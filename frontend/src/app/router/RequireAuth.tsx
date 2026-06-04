import { useEffect, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useTokenStore, setUnauthorizedHandler } from '@/foundation/api';
import { useAuthStore, useBootstrapSession } from '@/foundation/auth';
import { LoadingState } from '@/foundation/ui';

/**
 * Gate for authenticated routes. Triggers the /me bootstrap, shows a spinner
 * until it resolves, then either renders children or redirects to /login
 * (preserving the attempted location for post-login return).
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation();
  const accessToken = useTokenStore((s) => s.accessToken);
  const me = useAuthStore((s) => s.me);
  const initialized = useAuthStore((s) => s.initialized);

  useBootstrapSession();

  useEffect(() => {
    setUnauthorizedHandler(() => {
      useTokenStore.getState().clear();
      useAuthStore.getState().clear();
    });
  }, []);

  if (!initialized) {
    return <LoadingState minHeight="100vh" />;
  }

  if (!accessToken || !me) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
