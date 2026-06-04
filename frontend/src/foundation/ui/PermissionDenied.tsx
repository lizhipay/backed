import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useTranslation } from 'react-i18next';

/** Shown in place of page content when the user lacks the required permission. */
export function PermissionDenied({
  description,
}: {
  description?: string;
}) {
  const { t } = useTranslation();
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      spacing={1.5}
      sx={{ py: 10, px: 3, textAlign: 'center' }}
    >
      <Box
        sx={{
          color: 'warning.main',
          bgcolor: 'panel.raised',
          borderRadius: '50%',
          width: 56,
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LockOutlinedIcon />
      </Box>
      <Typography variant="h4">{t('states.permissionTitle')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
        {description ?? t('states.permissionDescription')}
      </Typography>
    </Stack>
  );
}
