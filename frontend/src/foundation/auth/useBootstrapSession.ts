import { useEffect } from 'react';
import { tokenStore, useTokenStore } from '@/foundation/api/tokenStore';
import { useLanguageStore } from '@/foundation/i18n';
import { authApi } from './authApi';
import { useAuthStore } from './authStore';

export function useBootstrapSession() {
  const accessToken = useTokenStore((s) => s.accessToken);
  const setSession = useAuthStore((s) => s.setSession);
  const setInitialized = useAuthStore((s) => s.setInitialized);
  const clear = useAuthStore((s) => s.clear);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setInitialized(false);
      try {
        if (!tokenStore.access) {
          const refreshed = await authApi.refresh();
          tokenStore.set(refreshed.accessToken);
        }
        const [me, permissions] = await Promise.all([
          authApi.me(),
          authApi.myPermissions(),
        ]);
        useLanguageStore.getState().setPreference(me.languagePreference);
        if (!cancelled) setSession(me, permissions);
      } catch {
        tokenStore.clear();
        if (!cancelled) clear();
      } finally {
        if (!cancelled) setInitialized(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, clear, setInitialized, setSession]);
}
