import type { SvgIconComponent } from '@mui/icons-material';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import SecurityOutlinedIcon from '@mui/icons-material/SecurityOutlined';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import DevicesOutlinedIcon from '@mui/icons-material/DevicesOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import { PERMISSIONS } from '@/foundation/permissions';

export interface NavItem {
  label?: string;
  labelKey?: string;
  to: string;
  icon: SvgIconComponent;
  /** Required permission to see this item; undefined = always visible. */
  perm?: string;
}

export interface NavSection {
  heading: string;
  headingKey?: string;
  items: NavItem[];
}

/** Real foundation navigation, grouped per plan.md §7.1. */
export const foundationNav: NavSection[] = [
  {
    heading: 'Overview',
    headingKey: 'nav.overview',
    items: [
      {
        labelKey: 'nav.dashboard',
        to: '/dashboard',
        icon: DashboardOutlinedIcon,
      },
    ],
  },
  {
    heading: 'Access Control',
    headingKey: 'nav.accessControl',
    items: [
      {
        labelKey: 'nav.admins',
        to: '/admins',
        icon: GroupOutlinedIcon,
        perm: PERMISSIONS.adminsView,
      },
      {
        labelKey: 'nav.roles',
        to: '/roles',
        icon: SecurityOutlinedIcon,
        perm: PERMISSIONS.rolesView,
      },
      {
        labelKey: 'nav.permissions',
        to: '/permissions',
        icon: VpnKeyOutlinedIcon,
        perm: PERMISSIONS.permissionsView,
      },
    ],
  },
  {
    heading: 'Security',
    headingKey: 'nav.security',
    items: [
      {
        labelKey: 'nav.sessions',
        to: '/sessions',
        icon: DevicesOutlinedIcon,
        perm: PERMISSIONS.sessionsView,
      },
      {
        labelKey: 'nav.auditLogs',
        to: '/audit-logs',
        icon: HistoryOutlinedIcon,
        perm: PERMISSIONS.auditLogsView,
      },
    ],
  },
];
