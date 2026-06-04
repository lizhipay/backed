package db

import (
	"context"
	"fmt"
	"io/fs"
	"sort"
	"strings"

	"github.com/backed/backend/migrations"
	"github.com/jackc/pgx/v5/pgxpool"
)

type migration struct {
	name string
	up   string
}

// Migrate applies all pending up migrations in lexical filename order. Each
// applied migration name is recorded in schema_migrations so reruns are safe.
// Migration SQL itself uses CREATE IF NOT EXISTS semantics to stay
// non-destructive even if the tracking table is reset.
func Migrate(ctx context.Context, pool *pgxpool.Pool) error {
	if _, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version    TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)`); err != nil {
		return fmt.Errorf("ensure schema_migrations: %w", err)
	}

	all, err := loadMigrations()
	if err != nil {
		return err
	}

	applied, err := appliedVersions(ctx, pool)
	if err != nil {
		return err
	}

	for _, m := range all {
		if applied[m.name] {
			continue
		}
		if err := applyOne(ctx, pool, m); err != nil {
			return fmt.Errorf("apply %s: %w", m.name, err)
		}
	}
	return nil
}

func applyOne(ctx context.Context, pool *pgxpool.Pool, m migration) error {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx, m.up); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx,
		`INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING`,
		m.name); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func appliedVersions(ctx context.Context, pool *pgxpool.Pool) (map[string]bool, error) {
	rows, err := pool.Query(ctx, `SELECT version FROM schema_migrations`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	applied := map[string]bool{}
	for rows.Next() {
		var v string
		if err := rows.Scan(&v); err != nil {
			return nil, err
		}
		applied[v] = true
	}
	return applied, rows.Err()
}

// loadMigrations reads embedded SQL files and extracts the +goose Up section.
func loadMigrations() ([]migration, error) {
	entries, err := fs.ReadDir(migrations.Files, ".")
	if err != nil {
		return nil, fmt.Errorf("read migrations: %w", err)
	}

	var names []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
			names = append(names, e.Name())
		}
	}
	sort.Strings(names)

	out := make([]migration, 0, len(names))
	for _, name := range names {
		raw, err := fs.ReadFile(migrations.Files, name)
		if err != nil {
			return nil, err
		}
		out = append(out, migration{name: name, up: extractUp(string(raw))})
	}
	return out, nil
}

// extractUp returns the SQL between "-- +goose Up" and "-- +goose Down".
// If no goose markers are present the entire file is treated as the up body.
func extractUp(content string) string {
	upIdx := strings.Index(content, "-- +goose Up")
	if upIdx == -1 {
		return content
	}
	body := content[upIdx+len("-- +goose Up"):]
	if downIdx := strings.Index(body, "-- +goose Down"); downIdx != -1 {
		body = body[:downIdx]
	}
	return strings.TrimSpace(body)
}
