import type { ReactNode } from 'react';
import { usePermissions } from '@/foundation/permissions';
import { PermissionDenied } from '@/foundation/ui';

/**
 * Page-level permission gate. Renders the access-denied state in place of the
 * page when the user lacks the required permission. The server still enforces.
 */
export function RequirePermission({
  perm,
  children,
}: {
  perm?: string;
  children: ReactNode;
}) {
  const { has } = usePermissions();
  if (perm && !has(perm)) {
    return <PermissionDenied />;
  }
  return <>{children}</>;
}
