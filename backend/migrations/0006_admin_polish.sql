-- +goose Up
-- v2 admin polish: profile display name + avatar, and MFA enrollment support.
-- All statements are additive (ADD COLUMN IF NOT EXISTS / CREATE IF NOT EXISTS)
-- so applying this migration never drops or truncates existing data.

ALTER TABLE admins
    ADD COLUMN IF NOT EXISTS display_name      TEXT NOT NULL DEFAULT '';
ALTER TABLE admins
    ADD COLUMN IF NOT EXISTS avatar_url        TEXT NOT NULL DEFAULT '';
ALTER TABLE admins
    ADD COLUMN IF NOT EXISTS avatar_object_key TEXT NOT NULL DEFAULT '';

-- One-time MFA recovery codes. Only the hash is stored; the plaintext is shown
-- to the operator exactly once at enrollment.
CREATE TABLE IF NOT EXISTS mfa_recovery_codes (
    id          UUID PRIMARY KEY,
    admin_id    UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    code_hash   TEXT NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mfa_recovery_codes_admin_idx
    ON mfa_recovery_codes (admin_id);
CREATE UNIQUE INDEX IF NOT EXISTS mfa_recovery_codes_hash_key
    ON mfa_recovery_codes (code_hash);

-- Short-lived, single-use challenges issued after a correct password when the
-- account has MFA enabled. The second factor is verified against this token.
CREATE TABLE IF NOT EXISTS mfa_challenges (
    id           UUID PRIMARY KEY,
    admin_id     UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    token_hash   TEXT NOT NULL,
    expires_at   TIMESTAMPTZ NOT NULL,
    consumed_at  TIMESTAMPTZ,
    ip           TEXT NOT NULL DEFAULT '',
    user_agent   TEXT NOT NULL DEFAULT '',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS mfa_challenges_token_key
    ON mfa_challenges (token_hash);
CREATE INDEX IF NOT EXISTS mfa_challenges_admin_idx
    ON mfa_challenges (admin_id);

-- +goose Down
DROP TABLE IF EXISTS mfa_challenges;
DROP TABLE IF EXISTS mfa_recovery_codes;
