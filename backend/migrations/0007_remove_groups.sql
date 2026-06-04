-- +goose Up
-- Remove the retired user-group feature and its permission keys.

DELETE FROM role_permissions rp
USING permissions p
WHERE rp.permission_id = p.id
  AND p.key LIKE 'groups.%';

DELETE FROM permissions
WHERE key LIKE 'groups.%';

DROP TABLE IF EXISTS group_roles;
DROP TABLE IF EXISTS admin_groups;
DROP TABLE IF EXISTS groups;

-- +goose Down
CREATE TABLE IF NOT EXISTS groups (
    id          UUID PRIMARY KEY,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_system   BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS groups_slug_key ON groups (slug);

CREATE TABLE IF NOT EXISTS admin_groups (
    admin_id    UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
    group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (admin_id, group_id)
);

CREATE INDEX IF NOT EXISTS admin_groups_group_idx ON admin_groups (group_id);

CREATE TABLE IF NOT EXISTS group_roles (
    group_id    UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    role_id     UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES admins(id) ON DELETE SET NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (group_id, role_id)
);

CREATE INDEX IF NOT EXISTS group_roles_role_idx ON group_roles (role_id);
