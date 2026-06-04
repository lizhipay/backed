/**
 * Horizon-inspired design tokens. These are the raw palette values referenced
 * across the app; the MUI theme is generated from them in createAppTheme.ts.
 */

export const darkTokens = {
  appBg: '#101113',
  sidebar: '#0F1012',
  sidebarActive: '#24262B',
  panel: '#181A1E',
  panelRaised: '#202228',
  field: '#272A30',
  border: '#333740',
  textPrimary: '#F5F7FA',
  textSecondary: '#A8ADB7',
  textMuted: '#707784',
  primary: '#4567E8',
  primaryHover: '#5677FF',
  success: '#34D399',
  warning: '#F59E0B',
  error: '#F87171',
  chartBlue: '#3F6DF6',
} as const;

export const lightTokens = {
  appBg: '#F6F7FB',
  sidebar: '#FFFFFF',
  sidebarActive: '#EEF2FF',
  panel: '#FFFFFF',
  panelRaised: '#F9FAFB',
  field: '#FFFFFF',
  border: '#E5E7EB',
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#6B7280',
  primary: '#4567E8',
  primaryHover: '#3B5BD6',
  success: '#059669',
  warning: '#D97706',
  error: '#DC2626',
  chartBlue: '#3F6DF6',
} as const;

export interface AppTokens {
  appBg: string;
  sidebar: string;
  sidebarActive: string;
  panel: string;
  panelRaised: string;
  field: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryHover: string;
  success: string;
  warning: string;
  error: string;
  chartBlue: string;
}

export const tokensByMode = {
  dark: darkTokens,
  light: lightTokens,
} as const;
