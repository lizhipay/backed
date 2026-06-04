/**
 * Stable permission keys, mirrored from the backend. The backend remains the
 * source of truth and re-checks every request; the frontend only uses these to
 * hide/disable UI affordances the user can't act on.
 */
export const PERMISSIONS = {
  adminsView: 'admins.view',
  adminsCreate: 'admins.create',
  adminsUpdate: 'admins.update',
  adminsDelete: 'admins.delete',
  adminsDisable: 'admins.disable',

  rolesView: 'roles.view',
  rolesCreate: 'roles.create',
  rolesUpdate: 'roles.update',
  rolesDelete: 'roles.delete',
  rolesAssignPermissions: 'roles.assign_permissions',

  permissionsView: 'permissions.view',

  sessionsView: 'sessions.view',
  sessionsRevoke: 'sessions.revoke',

  auditLogsView: 'audit_logs.view',

  settingsView: 'settings.view',
  settingsUpdate: 'settings.update',
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Grouping used by the permission matrix. */
export const PERMISSION_CATEGORIES: {
  label: string;
  resource: string;
  keys: PermissionKey[];
}[] = [
  {
    label: 'Admins',
    resource: 'admins',
    keys: [
      PERMISSIONS.adminsView,
      PERMISSIONS.adminsCreate,
      PERMISSIONS.adminsUpdate,
      PERMISSIONS.adminsDelete,
      PERMISSIONS.adminsDisable,
    ],
  },
  {
    label: 'Roles',
    resource: 'roles',
    keys: [
      PERMISSIONS.rolesView,
      PERMISSIONS.rolesCreate,
      PERMISSIONS.rolesUpdate,
      PERMISSIONS.rolesDelete,
      PERMISSIONS.rolesAssignPermissions,
    ],
  },
  {
    label: 'Sessions',
    resource: 'sessions',
    keys: [PERMISSIONS.sessionsView, PERMISSIONS.sessionsRevoke],
  },
  {
    label: 'Audit',
    resource: 'audit_logs',
    keys: [PERMISSIONS.auditLogsView],
  },
  {
    label: 'Settings',
    resource: 'settings',
    keys: [PERMISSIONS.settingsView, PERMISSIONS.settingsUpdate],
  },
];

export function actionLabel(key: string): string {
  const action = key.split('.')[1] ?? key;
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
