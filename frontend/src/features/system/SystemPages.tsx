import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import KeyOutlinedIcon from '@mui/icons-material/KeyOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { type GridColDef } from '@mui/x-data-grid';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import { ApiRequestError, api } from '@/foundation/api';
import type { Admin, SessionInfo, ThemePreference } from '@/foundation/api';
import { useAuthStore } from '@/foundation/auth';
import { LanguageSelect, roleDisplayName } from '@/foundation/i18n';
import { useThemeStore } from '@/foundation/theme';
import { Can, PERMISSIONS } from '@/foundation/permissions';
import {
  DataTable,
  QueryBoundary,
  SettingsLayout,
  SettingsPanel,
  SettingsSection,
  StatusBadge,
  useUrlTab,
} from '@/foundation/ui';
import { formatDateTime, initials } from '@/foundation/utils';

const settingsTabValues = ['appearance', 'system'] as const;
type SettingsTab = (typeof settingsTabValues)[number];
const profileTabValues = ['account', 'security', 'sessions'] as const;
type ProfileTab = (typeof profileTabValues)[number];

function mfaSetupErrorKey(error: unknown) {
  if (error instanceof ApiRequestError) {
    if (error.code === 'mfa_unavailable' || error.status === 503) {
      return 'profile.mfaSetupUnavailable';
    }
    if (error.code === 'unauthorized' || error.status === 401) {
      return 'profile.mfaSetupBadPassword';
    }
    if (error.status === 409) {
      return 'profile.mfaSetupAlreadyEnabled';
    }
  }
  return 'profile.mfaSetupFailed';
}

export function SettingsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useUrlTab<SettingsTab>(settingsTabValues, 'appearance');
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const me = useAuthStore((s) => s.me);
  const setSession = useAuthStore((s) => s.setSession);
  const permissionsSet = useAuthStore((s) => s.permissions);
  const permissions = useMemo(() => Array.from(permissionsSet), [permissionsSet]);
  const [appName, setAppName] = useState('Backed Admin');
  const [supportEmail, setSupportEmail] = useState('');
  const [allowSelfRegistration, setAllowSelfRegistration] = useState(false);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(30);
  const settings = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<Record<string, Record<string, unknown>>>('/settings'),
  });
  useEffect(() => {
    const general = settings.data?.general;
    if (!general) return;
    if (typeof general.app_name === 'string') setAppName(general.app_name);
    if (typeof general.support_email === 'string') setSupportEmail(general.support_email);
    if (typeof general.allow_self_registration === 'boolean') {
      setAllowSelfRegistration(general.allow_self_registration);
    }
    if (typeof general.session_timeout_minutes === 'number') {
      setSessionTimeoutMinutes(general.session_timeout_minutes);
    }
  }, [settings.data]);
  const saveTheme = useMutation({
    mutationFn: (theme_preference: ThemePreference) =>
      api.patch('/me', { theme_preference }),
    onSuccess: (_, selectedMode) => {
      if (me) setSession({ ...me, themePreference: selectedMode }, permissions);
    },
  });
  const saveSettings = useMutation({
    mutationFn: () =>
      api.patch<{ ok: true }>('/settings', {
        general: {
          app_name: appName,
          support_email: supportEmail,
          allow_self_registration: allowSelfRegistration,
          session_timeout_minutes: sessionTimeoutMinutes,
        },
      }),
  });

  const handleMode = (selectedMode: ThemePreference) => {
    setMode(selectedMode);
    saveTheme.mutate(selectedMode);
  };
  const tabs = useMemo(
    () => [
      {
        value: 'appearance' as const,
        label: t('settings.appearance'),
        icon: <PaletteOutlinedIcon fontSize="small" />,
      },
      {
        value: 'system' as const,
        label: t('settings.systemDefaults'),
        icon: <SettingsOutlinedIcon fontSize="small" />,
      },
    ],
    [t],
  );

  return (
    <QueryBoundary query={settings}>
      {() => (
        <SettingsLayout
          title={t('settings.title')}
          description={t('settings.description')}
          tabs={tabs}
          value={tab}
          onChange={setTab}
          ariaLabel={t('settings.tabsLabel')}
        >
          {tab === 'appearance' && (
            <SettingsPanel>
              <SettingsSection
                title={t('settings.themeMode')}
                description={t('settings.appearanceDescription')}
              >
                <FormControl>
                  <RadioGroup
                    row
                    value={mode}
                    onChange={(event) =>
                      handleMode(event.target.value as ThemePreference)
                    }
                    sx={{ gap: 1 }}
                  >
                    <FormControlLabel
                      value="dark"
                      control={<Radio />}
                      label={t('settings.dark')}
                    />
                    <FormControlLabel
                      value="light"
                      control={<Radio />}
                      label={t('settings.light')}
                    />
                    <FormControlLabel
                      value="auto"
                      control={<Radio />}
                      label={t('settings.auto')}
                    />
                  </RadioGroup>
                </FormControl>
                {saveTheme.isError && (
                  <Alert severity="warning">
                    {t('settings.themeSavedLocal')}
                  </Alert>
                )}
              </SettingsSection>
              <SettingsSection title={t('settings.language')}>
                <LanguageSelect fullWidth />
              </SettingsSection>
            </SettingsPanel>
          )}
          {tab === 'system' && (
            <SettingsPanel>
              <SettingsSection
                title={t('settings.systemDefaults')}
                description={t('settings.systemDefaultsDescription')}
                actions={
                  <Can perm={PERMISSIONS.settingsUpdate}>
                    <Button
                      variant="contained"
                      startIcon={<SaveOutlinedIcon />}
                      onClick={() => saveSettings.mutate()}
                      disabled={saveSettings.isPending}
                    >
                      {t('common.save')}
                    </Button>
                  </Can>
                }
              >
                <Stack spacing={2}>
                  <TextField
                    label={t('settings.appName')}
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                  />
                  <TextField
                    label={t('settings.supportEmail')}
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                  />
                  <TextField
                    label={t('settings.timeout')}
                    type="number"
                    value={sessionTimeoutMinutes}
                    onChange={(e) =>
                      setSessionTimeoutMinutes(Number(e.target.value))
                    }
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={allowSelfRegistration}
                        onChange={(e) =>
                          setAllowSelfRegistration(e.target.checked)
                        }
                      />
                    }
                    label={t('settings.selfRegistration')}
                  />
                  {saveSettings.isSuccess && (
                    <Alert severity="success">{t('settings.saved')}</Alert>
                  )}
                </Stack>
              </SettingsSection>
            </SettingsPanel>
          )}
        </SettingsLayout>
      )}
    </QueryBoundary>
  );
}

function MfaSetupDialog({
  open,
  onClose,
  onEnabled,
}: {
  open: boolean;
  onClose: () => void;
  onEnabled: () => void;
}) {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [code, setCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const setup = useMutation({
    mutationFn: () =>
      api.post<{
        setup_id: string;
        otpauth_url: string;
        secret: string;
      }>('/me/mfa/setup', { current_password: currentPassword }),
  });
  const confirm = useMutation({
    mutationFn: () =>
      api.post<{ ok: true; recovery_codes: string[] }>('/me/mfa/confirm', {
        setup_id: setup.data?.setup_id,
        code,
      }),
    onSuccess: (res) => {
      setRecoveryCodes(res.recovery_codes);
      onEnabled();
    },
  });

  const reset = () => {
    setCurrentPassword('');
    setCode('');
    setRecoveryCodes([]);
    setup.reset();
    confirm.reset();
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>{t('profile.mfaSetupTitle')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {!setup.data && recoveryCodes.length === 0 && (
            <>
              <Typography color="text.secondary">
                {t('profile.mfaSetupDescription')}
              </Typography>
              <TextField
                label={t('profile.currentPassword')}
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
              {setup.isError && (
                <Alert severity="error">
                  {t(mfaSetupErrorKey(setup.error))}
                </Alert>
              )}
            </>
          )}

          {setup.data && recoveryCodes.length === 0 && (
            <>
              <Box sx={{ display: 'grid', placeItems: 'center', py: 1 }}>
                <Box
                  sx={{
                    bgcolor: '#fff',
                    borderRadius: 1,
                    p: 1.5,
                    lineHeight: 0,
                  }}
                >
                  <QRCodeSVG value={setup.data.otpauth_url} size={190} />
                </Box>
              </Box>
              <TextField
                label={t('profile.mfaSecret')}
                value={setup.data.secret}
                InputProps={{ readOnly: true }}
              />
              <TextField
                label={t('auth.mfaCode')}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                inputProps={{ inputMode: 'numeric', maxLength: 6 }}
              />
              {confirm.isError && (
                <Alert severity="error">{t('profile.mfaConfirmFailed')}</Alert>
              )}
            </>
          )}

          {recoveryCodes.length > 0 && (
            <>
              <Alert severity="warning">{t('profile.recoveryCodesWarning')}</Alert>
              <Box
                component="pre"
                sx={{
                  m: 0,
                  p: 2,
                  borderRadius: 1,
                  bgcolor: 'panel.raised',
                  border: '1px solid',
                  borderColor: 'border.main',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {recoveryCodes.join('\n')}
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            reset();
            onClose();
          }}
        >
          {recoveryCodes.length > 0 ? t('common.close') : t('common.cancel')}
        </Button>
        {!setup.data && recoveryCodes.length === 0 && (
          <Button
            variant="contained"
            onClick={() => setup.mutate()}
            disabled={currentPassword.length < 8 || setup.isPending}
          >
            {t('profile.startMfaSetup')}
          </Button>
        )}
        {setup.data && recoveryCodes.length === 0 && (
          <Button
            variant="contained"
            onClick={() => confirm.mutate()}
            disabled={code.length !== 6 || confirm.isPending}
          >
            {t('profile.enableMfa')}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export function ProfilePage() {
  const { t } = useTranslation();
  const [tab, setTab] = useUrlTab<ProfileTab>(profileTabValues, 'account');
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.me);
  const setSession = useAuthStore((s) => s.setSession);
  const permissionsSet = useAuthStore((s) => s.permissions);
  const permissions = useMemo(() => Array.from(permissionsSet), [permissionsSet]);
  const [username, setUsername] = useState(me?.username ?? '');
  const [displayName, setDisplayName] = useState(me?.displayName ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mfaSetupOpen, setMfaSetupOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');

  useEffect(() => {
    setUsername(me?.username ?? '');
    setDisplayName(me?.displayName ?? '');
  }, [me?.displayName, me?.username]);

  const applyAdmin = (admin: Admin) => {
    if (!me) return;
    setSession(
      {
        ...me,
        username: admin.username,
        displayName: admin.display_name || admin.username || admin.email,
        avatarUrl: admin.avatar_url || '',
        mfaEnabled: admin.mfa_enabled,
        recoveryCodesRemaining: admin.mfa_recovery_codes_remaining ?? me.recoveryCodesRemaining,
      },
      permissions,
    );
  };

  const updateProfile = useMutation({
    mutationFn: () => api.patch<Admin>('/me', { username, display_name: displayName }),
    onSuccess: (admin) => {
      applyAdmin(admin);
    },
  });
  const uploadAvatar = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('avatar', file);
      return api.post<Admin>('/me/avatar', form);
    },
    onSuccess: (admin) => applyAdmin(admin),
  });
  const changePassword = useMutation({
    mutationFn: () =>
      api.post<{ ok: true }>('/me/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      }),
    onSuccess: () => {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
  });
  const disableMfa = useMutation({
    mutationFn: () =>
      api.post<{ ok: true }>('/me/mfa/disable', {
        current_password: disablePassword,
        code: disableCode,
        recovery_code: disableCode,
      }),
    onSuccess: () => {
      if (me) {
        setSession(
          {
            ...me,
            mfaEnabled: false,
            recoveryCodesRemaining: 0,
          },
          permissions,
        );
      }
      setDisablePassword('');
      setDisableCode('');
    },
  });
  const sessions = useQuery({
    queryKey: ['me-sessions'],
    enabled: tab === 'sessions',
    queryFn: () => api.get<SessionInfo[]>('/me/sessions'),
  });
  const revokeSession = useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/me/sessions/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['me-sessions'] }),
  });
  const passwordMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;
  const sessionColumns = useMemo<GridColDef<SessionInfo>[]>(
    () => [
      { field: 'ip', headerName: t('security.ip'), minWidth: 130, flex: 0.7 },
      {
        field: 'user_agent',
        headerName: t('security.userAgent'),
        minWidth: 260,
        flex: 1.4,
      },
      {
        field: 'last_seen_at',
        headerName: t('security.lastSeen'),
        minWidth: 180,
        valueGetter: (_, row) => formatDateTime(row.last_seen_at),
      },
      {
        field: 'revoked_at',
        headerName: t('security.status'),
        width: 130,
        renderCell: ({ row }) => (
          <StatusBadge status={row.revoked_at ? 'revoked' : 'active'} />
        ),
      },
      {
        field: 'actions',
        headerName: '',
        width: 130,
        sortable: false,
        renderCell: ({ row }) => (
          <Button
            size="small"
            startIcon={<LogoutOutlinedIcon />}
            disabled={Boolean(row.revoked_at) || revokeSession.isPending}
            onClick={() => revokeSession.mutate(row.id)}
          >
            {t('security.revoke')}
          </Button>
        ),
      },
    ],
    [revokeSession, t],
  );
  const tabs = useMemo(
    () => [
      {
        value: 'account' as const,
        label: t('profile.account'),
        icon: <AccountCircleOutlinedIcon fontSize="small" />,
      },
      {
        value: 'security' as const,
        label: t('profile.security'),
        icon: <SecurityOutlinedIcon fontSize="small" />,
      },
      {
        value: 'sessions' as const,
        label: t('profile.mySessions'),
        icon: <LogoutOutlinedIcon fontSize="small" />,
      },
    ],
    [t],
  );

  return (
    <>
      <SettingsLayout
        title={t('profile.title')}
        description={t('profile.description')}
        tabs={tabs}
        value={tab}
        onChange={setTab}
        ariaLabel={t('profile.tabsLabel')}
        maxWidth={tab === 'sessions' ? 1080 : 1040}
      >
        {tab === 'account' && (
          <SettingsPanel>
            <SettingsSection
              title={t('profile.account')}
              description={t('profile.accountDescription')}
              actions={
                <Button
                  variant="contained"
                  startIcon={<SaveOutlinedIcon />}
                  onClick={() => updateProfile.mutate()}
                  disabled={!username.trim() || updateProfile.isPending}
                >
                  {t('profile.saveProfile')}
                </Button>
              }
            >
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  spacing={2}
                >
                  <Box
                    component="label"
                    aria-label={t('profile.uploadAvatar')}
                    title={t('profile.uploadAvatar')}
                    sx={{
                      position: 'relative',
                      display: 'inline-flex',
                      borderRadius: '50%',
                      cursor: uploadAvatar.isPending ? 'default' : 'pointer',
                      opacity: uploadAvatar.isPending ? 0.6 : 1,
                      transition: 'transform 160ms ease, box-shadow 160ms ease',
                      '&:hover': uploadAvatar.isPending
                        ? undefined
                        : {
                            transform: 'translateY(-1px)',
                            boxShadow: '0 10px 28px rgba(66, 84, 255, 0.22)',
                          },
                      '&:focus-within': {
                        outline: '2px solid',
                        outlineColor: 'primary.main',
                        outlineOffset: 4,
                      },
                    }}
                  >
                    <Avatar
                      src={me?.avatarUrl || undefined}
                      sx={{
                        width: 76,
                        height: 76,
                        fontSize: 24,
                        border: '2px solid',
                        borderColor: 'transparent',
                      }}
                    >
                      {initials(me?.displayName ?? me?.username ?? t('common.user'))}
                    </Avatar>
                    <input
                      hidden
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      disabled={uploadAvatar.isPending}
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        if (file) uploadAvatar.mutate(file);
                      }}
                    />
                  </Box>
                </Stack>
                {uploadAvatar.isError && (
                  <Alert severity="error">{t('profile.avatarUploadFailed')}</Alert>
                )}
                <TextField label={t('common.email')} value={me?.email ?? ''} disabled />
                <TextField
                  label={t('profile.displayName')}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
                <TextField
                  label={t('profile.username')}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                {updateProfile.isSuccess && (
                  <Alert severity="success">{t('profile.saved')}</Alert>
                )}
              </Stack>
            </SettingsSection>
          </SettingsPanel>
        )}
        {tab === 'security' && (
          <SettingsPanel>
            <SettingsSection
              title={t('profile.roles')}
              description={t('profile.rolesDescription')}
            >
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {me?.roles.length ? (
                  me.roles.map((role) => (
                    <Chip
                      key={role.id}
                      label={roleDisplayName(role, t)}
                      color={role.slug === 'super_admin' ? 'primary' : 'default'}
                      size="small"
                    />
                  ))
                ) : (
                  <Typography color="text.secondary" variant="body2">
                    {t('profile.noRoles')}
                  </Typography>
                )}
              </Stack>
            </SettingsSection>
            <SettingsSection
              title={t('profile.password')}
              description={t('profile.passwordDescription')}
              actions={
                <Button
                  variant="outlined"
                  onClick={() => changePassword.mutate()}
                  disabled={
                    currentPassword.length < 8 ||
                    newPassword.length < 8 ||
                    newPassword !== confirmPassword ||
                    changePassword.isPending
                  }
                >
                  {t('profile.changePassword')}
                </Button>
              }
            >
              <Stack spacing={2}>
                <TextField
                  label={t('profile.currentPassword')}
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <TextField
                  label={t('profile.newPassword')}
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <TextField
                  label={t('profile.confirmPassword')}
                  type="password"
                  value={confirmPassword}
                  error={passwordMismatch}
                  helperText={
                    passwordMismatch
                      ? t('profile.passwordMismatch')
                      : t('profile.passwordHint')
                  }
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                {changePassword.isSuccess && (
                  <Alert severity="success">{t('profile.passwordChanged')}</Alert>
                )}
                {changePassword.isError && (
                  <Alert severity="error">{t('profile.passwordChangeFailed')}</Alert>
                )}
              </Stack>
            </SettingsSection>
            <SettingsSection
              title={t('profile.mfa')}
              description={
                me?.mfaEnabled
                  ? t('profile.mfaEnabledDescription', {
                      count: me.recoveryCodesRemaining,
                    })
                  : t('profile.mfaDisabledDescription')
              }
              actions={
                !me?.mfaEnabled ? (
                  <Button
                    variant="contained"
                    startIcon={<SecurityOutlinedIcon />}
                    onClick={() => setMfaSetupOpen(true)}
                  >
                    {t('profile.setupMfa')}
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<KeyOutlinedIcon />}
                    onClick={() => disableMfa.mutate()}
                    disabled={
                      disablePassword.length < 8 ||
                      !disableCode.trim() ||
                      disableMfa.isPending
                    }
                  >
                    {t('profile.disableMfa')}
                  </Button>
                )
              }
            >
              <Stack spacing={1.5}>
                {me?.mfaEnabled && (
                  <>
                    <Chip
                      label={t('profile.mfaEnabled')}
                      color="success"
                      size="small"
                      sx={{ alignSelf: 'flex-start' }}
                    />
                    <TextField
                      label={t('profile.currentPassword')}
                      type="password"
                      value={disablePassword}
                      onChange={(event) => setDisablePassword(event.target.value)}
                    />
                    <TextField
                      label={t('profile.mfaOrRecoveryCode')}
                      value={disableCode}
                      onChange={(event) => setDisableCode(event.target.value)}
                    />
                    {disableMfa.isSuccess && (
                      <Alert severity="success">{t('profile.mfaDisabled')}</Alert>
                    )}
                    {disableMfa.isError && (
                      <Alert severity="error">{t('profile.mfaDisableFailed')}</Alert>
                    )}
                  </>
                )}
              </Stack>
            </SettingsSection>
          </SettingsPanel>
        )}
        {tab === 'sessions' && (
          <SettingsPanel>
            <SettingsSection
              title={t('profile.mySessions')}
              description={t('profile.mySessionsDescription')}
              contentMaxWidth="100%"
            >
              <QueryBoundary query={sessions}>
                {(rows) => (
                  <DataTable
                    frame={false}
                    rows={rows}
                    columns={sessionColumns}
                    getRowId={(row) => row.id}
                  />
                )}
              </QueryBoundary>
            </SettingsSection>
          </SettingsPanel>
        )}
      </SettingsLayout>
      <MfaSetupDialog
        open={mfaSetupOpen}
        onClose={() => setMfaSetupOpen(false)}
        onEnabled={() => {
          if (me) {
            setSession({ ...me, mfaEnabled: true, recoveryCodesRemaining: 10 }, permissions);
          }
        }}
      />
    </>
  );
}
