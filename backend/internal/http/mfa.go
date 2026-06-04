package httpapi

import (
	"errors"
	"net/http"

	"github.com/backed/backend/internal/auth"
	"github.com/backed/backend/internal/platform/response"
	"github.com/backed/backend/internal/store"
	"github.com/google/uuid"
)

// errMFANotConfigured signals that no MFA encryption key is configured.
var errMFANotConfigured = errors.New("mfa encryption key not configured")

// recoveryCodeCount is how many one-time recovery codes are minted at enrollment.
const recoveryCodeCount = 10

// mfaCipherOrError returns the configured cipher or a 503 APIError explaining
// that MFA cannot be used until a valid encryption key is set. This keeps the
// key optional at startup while making MFA setup fail loudly when it is missing
// or invalid.
func (s *Server) requireMFACipher() (*auth.SecretCipher, error) {
	if s.mfaCipher != nil {
		return s.mfaCipher, nil
	}
	return nil, response.New(http.StatusServiceUnavailable, "mfa_unavailable",
		"multi-factor authentication is not available: server encryption key is missing or invalid")
}

type mfaSetupRequest struct {
	CurrentPassword string `json:"current_password"`
}

func (s *Server) handleMFASetup(w http.ResponseWriter, r *http.Request) {
	p := principal(r)
	cipher, err := s.requireMFACipher()
	if err != nil {
		response.Error(w, s.log, err)
		return
	}

	var req mfaSetupRequest
	if err := decodeJSON(r, &req); err != nil {
		response.Error(w, s.log, err)
		return
	}
	admin, err := s.store.GetAdminByID(r.Context(), p.AdminID)
	if err != nil {
		response.Error(w, s.log, response.NotFound("account not found"))
		return
	}
	if err := auth.VerifyPassword(admin.PasswordHash, req.CurrentPassword); err != nil {
		s.audit(r, "me.mfa_setup", "admin", p.AdminID, map[string]any{"result": "bad_password"})
		response.Error(w, s.log, response.Unauthorized("current password is incorrect"))
		return
	}
	if admin.MFAEnabled {
		response.Error(w, s.log, response.Conflict("MFA is already enabled; disable it first to re-enroll"))
		return
	}

	secret, otpauthURL, err := auth.GenerateTOTPSecret(admin.Email)
	if err != nil {
		response.Error(w, s.log, response.Internal("could not generate MFA secret"))
		return
	}
	encrypted, err := cipher.Encrypt(secret)
	if err != nil {
		response.Error(w, s.log, response.Internal("could not protect MFA secret"))
		return
	}
	// Persist the (encrypted) pending secret. MFA stays disabled until confirm.
	if err := s.store.SetMFASecret(r.Context(), p.AdminID, encrypted); err != nil {
		response.Error(w, s.log, response.Internal("could not store MFA secret"))
		return
	}
	s.audit(r, "me.mfa_setup", "admin", p.AdminID, map[string]any{"result": "pending"})
	response.JSON(w, http.StatusOK, map[string]any{
		"setup_id":    uuid.NewString(),
		"secret":      secret,
		"otpauth_url": otpauthURL,
		"issuer":      auth.TOTPIssuer,
		"account":     admin.Email,
	})
}

type mfaConfirmRequest struct {
	SetupID string `json:"setup_id"`
	Code    string `json:"code"`
}

func (s *Server) handleMFAConfirm(w http.ResponseWriter, r *http.Request) {
	p := principal(r)
	cipher, err := s.requireMFACipher()
	if err != nil {
		response.Error(w, s.log, err)
		return
	}

	var req mfaConfirmRequest
	if err := decodeJSON(r, &req); err != nil {
		response.Error(w, s.log, err)
		return
	}
	admin, err := s.store.GetAdminByID(r.Context(), p.AdminID)
	if err != nil {
		response.Error(w, s.log, response.NotFound("account not found"))
		return
	}
	if admin.MFAEnabled {
		response.Error(w, s.log, response.Conflict("MFA is already enabled"))
		return
	}
	if admin.MFASecret == "" {
		response.Error(w, s.log, response.BadRequest("start MFA setup before confirming"))
		return
	}
	secret, err := cipher.Decrypt(admin.MFASecret)
	if err != nil {
		s.log.Error("decrypt mfa secret", "err", err)
		response.Error(w, s.log, response.Internal("could not read MFA secret"))
		return
	}
	if !auth.ValidateTOTP(secret, req.Code) {
		s.audit(r, "me.mfa_enable", "admin", p.AdminID, map[string]any{"result": "invalid_code"})
		response.Error(w, s.log, response.BadRequest("invalid verification code"))
		return
	}

	codes, err := auth.GenerateRecoveryCodes(recoveryCodeCount)
	if err != nil {
		response.Error(w, s.log, response.Internal("could not generate recovery codes"))
		return
	}
	hashes := make([]string, len(codes))
	for i, c := range codes {
		hashes[i] = auth.HashRecoveryCode(c)
	}
	if err := s.store.EnableMFA(r.Context(), store.EnableMFAParams{
		AdminID:            p.AdminID,
		EncryptedSecret:    admin.MFASecret,
		RecoveryCodeHashes: hashes,
	}); err != nil {
		response.Error(w, s.log, response.Internal("could not enable MFA"))
		return
	}
	s.audit(r, "me.mfa_enable", "admin", p.AdminID, map[string]any{"result": "enabled"})
	// Recovery codes are returned exactly once, here. They are not retrievable
	// later because only their hashes are stored.
	response.JSON(w, http.StatusOK, map[string]any{
		"ok":             true,
		"mfa_enabled":    true,
		"recovery_codes": codes,
	})
}

type mfaDisableRequest struct {
	CurrentPassword string `json:"current_password"`
	Code            string `json:"code"`
	RecoveryCode    string `json:"recovery_code"`
}

func (s *Server) handleMFADisable(w http.ResponseWriter, r *http.Request) {
	p := principal(r)
	cipher, err := s.requireMFACipher()
	if err != nil {
		response.Error(w, s.log, err)
		return
	}

	var req mfaDisableRequest
	if err := decodeJSON(r, &req); err != nil {
		response.Error(w, s.log, err)
		return
	}
	admin, err := s.store.GetAdminByID(r.Context(), p.AdminID)
	if err != nil {
		response.Error(w, s.log, response.NotFound("account not found"))
		return
	}
	if !admin.MFAEnabled {
		response.Error(w, s.log, response.BadRequest("MFA is not enabled"))
		return
	}
	if err := auth.VerifyPassword(admin.PasswordHash, req.CurrentPassword); err != nil {
		s.audit(r, "me.mfa_disable", "admin", p.AdminID, map[string]any{"result": "bad_password"})
		response.Error(w, s.log, response.Unauthorized("current password is incorrect"))
		return
	}

	ok, err := s.verifySecondFactor(r, admin, cipher, req.Code, req.RecoveryCode)
	if err != nil {
		response.Error(w, s.log, err)
		return
	}
	if !ok {
		s.audit(r, "me.mfa_disable", "admin", p.AdminID, map[string]any{"result": "invalid_second_factor"})
		response.Error(w, s.log, response.BadRequest("a valid authenticator code or recovery code is required"))
		return
	}
	if err := s.store.DisableMFA(r.Context(), p.AdminID); err != nil {
		response.Error(w, s.log, response.Internal("could not disable MFA"))
		return
	}
	s.audit(r, "me.mfa_disable", "admin", p.AdminID, map[string]any{"result": "disabled"})
	response.JSON(w, http.StatusOK, map[string]any{"ok": true, "mfa_enabled": false})
}

// verifySecondFactor checks a TOTP code or a recovery code against an admin with
// MFA enabled. A consumed recovery code is marked used. It returns whether a
// factor matched. Internal failures are surfaced as APIErrors.
func (s *Server) verifySecondFactor(r *http.Request, admin *store.Admin, cipher *auth.SecretCipher, code, recoveryCode string) (bool, error) {
	if code != "" && admin.MFASecret != "" {
		secret, err := cipher.Decrypt(admin.MFASecret)
		if err != nil {
			s.log.Error("decrypt mfa secret", "err", err)
			return false, response.Internal("could not read MFA secret")
		}
		if auth.ValidateTOTP(secret, code) {
			return true, nil
		}
	}
	if recoveryCode != "" {
		consumed, err := s.store.ConsumeRecoveryCode(r.Context(), admin.ID,
			[]string{auth.HashRecoveryCode(recoveryCode)})
		if err != nil {
			return false, response.Internal("could not verify recovery code")
		}
		if consumed {
			s.audit(r, "me.mfa_recovery_code_used", "admin", admin.ID, nil)
			return true, nil
		}
	}
	return false, nil
}
