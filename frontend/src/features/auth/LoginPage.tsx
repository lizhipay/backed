import { type FormEvent, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import { useTranslation } from 'react-i18next';
import { BrandLogo } from '@/foundation/ui';
import { useAuth } from '@/foundation/auth';
import { ApiRequestError } from '@/foundation/api';
import { LanguageSelect } from '@/foundation/i18n';

type LoginForm = {
  email: string;
  password: string;
};

interface LocationState {
  from?: { pathname?: string };
}

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, verifyMfa } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [mfaChallenge, setMfaChallenge] = useState<{
    token: string;
    email?: string;
    expiresAt: string;
  } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [useRecoveryCode, setUseRecoveryCode] = useState(false);
  const [mfaSubmitting, setMfaSubmitting] = useState(false);
  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('auth.invalidEmail')),
        password: z.string().min(8, t('auth.passwordMin')),
      }),
    [t],
  );
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const finishLogin = () => {
    const state = location.state as LocationState | null;
    navigate(state?.from?.pathname ?? '/dashboard', { replace: true });
  };

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const res = await login(values);
      if (res.kind === 'mfa_required') {
        setMfaChallenge({
          token: res.mfaToken,
          email: res.adminHint?.email ?? values.email,
          expiresAt: res.expiresAt,
        });
        setMfaCode('');
        return;
      }
      finishLogin();
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : t('auth.failed'),
      );
    }
  });

  const onMfaSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!mfaChallenge || !mfaCode.trim()) return;
    setError(null);
    setMfaSubmitting(true);
    try {
      const code = mfaCode.trim();
      const res = await verifyMfa({
        mfa_token: mfaChallenge.token,
        ...(useRecoveryCode ? { recovery_code: code } : { code }),
      });
      if (res.kind === 'authenticated') finishLogin();
    } catch (err) {
      setError(
        err instanceof ApiRequestError
          ? err.message
          : t('auth.mfaFailed'),
      );
    } finally {
      setMfaSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'grid',
        placeItems: 'center',
        bgcolor: 'background.default',
        px: 2,
        py: 6,
        position: 'relative',
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ position: 'absolute', top: 24, left: 24 }}
      >
        <BrandLogo size={32} />
        <Typography variant="h5">Backed Admin</Typography>
      </Stack>

      <Card
        component="form"
        onSubmit={mfaChallenge ? onMfaSubmit : onSubmit}
        sx={{
          width: '100%',
          maxWidth: 420,
          p: { xs: 3, sm: 4 },
          bgcolor: 'panel.main',
        }}
      >
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="h1">
              {mfaChallenge ? t('auth.mfaTitle') : t('auth.signIn')}
            </Typography>
            <Typography color="text.secondary" sx={{ mt: 0.75 }}>
              {mfaChallenge
                ? t('auth.mfaSubtitle', { email: mfaChallenge.email })
                : t('auth.subtitle')}
            </Typography>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          {mfaChallenge ? (
            <>
              <TextField
                label={
                  useRecoveryCode ? t('auth.recoveryCode') : t('auth.mfaCode')
                }
                autoComplete="one-time-code"
                fullWidth
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value)}
                inputProps={{
                  inputMode: useRecoveryCode ? 'text' : 'numeric',
                  maxLength: useRecoveryCode ? 32 : 6,
                }}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    checked={useRecoveryCode}
                    onChange={(event) => {
                      setUseRecoveryCode(event.target.checked);
                      setMfaCode('');
                    }}
                  />
                }
                label={
                  <Typography variant="body2">
                    {t('auth.useRecoveryCode')}
                  </Typography>
                }
              />
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                startIcon={<KeyOutlinedIcon />}
                disabled={!mfaCode.trim() || mfaSubmitting}
              >
                {mfaSubmitting ? t('auth.verifying') : t('auth.verifyMfa')}
              </Button>
              <Button
                type="button"
                variant="text"
                startIcon={<ArrowBackOutlinedIcon />}
                onClick={() => {
                  setMfaChallenge(null);
                  setMfaCode('');
                  setUseRecoveryCode(false);
                  setError(null);
                }}
              >
                {t('auth.backToPassword')}
              </Button>
            </>
          ) : (
            <>
              <TextField
                label={t('auth.email')}
                autoComplete="email"
                fullWidth
                error={Boolean(errors.email)}
                helperText={errors.email?.message}
                {...register('email')}
              />
              <TextField
                label={t('auth.password')}
                type="password"
                autoComplete="current-password"
                fullWidth
                error={Boolean(errors.password)}
                helperText={errors.password?.message}
                {...register('password')}
              />
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                spacing={2}
              >
                <FormControlLabel
                  control={<Checkbox size="small" />}
                  label={
                    <Typography variant="body2">
                      {t('auth.rememberDevice')}
                    </Typography>
                  }
                />
                <Link href="#" underline="hover" variant="body2">
                  {t('auth.forgotPassword')}
                </Link>
              </Stack>
              <LanguageSelect fullWidth />
              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                startIcon={<LoginOutlinedIcon />}
                disabled={isSubmitting}
              >
                {isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
              </Button>
            </>
          )}
        </Stack>
      </Card>
    </Box>
  );
}
