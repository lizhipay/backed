import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import MenuIcon from '@mui/icons-material/Menu';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { BrandLogo } from '@/foundation/ui';
import { SidebarContent, DRAWER_WIDTH } from './SidebarContent';
import type { NavSection } from './navConfig';

/**
 * The application shell: a fixed 264px dark sidebar plus a 100%-width main
 * content area (no max-width container). On mobile the sidebar becomes a
 * temporary drawer behind a top app bar. Child routes render in the Outlet.
 */
export function AppShell({ extraSection }: { extraSection?: NavSection }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      {isDesktop ? (
        <Box
          component="nav"
          sx={{ width: DRAWER_WIDTH, flexShrink: 0 }}
          aria-label={t('nav.mainNavigation')}
        >
          <Drawer
            variant="permanent"
            open
            sx={{
              '& .MuiDrawer-paper': {
                width: DRAWER_WIDTH,
                boxSizing: 'border-box',
                borderRight: 'none',
              },
            }}
          >
            <SidebarContent extraSection={extraSection} />
          </Drawer>
        </Box>
      ) : (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH,
              boxSizing: 'border-box',
            },
          }}
        >
          <SidebarContent
            extraSection={extraSection}
            onNavigate={() => setMobileOpen(false)}
          />
        </Drawer>
      )}

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minWidth: 0,
          bgcolor: 'background.default',
          minHeight: '100vh',
        }}
      >
        {!isDesktop && (
          <AppBar
            position="sticky"
            color="default"
            elevation={0}
            sx={{
              bgcolor: 'sidebar.bg',
              borderBottom: '1px solid',
              borderColor: 'border.main',
            }}
          >
            <Toolbar variant="dense">
              <IconButton
                edge="start"
                onClick={() => setMobileOpen(true)}
                aria-label={t('nav.openNavigation')}
                sx={{ mr: 1 }}
              >
                <MenuIcon />
              </IconButton>
              <BrandLogo size={26} />
              <Typography variant="h6" sx={{ ml: 1 }}>
                Backed Admin
              </Typography>
            </Toolbar>
          </AppBar>
        )}
        <Box sx={{ p: 3, width: '100%' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
