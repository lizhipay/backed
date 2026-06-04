import Chip from '@mui/material/Chip';
import { alpha, useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

type Tone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

const TONE_MAP: Record<string, Tone> = {
  active: 'success',
  enabled: 'success',
  success: 'success',
  online: 'success',
  paid: 'success',
  low: 'success',
  pending: 'warning',
  invited: 'warning',
  medium: 'warning',
  warning: 'warning',
  processing: 'info',
  disabled: 'neutral',
  archived: 'neutral',
  inactive: 'neutral',
  offline: 'neutral',
  locked: 'error',
  suspended: 'error',
  denied: 'error',
  error: 'error',
  failed: 'error',
  high: 'error',
  refunded: 'error',
};

interface StatusBadgeProps {
  status: string;
  /** Override the inferred tone. */
  tone?: Tone;
  label?: string;
}

/** Pill badge with dark-theme tinted colors, inferred from a status string. */
export function StatusBadge({ status, tone, label }: StatusBadgeProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const resolved: Tone = tone ?? TONE_MAP[status.toLowerCase()] ?? 'neutral';

  const colorMap: Record<Tone, string> = {
    success: theme.palette.success.main,
    warning: theme.palette.warning.main,
    error: theme.palette.error.main,
    info: theme.palette.primary.main,
    neutral: theme.palette.text.secondary,
  };
  const color = colorMap[resolved];

  return (
    <Chip
      size="small"
      label={label ?? t(`common.${status}`, { defaultValue: status })}
      sx={{
        bgcolor: alpha(color, 0.14),
        color,
        border: `1px solid ${alpha(color, 0.3)}`,
        textTransform: 'capitalize',
        height: 22,
        fontSize: 12,
      }}
    />
  );
}
