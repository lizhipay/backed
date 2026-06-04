import { useMemo } from 'react';
import { useAuthStore } from '@/foundation/auth/authStore';

/**
 * Reads the current admin's effective permission set. `has` accepts one key,
 * `hasAny`/`hasAll` accept several. super_admin is represented by holding the
 * wildcard "*" permission, which short-circuits every check.
 */
export function usePermissions() {
  const permissions = useAuthStore((s) => s.permissions);

  return useMemo(() => {
    const isSuper = permissions.has('*');
    const has = (key: string) => isSuper || permissions.has(key);
    const hasAny = (keys: string[]) =>
      isSuper || keys.some((k) => permissions.has(k));
    const hasAll = (keys: string[]) =>
      isSuper || keys.every((k) => permissions.has(k));
    return { has, hasAny, hasAll, isSuper, all: permissions };
  }, [permissions]);
}

export function useHasPermission(key: string): boolean {
  const { has } = usePermissions();
  return has(key);
}
