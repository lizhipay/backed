import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import { useTranslation } from 'react-i18next';
import { api } from '@/foundation/api';
import type { AuditLog, SessionInfo } from '@/foundation/api';
import { auditActionLabel, resourceTypeLabel } from '@/foundation/i18n';
import { Can, PERMISSIONS } from '@/foundation/permissions';
import {
  ConfirmDialog,
  DataTable,
  PageHeader,
  QueryBoundary,
  SectionCard,
  StatusBadge,
} from '@/foundation/ui';
import { formatDateTime } from '@/foundation/utils';

const defaultPagination: GridPaginationModel = { page: 0, pageSize: 10 };

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return debounced;
}

function TableToolbar({
  search,
  onSearchChange,
  searchLabel,
  filters,
  onRefresh,
}: {
  search?: string;
  onSearchChange?: (value: string) => void;
  searchLabel?: string;
  filters?: ReactNode;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={1.5}
      alignItems={{ xs: 'stretch', md: 'center' }}
      justifyContent="space-between"
      sx={{ mb: 2 }}
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ flex: 1 }}>
        {onSearchChange && (
          <TextField
            size="small"
            label={searchLabel}
            value={search ?? ''}
            onChange={(event) => onSearchChange(event.target.value)}
            sx={{ minWidth: { xs: '100%', sm: 280 } }}
          />
        )}
        {filters}
      </Stack>
      <Button
        variant="outlined"
        startIcon={<RefreshOutlinedIcon />}
        onClick={onRefresh}
      >
        {t('common.refresh')}
      </Button>
    </Stack>
  );
}

export function SessionsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'revoked'>('all');
  const [searchText, setSearchText] = useState('');
  const search = useDebouncedValue(searchText).trim().toLowerCase();
  const [revokeTarget, setRevokeTarget] = useState<SessionInfo | null>(null);
  const query = useQuery({
    queryKey: ['sessions', statusFilter],
    queryFn: () =>
      api.get<SessionInfo[]>('/sessions', {
        params: { active: statusFilter === 'active' ? true : undefined },
      }),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/sessions/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['sessions'] });
      setRevokeTarget(null);
    },
  });
  const columns = useMemo<GridColDef<SessionInfo>[]>(
    () => [
      { field: 'admin_id', headerName: t('security.adminId'), minWidth: 260, flex: 1 },
      { field: 'ip', headerName: t('security.ip'), minWidth: 140, flex: 0.7 },
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
          <Can perm={PERMISSIONS.sessionsRevoke}>
            <Button
              size="small"
              startIcon={<LogoutOutlinedIcon />}
              disabled={Boolean(row.revoked_at) || revoke.isPending}
              onClick={() => setRevokeTarget(row)}
            >
              {t('security.revoke')}
            </Button>
          </Can>
        ),
      },
    ],
    [revoke.isPending, t],
  );

  return (
    <QueryBoundary query={query}>
      {(sessions) => {
        const rows = sessions.filter((session) => {
          const matchesStatus =
            statusFilter === 'all' ||
            (statusFilter === 'active' && !session.revoked_at) ||
            (statusFilter === 'revoked' && Boolean(session.revoked_at));
          const haystack = [
            session.id,
            session.admin_id,
            session.ip,
            session.user_agent,
            session.revoked_reason ?? '',
          ]
            .join(' ')
            .toLowerCase();
          return matchesStatus && (!search || haystack.includes(search));
        });
        return (
          <>
            <PageHeader
              title={t('security.sessionsTitle')}
              description={t('security.sessionsDescription')}
            />
            <TableToolbar
              search={searchText}
              onSearchChange={setSearchText}
              searchLabel={t('security.sessionSearchPlaceholder')}
              onRefresh={() => void query.refetch()}
              filters={
                <TextField
                  select
                  size="small"
                  label={t('security.status')}
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as 'all' | 'active' | 'revoked')
                  }
                  sx={{ minWidth: 160 }}
                >
                  <MenuItem value="all">{t('common.all')}</MenuItem>
                  <MenuItem value="active">{t('common.active')}</MenuItem>
                  <MenuItem value="revoked">{t('common.revoked')}</MenuItem>
                </TextField>
              }
            />
            <DataTable rows={rows} columns={columns} getRowId={(row) => row.id} />
            <ConfirmDialog
              open={Boolean(revokeTarget)}
              title={t('security.revokeSessionTitle')}
              description={t('security.revokeSessionDescription', {
                ip: revokeTarget?.ip ?? '',
              })}
              confirmLabel={t('security.revoke')}
              destructive
              loading={revoke.isPending}
              onClose={() => setRevokeTarget(null)}
              onConfirm={() => {
                if (revokeTarget) revoke.mutate(revokeTarget.id);
              }}
            />
          </>
        );
      }}
    </QueryBoundary>
  );
}

function AuditDetail({
  log,
  onClose,
}: {
  log: AuditLog | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog open={Boolean(log)} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          {t('security.auditDetail')}
          <IconButton onClick={onClose} aria-label={t('common.close')}>
            <CloseOutlinedIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>
        {log && (
          <Stack spacing={2}>
            <SectionCard title={auditActionLabel(log, t)}>
              <Stack spacing={1}>
                <Typography color="text.secondary">
                  {t('security.actor')}: {log.actor_label || t('common.system')}
                </Typography>
                <Typography color="text.secondary">
                  {t('security.resource')}: {resourceTypeLabel(log.resource_type, t)} /{' '}
                  {log.resource_id || t('common.notAvailable')}
                </Typography>
                <Typography color="text.secondary">
                  {t('security.requestId')}: {log.request_id || t('common.notAvailable')}
                </Typography>
                <Typography color="text.secondary">
                  {t('security.userAgent')}: {log.user_agent || t('common.notAvailable')}
                </Typography>
              </Stack>
            </SectionCard>
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 2,
                borderRadius: 1,
                bgcolor: 'panel.raised',
                border: '1px solid',
                borderColor: 'border.main',
                overflow: 'auto',
              }}
            >
              {JSON.stringify(log.changes ?? {}, null, 2)}
            </Box>
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AuditLogsPage() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [paginationModel, setPaginationModel] =
    useState<GridPaginationModel>(defaultPagination);
  const [action, setAction] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [status, setStatus] = useState('all');
  const actionQuery = useDebouncedValue(action);
  const resourceQuery = useDebouncedValue(resourceType);
  useEffect(() => {
    setPaginationModel((current) => ({ ...current, page: 0 }));
  }, [actionQuery, resourceQuery, status]);

  const query = useQuery({
    queryKey: [
      'audit-logs',
      paginationModel.page,
      paginationModel.pageSize,
      actionQuery,
      resourceQuery,
      status,
    ],
    queryFn: () =>
      api.list<AuditLog>('/audit-logs', {
        params: {
          page: paginationModel.page + 1,
          page_size: paginationModel.pageSize,
          action: actionQuery,
          resource_type: resourceQuery,
          status: status === 'all' ? '' : status,
        },
      }),
  });
  const columns = useMemo<GridColDef<AuditLog>[]>(
    () => [
      {
        field: 'action',
        headerName: t('security.action'),
        minWidth: 220,
        flex: 1,
        valueGetter: (_, row) => auditActionLabel(row, t),
      },
      { field: 'actor_label', headerName: t('security.actor'), minWidth: 180, flex: 0.9 },
      {
        field: 'resource_type',
        headerName: t('security.resource'),
        minWidth: 150,
        flex: 0.7,
        valueGetter: (_, row) => resourceTypeLabel(row.resource_type, t),
      },
      {
        field: 'status',
        headerName: t('security.status'),
        width: 130,
        renderCell: ({ row }) => <StatusBadge status={row.status} />,
      },
      { field: 'ip', headerName: t('security.ip'), minWidth: 130, flex: 0.6 },
      {
        field: 'created_at',
        headerName: t('security.created'),
        minWidth: 180,
        valueGetter: (_, row) => formatDateTime(row.created_at),
      },
      {
        field: 'actions',
        headerName: '',
        width: 110,
        sortable: false,
        renderCell: ({ row }) => (
          <Button
            size="small"
            startIcon={<VisibilityOutlinedIcon />}
            onClick={() => setSelected(row)}
          >
            {t('common.view')}
          </Button>
        ),
      },
    ],
    [t],
  );

  return (
    <QueryBoundary query={query}>
      {(logs) => (
        <>
          <PageHeader
            title={t('security.auditTitle')}
            description={t('security.auditDescription')}
          />
          <TableToolbar
            onRefresh={() => void query.refetch()}
            filters={
              <>
                <TextField
                  size="small"
                  label={t('security.action')}
                  value={action}
                  onChange={(event) => setAction(event.target.value)}
                  sx={{ minWidth: { xs: '100%', sm: 190 } }}
                />
                <TextField
                  size="small"
                  label={t('security.resource')}
                  value={resourceType}
                  onChange={(event) => setResourceType(event.target.value)}
                  sx={{ minWidth: { xs: '100%', sm: 190 } }}
                />
                <TextField
                  select
                  size="small"
                  label={t('security.status')}
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  sx={{ minWidth: 150 }}
                >
                  <MenuItem value="all">{t('common.all')}</MenuItem>
                  <MenuItem value="success">{t('common.success')}</MenuItem>
                  <MenuItem value="denied">{t('common.denied')}</MenuItem>
                  <MenuItem value="error">{t('common.error')}</MenuItem>
                  <MenuItem value="failure">{t('common.failure')}</MenuItem>
                </TextField>
              </>
            }
          />
          <DataTable
            rows={logs.items}
            columns={columns}
            getRowId={(row) => row.id}
            loading={query.isFetching}
            rowCount={logs.meta?.total ?? logs.items.length}
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
          />
          <AuditDetail log={selected} onClose={() => setSelected(null)} />
        </>
      )}
    </QueryBoundary>
  );
}
