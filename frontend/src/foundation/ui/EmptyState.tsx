import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import { useTranslation } from 'react-i18next';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: { label: string; onClick: () => void };
}

/** Foundation empty state. Used by lists/tables when there's nothing to show. */
export function EmptyState({
  title,
  description,
  icon,
  action,
}: EmptyStateProps) {
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
          color: 'text.secondary',
          bgcolor: 'panel.raised',
          borderRadius: '50%',
          width: 56,
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon ?? <InboxOutlinedIcon />}
      </Box>
      <Typography variant="h4">{title ?? t('states.emptyTitle')}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
        {description ?? t('states.emptyDescription')}
      </Typography>
      {action && (
        <Button variant="contained" onClick={action.onClick} sx={{ mt: 1 }}>
          {action.label}
        </Button>
      )}
    </Stack>
  );
}
