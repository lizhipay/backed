import { useEffect, useMemo, type ReactNode } from 'react';
import {
  ThemeProvider as MuiThemeProvider,
  useColorScheme,
} from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useLanguageStore } from '@/foundation/i18n';
import { createAppTheme } from './createAppTheme';
import { useResolvedColorScheme } from './useResolvedColorScheme';

/**
 * Bridges our Zustand `mode` (dark/light/auto) to MUI's color scheme. Because
 * we resolve "auto" ourselves and always set an explicit scheme, MUI never
 * flickers and the choice persists via our own store.
 */
function ColorSchemeBridge({ children }: { children: ReactNode }) {
  const { setMode } = useColorScheme();
  const { resolved } = useResolvedColorScheme();

  useEffect(() => {
    setMode(resolved);
  }, [resolved, setMode]);

  return <>{children}</>;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const language = useLanguageStore((s) => s.resolved);
  const theme = useMemo(() => createAppTheme(language), [language]);

  return (
    <MuiThemeProvider theme={theme} defaultMode="dark">
      <CssBaseline />
      <ColorSchemeBridge>{children}</ColorSchemeBridge>
    </MuiThemeProvider>
  );
}
