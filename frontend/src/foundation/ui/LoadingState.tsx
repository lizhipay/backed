import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useTranslation } from 'react-i18next';

/** Centered spinner for inline/page loading states. */
export function LoadingState({
  minHeight = 240,
}: {
  minHeight?: number | string;
}) {
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight,
      }}
    >
      <CircularProgress size={28} aria-label={t('states.loading')} />
    </Box>
  );
}
