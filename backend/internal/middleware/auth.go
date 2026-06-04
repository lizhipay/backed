package middleware

import (
	"log/slog"
	"net/http"
	"strings"

	"github.com/backed/backend/internal/auth"
	"github.com/backed/backend/internal/store"
)

// Authenticator validates access tokens and loads the request principal.
type Authenticator struct {
	tokens *auth.TokenManager
	store  *store.Store
	log    *slog.Logger
}

// NewAuthenticator constructs an Authenticator.
func NewAuthenticator(tokens *auth.TokenManager, st *store.Store, log *slog.Logger) *Authenticator {
	return &Authenticator{tokens: tokens, store: st, log: log}
}

// Require is middleware that rejects unauthenticated requests. On success it
// attaches the resolved principal (including effective permissions) to context.
func (a *Authenticator) Require(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := bearerToken(r)
		if token == "" {
			writeAuthError(w, a.log, "missing access token")
			return
		}
		claims, err := a.tokens.ParseAccessToken(token)
		if err != nil {
			writeAuthError(w, a.log, "invalid or expired access token")
			return
		}

		admin, err := a.store.GetAdminByID(r.Context(), claims.AdminID)
		if err != nil {
			writeAuthError(w, a.log, "account not found")
			return
		}
		if admin.Status != "active" {
			writeForbidden(w, a.log, "account is "+admin.Status)
			return
		}

		perms, err := a.store.EffectivePermissions(r.Context(), admin.ID)
		if err != nil {
			a.log.Error("resolve permissions", "err", err)
			writeAuthError(w, a.log, "could not resolve permissions")
			return
		}

		p := &auth.Principal{
			AdminID:     admin.ID,
			Email:       admin.Email,
			Username:    admin.Username,
			Status:      admin.Status,
			JTI:         claims.ID,
			Permissions: perms,
		}
		ctx := auth.WithPrincipal(r.Context(), p)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func bearerToken(r *http.Request) string {
	h := r.Header.Get("Authorization")
	if h == "" {
		return ""
	}
	parts := strings.SplitN(h, " ", 2)
	if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
		return strings.TrimSpace(parts[1])
	}
	return ""
}

// requirePermission is the shared body of permission guards. It records a denied
// audit entry whenever an authenticated principal lacks the needed permission.
func (a *Authenticator) requirePermission(key string, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p, ok := auth.PrincipalFrom(r.Context())
		if !ok {
			writeAuthError(w, a.log, "authentication required")
			return
		}
		if !p.Permissions.Has(key) {
			actor := p.AdminID
			_ = a.store.AppendAudit(r.Context(), store.AuditEntry{
				ActorAdminID: &actor,
				ActorLabel:   p.Email,
				Action:       "permission.denied",
				ResourceType: "permission",
				ResourceID:   key,
				Status:       "denied",
				IP:           ClientIP(r),
				UserAgent:    r.UserAgent(),
				RequestID:    RequestIDFrom(r.Context()),
			})
			writeForbidden(w, a.log, "missing permission: "+key)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// RequirePermission returns middleware enforcing a single permission key.
func (a *Authenticator) RequirePermission(key string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return a.requirePermission(key, next)
	}
}

func writeAuthError(w http.ResponseWriter, log *slog.Logger, msg string) {
	writeJSONError(w, log, http.StatusUnauthorized, "unauthorized", msg)
}

func writeForbidden(w http.ResponseWriter, log *slog.Logger, msg string) {
	writeJSONError(w, log, http.StatusForbidden, "forbidden", msg)
}

// ClientIP extracts the best-effort client IP, honoring X-Forwarded-For.
func ClientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		if i := strings.IndexByte(xff, ','); i > 0 {
			return strings.TrimSpace(xff[:i])
		}
		return strings.TrimSpace(xff)
	}
	if r.RemoteAddr != "" {
		if i := strings.LastIndexByte(r.RemoteAddr, ':'); i > 0 {
			return r.RemoteAddr[:i]
		}
		return r.RemoteAddr
	}
	return ""
}
