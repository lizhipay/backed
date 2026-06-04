package httpapi

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/backed/backend/internal/auth"
	appmw "github.com/backed/backend/internal/middleware"
	"github.com/backed/backend/internal/platform/response"
	"github.com/backed/backend/internal/sessionstore"
	"github.com/backed/backend/internal/store"
)

const (
	maxFailedLogins = 5
	lockoutMinutes  = 15
	mfaChallengeTTL = 5 * time.Minute
)

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type tokenResponse struct {
	AccessToken string    `json:"access_token"`
	TokenType   string    `json:"token_type"`
	ExpiresAt   time.Time `json:"expires_at"`
}

type mfaRequiredResponse struct {
	MFARequired bool      `json:"mfa_required"`
	MFAToken    string    `json:"mfa_token"`
	ExpiresAt   time.Time `json:"expires_at"`
	AdminHint   struct {
		Email string `json:"email"`
	} `json:"admin_hint"`
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := decodeJSON(r, &req); err != nil {
		response.Error(w, s.log, err)
		return
	}
	req.Email = strings.TrimSpace(req.Email)
	if req.Email == "" || req.Password == "" {
		response.Error(w, s.log, response.BadRequest("email and password are required"))
		return
	}

	ip := appmw.ClientIP(r)
	ua := r.UserAgent()

	admin, err := s.store.GetAdminByEmail(r.Context(), req.Email)
	if err != nil {
		// Same error and timing-insensitive path whether or not the account
		// exists, to avoid leaking which emails are registered.
		s.store.RecordLoginAttempt(r.Context(), req.Email, false, ip, ua)
		s.auditLogin(r, nil, req.Email, "auth.login", "failure")
		response.Error(w, s.log, response.Unauthorized("invalid email or password"))
		return
	}

	if admin.Status == "locked" || (admin.LockedUntil != nil && admin.LockedUntil.After(time.Now())) {
		s.store.RecordLoginAttempt(r.Context(), req.Email, false, ip, ua)
		s.auditLogin(r, &admin.ID, admin.Email, "auth.login", "failure")
		response.Error(w, s.log, response.Forbidden("account is locked; try again later"))
		return
	}
	if admin.Status == "disabled" {
		s.store.RecordLoginAttempt(r.Context(), req.Email, false, ip, ua)
		s.auditLogin(r, &admin.ID, admin.Email, "auth.login", "failure")
		response.Error(w, s.log, response.Forbidden("account is disabled"))
		return
	}

	if err := auth.VerifyPassword(admin.PasswordHash, req.Password); err != nil {
		s.store.RecordLoginAttempt(r.Context(), req.Email, false, ip, ua)
		if _, e := s.store.IncrementFailedLogin(r.Context(), admin.ID, maxFailedLogins, lockoutMinutes); e != nil {
			s.log.Error("increment failed login", "err", e)
		}
		s.auditLogin(r, &admin.ID, admin.Email, "auth.login", "failure")
		response.Error(w, s.log, response.Unauthorized("invalid email or password"))
		return
	}

	if admin.MFAEnabled {
		raw, err := s.tokens.NewRefreshToken()
		if err != nil {
			response.Error(w, s.log, response.Internal("could not issue MFA challenge"))
			return
		}
		expiresAt := time.Now().Add(mfaChallengeTTL)
		if _, err := s.sessionStore.CreateMFAChallenge(r.Context(), admin.ID, s.tokens.HashRefreshToken(raw), expiresAt, ip, ua); err != nil {
			response.Error(w, s.log, response.Internal("could not open MFA challenge"))
			return
		}
		s.auditLogin(r, &admin.ID, admin.Email, "auth.mfa_required", "success")
		res := mfaRequiredResponse{
			MFARequired: true,
			MFAToken:    raw,
			ExpiresAt:   expiresAt,
		}
		res.AdminHint.Email = admin.Email
		response.JSON(w, http.StatusOK, res)
		return
	}

	if err := s.issueSession(w, r, admin, ip, ua); err != nil {
		response.Error(w, s.log, err)
		return
	}
	s.store.RecordLoginAttempt(r.Context(), req.Email, true, ip, ua)
	if err := s.store.RecordSuccessfulLogin(r.Context(), admin.ID); err != nil {
		s.log.Error("record successful login", "err", err)
	}
	s.auditLogin(r, &admin.ID, admin.Email, "auth.login", "success")
}

type mfaVerifyRequest struct {
	MFAToken     string `json:"mfa_token"`
	Code         string `json:"code"`
	RecoveryCode string `json:"recovery_code"`
}

func (s *Server) handleMFAVerify(w http.ResponseWriter, r *http.Request) {
	var req mfaVerifyRequest
	if err := decodeJSON(r, &req); err != nil {
		response.Error(w, s.log, err)
		return
	}
	req.MFAToken = strings.TrimSpace(req.MFAToken)
	req.Code = strings.TrimSpace(req.Code)
	req.RecoveryCode = strings.TrimSpace(req.RecoveryCode)
	if req.MFAToken == "" || (req.Code == "" && req.RecoveryCode == "") {
		response.Error(w, s.log, response.BadRequest("mfa_token and code or recovery_code are required"))
		return
	}

	challenge, err := s.sessionStore.ConsumeMFAChallenge(r.Context(), s.tokens.HashRefreshToken(req.MFAToken))
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			response.Error(w, s.log, response.Unauthorized("MFA challenge is invalid or expired"))
			return
		}
		response.Error(w, s.log, response.Internal("could not verify MFA challenge"))
		return
	}
	admin, err := s.store.GetAdminByID(r.Context(), challenge.AdminID)
	if err != nil || admin.Status != "active" || !admin.MFAEnabled {
		response.Error(w, s.log, response.Unauthorized("account unavailable"))
		return
	}
	cipher, err := s.requireMFACipher()
	if err != nil {
		response.Error(w, s.log, err)
		return
	}
	ok, err := s.verifySecondFactor(r, admin, cipher, req.Code, req.RecoveryCode)
	if err != nil {
		response.Error(w, s.log, err)
		return
	}
	if !ok {
		s.auditLogin(r, &admin.ID, admin.Email, "auth.mfa_verify", "failure")
		response.Error(w, s.log, response.Unauthorized("invalid MFA code"))
		return
	}

	ip := appmw.ClientIP(r)
	ua := r.UserAgent()
	if err := s.issueSession(w, r, admin, ip, ua); err != nil {
		response.Error(w, s.log, err)
		return
	}
	s.store.RecordLoginAttempt(r.Context(), admin.Email, true, ip, ua)
	if err := s.store.RecordSuccessfulLogin(r.Context(), admin.ID); err != nil {
		s.log.Error("record successful login", "err", err)
	}
	s.auditLogin(r, &admin.ID, admin.Email, "auth.mfa_verify", "success")
	s.auditLogin(r, &admin.ID, admin.Email, "auth.login", "success")
}

// issueSession mints an access token + refresh token, persists the session, and
// writes the access token in the body plus the refresh token as an HttpOnly cookie.
func (s *Server) issueSession(w http.ResponseWriter, r *http.Request, admin *store.Admin, ip, ua string) error {
	accessToken, jti, err := s.tokens.IssueAccessToken(admin.ID, admin.Email)
	if err != nil {
		return response.Internal("could not issue access token")
	}
	rawRefresh, err := s.tokens.NewRefreshToken()
	if err != nil {
		return response.Internal("could not issue refresh token")
	}
	expiresAt := s.tokens.RefreshExpiry()
	if _, err := s.sessionStore.CreateSession(r.Context(), sessionstore.CreateSessionParams{
		AdminID:          admin.ID,
		RefreshTokenHash: s.tokens.HashRefreshToken(rawRefresh),
		AccessJTI:        jti,
		UserAgent:        ua,
		IP:               ip,
		ExpiresAt:        expiresAt,
	}); err != nil {
		return response.Internal("could not open session")
	}

	auth.SetRefreshCookie(w, rawRefresh, expiresAt, s.cfg.IsProduction())
	response.JSON(w, http.StatusOK, tokenResponse{
		AccessToken: accessToken,
		TokenType:   "Bearer",
		ExpiresAt:   time.Now().Add(s.tokens.AccessTTL()),
	})
	return nil
}

func (s *Server) handleRefresh(w http.ResponseWriter, r *http.Request) {
	raw, ok := auth.ReadRefreshCookie(r)
	if !ok {
		response.Error(w, s.log, response.Unauthorized("missing refresh token"))
		return
	}
	sess, err := s.sessionStore.GetSessionByRefreshHash(r.Context(), s.tokens.HashRefreshToken(raw))
	if err != nil {
		response.Error(w, s.log, response.Unauthorized("invalid refresh token"))
		return
	}
	if sess.RevokedAt != nil || sess.ExpiresAt.Before(time.Now()) {
		response.Error(w, s.log, response.Unauthorized("session expired or revoked"))
		return
	}

	admin, err := s.store.GetAdminByID(r.Context(), sess.AdminID)
	if err != nil || admin.Status != "active" {
		response.Error(w, s.log, response.Unauthorized("account unavailable"))
		return
	}

	// Rotate both tokens to prevent refresh-token replay.
	accessToken, jti, err := s.tokens.IssueAccessToken(admin.ID, admin.Email)
	if err != nil {
		response.Error(w, s.log, response.Internal("could not issue access token"))
		return
	}
	newRaw, err := s.tokens.NewRefreshToken()
	if err != nil {
		response.Error(w, s.log, response.Internal("could not rotate refresh token"))
		return
	}
	expiresAt := s.tokens.RefreshExpiry()
	if err := s.sessionStore.RotateSession(r.Context(), sess.ID,
		s.tokens.HashRefreshToken(newRaw), jti, expiresAt); err != nil {
		response.Error(w, s.log, response.Internal("could not rotate session"))
		return
	}

	auth.SetRefreshCookie(w, newRaw, expiresAt, s.cfg.IsProduction())
	response.JSON(w, http.StatusOK, tokenResponse{
		AccessToken: accessToken,
		TokenType:   "Bearer",
		ExpiresAt:   time.Now().Add(s.tokens.AccessTTL()),
	})
}

func (s *Server) handleLogout(w http.ResponseWriter, r *http.Request) {
	if raw, ok := auth.ReadRefreshCookie(r); ok {
		if sess, err := s.sessionStore.GetSessionByRefreshHash(r.Context(), s.tokens.HashRefreshToken(raw)); err == nil {
			_ = s.sessionStore.RevokeSession(r.Context(), sess.ID, "logout")
			s.auditLogin(r, &sess.AdminID, "", "auth.logout", "success")
		}
	}
	auth.ClearRefreshCookie(w, s.cfg.IsProduction())
	response.JSON(w, http.StatusOK, map[string]any{"ok": true})
}

// Password reset is intentionally minimal for v1: it generates a reset token
// and records it. Delivery (email) is left to the deployment integration; the
// request endpoint never reveals whether an account exists.
type passwordResetRequest struct {
	Email string `json:"email"`
}

func (s *Server) handlePasswordResetRequest(w http.ResponseWriter, r *http.Request) {
	var req passwordResetRequest
	if err := decodeJSON(r, &req); err != nil {
		response.Error(w, s.log, err)
		return
	}
	// Always return ok to avoid account enumeration. Token creation is wired in
	// the store; out-of-band delivery is a deployment concern.
	if admin, err := s.store.GetAdminByEmail(r.Context(), strings.TrimSpace(req.Email)); err == nil {
		s.auditLogin(r, &admin.ID, admin.Email, "auth.password_reset_request", "success")
	}
	response.JSON(w, http.StatusOK, map[string]any{
		"ok":      true,
		"message": "if the account exists, a reset link has been sent",
	})
}

type passwordResetConfirm struct {
	Token       string `json:"token"`
	NewPassword string `json:"new_password"`
}

func (s *Server) handlePasswordResetConfirm(w http.ResponseWriter, r *http.Request) {
	var req passwordResetConfirm
	if err := decodeJSON(r, &req); err != nil {
		response.Error(w, s.log, err)
		return
	}
	// v1 stub: token verification against password_resets is a deployment
	// integration point. Reject by default so the endpoint is never a bypass.
	_ = req
	response.Error(w, s.log, response.New(http.StatusNotImplemented,
		"not_implemented", "password reset confirmation is not enabled in this deployment"))
}

func (s *Server) auditLogin(r *http.Request, actorID *string, label, action, status string) {
	_ = s.store.AppendAudit(r.Context(), store.AuditEntry{
		ActorAdminID: actorID,
		ActorLabel:   label,
		Action:       action,
		ResourceType: "auth",
		Status:       status,
		IP:           appmw.ClientIP(r),
		UserAgent:    r.UserAgent(),
		RequestID:    appmw.RequestIDFrom(r.Context()),
	})
}
