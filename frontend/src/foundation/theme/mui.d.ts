import type { AppTokens } from './tokens';

/**
 * Augment MUI's theme so our custom Horizon tokens are available and typed via
 * `theme.tokens` (and on the palette for convenience).
 */
declare module '@mui/material/styles' {
  interface Theme {
    tokens: AppTokens;
  }
  interface ThemeOptions {
    tokens?: AppTokens;
  }
  interface Palette {
    sidebar: {
      bg: string;
      active: string;
    };
    panel: {
      main: string;
      raised: string;
    };
    border: {
      main: string;
    };
  }
  interface PaletteOptions {
    sidebar?: {
      bg: string;
      active: string;
    };
    panel?: {
      main: string;
      raised: string;
    };
    border?: {
      main: string;
    };
  }
}
