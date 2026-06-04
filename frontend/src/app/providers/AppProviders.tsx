import type { ReactNode } from 'react';
import { ThemeProvider } from '@/foundation/theme';
import { ToastProvider } from '@/foundation/ui';
import { QueryProvider } from './QueryProvider';

/** Composes all app-level providers in the correct order. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <ToastProvider>{children}</ToastProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}
