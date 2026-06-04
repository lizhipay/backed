import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import Grid from '@mui/material/Grid2';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { BarChart, LineChart } from '@mui/x-charts';
import { useTranslation } from 'react-i18next';
import { api, type ListResult } from '@/foundation/api';
import type {
  Admin,
  AuditLog,
  Role,
  SessionInfo,
} from '@/foundation/api';
import { PERMISSIONS, usePermissions } from '@/foundation/permissions';
import {
  ErrorState,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
} from '@/foundation/ui';
import { formatDateTime, formatNumber } from '@/foundation/utils';

const trend = [42, 48, 51, 47, 58, 63, 69, 74, 72, 81, 84, 92];
const bars = [12, 18, 9, 22, 16, 28, 31];

function countValue<T>(query: UseQueryResult<ListResult<T>>, fallback = 0) {
  if (query.isError) return '—';
  if (query.isLoading) return '…';
  return formatNumber(query.data?.meta?.total ?? query.data?.items.length ?? fallback);
}

export function DashboardPage() {
  const { t } = useTranslation();
  const { has } = usePermissions();
  const admins = useQuery({
    queryKey: ['dashboard', 'admins'],
    enabled: has(PERMISSIONS.adminsView),
    queryFn: () => api.list<Admin>('/admins', { params: { page_size: 5 } }),
  });
  const roles = useQuery({
    queryKey: ['dashboard', 'roles'],
    enabled: has(PERMISSIONS.rolesView),
    queryFn: () => api.list<Role>('/roles', { params: { page_size: 5 } }),
  });
  const sessions = useQuery({
    queryKey: ['dashboard', 'sessions'],
    enabled: has(PERMISSIONS.sessionsView),
    queryFn: () => api.get<SessionInfo[]>('/sessions', { params: { active: true } }),
  });
  const audits = useQuery({
    queryKey: ['dashboard', 'audit-logs'],
    enabled: has(PERMISSIONS.auditLogsView),
    queryFn: () => api.list<AuditLog>('/audit-logs', { params: { page_size: 6 } }),
  });

  return (
    <>
      <PageHeader
        title={t('dashboard.title')}
        description={t('dashboard.description')}
        actions={
          <>
            <Button variant="outlined" startIcon={<DownloadOutlinedIcon />}>
              {t('common.export')}
            </Button>
            <Button variant="contained" startIcon={<SettingsOutlinedIcon />}>
              {t('common.customize')}
            </Button>
          </>
        }
      />

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard
            label={t('dashboard.administrators')}
            value={has(PERMISSIONS.adminsView) ? countValue(admins) : t('common.noAccess')}
            delta={admins.isError ? t('states.errorTitle') : '+8.4%'}
            tone={admins.isError ? 'warning' : 'success'}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard
            label={t('dashboard.roles')}
            value={has(PERMISSIONS.rolesView) ? countValue(roles) : t('common.noAccess')}
            delta={roles.isError ? t('states.errorTitle') : t('dashboard.roles')}
            tone="neutral"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard
            label={t('dashboard.activeSessions')}
            value={
              has(PERMISSIONS.sessionsView)
                ? sessions.isLoading
                  ? '…'
                  : formatNumber(sessions.data?.length ?? 0)
                : t('common.noAccess')
            }
            delta={sessions.isError ? t('states.errorTitle') : t('dashboard.live')}
            tone={sessions.isError ? 'warning' : 'success'}
          />
        </Grid>

        <Grid size={{ xs: 12, lg: 8 }}>
          <SectionCard
            title={t('dashboard.accessActivity')}
            description={t('dashboard.accessActivityDescription')}
          >
            <LineChart
              height={300}
              series={[{ data: trend, area: true, label: t('dashboard.requests') }]}
              xAxis={[
                {
                  scaleType: 'point',
                  data: trend.map((_, i) => `W${i + 1}`),
                },
              ]}
              grid={{ horizontal: true }}
            />
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <SectionCard
            title={t('dashboard.permissionActions')}
            description={t('dashboard.permissionActionsDescription')}
          >
            <BarChart
              height={300}
              series={[{ data: bars, label: t('dashboard.actions') }]}
              xAxis={[
                {
                  scaleType: 'band',
                  data: [
                    t('dashboard.mon'),
                    t('dashboard.tue'),
                    t('dashboard.wed'),
                    t('dashboard.thu'),
                    t('dashboard.fri'),
                    t('dashboard.sat'),
                    t('dashboard.sun'),
                  ],
                },
              ]}
              grid={{ horizontal: true }}
            />
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <SectionCard title={t('dashboard.recentAuditLogs')}>
            {!has(PERMISSIONS.auditLogsView) && (
              <Typography color="text.secondary">{t('states.permissionDescription')}</Typography>
            )}
            {audits.isError && <ErrorState />}
            {has(PERMISSIONS.auditLogsView) && !audits.isError && (
              <Stack spacing={1.25}>
                {(audits.data?.items ?? []).map((row) => (
                  <Stack
                    key={row.id}
                    direction={{ xs: 'column', md: 'row' }}
                    alignItems={{ xs: 'flex-start', md: 'center' }}
                    justifyContent="space-between"
                    spacing={1}
                  >
                    <Stack spacing={0.25}>
                      <Typography fontWeight={600}>{row.action}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {row.actor_label || t('common.system')} · {row.resource_type}
                      </Typography>
                    </Stack>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <StatusBadge status={row.status} />
                      <Typography variant="body2" color="text.secondary">
                        {formatDateTime(row.created_at)}
                      </Typography>
                    </Stack>
                  </Stack>
                ))}
                {!audits.isLoading && (audits.data?.items.length ?? 0) === 0 && (
                  <Typography color="text.secondary">{t('dashboard.noAudit')}</Typography>
                )}
              </Stack>
            )}
          </SectionCard>
        </Grid>
      </Grid>
    </>
  );
}
