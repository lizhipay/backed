package store

import (
	"fmt"

	"github.com/google/uuid"
)

const roleColumns = `id, name, slug, description, is_system, created_at, updated_at`

func scanRole(row interface{ Scan(...any) error }) (*Role, error) {
	var r Role
	if err := row.Scan(&r.ID, &r.Name, &r.Slug, &r.Description, &r.IsSystem,
		&r.CreatedAt, &r.UpdatedAt); err != nil {
		return nil, mapErr(err)
	}
	return &r, nil
}

// ListRoles returns roles ordered by system-first then name, with a total count.
func (s *Store) ListRoles(ctx ctx, search string, limit, offset int) ([]Role, int64, error) {
	where := "1=1"
	args := []any{}
	if search != "" {
		where = "(name ILIKE $1 OR slug ILIKE $1)"
		args = append(args, "%"+search+"%")
	}
	var total int64
	if err := s.pool.QueryRow(ctx, `SELECT count(*) FROM roles WHERE `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}
	args = append(args, limit, offset)
	rows, err := s.pool.Query(ctx,
		fmt.Sprintf(`SELECT %s FROM roles WHERE %s ORDER BY is_system DESC, name
			LIMIT $%d OFFSET $%d`, roleColumns, where, len(args)-1, len(args)), args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	roles := []Role{}
	for rows.Next() {
		r, err := scanRole(rows)
		if err != nil {
			return nil, 0, err
		}
		roles = append(roles, *r)
	}
	return roles, total, rows.Err()
}

// GetRole loads a role by id.
func (s *Store) GetRole(ctx ctx, id string) (*Role, error) {
	return scanRole(s.pool.QueryRow(ctx, `SELECT `+roleColumns+` FROM roles WHERE id = $1`, id))
}

// GetRoleBySlug loads a role by slug.
func (s *Store) GetRoleBySlug(ctx ctx, slug string) (*Role, error) {
	return scanRole(s.pool.QueryRow(ctx, `SELECT `+roleColumns+` FROM roles WHERE slug = $1`, slug))
}

// CreateRole inserts a role.
func (s *Store) CreateRole(ctx ctx, name, slug, description string, isSystem bool) (*Role, error) {
	return scanRole(s.pool.QueryRow(ctx,
		`INSERT INTO roles (id, name, slug, description, is_system) VALUES ($1, $2, $3, $4, $5)
		 RETURNING `+roleColumns, uuid.NewString(), name, slug, description, isSystem))
}

// UpdateRole updates a role's name and description.
func (s *Store) UpdateRole(ctx ctx, id, name, description string) (*Role, error) {
	return scanRole(s.pool.QueryRow(ctx,
		`UPDATE roles SET name = $1, description = $2, updated_at = now()
		 WHERE id = $3 RETURNING `+roleColumns, name, description, id))
}

// DeleteRole removes a role.
func (s *Store) DeleteRole(ctx ctx, id string) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM roles WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ListPermissions returns the full permission catalog from the database.
func (s *Store) ListPermissions(ctx ctx) ([]Permission, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, key, resource, action, category, description, is_system, created_at, updated_at
		 FROM permissions ORDER BY category, resource, action`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	perms := []Permission{}
	for rows.Next() {
		var p Permission
		if err := rows.Scan(&p.ID, &p.Key, &p.Resource, &p.Action, &p.Category,
			&p.Description, &p.IsSystem, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		perms = append(perms, p)
	}
	return perms, rows.Err()
}

// RolePermissionKeys returns the permission keys granted to a role.
func (s *Store) RolePermissionKeys(ctx ctx, roleID string) ([]string, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT p.key FROM permissions p
		 JOIN role_permissions rp ON rp.permission_id = p.id
		 WHERE rp.role_id = $1 ORDER BY p.key`, roleID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	keys := []string{}
	for rows.Next() {
		var k string
		if err := rows.Scan(&k); err != nil {
			return nil, err
		}
		keys = append(keys, k)
	}
	return keys, rows.Err()
}

// SetRolePermissions replaces a role's permission set with the given keys.
func (s *Store) SetRolePermissions(ctx ctx, roleID string, keys []string) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, `DELETE FROM role_permissions WHERE role_id = $1`, roleID); err != nil {
		return err
	}
	if len(keys) > 0 {
		if _, err := tx.Exec(ctx,
			`INSERT INTO role_permissions (role_id, permission_id)
			 SELECT $1, id FROM permissions WHERE key = ANY($2)
			 ON CONFLICT DO NOTHING`, roleID, keys); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

// AssignRolePermissionByKey grants a single permission to a role (used in seeding).
func (s *Store) AssignRolePermissionByKey(ctx ctx, roleID, key string) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO role_permissions (role_id, permission_id)
		 SELECT $1, id FROM permissions WHERE key = $2 ON CONFLICT DO NOTHING`, roleID, key)
	return err
}

// UpsertPermission inserts or updates a permission by key (used in seeding).
func (s *Store) UpsertPermission(ctx ctx, key, resource, action, category, description string) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO permissions (id, key, resource, action, category, description, is_system)
		 VALUES ($1, $2, $3, $4, $5, $6, TRUE)
		 ON CONFLICT (key) DO UPDATE SET
		   resource = EXCLUDED.resource, action = EXCLUDED.action,
		   category = EXCLUDED.category, description = EXCLUDED.description,
		   updated_at = now()`,
		uuid.NewString(), key, resource, action, category, description)
	return err
}
