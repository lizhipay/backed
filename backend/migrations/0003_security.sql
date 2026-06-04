-- +goose Up
-- Security tables: sessions, login attempts, password resets.

CREATE TABLE IF NOT EXISTS sessions (
    id                 UUID PRIMARY KEY,
    admin_id           UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL,
    access_jti         TEXT,
    user_agent         TEXT NOT NULL DEFAULT '',
    ip                 TEXT NOT NULL DEFAULT '',
    expires_at         TIMESTAMPTZ NOT NULL,
    last_seen_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at         TIMESTAMPTZ,
    revoked_reason     TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS sessions_refresh_hash_key
    ON sessions (refresh_token_hash);
CREATE INDEX IF NOT EXISTS sessions_admin_idx ON sessions (admin_id);
CREATE INDEX IF NOT EXISTS sessions_active_idx
    ON sessions (admin_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS login_attempts (
    id         UUID PRIMARY KEY,
    identifier TEXT NOT NULL,
    success    BOOLEAN NOT NULL,
    ip         TEXT NOT NULL DEFAULT '',
    user_agent TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS login_attempts_identifier_idx
    ON login_attempts (lower(identifier), created_at DESC);

CREATE TABLE IF NOT EXISTS password_resets (
    id          UUID PRIMARY KEY,
    admin_id    UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS password_resets_token_key
    ON password_resets (token_hash);
CREATE INDEX IF NOT EXISTS password_resets_admin_idx ON password_resets (admin_id);

-- +goose Down
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS login_attempts;
DROP TABLE IF EXISTS sessions;
