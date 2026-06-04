import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { useTranslation } from 'react-i18next';

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

/** Foundation error state for failed data loads. */
export function ErrorState({
  title,
  description,
  onRetry,
}: ErrorStateProps) {
  const { t } = useTranslation();
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={1.5}
      sx={{ py: 8, px: 3, textAlign: 'center' }}
    >
      <Box
        sx={{
          color: 'error.main',
          bgcolor: 'panel.raised',
          borderRadius: '50%',
          width: 56,
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ErrorOutlineIcon />
      </Box>
      <Typography variant="h4">{title ?? t('states.errorTitle')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
        {description ?? t('states.errorDescription')}
      </Typography>
      {onRetry && (
        <Button variant="outlined" onClick={onRetry} sx={{ mt: 1 }}>
          {t('common.retry')}
        </Button>
      )}
    </Stack>
  );
}
