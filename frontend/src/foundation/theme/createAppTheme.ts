import {
  createTheme,
  type Theme,
  type ThemeOptions,
} from '@mui/material/styles';
import {
  enUS as muiEnUS,
  jaJP as muiJaJP,
  zhCN as muiZhCN,
  zhTW as muiZhTW,
} from '@mui/material/locale';
import {
  enUS as gridEnUS,
  jaJP as gridJaJP,
  zhCN as gridZhCN,
  zhTW as gridZhTW,
} from '@mui/x-data-grid/locales';
import type { SupportedLanguage } from '@/foundation/i18n';
import { darkTokens, lightTokens, type AppTokens } from './tokens';

const FONT_FAMILY = [
  'Inter',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI"',
  'Roboto',
  '"Helvetica Neue"',
  'Arial',
  'sans-serif',
].join(',');

function basePalette(mode: 'dark' | 'light', t: AppTokens) {
  return {
    mode,
    primary: { main: t.primary, dark: t.primaryHover },
    success: { main: t.success },
    warning: { main: t.warning },
    error: { main: t.error },
    background: { default: t.appBg, paper: t.panel },
    text: {
      primary: t.textPrimary,
      secondary: t.textSecondary,
      disabled: t.textMuted,
    },
    divider: t.border,
    sidebar: { bg: t.sidebar, active: t.sidebarActive },
    panel: { main: t.panel, raised: t.panelRaised },
    border: { main: t.border },
  };
}

function componentOverrides(): ThemeOptions['components'] {
  return {
    MuiCssBaseline: {
      styleOverrides: {
        ':root': { colorScheme: 'light dark' },
        body: { transition: 'background-color 0.2s ease' },
        '*::-webkit-scrollbar': { width: 10, height: 10 },
        '*::-webkit-scrollbar-thumb': {
          backgroundColor: 'var(--mui-palette-border-main)',
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 12,
          border: `1px solid ${theme.palette.border.main}`,
          backgroundColor: theme.palette.panel.main,
        }),
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 8, textTransform: 'none', fontWeight: 600 },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 8,
          backgroundColor: theme.palette.panel.raised,
        }),
      },
    },
    MuiChip: {
      styleOverrides: { root: { borderRadius: 6, fontWeight: 600 } },
    },
    MuiTableCell: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderColor: theme.palette.border.main,
        }),
      },
    },
  };
}

function optionsForMode(mode: 'dark' | 'light'): ThemeOptions {
  const t = mode === 'dark' ? darkTokens : lightTokens;
  return {
    tokens: t,
    palette: basePalette(mode, t),
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: FONT_FAMILY,
      fontSize: 14,
      h1: { fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em' },
      h2: { fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.01em' },
      h3: { fontSize: '1.25rem', fontWeight: 600 },
      h4: { fontSize: '1.125rem', fontWeight: 600 },
      h5: { fontSize: '1rem', fontWeight: 600 },
      h6: { fontSize: '0.9375rem', fontWeight: 600 },
      body2: { fontSize: '0.8125rem' },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: componentOverrides(),
  };
}

/**
 * Builds a single MUI theme that contains BOTH color schemes. MUI generates CSS
 * variables for each scheme; switching `mode` on the provider toggles the
 * scheme without remounting, so routes, filters and form inputs are preserved.
 */
const localeByLanguage = {
  'zh-CN': [muiZhCN, gridZhCN],
  'zh-TW': [muiZhTW, gridZhTW],
  'ja-JP': [muiJaJP, gridJaJP],
  'en-US': [muiEnUS, gridEnUS],
} satisfies Record<SupportedLanguage, unknown[]>;

export function createAppTheme(language: SupportedLanguage = 'en-US'): Theme {
  return createTheme(
    {
      cssVariables: {
        colorSchemeSelector: 'data-mui-color-scheme',
      },
      colorSchemes: {
        dark: optionsForMode('dark'),
        light: optionsForMode('light'),
      },
      // Shared, scheme-independent options live at the root too.
      shape: { borderRadius: 12 },
      typography: { fontFamily: FONT_FAMILY, fontSize: 14 },
      components: componentOverrides(),
    },
    ...(localeByLanguage[language] as ThemeOptions[]),
  );
}

export const appTheme = createAppTheme();
