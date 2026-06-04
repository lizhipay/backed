package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds all runtime configuration sourced from environment variables.
// The database password is never persisted to disk; it arrives only via
// DATABASE_URL in the process environment.
type Config struct {
	AppEnv             string
	Port               string
	DatabaseURL        string
	JWTSecret          []byte
	RefreshSecret      []byte
	AccessTokenTTL     time.Duration
	RefreshTokenTTL    time.Duration
	RedisAddr          string
	RedisPassword      string
	RedisDB            int
	RedisKeyPrefix     string
	CORSAllowedOrigins []string
	AdminFrontendDir   string
	AdminBasePath      string

	// AdminUploadDir is the local filesystem directory where uploaded admin
	// assets (avatars) are written. AdminPublicUploadBase is the URL prefix the
	// same files are served under.
	AdminUploadDir        string
	AdminPublicUploadBase string

	// MFASecretEncryptionKey is the raw value of MFA_SECRET_ENCRYPTION_KEY. It is
	// optional at startup; MFA setup fails at request time if it is absent or
	// malformed. The key material is only held in memory, never written to disk.
	MFASecretEncryptionKey string

	BootstrapEmail    string
	BootstrapPassword string
}

// Load reads configuration from the environment, applying sensible defaults
// for non-secret values and validating that all secrets are present.
func Load() (*Config, error) {
	cfg := &Config{
		AppEnv:             getenv("APP_ENV", "development"),
		Port:               getenv("APP_PORT", "8080"),
		DatabaseURL:        os.Getenv("DATABASE_URL"),
		JWTSecret:          []byte(os.Getenv("JWT_SECRET")),
		RefreshSecret:      []byte(os.Getenv("REFRESH_TOKEN_SECRET")),
		AccessTokenTTL:     getdur("ACCESS_TOKEN_TTL", 15*time.Minute),
		RefreshTokenTTL:    getdur("REFRESH_TOKEN_TTL", 30*24*time.Hour),
		RedisAddr:          getenv("REDIS_ADDR", "localhost:6379"),
		RedisPassword:      os.Getenv("REDIS_PASSWORD"),
		RedisDB:            getint("REDIS_DB", 0),
		RedisKeyPrefix:     getenv("REDIS_KEY_PREFIX", "backed:admin"),
		CORSAllowedOrigins: splitList(getenv("CORS_ALLOWED_ORIGINS", "http://localhost:5173")),
		AdminFrontendDir:   os.Getenv("ADMIN_FRONTEND_DIR"),
		AdminBasePath:      getenv("ADMIN_BASE_PATH", "/admin"),

		AdminUploadDir:         getenv("ADMIN_UPLOAD_DIR", "uploads"),
		AdminPublicUploadBase:  getenv("ADMIN_PUBLIC_UPLOAD_BASE", "/uploads"),
		MFASecretEncryptionKey: os.Getenv("MFA_SECRET_ENCRYPTION_KEY"),

		BootstrapEmail:    os.Getenv("ADMIN_BOOTSTRAP_EMAIL"),
		BootstrapPassword: os.Getenv("ADMIN_BOOTSTRAP_PASSWORD"),
	}

	var missing []string
	if cfg.DatabaseURL == "" {
		missing = append(missing, "DATABASE_URL")
	}
	if len(cfg.JWTSecret) < 16 {
		missing = append(missing, "JWT_SECRET (min 16 bytes)")
	}
	if len(cfg.RefreshSecret) < 16 {
		missing = append(missing, "REFRESH_TOKEN_SECRET (min 16 bytes)")
	}
	if len(missing) > 0 {
		return nil, fmt.Errorf("missing required configuration: %s", strings.Join(missing, ", "))
	}
	return cfg, nil
}

// IsProduction reports whether the app runs in a production environment.
func (c *Config) IsProduction() bool {
	return c.AppEnv == "production" || c.AppEnv == "prod"
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getdur(key string, fallback time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	if d, err := time.ParseDuration(v); err == nil {
		return d
	}
	if secs, err := strconv.Atoi(v); err == nil {
		return time.Duration(secs) * time.Second
	}
	return fallback
}

func getint(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	if n, err := strconv.Atoi(v); err == nil {
		return n
	}
	return fallback
}

func splitList(v string) []string {
	parts := strings.Split(v, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}
