import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid2';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LockOpenOutlinedIcon from '@mui/icons-material/LockOpenOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import { type GridColDef, type GridPaginationModel } from '@mui/x-data-grid';
import { useTranslation } from 'react-i18next';
import { api } from '@/foundation/api';
import type { Admin, AdminStatus, PermissionDef, Role } from '@/foundation/api';
import {
  permissionActionLabel,
  permissionCategoryLabel,
  permissionDescription,
  permissionLabel,
  permissionResourceLabel,
  roleDescription,
  roleDisplayName,
} from '@/foundation/i18n';
import { Can, PERMISSIONS } from '@/foundation/permissions';
import {
  ConfirmDialog,
  DataTable,
  HorizontalTabs,
  PageHeader,
  QueryBoundary,
  StatCard,
  StatusBadge,
} from '@/foundation/ui';
import { formatDateTime } from '@/foundation/utils';

type ListOptions = {
  enabled?: boolean;
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
};
type AdminDetail = { admin: Admin; role_ids: string[] };

const defaultPagination: GridPaginationModel = { page: 0, pageSize: 10 };

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);
  return debounced;
}

function useAdminsList(options: ListOptions = {}) {
  const {
    enabled = true,
    page = 0,
    pageSize = 100,
    search = '',
    status = '',
  } = options;
  return useQuery({
    queryKey: ['admins-list', page, pageSize, search, status],
    enabled,
    queryFn: () =>
      api.list<Admin>('/admins', {
        params: {
          page: page + 1,
          page_size: pageSize,
          q: search,
          status: status === 'all' ? '' : status,
        },
      }),
  });
}

function useRolesList(options: ListOptions = {}) {
  const { enabled = true, page = 0, pageSize = 100, search = '' } = options;
  return useQuery({
    queryKey: ['roles-list', page, pageSize, search],
    enabled,
    queryFn: () =>
      api.list<Role>('/roles', {
        params: { page: page + 1, page_size: pageSize, q: search },
      }),
  });
}

function usePermissionsList(enabled = true) {
  return useQuery({
    queryKey: ['permissions-list'],
    enabled,
    queryFn: () => api.get<PermissionDef[]>('/permissions'),
  });
}

function TableToolbar({
  search,
  onSearchChange,
  searchLabel,
  filters,
  onRefresh,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  searchLabel: string;
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
        <TextField
          size="small"
          label={searchLabel}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          sx={{ minWidth: { xs: '100%', sm: 280 } }}
        />
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

function AdminDialog({
  open,
  admin,
  onClose,
}: {
  open: boolean;
  admin: Admin | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const isEdit = Boolean(admin);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<AdminStatus>('active');

  useEffect(() => {
    if (!open) return;
    setEmail(admin?.email ?? '');
    setUsername(admin?.username ?? '');
    setDisplayName(admin?.display_name ?? '');
    setPassword('');
    setStatus(admin?.status ?? 'active');
  }, [admin, open]);

  const save = useMutation({
    mutationFn: () =>
      isEdit && admin
        ? api.patch<Admin>(`/admins/${admin.id}`, {
            email,
            username,
            display_name: displayName,
            status,
          })
        : api.post<Admin>('/admins', { email, username, password }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admins-list'] });
      onClose();
    },
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {isEdit ? t('admins.editTitle') : t('admins.createTitle')}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label={t('auth.email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label={t('admins.username')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          {isEdit && (
            <>
              <TextField
                label={t('profile.displayName')}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <TextField
                select
                label={t('admins.status')}
                value={status}
                disabled={admin?.is_super_admin}
                onChange={(e) => setStatus(e.target.value as AdminStatus)}
              >
                <MenuItem value="active">{t('common.active')}</MenuItem>
                <MenuItem value="disabled">{t('common.disabled')}</MenuItem>
                <MenuItem value="locked">{t('common.locked')}</MenuItem>
              </TextField>
            </>
          )}
          {!isEdit && (
            <TextField
              label={t('admins.temporaryPassword')}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          variant="contained"
          onClick={() => save.mutate()}
          disabled={
            !email ||
            !username ||
            (!isEdit && password.length < 8) ||
            save.isPending
          }
        >
          {isEdit ? t('common.save') : t('common.create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function AdminAssignmentsDrawer({
  admin,
  onClose,
}: {
  admin: Admin | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [roleIds, setRoleIds] = useState<string[]>([]);
  const roles = useRolesList({ enabled: Boolean(admin), pageSize: 100 });

  useQuery({
    queryKey: ['admin-detail', admin?.id],
    enabled: Boolean(admin),
    queryFn: async () => {
      const res = await api.get<AdminDetail>(`/admins/${admin?.id}`);
      setRoleIds(res.role_ids);
      return res;
    },
  });

  const saveRoles = useMutation({
    mutationFn: () =>
      api.post<{ ok: true }>(`/admins/${admin?.id}/roles`, { ids: roleIds }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admins-list'] });
      void qc.invalidateQueries({ queryKey: ['admin-detail', admin?.id] });
      onClose();
    },
  });

  return (
    <Drawer
      anchor="right"
      open={Boolean(admin)}
      onClose={onClose}
      variant="temporary"
      ModalProps={{ keepMounted: true }}
      sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 600 }, p: 0 } }}
    >
      <Stack sx={{ height: '100%' }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 3, py: 2.5 }}
        >
          <Box>
            <Typography variant="h4">{t('admins.assignTitle')}</Typography>
            <Typography color="text.secondary" variant="body2">
              {admin?.username}
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label={t('common.close')}>
            <CloseOutlinedIcon />
          </IconButton>
        </Stack>
        <Divider />
        <Box sx={{ flex: 1, overflow: 'auto', px: 2.5, py: 2 }}>
          <Stack
            spacing={0}
            sx={{
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'border.main',
              borderRadius: 2,
              bgcolor: 'panel.main',
            }}
          >
            {(roles.data?.items ?? []).map((role, index, all) => {
              const protectedSuperRole =
                admin?.is_super_admin && role.slug === 'super_admin';
              return (
                <FormControlLabel
                  key={role.id}
                  sx={{
                    m: 0,
                    width: '100%',
                    px: 1.5,
                    py: 1.25,
                    borderBottom:
                      index === all.length - 1 ? 'none' : '1px solid',
                    borderColor: 'border.main',
                    alignItems: 'flex-start',
                    '& .MuiFormControlLabel-label': { width: '100%' },
                  }}
                  control={
                    <Checkbox
                      checked={roleIds.includes(role.id)}
                      disabled={protectedSuperRole}
                      sx={{ mt: 0.1 }}
                      onChange={(event) =>
                        setRoleIds((current) =>
                          event.target.checked
                            ? [...current, role.id]
                            : current.filter((id) => id !== role.id),
                        )
                      }
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {roleDisplayName(role, t)}
                      </Typography>
                      <Typography color="text.secondary" variant="caption">
                        {protectedSuperRole
                          ? t('admins.superAdminRoleLocked')
                          : role.slug}
                      </Typography>
                    </Box>
                  }
                />
              );
            })}
          </Stack>
        </Box>
        <Divider />
        <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ p: 2 }}>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          <Button
            variant="contained"
            startIcon={<SaveOutlinedIcon />}
            onClick={() => saveRoles.mutate()}
            disabled={saveRoles.isPending}
          >
            {t('common.save')}
          </Button>
        </Stack>
      </Stack>
    </Drawer>
  );
}

export function AdminsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [paginationModel, setPaginationModel] =
    useState<GridPaginationModel>(defaultPagination);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const search = useDebouncedValue(searchText);
  const [editing, setEditing] = useState<Admin | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [assigning, setAssigning] = useState<Admin | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Admin | null>(null);
  const [forceTarget, setForceTarget] = useState<Admin | null>(null);
  const query = useAdminsList({
    page: paginationModel.page,
    pageSize: paginationModel.pageSize,
    search,
    status: statusFilter,
  });

  useEffect(() => {
    setPaginationModel((current) => ({ ...current, page: 0 }));
  }, [search, statusFilter]);

  const setStatus = useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: 'enable' | 'disable';
    }) => api.post<{ ok: true }>(`/admins/${id}/${status}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admins-list'] }),
  });
  const deleteAdmin = useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/admins/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admins-list'] });
      setDeleteTarget(null);
    },
  });
  const forceLogout = useMutation({
    mutationFn: (id: string) =>
      api.post<{ revoked: number }>(`/admins/${id}/force-logout`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admins-list'] });
      setForceTarget(null);
    },
  });

  const columns = useMemo<GridColDef<Admin>[]>(
    () => [
      { field: 'username', headerName: t('admins.name'), minWidth: 180, flex: 1 },
      { field: 'email', headerName: t('common.email'), minWidth: 220, flex: 1.2 },
      {
        field: 'status',
        headerName: t('admins.status'),
        width: 130,
        renderCell: ({ row }) => <StatusBadge status={row.status} />,
      },
      {
        field: 'mfa_enabled',
        headerName: t('admins.mfa'),
        width: 110,
        renderCell: ({ row }) =>
          row.mfa_enabled ? t('common.enabled') : t('common.off'),
      },
      {
        field: 'last_login_at',
        headerName: t('admins.lastLogin'),
        minWidth: 180,
        valueGetter: (_, row) => formatDateTime(row.last_login_at),
      },
      {
        field: 'actions',
        headerName: '',
        width: 430,
        sortable: false,
        renderCell: ({ row }) => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Can perm={PERMISSIONS.adminsUpdate}>
              <Button
                size="small"
                startIcon={<EditOutlinedIcon />}
                onClick={() => setEditing(row)}
              >
                {t('common.edit')}
              </Button>
              <Button
                size="small"
                startIcon={<SecurityOutlinedIcon />}
                onClick={() => setAssigning(row)}
              >
                {t('admins.assign')}
              </Button>
            </Can>
            <Can perm={PERMISSIONS.adminsDisable}>
              <Button
                size="small"
                startIcon={
                  row.status === 'active' ? (
                    <BlockOutlinedIcon />
                  ) : (
                    <LockOpenOutlinedIcon />
                  )
                }
                disabled={row.is_super_admin || setStatus.isPending}
                onClick={() =>
                  setStatus.mutate({
                    id: row.id,
                    status: row.status === 'active' ? 'disable' : 'enable',
                  })
                }
              >
                {row.is_super_admin
                  ? t('admins.protected')
                  : row.status === 'active'
                    ? t('admins.disable')
                    : t('admins.enable')}
              </Button>
            </Can>
            <Can perm={PERMISSIONS.sessionsRevoke}>
              <Button
                size="small"
                startIcon={<LogoutOutlinedIcon />}
                onClick={() => setForceTarget(row)}
              >
                {t('admins.forceLogout')}
              </Button>
            </Can>
            <Can perm={PERMISSIONS.adminsDelete}>
              <Tooltip
                title={row.is_super_admin ? t('admins.protected') : ''}
                disableHoverListener={!row.is_super_admin}
              >
                <span>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteOutlinedIcon />}
                    disabled={row.is_super_admin}
                    onClick={() => setDeleteTarget(row)}
                  >
                    {t('common.delete')}
                  </Button>
                </span>
              </Tooltip>
            </Can>
          </Stack>
        ),
      },
    ],
    [setStatus, t],
  );

  return (
    <QueryBoundary query={query}>
      {(data) => (
        <>
          <PageHeader
            title={t('admins.title')}
            description={t('admins.description')}
            actions={
              <Can perm={PERMISSIONS.adminsCreate}>
                <Button
                  variant="contained"
                  startIcon={<AddOutlinedIcon />}
                  onClick={() => setCreateOpen(true)}
                >
                  {t('admins.newAdmin')}
                </Button>
              </Can>
            }
          />
          <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <StatCard
                label={t('admins.total')}
                value={data.meta?.total ?? data.items.length}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <StatCard
                label={t('admins.active')}
                value={data.items.filter((a) => a.status === 'active').length}
                tone="success"
                delta={t('admins.currentPage')}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <StatCard
                label={t('admins.lockedDisabled')}
                value={data.items.filter((a) => a.status !== 'active').length}
                tone="warning"
                delta={t('admins.currentPage')}
              />
            </Grid>
          </Grid>
          <TableToolbar
            search={searchText}
            onSearchChange={setSearchText}
            searchLabel={t('admins.searchPlaceholder')}
            onRefresh={() => void query.refetch()}
            filters={
              <TextField
                select
                size="small"
                label={t('admins.status')}
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                sx={{ minWidth: 150 }}
              >
                <MenuItem value="all">{t('common.all')}</MenuItem>
                <MenuItem value="active">{t('common.active')}</MenuItem>
                <MenuItem value="disabled">{t('common.disabled')}</MenuItem>
                <MenuItem value="locked">{t('common.locked')}</MenuItem>
              </TextField>
            }
          />
          <DataTable
            rows={data.items}
            columns={columns}
            getRowId={(row) => row.id}
            loading={query.isFetching}
            rowCount={data.meta?.total ?? data.items.length}
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
          />
          <AdminDialog
            open={createOpen || Boolean(editing)}
            admin={editing}
            onClose={() => {
              setCreateOpen(false);
              setEditing(null);
            }}
          />
          <AdminAssignmentsDrawer admin={assigning} onClose={() => setAssigning(null)} />
          <ConfirmDialog
            open={Boolean(deleteTarget)}
            title={t('admins.deleteTitle')}
            description={t('admins.deleteDescription', {
              name: deleteTarget?.username ?? '',
            })}
            confirmLabel={t('common.delete')}
            destructive
            loading={deleteAdmin.isPending}
            onClose={() => setDeleteTarget(null)}
            onConfirm={() => {
              if (deleteTarget) deleteAdmin.mutate(deleteTarget.id);
            }}
          />
          <ConfirmDialog
            open={Boolean(forceTarget)}
            title={t('admins.forceLogoutTitle')}
            description={t('admins.forceLogoutDescription', {
              name: forceTarget?.username ?? '',
            })}
            confirmLabel={t('admins.forceLogout')}
            destructive
            loading={forceLogout.isPending}
            onClose={() => setForceTarget(null)}
            onConfirm={() => {
              if (forceTarget) forceLogout.mutate(forceTarget.id);
            }}
          />
        </>
      )}
    </QueryBoundary>
  );
}

function RoleDialog({
  open,
  role,
  onClose,
}: {
  open: boolean;
  role: Role | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const isEdit = Boolean(role);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  useEffect(() => {
    if (!open) return;
    setName(role?.name ?? '');
    setDescription(role?.description ?? '');
  }, [open, role]);
  const save = useMutation({
    mutationFn: () =>
      isEdit && role
        ? api.patch<Role>(`/roles/${role.id}`, { name, description })
        : api.post<Role>('/roles', {
            name,
            slug: slugify(name),
            description,
          }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['roles-list'] });
      onClose();
    },
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {isEdit ? t('roles.editTitle') : t('roles.createTitle')}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label={t('admins.name')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label={t('roles.descriptionColumn')}
            value={description}
            multiline
            minRows={3}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          variant="contained"
          disabled={!name || save.isPending}
          onClick={() => save.mutate()}
        >
          {isEdit ? t('common.save') : t('common.create')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function RolePermissionDrawer({
  role,
  onClose,
}: {
  role: Role | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [keys, setKeys] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState('');
  const permissions = usePermissionsList(Boolean(role));
  const detail = useQuery({
    queryKey: ['role-detail', role?.id],
    enabled: Boolean(role),
    queryFn: async () => {
      const res = await api.get<{ role: Role; permission_keys: string[] }>(
        `/roles/${role?.id}`,
      );
      setKeys(res.permission_keys);
      return res;
    },
  });
  const readOnly = (detail.data?.role.slug ?? role?.slug) === 'super_admin';
  const save = useMutation({
    mutationFn: () =>
      api.put<{ ok: true }>(`/roles/${role?.id}/permissions`, { keys }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['role-detail', role?.id] });
      onClose();
    },
  });
  const grouped = useMemo(
    () =>
      (permissions.data ?? []).reduce<Record<string, PermissionDef[]>>(
        (acc, permission) => {
          const key = permission.category || permission.resource;
          acc[key] = [...(acc[key] ?? []), permission];
          return acc;
        },
        {},
      ),
    [permissions.data],
  );
  const categories = useMemo(() => Object.keys(grouped), [grouped]);
  const categoryTabs = useMemo(
    () =>
      categories.map((category) => ({
        value: category,
        label: permissionCategoryLabel(category, t),
      })),
    [categories, t],
  );
  useEffect(() => {
    if (!role) {
      setActiveCategory('');
      return;
    }
    if (categories.length > 0 && !categories.includes(activeCategory)) {
      setActiveCategory(categories[0]);
    }
  }, [activeCategory, categories, role]);
  const selectedCategory = activeCategory || categories[0] || '';
  const visiblePermissions = grouped[selectedCategory] ?? [];

  return (
    <Drawer
      anchor="right"
      open={Boolean(role)}
      onClose={onClose}
      variant="temporary"
      ModalProps={{ keepMounted: true }}
      sx={{ '& .MuiDrawer-paper': { width: { xs: '100%', sm: 600 }, p: 0 } }}
    >
      <Stack sx={{ height: '100%' }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ px: 3, py: 2.5 }}
        >
          <Box>
            <Typography variant="h4">{t('roles.permissionsTitle')}</Typography>
            <Typography color="text.secondary" variant="body2">
              {detail.data?.role
                ? roleDisplayName(detail.data.role, t)
                : role
                  ? roleDisplayName(role, t)
                  : ''}
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label={t('common.close')}>
            <CloseOutlinedIcon />
          </IconButton>
        </Stack>
        <Divider />
        <Box sx={{ px: 3 }}>
          {categoryTabs.length > 0 && (
            <HorizontalTabs
              tabs={categoryTabs}
              value={selectedCategory}
              onChange={setActiveCategory}
              ariaLabel={t('roles.permissionsTitle')}
            />
          )}
        </Box>
        <Box sx={{ flex: 1, overflow: 'auto', px: 2.5, py: 2 }}>
          {readOnly && (
            <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
              {t('roles.superAdminPermissionsReadOnly')}
            </Typography>
          )}
          <Stack
            spacing={0}
            sx={{
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'border.main',
              borderRadius: 2,
              bgcolor: 'panel.main',
            }}
          >
            {visiblePermissions.map((permission, index) => (
              <FormControlLabel
                key={permission.key}
                sx={{
                  m: 0,
                  width: '100%',
                  px: 1.5,
                  py: 1.25,
                  borderBottom:
                    index === visiblePermissions.length - 1
                      ? 'none'
                      : '1px solid',
                  borderColor: 'border.main',
                  alignItems: 'flex-start',
                  '& .MuiFormControlLabel-label': { width: '100%' },
                }}
                control={
                  <Checkbox
                    checked={keys.includes(permission.key)}
                    disabled={readOnly}
                    sx={{ mt: 0.1 }}
                    onChange={(event) =>
                      setKeys((current) =>
                        event.target.checked
                          ? [...current, permission.key]
                          : current.filter((key) => key !== permission.key),
                      )
                    }
                  />
                }
                label={
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr',
                        sm: 'minmax(0, 1fr) auto',
                      },
                      columnGap: 2,
                      rowGap: 0.5,
                      width: '100%',
                      minWidth: 0,
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {permissionLabel(permission, t)}
                      </Typography>
                      <Typography color="text.secondary" variant="body2">
                        {permissionDescription(permission, t)}
                      </Typography>
                    </Box>
                    <Typography
                      color="text.disabled"
                      variant="caption"
                      sx={{ alignSelf: 'center', whiteSpace: 'nowrap' }}
                    >
                      {permission.key}
                    </Typography>
                  </Box>
                }
              />
            ))}
          </Stack>
        </Box>
        <Divider />
        <Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ p: 2 }}>
          <Button onClick={onClose}>{t('common.cancel')}</Button>
          {!readOnly && (
            <Button
              variant="contained"
              startIcon={<SaveOutlinedIcon />}
              onClick={() => save.mutate()}
              disabled={save.isPending}
            >
              {t('common.save')}
            </Button>
          )}
        </Stack>
      </Stack>
    </Drawer>
  );
}

export function RolesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [paginationModel, setPaginationModel] =
    useState<GridPaginationModel>(defaultPagination);
  const [searchText, setSearchText] = useState('');
  const search = useDebouncedValue(searchText);
  const query = useRolesList({
    page: paginationModel.page,
    pageSize: paginationModel.pageSize,
    search,
  });
  const [editing, setEditing] = useState<Role | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Role | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

  useEffect(() => {
    setPaginationModel((current) => ({ ...current, page: 0 }));
  }, [search]);

  const deleteRole = useMutation({
    mutationFn: (id: string) => api.delete<{ ok: true }>(`/roles/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['roles-list'] });
      setDeleteTarget(null);
    },
  });

  const columns = useMemo<GridColDef<Role>[]>(
    () => [
      {
        field: 'name',
        headerName: t('roles.role'),
        minWidth: 180,
        flex: 1,
        valueGetter: (_, row) => roleDisplayName(row, t),
      },
      { field: 'slug', headerName: t('roles.slug'), minWidth: 160, flex: 1 },
      {
        field: 'description',
        headerName: t('roles.descriptionColumn'),
        minWidth: 260,
        flex: 1.4,
        valueGetter: (_, row) => roleDescription(row, t),
      },
      {
        field: 'is_system',
        headerName: t('roles.system'),
        width: 110,
        renderCell: ({ row }) => (row.is_system ? t('common.yes') : t('common.no')),
      },
      {
        field: 'actions',
        headerName: '',
        width: 310,
        sortable: false,
        renderCell: ({ row }) => (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Can perm={PERMISSIONS.rolesUpdate}>
              <Button
                size="small"
                startIcon={<EditOutlinedIcon />}
                onClick={() => setEditing(row)}
              >
                {t('common.edit')}
              </Button>
            </Can>
            <Can perm={PERMISSIONS.rolesAssignPermissions}>
              <Button
                size="small"
                startIcon={<SecurityOutlinedIcon />}
                onClick={() => setSelected(row)}
              >
                {t('common.permissions')}
              </Button>
            </Can>
            <Can perm={PERMISSIONS.rolesDelete}>
              <Tooltip
                title={row.is_system ? t('roles.systemDeleteBlocked') : ''}
                disableHoverListener={!row.is_system}
              >
                <span>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteOutlinedIcon />}
                    disabled={row.is_system}
                    onClick={() => setDeleteTarget(row)}
                  >
                    {t('common.delete')}
                  </Button>
                </span>
              </Tooltip>
            </Can>
          </Stack>
        ),
      },
    ],
    [t],
  );

  return (
    <QueryBoundary query={query}>
      {(data) => (
        <>
          <PageHeader
            title={t('roles.title')}
            description={t('roles.description')}
            actions={
              <Can perm={PERMISSIONS.rolesCreate}>
                <Button
                  variant="contained"
                  startIcon={<AddOutlinedIcon />}
                  onClick={() => setCreateOpen(true)}
                >
                  {t('roles.newRole')}
                </Button>
              </Can>
            }
          />
          <TableToolbar
            search={searchText}
            onSearchChange={setSearchText}
            searchLabel={t('roles.searchPlaceholder')}
            onRefresh={() => void query.refetch()}
          />
          <DataTable
            rows={data.items}
            columns={columns}
            getRowId={(row) => row.id}
            loading={query.isFetching}
            rowCount={data.meta?.total ?? data.items.length}
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
          />
          <RoleDialog
            open={createOpen || Boolean(editing)}
            role={editing}
            onClose={() => {
              setCreateOpen(false);
              setEditing(null);
            }}
          />
          <RolePermissionDrawer role={selected} onClose={() => setSelected(null)} />
          <ConfirmDialog
            open={Boolean(deleteTarget)}
            title={t('roles.deleteTitle')}
            description={t('roles.deleteDescription', {
              name: deleteTarget ? roleDisplayName(deleteTarget, t) : '',
            })}
            confirmLabel={t('common.delete')}
            destructive
            loading={deleteRole.isPending}
            onClose={() => setDeleteTarget(null)}
            onConfirm={() => {
              if (deleteTarget) deleteRole.mutate(deleteTarget.id);
            }}
          />
        </>
      )}
    </QueryBoundary>
  );
}

export function PermissionsPage() {
  const { t } = useTranslation();
  const query = usePermissionsList();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const columns = useMemo<GridColDef<PermissionDef>[]>(
    () => [
      { field: 'key', headerName: t('permissions.key'), minWidth: 220, flex: 1 },
      {
        field: 'category',
        headerName: t('permissions.category'),
        minWidth: 160,
        flex: 0.8,
        valueGetter: (_, row) => permissionCategoryLabel(row.category, t),
      },
      {
        field: 'resource',
        headerName: t('permissions.resource'),
        minWidth: 140,
        flex: 0.7,
        valueGetter: (_, row) => permissionResourceLabel(row.resource, t),
      },
      {
        field: 'action',
        headerName: t('permissions.action'),
        minWidth: 160,
        flex: 0.7,
        valueGetter: (_, row) => permissionActionLabel(row.action, t),
      },
      {
        field: 'description',
        headerName: t('roles.descriptionColumn'),
        minWidth: 260,
        flex: 1.4,
        valueGetter: (_, row) => permissionDescription(row, t),
      },
    ],
    [t],
  );

  return (
    <QueryBoundary query={query}>
      {(data) => {
        const categories = Array.from(new Set(data.map((item) => item.category)));
        const normalizedSearch = search.trim().toLowerCase();
        const rows = data.filter((permission) => {
          const matchesCategory =
            category === 'all' || permission.category === category;
          const haystack = [
            permission.key,
            permission.resource,
            permission.action,
            permission.description,
            permissionLabel(permission, t),
            permissionDescription(permission, t),
          ]
            .join(' ')
            .toLowerCase();
          return matchesCategory && (!normalizedSearch || haystack.includes(normalizedSearch));
        });
        return (
          <>
            <PageHeader
              title={t('permissions.title')}
              description={t('permissions.description')}
            />
            <TableToolbar
              search={search}
              onSearchChange={setSearch}
              searchLabel={t('permissions.searchPlaceholder')}
              onRefresh={() => void query.refetch()}
              filters={
                <TextField
                  select
                  size="small"
                  label={t('permissions.category')}
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  sx={{ minWidth: 190 }}
                >
                  <MenuItem value="all">{t('common.all')}</MenuItem>
                  {categories.map((item) => (
                    <MenuItem key={item} value={item}>
                      {permissionCategoryLabel(item, t)}
                    </MenuItem>
                  ))}
                </TextField>
              }
            />
            <DataTable
              rows={rows}
              columns={columns}
              getRowId={(row) => row.id}
            />
          </>
        );
      }}
    </QueryBoundary>
  );
}
