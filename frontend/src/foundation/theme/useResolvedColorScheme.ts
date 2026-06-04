import { useEffect, useState } from 'react';
import { useThemeStore, type ThemeMode } from './themeStore';

function getSystemScheme(): 'dark' | 'light' {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * Resolves the user's `mode` preference to a concrete scheme. In "auto" it
 * follows `prefers-color-scheme` and updates live when the OS theme changes.
 * Auto never overrides an explicit user choice — only "auto" listens to the OS.
 */
export function useResolvedColorScheme(): {
  mode: ThemeMode;
  resolved: 'dark' | 'light';
  systemScheme: 'dark' | 'light';
} {
  const mode = useThemeStore((s) => s.mode);
  const [systemScheme, setSystemScheme] = useState<'dark' | 'light'>(
    getSystemScheme,
  );

  useEffect(() => {
    if (!window.matchMedia) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemScheme(mql.matches ? 'dark' : 'light');
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  const resolved = mode === 'auto' ? systemScheme : mode;
  return { mode, resolved, systemScheme };
}
