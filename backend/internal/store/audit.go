package store

import (
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
)

// AuditEntry holds inputs for appending an audit log row.
type AuditEntry struct {
	ActorAdminID *string
	ActorLabel   string
	Action       string
	ResourceType string
	ResourceID   string
	Changes      map[string]any
	Status       string
	IP           string
	UserAgent    string
	RequestID    string
}

// AppendAudit writes an append-only audit log row. Errors are returned so the
// caller can log them, but audit writes should never block the main flow.
func (s *Store) AppendAudit(ctx ctx, e AuditEntry) error {
	changes := e.Changes
	if changes == nil {
		changes = map[string]any{}
	}
	raw, err := json.Marshal(changes)
	if err != nil {
		return err
	}
	status := e.Status
	if status == "" {
		status = "success"
	}
	_, err = s.pool.Exec(ctx,
		`INSERT INTO audit_logs
		 (id, actor_admin_id, actor_label, action, resource_type, resource_id, changes, status, ip, user_agent, request_id)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		uuid.NewString(), e.ActorAdminID, e.ActorLabel, e.Action, e.ResourceType, e.ResourceID,
		raw, status, e.IP, e.UserAgent, e.RequestID)
	return err
}

// ListAuditParams holds filters for querying audit logs.
type ListAuditParams struct {
	Action       string
	ResourceType string
	ActorID      string
	Status       string
	Limit        int
	Offset       int
}

// ListAudit returns a filtered page of audit logs, newest first.
func (s *Store) ListAudit(ctx ctx, p ListAuditParams) ([]AuditLog, int64, error) {
	where := "1=1"
	args := []any{}
	add := func(cond string, val any) {
		args = append(args, val)
		where += fmt.Sprintf(" AND %s = $%d", cond, len(args))
	}
	if p.Action != "" {
		add("action", p.Action)
	}
	if p.ResourceType != "" {
		add("resource_type", p.ResourceType)
	}
	if p.ActorID != "" {
		add("actor_admin_id", p.ActorID)
	}
	if p.Status != "" {
		add("status", p.Status)
	}

	var total int64
	if err := s.pool.QueryRow(ctx, `SELECT count(*) FROM audit_logs WHERE `+where, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	args = append(args, p.Limit, p.Offset)
	rows, err := s.pool.Query(ctx, fmt.Sprintf(
		`SELECT id, actor_admin_id, actor_label, action, resource_type, resource_id,
		        changes, status, ip, user_agent, request_id, created_at
		 FROM audit_logs WHERE %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`,
		where, len(args)-1, len(args)), args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	out := []AuditLog{}
	for rows.Next() {
		l, err := scanAudit(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, *l)
	}
	return out, total, rows.Err()
}

// GetAudit loads a single audit log entry.
func (s *Store) GetAudit(ctx ctx, id string) (*AuditLog, error) {
	return scanAudit(s.pool.QueryRow(ctx,
		`SELECT id, actor_admin_id, actor_label, action, resource_type, resource_id,
		        changes, status, ip, user_agent, request_id, created_at
		 FROM audit_logs WHERE id = $1`, id))
}

func scanAudit(row interface{ Scan(...any) error }) (*AuditLog, error) {
	var l AuditLog
	var raw []byte
	if err := row.Scan(&l.ID, &l.ActorAdminID, &l.ActorLabel, &l.Action,
		&l.ResourceType, &l.ResourceID, &raw, &l.Status, &l.IP, &l.UserAgent,
		&l.RequestID, &l.CreatedAt); err != nil {
		return nil, mapErr(err)
	}
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &l.Changes)
	}
	if l.Changes == nil {
		l.Changes = map[string]any{}
	}
	return &l, nil
}
