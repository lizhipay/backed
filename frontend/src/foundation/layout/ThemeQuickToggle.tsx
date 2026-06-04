import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import BrightnessAutoOutlinedIcon from '@mui/icons-material/BrightnessAutoOutlined';
import { useTranslation } from 'react-i18next';
import {
  useThemeStore,
  useResolvedColorScheme,
  type ThemeMode,
} from '@/foundation/theme';

const ORDER: ThemeMode[] = ['dark', 'light', 'auto'];

/**
 * Compact theme switch for the sidebar footer / user menu. Cycles
 * dark → light → auto and shows the current mode (and, for auto, the
 * effective scheme, e.g. "Auto · Dark").
 */
export function ThemeQuickToggle() {
  const { t } = useTranslation();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const { resolved } = useResolvedColorScheme();

  const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
  const icon =
    mode === 'dark' ? (
      <DarkModeOutlinedIcon fontSize="small" />
    ) : mode === 'light' ? (
      <LightModeOutlinedIcon fontSize="small" />
    ) : (
      <BrightnessAutoOutlinedIcon fontSize="small" />
    );

  const modeLabel = (value: ThemeMode) =>
    value === 'dark'
      ? t('settings.dark')
      : value === 'light'
        ? t('settings.light')
        : t('settings.auto');
  const resolvedLabel =
    resolved === 'dark' ? t('settings.dark') : t('settings.light');
  const label =
    mode === 'auto'
      ? t('settings.autoResolved', { mode: resolvedLabel })
      : modeLabel(mode);
  const nextLabel = modeLabel(next);

  return (
    <Tooltip title={t('settings.themeTooltip', { current: label, next: nextLabel })}>
      <IconButton
        size="small"
        onClick={() => setMode(next)}
        aria-label={t('settings.themeSwitchLabel', { current: label })}
      >
        {icon}
      </IconButton>
    </Tooltip>
  );
}
