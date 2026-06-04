import type { ReactNode } from 'react';
import { usePermissions } from './usePermissions';

interface CanProps {
  /** Single permission key. */
  perm?: string;
  /** Any of these grants access. */
  anyOf?: string[];
  /** All of these are required. */
  allOf?: string[];
  children: ReactNode;
  /** Rendered when the check fails (default: nothing). */
  fallback?: ReactNode;
}

/**
 * Conditional renderer for permission-gated UI. Use to hide buttons/sections
 * the user can't act on. Server still enforces; this is presentation only.
 */
export function Can({
  perm,
  anyOf,
  allOf,
  children,
  fallback = null,
}: CanProps) {
  const { has, hasAny, hasAll } = usePermissions();

  let allowed = true;
  if (perm) allowed = allowed && has(perm);
  if (anyOf) allowed = allowed && hasAny(anyOf);
  if (allOf) allowed = allowed && hasAll(allOf);

  return <>{allowed ? children : fallback}</>;
}
