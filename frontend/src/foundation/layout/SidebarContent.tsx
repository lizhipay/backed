import { useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import ButtonBase from '@mui/material/ButtonBase';
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined';
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined';
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import MoreVertOutlinedIcon from '@mui/icons-material/MoreVertOutlined';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { useTranslation } from 'react-i18next';
import { api } from '@/foundation/api';
import { BrandLogo } from '@/foundation/ui';
import { useToast } from '@/foundation/ui';
import { PERMISSIONS, usePermissions } from '@/foundation/permissions';
import { useAuth, useAuthStore } from '@/foundation/auth';
import { LanguageIconMenu } from '@/foundation/i18n';
import { useThemeStore, type ThemeMode } from '@/foundation/theme';
import { initials } from '@/foundation/utils';
import { foundationNav, type NavSection } from './navConfig';

export const DRAWER_WIDTH = 264;

function NavGroup({
  section,
  onNavigate,
}: {
  section: NavSection;
  onNavigate?: () => void;
}) {
  const { has } = usePermissions();
  const { t } = useTranslation();
  const visible = section.items.filter((i) => !i.perm || has(i.perm));
  if (visible.length === 0) return null;

  return (
    <List
      dense
      subheader={
        <ListSubheader
          disableSticky
          sx={{
            bgcolor: 'transparent',
            color: 'text.disabled',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            lineHeight: '32px',
            px: 1.5,
          }}
        >
          {section.headingKey ? t(section.headingKey) : section.heading}
        </ListSubheader>
      }
      sx={{ px: 1, py: 0 }}
    >
      {visible.map((item) => (
        <ListItemButton
          key={item.to}
          component={NavLink}
          to={item.to}
          onClick={onNavigate}
          sx={{
            borderRadius: 1.5,
            mb: 0.25,
            color: 'text.secondary',
            '&.active': {
              bgcolor: 'sidebar.active',
              color: 'text.primary',
              '& .MuiListItemIcon-root': { color: 'primary.main' },
            },
            '&:hover': { bgcolor: 'sidebar.active' },
          }}
        >
          <ListItemIcon sx={{ minWidth: 34, color: 'inherit' }}>
            <item.icon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary={item.labelKey ? t(item.labelKey) : item.label}
            primaryTypographyProps={{ fontSize: 13.5, fontWeight: 500 }}
          />
        </ListItemButton>
      ))}
    </List>
  );
}

interface SidebarProps {
  onNavigate?: () => void;
  extraSection?: NavSection;
}

export function SidebarContent({ extraSection, onNavigate }: SidebarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const me = useAuthStore((s) => s.me);
  const setSession = useAuthStore((s) => s.setSession);
  const permissions = useAuthStore((s) => s.permissions);
  const { logout } = useAuth();
  const { notify } = useToast();
  const { has } = usePermissions();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(
    null,
  );
  const [themeMenuAnchor, setThemeMenuAnchor] = useState<null | HTMLElement>(
    null,
  );
  const themeMenuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const userMenuOpen = Boolean(userMenuAnchor);
  const themeMenuOpen = Boolean(themeMenuAnchor);

  const accountName = me?.displayName ?? me?.username ?? t('common.signedIn');

  const clearThemeMenuCloseTimer = () => {
    if (!themeMenuCloseTimer.current) return;
    clearTimeout(themeMenuCloseTimer.current);
    themeMenuCloseTimer.current = null;
  };

  const closeThemeMenu = () => {
    clearThemeMenuCloseTimer();
    setThemeMenuAnchor(null);
  };

  const scheduleThemeMenuClose = () => {
    clearThemeMenuCloseTimer();
    themeMenuCloseTimer.current = setTimeout(() => {
      setThemeMenuAnchor(null);
      themeMenuCloseTimer.current = null;
    }, 140);
  };

  const openThemeMenu = (anchor: HTMLElement) => {
    clearThemeMenuCloseTimer();
    setThemeMenuAnchor(anchor);
  };

  const closeUserMenu = () => {
    closeThemeMenu();
    setUserMenuAnchor(null);
  };

  const handleNavigate = (to: string) => {
    closeUserMenu();
    navigate(to);
    onNavigate?.();
  };

  const handleLogout = async () => {
    closeUserMenu();
    await logout();
    navigate('/login');
    onNavigate?.();
  };

  const handleThemeChange = (nextMode: ThemeMode) => {
    closeUserMenu();
    setMode(nextMode);
    if (!me) return;

    void api
      .patch('/me', { theme_preference: nextMode })
      .then(() => {
        setSession(
          { ...me, themePreference: nextMode },
          Array.from(permissions),
        );
      })
      .catch(() => notify(t('settings.themeSavedLocal'), 'warning'));
  };

  const themeOptions: Array<{
    value: ThemeMode;
    label: string;
  }> = [
    {
      value: 'light',
      label: t('settings.light'),
    },
    {
      value: 'dark',
      label: t('settings.dark'),
    },
    {
      value: 'auto',
      label: t('settings.auto'),
    },
  ];

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'sidebar.bg',
        borderRight: '1px solid',
        borderColor: 'border.main',
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.25}
        sx={{ px: 2, height: 64, flexShrink: 0 }}
      >
        <BrandLogo size={30} />
        <Typography variant="h5" noWrap sx={{ fontWeight: 700, flex: 1 }}>
          Backed Admin
        </Typography>
        <LanguageIconMenu />
      </Stack>

      <Box sx={{ flex: 1, overflowY: 'auto', pb: 2 }}>
        {foundationNav.map((section) => (
          <NavGroup
            key={section.heading}
            section={section}
            onNavigate={onNavigate}
          />
        ))}
        {extraSection && (
          <>
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.75}
              sx={{ px: 2.5, pt: 1, color: 'text.disabled' }}
            >
              <ScienceOutlinedIcon sx={{ fontSize: 14 }} />
              <Typography sx={{ fontSize: 10.5, letterSpacing: '0.06em' }}>
                {t('nav.samplePages')}
              </Typography>
            </Stack>
            <NavGroup section={extraSection} onNavigate={onNavigate} />
          </>
        )}
      </Box>

      <Box
        sx={{
          borderTop: '1px solid',
          borderColor: 'border.main',
          px: 1.5,
          py: 1.25,
          flexShrink: 0,
        }}
      >
        <ButtonBase
          id="sidebar-user-menu-button"
          onClick={(event) => setUserMenuAnchor(event.currentTarget)}
          aria-label={t('userMenu.open')}
          aria-controls={userMenuOpen ? 'sidebar-user-menu' : undefined}
          aria-haspopup="menu"
          aria-expanded={userMenuOpen ? 'true' : undefined}
          sx={{
            width: '100%',
            minWidth: 0,
            borderRadius: 1.5,
            px: 1,
            py: 0.75,
            justifyContent: 'flex-start',
            color: 'text.primary',
            bgcolor: userMenuOpen ? 'sidebar.active' : 'transparent',
            '&:hover': { bgcolor: 'sidebar.active' },
            '&:focus-visible': {
              outline: '2px solid',
              outlineColor: 'primary.main',
              outlineOffset: 2,
            },
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.1}
            sx={{ width: '100%', minWidth: 0 }}
          >
            <Avatar
              src={me?.avatarUrl || undefined}
              sx={{ width: 34, height: 34, fontSize: 13, flexShrink: 0 }}
            >
              {initials(me?.displayName ?? me?.username ?? t('common.user'))}
            </Avatar>
            <Box sx={{ minWidth: 0, textAlign: 'left', flex: 1 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
                {accountName}
              </Typography>
              <Typography variant="caption" color="text.secondary" noWrap>
                {me?.email ?? ''}
              </Typography>
            </Box>
            <MoreVertOutlinedIcon
              fontSize="small"
              sx={{
                color: userMenuOpen ? 'primary.main' : 'text.secondary',
                flexShrink: 0,
              }}
            />
          </Stack>
        </ButtonBase>
        <Menu
          id="sidebar-user-menu"
          anchorEl={userMenuAnchor}
          open={userMenuOpen}
          onClose={closeUserMenu}
          anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          MenuListProps={{
            dense: true,
            'aria-labelledby': 'sidebar-user-menu-button',
          }}
          PaperProps={{
            sx: {
              width: 280,
              maxWidth: 'calc(100vw - 32px)',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'border.main',
              bgcolor: 'panel.raised',
              backgroundImage: 'none',
              boxShadow: (theme) => theme.shadows[12],
              overflow: 'hidden',
            },
          }}
        >
          <Box sx={{ px: 1.5, py: 1.25 }}>
            <Stack direction="row" alignItems="center" spacing={1.25}>
              <Avatar
                src={me?.avatarUrl || undefined}
                sx={{ width: 38, height: 38, fontSize: 14 }}
              >
                {initials(me?.displayName ?? me?.username ?? t('common.user'))}
              </Avatar>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" noWrap sx={{ fontWeight: 700 }}>
                  {accountName}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                  {me?.email ?? ''}
                </Typography>
              </Box>
            </Stack>
          </Box>
          <Divider />
          <MenuItem
            onClick={() => handleNavigate('/profile')}
            onMouseEnter={closeThemeMenu}
          >
            <ListItemIcon>
              <AccountCircleOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('nav.profile')}</ListItemText>
          </MenuItem>
          {has(PERMISSIONS.settingsView) && (
            <MenuItem
              onClick={() => handleNavigate('/settings')}
              onMouseEnter={closeThemeMenu}
            >
              <ListItemIcon>
                <SettingsOutlinedIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>{t('nav.settings')}</ListItemText>
            </MenuItem>
          )}
          <Divider />
          <MenuItem
            selected={themeMenuOpen}
            onClick={(event) => openThemeMenu(event.currentTarget)}
            onFocus={(event) => openThemeMenu(event.currentTarget)}
            onMouseEnter={(event) => openThemeMenu(event.currentTarget)}
            onMouseLeave={scheduleThemeMenuClose}
            aria-haspopup="menu"
            aria-controls={themeMenuOpen ? 'sidebar-theme-menu' : undefined}
            aria-expanded={themeMenuOpen ? 'true' : undefined}
          >
            <ListItemIcon>
              <PaletteOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('userMenu.themeMode')}</ListItemText>
            <ChevronRightOutlinedIcon fontSize="small" />
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={handleLogout}
            onMouseEnter={closeThemeMenu}
            sx={{
              color: 'error.main',
              '& .MuiListItemIcon-root': { color: 'error.main' },
            }}
          >
            <ListItemIcon>
              <LogoutOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t('common.signOut')}</ListItemText>
          </MenuItem>
        </Menu>
        <Popper
          id="sidebar-theme-menu"
          anchorEl={themeMenuAnchor}
          open={themeMenuOpen && userMenuOpen}
          placement="right"
          disablePortal={false}
          sx={{ zIndex: (theme) => theme.zIndex.modal + 1 }}
          modifiers={[
            { name: 'offset', options: { offset: [0, 6] } },
            {
              name: 'preventOverflow',
              options: { padding: 12, boundary: 'viewport' },
            },
          ]}
        >
          <Paper
            elevation={12}
            onMouseEnter={clearThemeMenuCloseTimer}
            onMouseLeave={scheduleThemeMenuClose}
            sx={{
              width: 168,
              maxWidth: 'calc(100vw - 32px)',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'border.main',
              bgcolor: 'panel.raised',
              backgroundImage: 'none',
              overflow: 'hidden',
            }}
          >
            <List
              dense
              role="menu"
              aria-label={t('userMenu.themeMode')}
              sx={{ py: 0.5 }}
            >
              {themeOptions.map((option) => (
                <MenuItem
                  key={option.value}
                  role="menuitemradio"
                  aria-checked={option.value === mode}
                  selected={option.value === mode}
                  onClick={() => handleThemeChange(option.value)}
                  sx={{ minHeight: 42, px: 1.5 }}
                >
                  <ListItemIcon sx={{ minWidth: 30 }}>
                    {option.value === mode ? (
                      <CheckOutlinedIcon fontSize="small" color="primary" />
                    ) : null}
                  </ListItemIcon>
                  <ListItemText>{option.label}</ListItemText>
                </MenuItem>
              ))}
            </List>
          </Paper>
        </Popper>
      </Box>
    </Box>
  );
}
