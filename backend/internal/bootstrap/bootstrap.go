package bootstrap

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"github.com/backed/backend/internal/auth"
	"github.com/backed/backend/internal/config"
	"github.com/backed/backend/internal/permissions"
	"github.com/backed/backend/internal/store"
)

// Run seeds the permission catalog, baseline system roles, and optionally the
// first administrator. It is idempotent and never stores plaintext secrets.
func Run(ctx context.Context, log *slog.Logger, cfg *config.Config, st *store.Store) error {
	for _, p := range permissions.All() {
		if err := st.UpsertPermission(ctx, p.Key, p.Resource, p.Action, p.Category, p.Description); err != nil {
			return fmt.Errorf("seed permission %s: %w", p.Key, err)
		}
	}

	super, err := ensureRole(ctx, st, "Super Admin", "super_admin", "Full system access", true)
	if err != nil {
		return err
	}
	admin, err := ensureRole(ctx, st, "Admin", "admin", "Standard administrator", true)
	if err != nil {
		return err
	}
	readonly, err := ensureRole(ctx, st, "Read Only", "readonly", "Read-only administrator", true)
	if err != nil {
		return err
	}

	for _, key := range permissions.Keys() {
		if err := st.AssignRolePermissionByKey(ctx, admin.ID, key); err != nil {
			return fmt.Errorf("grant admin %s: %w", key, err)
		}
	}
	for _, key := range []string{
		permissions.AdminsView,
		permissions.RolesView,
		permissions.PermissionsView,
		permissions.AuditLogsView,
		permissions.SessionsView,
		permissions.SettingsView,
	} {
		if err := st.AssignRolePermissionByKey(ctx, readonly.ID, key); err != nil {
			return fmt.Errorf("grant readonly %s: %w", key, err)
		}
	}

	activeSuperAdmins, err := st.ActiveSuperAdminCount(ctx)
	if err != nil {
		return fmt.Errorf("count active super admins: %w", err)
	}
	if activeSuperAdmins > 0 {
		return nil
	}
	if cfg.BootstrapEmail == "" || cfg.BootstrapPassword == "" {
		log.Warn("no active super administrators exist and bootstrap env is not set")
		return nil
	}

	hash, err := auth.HashPassword(cfg.BootstrapPassword)
	if err != nil {
		return fmt.Errorf("hash bootstrap password: %w", err)
	}
	first, err := st.RestoreOrCreateBootstrapAdmin(ctx, cfg.BootstrapEmail, hash, super.ID)
	if err != nil {
		return fmt.Errorf("restore bootstrap admin: %w", err)
	}
	if err := st.AppendAudit(ctx, store.AuditEntry{
		ActorLabel:   "bootstrap",
		Action:       "bootstrap.super_admin_recovered",
		ResourceType: "admin",
		ResourceID:   first.ID,
		Status:       "success",
	}); err != nil {
		log.Error("record bootstrap recovery audit", "err", err)
	}
	log.Info("bootstrap administrator restored", "email", cfg.BootstrapEmail)
	return nil
}

func ensureRole(ctx context.Context, st *store.Store, name, slug, description string, system bool) (*store.Role, error) {
	role, err := st.GetRoleBySlug(ctx, slug)
	if err == nil {
		return role, nil
	}
	if !errors.Is(err, store.ErrNotFound) {
		return nil, err
	}
	return st.CreateRole(ctx, name, slug, description, system)
}
