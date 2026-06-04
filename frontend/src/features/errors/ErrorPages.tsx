import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useTranslation } from 'react-i18next';

interface ErrorPageProps {
  code: string;
  title: string;
  description: string;
}

/** Shared full-bleed error page used by the 403/404/500 routes. */
export function ErrorPage({ code, title, description }: ErrorPageProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  return (
    <Box
      sx={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      <Stack spacing={1.5} alignItems="center" sx={{ maxWidth: 460 }}>
        <Typography
          sx={{
            fontSize: 72,
            fontWeight: 800,
            lineHeight: 1,
            color: 'primary.main',
          }}
        >
          {code}
        </Typography>
        <Typography variant="h2">{title}</Typography>
        <Typography variant="body1" color="text.secondary">
          {description}
        </Typography>
        <Stack direction="row" spacing={1.5} sx={{ mt: 1 }}>
          <Button variant="outlined" onClick={() => navigate(-1)}>
            {t('states.goBack')}
          </Button>
          <Button variant="contained" onClick={() => navigate('/dashboard')}>
            {t('nav.dashboard')}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}

export function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <ErrorPage
      code="404"
      title={t('states.notFoundTitle')}
      description={t('states.notFoundDescription')}
    />
  );
}

export function ForbiddenPage() {
  const { t } = useTranslation();
  return (
    <ErrorPage
      code="403"
      title={t('states.permissionTitle')}
      description={t('states.permissionDescription')}
    />
  );
}

export function ServerErrorPage() {
  const { t } = useTranslation();
  return (
    <ErrorPage
      code="500"
      title={t('states.errorTitle')}
      description={t('states.errorDescription')}
    />
  );
}
