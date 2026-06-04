package permissions

// Permission keys are stable identifiers checked by the backend on every
// protected route. The frontend uses the same keys to show or hide controls,
// but the backend is always authoritative.
const (
	AdminsView    = "admins.view"
	AdminsCreate  = "admins.create"
	AdminsUpdate  = "admins.update"
	AdminsDelete  = "admins.delete"
	AdminsDisable = "admins.disable"

	RolesView              = "roles.view"
	RolesCreate            = "roles.create"
	RolesUpdate            = "roles.update"
	RolesDelete            = "roles.delete"
	RolesAssignPermissions = "roles.assign_permissions"

	PermissionsView = "permissions.view"

	AuditLogsView = "audit_logs.view"

	SessionsView   = "sessions.view"
	SessionsRevoke = "sessions.revoke"

	SettingsView   = "settings.view"
	SettingsUpdate = "settings.update"
)

// Catalog entry describes a single permission for seeding and the meta endpoint.
type Catalog struct {
	Key         string
	Resource    string
	Action      string
	Category    string
	Description string
}

// All returns the full permission catalog. This is the single source of truth
// seeded into the permissions table on startup.
func All() []Catalog {
	return []Catalog{
		{AdminsView, "admins", "view", "Access Control", "View administrators"},
		{AdminsCreate, "admins", "create", "Access Control", "Create administrators"},
		{AdminsUpdate, "admins", "update", "Access Control", "Update administrators"},
		{AdminsDelete, "admins", "delete", "Access Control", "Delete administrators"},
		{AdminsDisable, "admins", "disable", "Access Control", "Enable or disable administrators"},

		{RolesView, "roles", "view", "Access Control", "View roles"},
		{RolesCreate, "roles", "create", "Access Control", "Create roles"},
		{RolesUpdate, "roles", "update", "Access Control", "Update roles"},
		{RolesDelete, "roles", "delete", "Access Control", "Delete roles"},
		{RolesAssignPermissions, "roles", "assign_permissions", "Access Control", "Assign permissions to roles"},

		{PermissionsView, "permissions", "view", "Access Control", "View the permission catalog"},

		{AuditLogsView, "audit_logs", "view", "Security", "View audit logs"},

		{SessionsView, "sessions", "view", "Security", "View sessions"},
		{SessionsRevoke, "sessions", "revoke", "Security", "Revoke sessions / force logout"},

		{SettingsView, "settings", "view", "System", "View system settings"},
		{SettingsUpdate, "settings", "update", "System", "Update system settings"},
	}
}

// Keys returns just the permission key strings from the catalog.
func Keys() []string {
	all := All()
	keys := make([]string, len(all))
	for i, c := range all {
		keys[i] = c.Key
	}
	return keys
}
