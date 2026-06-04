-- +goose Up
-- Identity tables: administrators.

CREATE TABLE IF NOT EXISTS admins (
    id                 UUID PRIMARY KEY,
    email              TEXT NOT NULL,
    username           TEXT NOT NULL,
    password_hash      TEXT NOT NULL,
    status             TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'disabled', 'locked')),
    mfa_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
    mfa_secret         TEXT,
    must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
    theme_preference   TEXT NOT NULL DEFAULT 'auto'
                       CHECK (theme_preference IN ('dark', 'light', 'auto')),
    last_login_at      TIMESTAMPTZ,
    failed_login_count INTEGER NOT NULL DEFAULT 0,
    locked_until       TIMESTAMPTZ,
    created_by         UUID REFERENCES admins(id) ON DELETE SET NULL,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at         TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS admins_email_key
    ON admins (lower(email)) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS admins_username_key
    ON admins (lower(username)) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS admins_status_idx ON admins (status);

-- +goose Down
DROP TABLE IF EXISTS admins;
