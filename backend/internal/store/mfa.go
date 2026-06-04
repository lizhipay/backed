package store

import (
	"time"

	"github.com/google/uuid"
)

// SetMFASecret stores (or clears) the encrypted MFA secret for an admin without
// changing the enabled flag. Used during enrollment before confirmation.
func (s *Store) SetMFASecret(ctx ctx, adminID, encryptedSecret string) error {
	tag, err := s.pool.Exec(ctx,
		`UPDATE admins SET mfa_secret = $1, updated_at = now()
		 WHERE id = $2 AND deleted_at IS NULL`, encryptedSecret, adminID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// EnableMFAParams carries the inputs for atomically enabling MFA.
type EnableMFAParams struct {
	AdminID            string
	EncryptedSecret    string
	RecoveryCodeHashes []string
}

// EnableMFA flips mfa_enabled on, persists the encrypted secret, and replaces
// any prior recovery codes with the supplied hashes, all in one transaction.
func (s *Store) EnableMFA(ctx ctx, p EnableMFAParams) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx,
		`UPDATE admins SET mfa_enabled = TRUE, mfa_secret = $1, updated_at = now()
		 WHERE id = $2 AND deleted_at IS NULL`, p.EncryptedSecret, p.AdminID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}

	if _, err := tx.Exec(ctx,
		`DELETE FROM mfa_recovery_codes WHERE admin_id = $1`, p.AdminID); err != nil {
		return err
	}
	for _, h := range p.RecoveryCodeHashes {
		if _, err := tx.Exec(ctx,
			`INSERT INTO mfa_recovery_codes (id, admin_id, code_hash) VALUES ($1, $2, $3)`,
			uuid.NewString(), p.AdminID, h); err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

// DisableMFA clears the enabled flag, secret, and all recovery codes.
func (s *Store) DisableMFA(ctx ctx, adminID string) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx,
		`UPDATE admins SET mfa_enabled = FALSE, mfa_secret = NULL, updated_at = now()
		 WHERE id = $1 AND deleted_at IS NULL`, adminID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	if _, err := tx.Exec(ctx,
		`DELETE FROM mfa_recovery_codes WHERE admin_id = $1`, adminID); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// ConsumeRecoveryCode marks the first unused recovery code matching one of the
// candidate hashes as consumed. It reports whether a code was consumed. The
// match is performed in the database so timing does not depend on code order.
func (s *Store) ConsumeRecoveryCode(ctx ctx, adminID string, candidateHashes []string) (bool, error) {
	if len(candidateHashes) == 0 {
		return false, nil
	}
	tag, err := s.pool.Exec(ctx, `
		UPDATE mfa_recovery_codes SET consumed_at = now()
		WHERE id = (
			SELECT id FROM mfa_recovery_codes
			WHERE admin_id = $1 AND consumed_at IS NULL AND code_hash = ANY($2)
			ORDER BY created_at LIMIT 1
		)`, adminID, candidateHashes)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}

// CountActiveRecoveryCodes returns how many unused recovery codes remain.
func (s *Store) CountActiveRecoveryCodes(ctx ctx, adminID string) (int, error) {
	var n int
	err := s.pool.QueryRow(ctx,
		`SELECT count(*) FROM mfa_recovery_codes
		 WHERE admin_id = $1 AND consumed_at IS NULL`, adminID).Scan(&n)
	return n, err
}

// CreateMFAChallenge stores a single-use challenge keyed by a token hash.
func (s *Store) CreateMFAChallenge(ctx ctx, adminID, tokenHash string, expiresAt time.Time, ip, ua string) (string, error) {
	var id string
	err := s.pool.QueryRow(ctx,
		`INSERT INTO mfa_challenges (id, admin_id, token_hash, expires_at, ip, user_agent)
		 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
		uuid.NewString(), adminID, tokenHash, expiresAt, ip, ua).Scan(&id)
	return id, err
}

// MFAChallenge mirrors a row in the mfa_challenges table.
type MFAChallenge struct {
	ID         string
	AdminID    string
	ExpiresAt  time.Time
	ConsumedAt *time.Time
}

// ConsumeMFAChallenge atomically marks an unconsumed, unexpired challenge as
// consumed and returns it. ErrNotFound means no usable challenge matched.
func (s *Store) ConsumeMFAChallenge(ctx ctx, tokenHash string) (*MFAChallenge, error) {
	var c MFAChallenge
	err := s.pool.QueryRow(ctx, `
		UPDATE mfa_challenges SET consumed_at = now()
		WHERE token_hash = $1 AND consumed_at IS NULL AND expires_at > now()
		RETURNING id, admin_id, expires_at, consumed_at`, tokenHash).
		Scan(&c.ID, &c.AdminID, &c.ExpiresAt, &c.ConsumedAt)
	if err != nil {
		return nil, mapErr(err)
	}
	return &c, nil
}
