import {
  Navigate,
  RouterProvider,
  createBrowserRouter,
  type RouteObject,
} from 'react-router-dom';
import { AppShell } from '@/foundation/layout';
import type { NavSection } from '@/foundation/layout/navConfig';
import { PERMISSIONS } from '@/foundation/permissions';
import { LoginPage } from '@/features/auth/LoginPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import {
  AdminsPage,
  PermissionsPage,
  RolesPage,
} from '@/features/access/AccessPages';
import { AuditLogsPage, SessionsPage } from '@/features/security/SecurityPages';
import { ProfilePage, SettingsPage } from '@/features/system/SystemPages';
import { NotFoundPage } from '@/features/errors/ErrorPages';
import { RequireAuth } from './RequireAuth';
import { RequirePermission } from './RequirePermission';

const featureModules = import.meta.glob<{
  extraRoutes: RouteObject[];
  extraSection: NavSection;
}>('../../*/index.tsx', { eager: true });

const extraModules = Object.values(featureModules);
const extraRoutes = extraModules.flatMap((module) => module.extraRoutes ?? []);
const extraSection = extraModules.find(
  (module) => module.extraSection,
)?.extraSection;

function normalizeBasename(value?: string) {
  if (!value || value === '/') return undefined;
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  return withLeadingSlash.replace(/\/+$/, '');
}

const routes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell extraSection={extraSection} />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      {
        path: 'admins',
        element: (
          <RequirePermission perm={PERMISSIONS.adminsView}>
            <AdminsPage />
          </RequirePermission>
        ),
      },
      {
        path: 'roles',
        element: (
          <RequirePermission perm={PERMISSIONS.rolesView}>
            <RolesPage />
          </RequirePermission>
        ),
      },
      {
        path: 'permissions',
        element: (
          <RequirePermission perm={PERMISSIONS.permissionsView}>
            <PermissionsPage />
          </RequirePermission>
        ),
      },
      {
        path: 'sessions',
        element: (
          <RequirePermission perm={PERMISSIONS.sessionsView}>
            <SessionsPage />
          </RequirePermission>
        ),
      },
      {
        path: 'audit-logs',
        element: (
          <RequirePermission perm={PERMISSIONS.auditLogsView}>
            <AuditLogsPage />
          </RequirePermission>
        ),
      },
      {
        path: 'settings',
        element: (
          <RequirePermission perm={PERMISSIONS.settingsView}>
            <SettingsPage />
          </RequirePermission>
        ),
      },
      { path: 'profile', element: <ProfilePage /> },
      ...extraRoutes,
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

const router = createBrowserRouter(routes, {
  basename: normalizeBasename(import.meta.env.VITE_ADMIN_BASE),
});

export function AppRouter() {
  return <RouterProvider router={router} />;
}
