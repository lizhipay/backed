package store

// AdminRoleIDs returns the role ids directly assigned to an admin.
func (s *Store) AdminRoleIDs(ctx ctx, adminID string) ([]string, error) {
	return s.scanIDs(ctx, `SELECT role_id FROM admin_roles WHERE admin_id = $1`, adminID)
}

// AdminRoles returns the roles directly assigned to an admin.
func (s *Store) AdminRoles(ctx ctx, adminID string) ([]Role, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT r.id, r.name, r.slug, r.description, r.is_system, r.created_at, r.updated_at
		 FROM roles r JOIN admin_roles ar ON ar.role_id = r.id
		 WHERE ar.admin_id = $1 ORDER BY r.name`, adminID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	roles := []Role{}
	for rows.Next() {
		r, err := scanRole(rows)
		if err != nil {
			return nil, err
		}
		roles = append(roles, *r)
	}
	return roles, rows.Err()
}

// SetAdminRoles replaces the roles directly assigned to an admin.
func (s *Store) SetAdminRoles(ctx ctx, adminID string, roleIDs []string, assignedBy *string) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if _, err := tx.Exec(ctx, `DELETE FROM admin_roles WHERE admin_id = $1`, adminID); err != nil {
		return err
	}
	for _, rid := range roleIDs {
		if _, err := tx.Exec(ctx,
			`INSERT INTO admin_roles (admin_id, role_id, assigned_by) VALUES ($1, $2, $3)
			 ON CONFLICT DO NOTHING`, adminID, rid, assignedBy); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

// AssignAdminRoleBySlug grants a role to an admin by role slug (used in bootstrap).
func (s *Store) AssignAdminRoleBySlug(ctx ctx, adminID, slug string, assignedBy *string) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO admin_roles (admin_id, role_id, assigned_by)
		 SELECT $1, id, $3 FROM roles WHERE slug = $2 ON CONFLICT DO NOTHING`,
		adminID, slug, assignedBy)
	return err
}
