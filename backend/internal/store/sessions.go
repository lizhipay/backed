package store

import (
	"time"

	"github.com/google/uuid"
)

// CreateSessionParams holds inputs for opening a session.
type CreateSessionParams struct {
	AdminID          string
	RefreshTokenHash string
	AccessJTI        string
	UserAgent        string
	IP               string
	ExpiresAt        time.Time
}

// CreateSession opens a new session row and returns its id.
func (s *Store) CreateSession(ctx ctx, p CreateSessionParams) (string, error) {
	var id string
	err := s.pool.QueryRow(ctx,
		`INSERT INTO sessions (id, admin_id, refresh_token_hash, access_jti, user_agent, ip, expires_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
		uuid.NewString(), p.AdminID, p.RefreshTokenHash, p.AccessJTI, p.UserAgent, p.IP, p.ExpiresAt).Scan(&id)
	return id, err
}

// GetSessionByRefreshHash loads an active session by its refresh token hash.
func (s *Store) GetSessionByRefreshHash(ctx ctx, hash string) (*Session, error) {
	var sess Session
	err := s.pool.QueryRow(ctx,
		`SELECT id, admin_id, access_jti, user_agent, ip, expires_at, last_seen_at,
		        revoked_at, revoked_reason, created_at
		 FROM sessions WHERE refresh_token_hash = $1`, hash).
		Scan(&sess.ID, &sess.AdminID, &sess.AccessJTI, &sess.UserAgent, &sess.IP,
			&sess.ExpiresAt, &sess.LastSeenAt, &sess.RevokedAt, &sess.RevokedReason, &sess.CreatedAt)
	if err != nil {
		return nil, mapErr(err)
	}
	return &sess, nil
}

// RotateSession updates the refresh hash, access jti, and expiry on refresh.
func (s *Store) RotateSession(ctx ctx, id, newHash, newJTI string, expiresAt time.Time) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE sessions SET refresh_token_hash = $1, access_jti = $2,
		 expires_at = $3, last_seen_at = now() WHERE id = $4`,
		newHash, newJTI, expiresAt, id)
	return err
}

// ListSessionsForAdmin returns sessions for an admin, newest first.
func (s *Store) ListSessionsForAdmin(ctx ctx, adminID string, activeOnly bool) ([]Session, error) {
	query := `SELECT id, admin_id, access_jti, user_agent, ip, expires_at, last_seen_at,
	                 revoked_at, revoked_reason, created_at
	          FROM sessions WHERE admin_id = $1`
	if activeOnly {
		query += ` AND revoked_at IS NULL AND expires_at > now()`
	}
	query += ` ORDER BY last_seen_at DESC`
	rows, err := s.pool.Query(ctx, query, adminID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Session{}
	for rows.Next() {
		var sess Session
		if err := rows.Scan(&sess.ID, &sess.AdminID, &sess.AccessJTI, &sess.UserAgent,
			&sess.IP, &sess.ExpiresAt, &sess.LastSeenAt, &sess.RevokedAt,
			&sess.RevokedReason, &sess.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, sess)
	}
	return out, rows.Err()
}

// ListSessions returns all sessions, newest first.
func (s *Store) ListSessions(ctx ctx, activeOnly bool) ([]Session, error) {
	query := `SELECT id, admin_id, access_jti, user_agent, ip, expires_at, last_seen_at,
	                 revoked_at, revoked_reason, created_at
	          FROM sessions WHERE 1=1`
	if activeOnly {
		query += ` AND revoked_at IS NULL AND expires_at > now()`
	}
	query += ` ORDER BY last_seen_at DESC LIMIT 200`
	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Session{}
	for rows.Next() {
		var sess Session
		if err := rows.Scan(&sess.ID, &sess.AdminID, &sess.AccessJTI, &sess.UserAgent,
			&sess.IP, &sess.ExpiresAt, &sess.LastSeenAt, &sess.RevokedAt,
			&sess.RevokedReason, &sess.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, sess)
	}
	return out, rows.Err()
}

// GetSession loads a session by id.
func (s *Store) GetSession(ctx ctx, id string) (*Session, error) {
	var sess Session
	err := s.pool.QueryRow(ctx,
		`SELECT id, admin_id, access_jti, user_agent, ip, expires_at, last_seen_at,
		        revoked_at, revoked_reason, created_at
		 FROM sessions WHERE id = $1`, id).
		Scan(&sess.ID, &sess.AdminID, &sess.AccessJTI, &sess.UserAgent, &sess.IP,
			&sess.ExpiresAt, &sess.LastSeenAt, &sess.RevokedAt, &sess.RevokedReason, &sess.CreatedAt)
	if err != nil {
		return nil, mapErr(err)
	}
	return &sess, nil
}

// RevokeSession marks a single session revoked.
func (s *Store) RevokeSession(ctx ctx, id, reason string) error {
	tag, err := s.pool.Exec(ctx,
		`UPDATE sessions SET revoked_at = now(), revoked_reason = $2
		 WHERE id = $1 AND revoked_at IS NULL`, id, reason)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// RevokeAllSessions revokes every active session for an admin (force logout).
func (s *Store) RevokeAllSessions(ctx ctx, adminID, reason string) (int64, error) {
	tag, err := s.pool.Exec(ctx,
		`UPDATE sessions SET revoked_at = now(), revoked_reason = $2
		 WHERE admin_id = $1 AND revoked_at IS NULL`, adminID, reason)
	if err != nil {
		return 0, err
	}
	return tag.RowsAffected(), nil
}

// TouchSession updates last_seen_at for an active session.
func (s *Store) TouchSession(ctx ctx, id string) {
	_, _ = s.pool.Exec(ctx, `UPDATE sessions SET last_seen_at = now() WHERE id = $1`, id)
}

// RecordLoginAttempt appends a login attempt row.
func (s *Store) RecordLoginAttempt(ctx ctx, identifier string, success bool, ip, ua string) {
	_, _ = s.pool.Exec(ctx,
		`INSERT INTO login_attempts (id, identifier, success, ip, user_agent)
		 VALUES ($1, $2, $3, $4, $5)`, uuid.NewString(), identifier, success, ip, ua)
}
