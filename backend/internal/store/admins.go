package store

import (
	"fmt"
	"strings"

	"github.com/backed/backend/internal/permissions"
	"github.com/google/uuid"
)

const adminColumns = `id, email, username, display_name, avatar_url, avatar_object_key,
	password_hash, COALESCE(mfa_secret, ''), status, mfa_enabled,
	must_change_password, theme_preference, language_preference, last_login_at, failed_login_count,
	locked_until, created_by, created_at, updated_at`

func scanAdmin(row interface {
	Scan(dest ...any) error
}) (*Admin, error) {
	var a Admin
	err := row.Scan(&a.ID, &a.Email, &a.Username, &a.DisplayName, &a.AvatarURL, &a.AvatarObjectKey,
		&a.PasswordHash, &a.MFASecret, &a.Status,
		&a.MFAEnabled, &a.MustChangePassword, &a.ThemePreference, &a.LanguagePreference, &a.LastLoginAt,
		&a.FailedLoginCount, &a.LockedUntil, &a.CreatedBy, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		return nil, mapErr(err)
	}
	return &a, nil
}

// GetAdminByEmail loads an active (non-deleted) admin by email, case-insensitive.
func (s *Store) GetAdminByEmail(ctx ctx, email string) (*Admin, error) {
	row := s.pool.QueryRow(ctx,
		`SELECT `+adminColumns+` FROM admins
		 WHERE lower(email) = lower($1) AND deleted_at IS NULL`, email)
	return scanAdmin(row)
}

// GetAdminByID loads a non-deleted admin by id.
func (s *Store) GetAdminByID(ctx ctx, id string) (*Admin, error) {
	row := s.pool.QueryRow(ctx,
		`SELECT `+adminColumns+` FROM admins
		 WHERE id = $1 AND deleted_at IS NULL`, id)
	return scanAdmin(row)
}

// CreateAdminParams holds inputs for creating an admin.
type CreateAdminParams struct {
	Email              string
	Username           string
	PasswordHash       string
	Status             string
	MustChangePassword bool
	CreatedBy          *string
}

// CreateAdmin inserts a new admin and returns it.
func (s *Store) CreateAdmin(ctx ctx, p CreateAdminParams) (*Admin, error) {
	status := p.Status
	if status == "" {
		status = "active"
	}
	row := s.pool.QueryRow(ctx,
		`INSERT INTO admins (id, email, username, password_hash, status, must_change_password, created_by)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING `+adminColumns,
		uuid.NewString(), p.Email, p.Username, p.PasswordHash, status, p.MustChangePassword, p.CreatedBy)
	return scanAdmin(row)
}

// ListAdminsParams holds filters for listing admins.
type ListAdminsParams struct {
	Search string
	Status string
	Limit  int
	Offset int
}

// ListAdmins returns a page of admins and the total count.
func (s *Store) ListAdmins(ctx ctx, p ListAdminsParams) ([]Admin, int64, error) {
	where := []string{"deleted_at IS NULL"}
	args := []any{}
	i := 1
	if p.Search != "" {
		where = append(where, fmt.Sprintf("(email ILIKE $%d OR username ILIKE $%d)", i, i))
		args = append(args, "%"+p.Search+"%")
		i++
	}
	if p.Status != "" {
		where = append(where, fmt.Sprintf("status = $%d", i))
		args = append(args, p.Status)
		i++
	}
	clause := strings.Join(where, " AND ")

	var total int64
	if err := s.pool.QueryRow(ctx,
		`SELECT count(*) FROM admins WHERE `+clause, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	args = append(args, p.Limit, p.Offset)
	rows, err := s.pool.Query(ctx,
		`SELECT `+adminColumns+` FROM admins WHERE `+clause+
			fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", i, i+1), args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	admins := []Admin{}
	for rows.Next() {
		a, err := scanAdmin(rows)
		if err != nil {
			return nil, 0, err
		}
		admins = append(admins, *a)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	if err := s.markSuperAdmins(ctx, admins); err != nil {
		return nil, 0, err
	}
	return admins, total, nil
}

// UpdateAdminParams holds optional fields to update on an admin.
type UpdateAdminParams struct {
	Username        *string
	Email           *string
	Status          *string
	DisplayName     *string
	AvatarURL       *string
	AvatarObjectKey *string
}

// UpdateAdmin applies the non-nil fields and returns the updated admin.
func (s *Store) UpdateAdmin(ctx ctx, id string, p UpdateAdminParams) (*Admin, error) {
	sets := []string{"updated_at = now()"}
	args := []any{}
	i := 1
	if p.Username != nil {
		sets = append(sets, fmt.Sprintf("username = $%d", i))
		args = append(args, *p.Username)
		i++
	}
	if p.Email != nil {
		sets = append(sets, fmt.Sprintf("email = $%d", i))
		args = append(args, *p.Email)
		i++
	}
	if p.Status != nil {
		sets = append(sets, fmt.Sprintf("status = $%d", i))
		args = append(args, *p.Status)
		i++
	}
	if p.DisplayName != nil {
		sets = append(sets, fmt.Sprintf("display_name = $%d", i))
		args = append(args, *p.DisplayName)
		i++
	}
	if p.AvatarURL != nil {
		sets = append(sets, fmt.Sprintf("avatar_url = $%d", i))
		args = append(args, *p.AvatarURL)
		i++
	}
	if p.AvatarObjectKey != nil {
		sets = append(sets, fmt.Sprintf("avatar_object_key = $%d", i))
		args = append(args, *p.AvatarObjectKey)
		i++
	}
	args = append(args, id)
	row := s.pool.QueryRow(ctx,
		`UPDATE admins SET `+strings.Join(sets, ", ")+
			fmt.Sprintf(" WHERE id = $%d AND deleted_at IS NULL RETURNING ", i)+adminColumns, args...)
	return scanAdmin(row)
}

// SetAdminStatus updates only the status column.
func (s *Store) SetAdminStatus(ctx ctx, id, status string) error {
	tag, err := s.pool.Exec(ctx,
		`UPDATE admins SET status = $1, updated_at = now()
		 WHERE id = $2 AND deleted_at IS NULL`, status, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// SoftDeleteAdmin marks an admin as deleted.
func (s *Store) SoftDeleteAdmin(ctx ctx, id string) error {
	tag, err := s.pool.Exec(ctx,
		`UPDATE admins SET deleted_at = now(), updated_at = now()
		 WHERE id = $1 AND deleted_at IS NULL`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// UpdatePassword sets a new password hash and clears the must-change flag.
func (s *Store) UpdatePassword(ctx ctx, id, hash string, mustChange bool) error {
	tag, err := s.pool.Exec(ctx,
		`UPDATE admins SET password_hash = $1, must_change_password = $2, updated_at = now()
		 WHERE id = $3 AND deleted_at IS NULL`, hash, mustChange, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// UpdateThemePreference persists an admin's theme choice.
func (s *Store) UpdateThemePreference(ctx ctx, id, theme string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE admins SET theme_preference = $1, updated_at = now()
		 WHERE id = $2 AND deleted_at IS NULL`, theme, id)
	return err
}

// UpdateLanguagePreference persists an admin's language choice.
func (s *Store) UpdateLanguagePreference(ctx ctx, id, language string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE admins SET language_preference = $1, updated_at = now()
		 WHERE id = $2 AND deleted_at IS NULL`, language, id)
	return err
}

// RecordSuccessfulLogin updates last_login_at and resets the failure counter.
func (s *Store) RecordSuccessfulLogin(ctx ctx, id string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE admins SET last_login_at = now(), failed_login_count = 0,
		 locked_until = NULL, updated_at = now() WHERE id = $1`, id)
	return err
}

// IsSuperAdmin reports whether an admin currently holds the super_admin role.
func (s *Store) IsSuperAdmin(ctx ctx, adminID string) (bool, error) {
	var ok bool
	err := s.pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM admin_roles ar
			JOIN roles r ON r.id = ar.role_id
			WHERE ar.admin_id = $1 AND r.slug = 'super_admin'
		)`, adminID).Scan(&ok)
	return ok, err
}

// RoleIDsContainSlug reports whether a list of role ids includes a role slug.
func (s *Store) RoleIDsContainSlug(ctx ctx, roleIDs []string, slug string) (bool, error) {
	if len(roleIDs) == 0 {
		return false, nil
	}
	var ok bool
	err := s.pool.QueryRow(ctx,
		`SELECT EXISTS (SELECT 1 FROM roles WHERE id = ANY($1) AND slug = $2)`,
		roleIDs, slug).Scan(&ok)
	return ok, err
}

// ActiveSuperAdminCount returns the number of active, non-deleted super admins.
func (s *Store) ActiveSuperAdminCount(ctx ctx) (int64, error) {
	var n int64
	err := s.pool.QueryRow(ctx, `
		SELECT count(DISTINCT a.id)
		FROM admins a
		JOIN admin_roles ar ON ar.admin_id = a.id
		JOIN roles r ON r.id = ar.role_id
		WHERE a.deleted_at IS NULL AND a.status = 'active' AND r.slug = 'super_admin'`).Scan(&n)
	return n, err
}

func (s *Store) markSuperAdmins(ctx ctx, admins []Admin) error {
	if len(admins) == 0 {
		return nil
	}
	ids := make([]string, 0, len(admins))
	for _, admin := range admins {
		ids = append(ids, admin.ID)
	}
	rows, err := s.pool.Query(ctx, `
		SELECT DISTINCT ar.admin_id
		FROM admin_roles ar
		JOIN roles r ON r.id = ar.role_id
		WHERE ar.admin_id = ANY($1) AND r.slug = 'super_admin'`, ids)
	if err != nil {
		return err
	}
	defer rows.Close()

	super := map[string]bool{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return err
		}
		super[id] = true
	}
	if err := rows.Err(); err != nil {
		return err
	}
	for i := range admins {
		admins[i].IsSuperAdmin = super[admins[i].ID]
	}
	return nil
}

// RestoreOrCreateBootstrapAdmin makes the configured bootstrap account active
// and bound to super_admin. It is used only when no active super admin exists.
func (s *Store) RestoreOrCreateBootstrapAdmin(ctx ctx, email, passwordHash, superRoleID string) (*Admin, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	row := tx.QueryRow(ctx,
		`UPDATE admins
		 SET username = $2, password_hash = $3, status = 'active',
		     failed_login_count = 0, locked_until = NULL, deleted_at = NULL,
		     must_change_password = FALSE, updated_at = now()
		 WHERE id = (
		   SELECT id FROM admins WHERE lower(email) = lower($1)
		   ORDER BY deleted_at IS NULL DESC, created_at ASC LIMIT 1
		 )
		 RETURNING `+adminColumns,
		email, email, passwordHash)
	admin, err := scanAdmin(row)
	if err != nil {
		if err != ErrNotFound {
			return nil, err
		}
		row = tx.QueryRow(ctx,
			`INSERT INTO admins (id, email, username, password_hash, status, must_change_password)
			 VALUES ($1, $2, $3, $4, 'active', FALSE)
			 RETURNING `+adminColumns,
			uuid.NewString(), email, email, passwordHash)
		admin, err = scanAdmin(row)
		if err != nil {
			return nil, err
		}
	}

	if _, err := tx.Exec(ctx,
		`INSERT INTO admin_roles (admin_id, role_id) VALUES ($1, $2)
		 ON CONFLICT DO NOTHING`, admin.ID, superRoleID); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	admin.IsSuperAdmin = true
	return admin, nil
}

// IncrementFailedLogin bumps the failure counter and locks the account once the
// threshold is exceeded. Returns the new failure count.
func (s *Store) IncrementFailedLogin(ctx ctx, id string, threshold int, lockMinutes int) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx,
		`UPDATE admins
		 SET failed_login_count = failed_login_count + 1,
		     locked_until = CASE WHEN failed_login_count + 1 >= $2
		         AND NOT EXISTS (
		             SELECT 1 FROM admin_roles ar
		             JOIN roles r ON r.id = ar.role_id
		             WHERE ar.admin_id = admins.id AND r.slug = 'super_admin'
		         )
		         THEN now() + ($3 || ' minutes')::interval ELSE locked_until END,
		     status = CASE WHEN failed_login_count + 1 >= $2 AND status = 'active'
		         AND NOT EXISTS (
		             SELECT 1 FROM admin_roles ar
		             JOIN roles r ON r.id = ar.role_id
		             WHERE ar.admin_id = admins.id AND r.slug = 'super_admin'
		         )
		         THEN 'locked' ELSE status END,
		     updated_at = now()
		 WHERE id = $1 RETURNING failed_login_count`,
		id, threshold, lockMinutes).Scan(&count)
	return count, err
}

// EffectivePermissions resolves the union of permission keys an admin holds via
// directly assigned roles.
func (s *Store) EffectivePermissions(ctx ctx, adminID string) (permissions.Set, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT DISTINCT p.key
		FROM permissions p
		JOIN role_permissions rp ON rp.permission_id = p.id
		WHERE rp.role_id IN (
			SELECT role_id FROM admin_roles WHERE admin_id = $1
		)
		UNION
		SELECT $2
		WHERE EXISTS (
			SELECT 1 FROM admin_roles ar
			JOIN roles r ON r.id = ar.role_id
			WHERE ar.admin_id = $1 AND r.slug = 'super_admin'
		)`, adminID, permissions.Wildcard)
	if err != nil {
		return permissions.Set{}, err
	}
	defer rows.Close()

	var keys []string
	for rows.Next() {
		var k string
		if err := rows.Scan(&k); err != nil {
			return permissions.Set{}, err
		}
		keys = append(keys, k)
	}
	return permissions.NewSet(keys), rows.Err()
}
