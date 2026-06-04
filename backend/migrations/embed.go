// Package migrations holds the canonical SQL schema migrations and embeds them
// so the API binary can apply them on startup without external files.
package migrations

import "embed"

// Files contains every .sql migration in this directory, applied in filename
// order. Migrations use CREATE IF NOT EXISTS semantics and are non-destructive.
//
//go:embed *.sql
var Files embed.FS
