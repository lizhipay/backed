import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { tokenStore } from '@/foundation/api/tokenStore';
import type { LoginRequest, LoginResult } from '@/foundation/api/types';
import { useLanguageStore } from '@/foundation/i18n';
import { authApi } from './authApi';
import { useAuthStore } from './authStore';

/**
 * Imperative auth actions. `login` exchanges credentials for tokens then
 * hydrates the identity store; `logout` revokes server-side, clears tokens and
 * cached queries. Components read identity via useAuthStore selectors.
 */
export function useAuth() {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((s) => s.setSession);
  const clear = useAuthStore((s) => s.clear);

  const hydrateSession = useCallback(
    async (res: Extract<LoginResult, { kind: 'authenticated' }>) => {
      tokenStore.set(res.accessToken);
      const [me, permissions] = await Promise.all([
        authApi.me(),
        authApi.myPermissions(),
      ]);
      useLanguageStore.getState().setPreference(me.languagePreference);
      setSession(me, permissions);
      return me;
    },
    [setSession],
  );

  const login = useCallback(
    async (credentials: LoginRequest) => {
      const res = await authApi.login(credentials);
      if (res.kind === 'mfa_required') return res;
      return { kind: 'authenticated' as const, me: await hydrateSession(res) };
    },
    [hydrateSession],
  );

  const verifyMfa = useCallback(
    async (body: { mfa_token: string; code?: string; recovery_code?: string }) => {
      const res = await authApi.verifyMfa(body);
      if (res.kind === 'mfa_required') return res;
      return { kind: 'authenticated' as const, me: await hydrateSession(res) };
    },
    [hydrateSession],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // best-effort; clear locally regardless
    }
    tokenStore.clear();
    clear();
    queryClient.clear();
  }, [clear, queryClient]);

  return { login, verifyMfa, logout };
}
