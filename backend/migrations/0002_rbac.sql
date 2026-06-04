-- +goose Up
-- Permission tables: roles, permissions, and their join tables.

CREATE TABLE IF NOT EXISTS roles (
    id          UUID PRIMARY KEY,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_system   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS roles_slug_key ON roles (slug);

CREATE TABLE IF NOT EXISTS permissions (
    id          UUID PRIMARY KEY,
    key         TEXT NOT NULL,
    resource    TEXT NOT NULL,
    action      TEXT NOT NULL,
    category    TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    is_system   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS permissions_key_key ON permissions (key);
CREATE INDEX IF NOT EXISTS permissions_resource_idx ON permissions (resource);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id       UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS role_permissions_perm_idx ON role_permissions (permission_id);

CREATE TABLE IF NOT EXISTS admin_roles (
    admin_id    UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    role_id     UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (admin_id, role_id)
);

CREATE INDEX IF NOT EXISTS admin_roles_role_idx ON admin_roles (role_id);

-- +goose Down
DROP TABLE IF EXISTS admin_roles;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS permissions;
DROP TABLE IF EXISTS roles;
