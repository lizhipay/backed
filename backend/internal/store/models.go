package store

import "time"

// Admin mirrors a row in the admins table (without the password hash unless
// explicitly loaded for auth).
type Admin struct {
	ID                        string     `json:"id"`
	Email                     string     `json:"email"`
	Username                  string     `json:"username"`
	DisplayName               string     `json:"display_name"`
	AvatarURL                 string     `json:"avatar_url"`
	AvatarObjectKey           string     `json:"-"`
	PasswordHash              string     `json:"-"`
	MFASecret                 string     `json:"-"`
	Status                    string     `json:"status"`
	MFAEnabled                bool       `json:"mfa_enabled"`
	MFARecoveryCodesRemaining int        `json:"mfa_recovery_codes_remaining"`
	MustChangePassword        bool       `json:"must_change_password"`
	ThemePreference           string     `json:"theme_preference"`
	LanguagePreference        string     `json:"language_preference"`
	IsSuperAdmin              bool       `json:"is_super_admin"`
	LastLoginAt               *time.Time `json:"last_login_at,omitempty"`
	FailedLoginCount          int        `json:"failed_login_count"`
	LockedUntil               *time.Time `json:"locked_until,omitempty"`
	CreatedBy                 *string    `json:"created_by,omitempty"`
	CreatedAt                 time.Time  `json:"created_at"`
	UpdatedAt                 time.Time  `json:"updated_at"`
}

// Role mirrors a row in the roles table.
type Role struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Slug        string    `json:"slug"`
	Description string    `json:"description"`
	IsSystem    bool      `json:"is_system"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Permission mirrors a row in the permissions table.
type Permission struct {
	ID          string    `json:"id"`
	Key         string    `json:"key"`
	Resource    string    `json:"resource"`
	Action      string    `json:"action"`
	Category    string    `json:"category"`
	Description string    `json:"description"`
	IsSystem    bool      `json:"is_system"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Session mirrors a row in the sessions table.
type Session struct {
	ID            string     `json:"id"`
	AdminID       string     `json:"admin_id"`
	AccessJTI     *string    `json:"-"`
	UserAgent     string     `json:"user_agent"`
	IP            string     `json:"ip"`
	ExpiresAt     time.Time  `json:"expires_at"`
	LastSeenAt    time.Time  `json:"last_seen_at"`
	RevokedAt     *time.Time `json:"revoked_at,omitempty"`
	RevokedReason *string    `json:"revoked_reason,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
}

// AuditLog mirrors a row in the audit_logs table.
type AuditLog struct {
	ID           string         `json:"id"`
	ActorAdminID *string        `json:"actor_admin_id,omitempty"`
	ActorLabel   string         `json:"actor_label"`
	Action       string         `json:"action"`
	ResourceType string         `json:"resource_type"`
	ResourceID   string         `json:"resource_id"`
	Changes      map[string]any `json:"changes"`
	Status       string         `json:"status"`
	IP           string         `json:"ip"`
	UserAgent    string         `json:"user_agent"`
	RequestID    string         `json:"request_id"`
	CreatedAt    time.Time      `json:"created_at"`
}

// Setting mirrors a row in the settings table.
type Setting struct {
	Key       string         `json:"key"`
	Value     map[string]any `json:"value"`
	UpdatedAt time.Time      `json:"updated_at"`
}
