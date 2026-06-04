package httpapi

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"log/slog"
	"net/http"

	"github.com/backed/backend/internal/auth"
	"github.com/backed/backend/internal/config"
	appmw "github.com/backed/backend/internal/middleware"
	"github.com/backed/backend/internal/sessionstore"
	"github.com/backed/backend/internal/store"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
)

// Server wires together dependencies and exposes an http.Handler.
type Server struct {
	cfg          *config.Config
	log          *slog.Logger
	store        *store.Store
	sessionStore *sessionstore.Store
	tokens       *auth.TokenManager
	authn        *appmw.Authenticator

	// mfaCipher encrypts/decrypts stored TOTP secrets. It is nil when
	// MFA_SECRET_ENCRYPTION_KEY is absent or invalid; mfaCipherErr explains why.
	// The key is optional at startup so the API can boot without MFA configured,
	// but MFA operations fail until a valid key is provided.
	mfaCipher    *auth.SecretCipher
	mfaCipherErr error
}

// New constructs a Server.
func New(cfg *config.Config, log *slog.Logger, st *store.Store, sessions *sessionstore.Store, tokens *auth.TokenManager) *Server {
	s := &Server{
		cfg:          cfg,
		log:          log,
		store:        st,
		sessionStore: sessions,
		tokens:       tokens,
		authn:        appmw.NewAuthenticator(tokens, st, log),
	}
	if c, err := mfaCipherFromConfig(cfg); err != nil {
		s.mfaCipherErr = err
		if errors.Is(err, errMFANotConfigured) {
			log.Warn("MFA_SECRET_ENCRYPTION_KEY is not configured; MFA endpoints are disabled")
		} else {
			log.Warn("MFA_SECRET_ENCRYPTION_KEY is invalid; MFA endpoints are disabled", "err", err)
		}
	} else {
		s.mfaCipher = c
	}
	return s
}

func mfaCipherFromConfig(cfg *config.Config) (*auth.SecretCipher, error) {
	key := cfg.MFASecretEncryptionKey
	if key == "" {
		if cfg.IsProduction() {
			return nil, errMFANotConfigured
		}
		key = developmentMFAKey(cfg.RefreshSecret)
	}
	return auth.NewSecretCipher(key)
}

func developmentMFAKey(refreshSecret []byte) string {
	sum := sha256.Sum256(refreshSecret)
	return hex.EncodeToString(sum[:])
}

// Handler builds the chi router with all routes mounted under /api.
func (s *Server) Handler() http.Handler {
	r := chi.NewRouter()

	r.Use(appmw.RequestID)
	r.Use(appmw.Recoverer(s.log))
	r.Use(appmw.Logger(s.log))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   s.cfg.CORSAllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Authorization", "Content-Type", "X-Request-Id"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Route("/api", func(r chi.Router) {
		// Public endpoints.
		r.Get("/healthz", s.handleHealth)
		r.Get("/version", s.handleVersion)

		r.Route("/auth", func(r chi.Router) {
			r.Post("/login", s.handleLogin)
			r.Post("/refresh", s.handleRefresh)
			r.Post("/logout", s.handleLogout)
			r.Post("/mfa/verify", s.handleMFAVerify)
			r.Post("/password-reset/request", s.handlePasswordResetRequest)
			r.Post("/password-reset/confirm", s.handlePasswordResetConfirm)
		})

		// Authenticated endpoints.
		r.Group(func(r chi.Router) {
			r.Use(s.authn.Require)

			s.mountMe(r)
			s.mountAdmins(r)
			s.mountRoles(r)
			s.mountPermissions(r)
			s.mountSessions(r)
			s.mountAudit(r)
			s.mountSettings(r)
		})
	})

	s.mountUploads(r)
	s.mountAdminFrontend(r)

	return r
}

// can is a small alias for the permission middleware constructor.
func (s *Server) can(key string) func(http.Handler) http.Handler {
	return s.authn.RequirePermission(key)
}
