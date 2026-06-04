package store

import "encoding/json"

// GetAllSettings returns every settings row as a map keyed by setting key.
func (s *Store) GetAllSettings(ctx ctx) (map[string]map[string]any, error) {
	rows, err := s.pool.Query(ctx, `SELECT key, value FROM settings ORDER BY key`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]map[string]any{}
	for rows.Next() {
		var key string
		var raw []byte
		if err := rows.Scan(&key, &raw); err != nil {
			return nil, err
		}
		var val map[string]any
		if len(raw) > 0 {
			_ = json.Unmarshal(raw, &val)
		}
		out[key] = val
	}
	return out, rows.Err()
}

// UpsertSetting writes a single setting value.
func (s *Store) UpsertSetting(ctx ctx, key string, value map[string]any, updatedBy *string) error {
	raw, err := json.Marshal(value)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx,
		`INSERT INTO settings (key, value, updated_by, updated_at)
		 VALUES ($1, $2, $3, now())
		 ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value,
		   updated_by = EXCLUDED.updated_by, updated_at = now()`,
		key, raw, updatedBy)
	return err
}

// CountAdmins returns the number of non-deleted admins (used by bootstrap).
func (s *Store) CountAdmins(ctx ctx) (int64, error) {
	var n int64
	err := s.pool.QueryRow(ctx, `SELECT count(*) FROM admins WHERE deleted_at IS NULL`).Scan(&n)
	return n, err
}
