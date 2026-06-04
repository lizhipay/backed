package auth

import (
	"context"

	"github.com/backed/backend/internal/permissions"
)

type ctxKey int

const principalKey ctxKey = iota

// Principal is the authenticated admin attached to a request context.
type Principal struct {
	AdminID     string
	Email       string
	Username    string
	Status      string
	SessionID   string
	JTI         string
	Permissions permissions.Set
}

// WithPrincipal returns a child context carrying the principal.
func WithPrincipal(ctx context.Context, p *Principal) context.Context {
	return context.WithValue(ctx, principalKey, p)
}

// PrincipalFrom extracts the principal from the context, if present.
func PrincipalFrom(ctx context.Context) (*Principal, bool) {
	p, ok := ctx.Value(principalKey).(*Principal)
	return p, ok
}
