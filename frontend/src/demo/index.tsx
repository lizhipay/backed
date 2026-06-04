/* eslint-disable react-refresh/only-export-components */
import type { RouteObject } from 'react-router-dom';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid2';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined';
import DynamicFormOutlinedIcon from '@mui/icons-material/DynamicFormOutlined';
import QueryStatsOutlinedIcon from '@mui/icons-material/QueryStatsOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import NotificationsOutlinedIcon from '@mui/icons-material/NotificationsOutlined';
import WidgetsOutlinedIcon from '@mui/icons-material/WidgetsOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import { LineChart, PieChart } from '@mui/x-charts';
import { type GridColDef } from '@mui/x-data-grid';
import type { NavSection } from '@/foundation/layout/navConfig';
import {
  DataTable,
  EmptyState,
  ErrorState,
  PageHeader,
  SectionCard,
  StatCard,
  StatusBadge,
} from '@/foundation/ui';
import { formatCurrency } from '@/foundation/utils';

const orders = [
  {
    id: 'ORD-1001',
    customer: 'Northwind Studio',
    status: 'paid',
    total: 1280,
    created: '2026-05-08',
  },
  {
    id: 'ORD-1002',
    customer: 'Vertex Cloud',
    status: 'processing',
    total: 860,
    created: '2026-05-09',
  },
  {
    id: 'ORD-1003',
    customer: 'Blue Peak',
    status: 'refunded',
    total: 240,
    created: '2026-05-10',
  },
];

const members = [
  {
    id: 'MBR-01',
    name: 'Avery Chen',
    tier: 'Enterprise',
    status: 'active',
    value: 24500,
  },
  {
    id: 'MBR-02',
    name: 'Jordan Lee',
    tier: 'Team',
    status: 'pending',
    value: 8900,
  },
  {
    id: 'MBR-03',
    name: 'Riley Park',
    tier: 'Starter',
    status: 'disabled',
    value: 1200,
  },
];

const products = [
  {
    id: 'PRD-1',
    name: 'Workflow Seat',
    stock: 128,
    status: 'active',
    price: 49,
  },
  { id: 'PRD-2', name: 'Audit Pack', stock: 42, status: 'active', price: 199 },
  {
    id: 'PRD-3',
    name: 'Archive Add-on',
    stock: 0,
    status: 'disabled',
    price: 29,
  },
];

function DemoDataTablePage() {
  const columns: GridColDef<(typeof orders)[number]>[] = [
    { field: 'id', headerName: 'Order', minWidth: 140, flex: 0.7 },
    { field: 'customer', headerName: 'Customer', minWidth: 200, flex: 1 },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: ({ row }) => <StatusBadge status={row.status} />,
    },
    {
      field: 'total',
      headerName: 'Total',
      width: 140,
      valueGetter: (_, row) => formatCurrency(row.total),
    },
  ];
  return (
    <>
      <PageHeader
        title="Demo Table"
        description="Fake data table that can be removed with the demo folder."
      />
      <DataTable rows={orders} columns={columns} getRowId={(row) => row.id} />
    </>
  );
}

function DemoFormPage() {
  return (
    <>
      <PageHeader
        title="Demo Form"
        description="Reusable form composition with fake fields."
      />
      <SectionCard title="Project Intake">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              label="Project name"
              defaultValue="Launch Operations"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField select fullWidth label="Priority" defaultValue="high">
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              multiline
              minRows={5}
              label="Notes"
              defaultValue="Demo-only form content."
            />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Stack direction="row" spacing={2}>
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Require approval"
              />
              <FormControlLabel
                control={<Checkbox />}
                label="Send notification"
              />
            </Stack>
          </Grid>
        </Grid>
      </SectionCard>
    </>
  );
}

function DemoChartsPage() {
  return (
    <>
      <PageHeader
        title="Demo Charts"
        description="MUI X Charts with local fixture arrays."
      />
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <SectionCard title="Revenue">
            <LineChart
              height={300}
              series={[{ data: [12, 18, 22, 31, 42, 51], area: true }]}
            />
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <SectionCard title="Segments">
            <PieChart
              height={300}
              series={[
                {
                  data: [
                    { value: 40, label: 'Core' },
                    { value: 32, label: 'Team' },
                    { value: 28, label: 'Add-ons' },
                  ],
                },
              ]}
            />
          </SectionCard>
        </Grid>
      </Grid>
    </>
  );
}

function DemoOrdersPage() {
  return (
    <>
      <PageHeader title="Demo Orders" description="Fake commerce-style list." />
      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard
            label="Gross Volume"
            value="$2.38M"
            trend="+12.4%"
            trendColor="success"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard
            label="Refund Rate"
            value="1.8%"
            trend="-0.6%"
            trendColor="success"
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <StatCard
            label="Open Orders"
            value="38"
            trend="5 urgent"
            trendColor="warning"
          />
        </Grid>
      </Grid>
      <DemoDataTablePage />
    </>
  );
}

function DemoMembersPage() {
  const columns: GridColDef<(typeof members)[number]>[] = [
    { field: 'name', headerName: 'Member', minWidth: 180, flex: 1 },
    { field: 'tier', headerName: 'Tier', minWidth: 140, flex: 0.7 },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: ({ row }) => <StatusBadge status={row.status} />,
    },
    {
      field: 'value',
      headerName: 'Value',
      width: 150,
      valueGetter: (_, row) => formatCurrency(row.value),
    },
  ];
  return (
    <>
      <PageHeader
        title="Demo Members"
        description="Fake member management table."
      />
      <DataTable rows={members} columns={columns} getRowId={(row) => row.id} />
    </>
  );
}

function DemoMemberDetailPage() {
  return (
    <>
      <PageHeader
        title="Demo Member Detail"
        description="Fake profile, status, and activity sections."
      />
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 4 }}>
          <SectionCard title="Profile">
            <Stack spacing={1}>
              <Typography variant="h4">Avery Chen</Typography>
              <Typography color="text.secondary">
                Enterprise · Active
              </Typography>
              <StatusBadge status="active" />
            </Stack>
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <SectionCard title="Usage">
            <Stack spacing={2}>
              <LinearProgress variant="determinate" value={72} />
              <Typography color="text.secondary">
                72% of monthly quota used.
              </Typography>
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>
    </>
  );
}

function DemoProductsPage() {
  const columns: GridColDef<(typeof products)[number]>[] = [
    { field: 'name', headerName: 'Product', minWidth: 200, flex: 1 },
    { field: 'stock', headerName: 'Stock', width: 120 },
    {
      field: 'status',
      headerName: 'Status',
      width: 140,
      renderCell: ({ row }) => <StatusBadge status={row.status} />,
    },
    {
      field: 'price',
      headerName: 'Price',
      width: 140,
      valueGetter: (_, row) => formatCurrency(row.price),
    },
  ];
  return (
    <>
      <PageHeader
        title="Demo Products"
        description="Fake catalog and inventory list."
      />
      <DataTable rows={products} columns={columns} getRowId={(row) => row.id} />
    </>
  );
}

function DemoNotificationsPage() {
  return (
    <>
      <PageHeader
        title="Demo Notifications"
        description="Fake notification center layout."
      />
      <SectionCard title="Inbox">
        <Stack spacing={2}>
          {[
            'Deployment completed',
            'Billing export ready',
            'New reviewer assigned',
          ].map((item) => (
            <Stack
              key={item}
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography>{item}</Typography>
              <StatusBadge status="processing" label="Unread" />
            </Stack>
          ))}
        </Stack>
      </SectionCard>
    </>
  );
}

function DemoStatesPage() {
  return (
    <>
      <PageHeader
        title="Demo States"
        description="Empty and error presentation states."
      />
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard>
            <EmptyState
              title="No records"
              description="This empty state is demo-only."
            />
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard>
            <ErrorState
              title="Could not load"
              description="This error state is demo-only."
            />
          </SectionCard>
        </Grid>
      </Grid>
    </>
  );
}

function DemoComponentsPage() {
  return (
    <>
      <PageHeader
        title="Demo Components"
        description="Reusable controls and component states."
      />
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 4 }}>
          <SectionCard title="Buttons">
            <Stack spacing={1.5} alignItems="flex-start">
              <Button variant="contained">Primary</Button>
              <Button variant="outlined">Secondary</Button>
              <Button color="error" variant="outlined">
                Danger
              </Button>
            </Stack>
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <SectionCard title="Badges">
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <StatusBadge status="active" />
              <StatusBadge status="pending" />
              <StatusBadge status="locked" />
            </Stack>
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <SectionCard title="Progress">
            <Stack spacing={2}>
              <LinearProgress variant="determinate" value={28} />
              <LinearProgress variant="determinate" value={64} />
              <LinearProgress variant="determinate" value={92} />
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>
    </>
  );
}

export const extraSection: NavSection = {
  heading: 'Demo Pages',
  items: [
    { label: 'Tables', to: '/demo/table', icon: TableChartOutlinedIcon },
    { label: 'Forms', to: '/demo/forms', icon: DynamicFormOutlinedIcon },
    { label: 'Charts', to: '/demo/charts', icon: QueryStatsOutlinedIcon },
    { label: 'Orders', to: '/demo/orders', icon: ReceiptLongOutlinedIcon },
    { label: 'Members', to: '/demo/members', icon: PeopleAltOutlinedIcon },
    {
      label: 'Member Detail',
      to: '/demo/member-detail',
      icon: PeopleAltOutlinedIcon,
    },
    { label: 'Products', to: '/demo/products', icon: Inventory2OutlinedIcon },
    {
      label: 'Notifications',
      to: '/demo/notifications',
      icon: NotificationsOutlinedIcon,
    },
    { label: 'States', to: '/demo/states', icon: ErrorOutlineOutlinedIcon },
    { label: 'Components', to: '/demo/components', icon: WidgetsOutlinedIcon },
  ],
};

export const extraRoutes: RouteObject[] = [
  { path: 'demo/table', element: <DemoDataTablePage /> },
  { path: 'demo/forms', element: <DemoFormPage /> },
  { path: 'demo/charts', element: <DemoChartsPage /> },
  { path: 'demo/orders', element: <DemoOrdersPage /> },
  { path: 'demo/members', element: <DemoMembersPage /> },
  { path: 'demo/member-detail', element: <DemoMemberDetailPage /> },
  { path: 'demo/products', element: <DemoProductsPage /> },
  { path: 'demo/notifications', element: <DemoNotificationsPage /> },
  { path: 'demo/states', element: <DemoStatesPage /> },
  { path: 'demo/components', element: <DemoComponentsPage /> },
];
