import { Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';

/**
 * Full-screen centered layout for unauthenticated pages (login, forgot/reset
 * password). No sidebar, no top bar — a dark background with a centered card.
 */
export function AuthLayout() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Outlet />
    </Box>
  );
}
