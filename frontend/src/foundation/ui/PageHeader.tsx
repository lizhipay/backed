import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';

export interface Crumb {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Crumb[];
  /** Right-aligned action buttons (Export, Customize, primary action, etc.). */
  actions?: ReactNode;
}

/**
 * Standard page header used on application pages: optional
 * breadcrumbs, title, description, and a right-aligned action cluster. No
 * white top bar — it sits inside the 100%-width dark content area.
 */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: PageHeaderProps) {
  return (
    <Box sx={{ mb: 3 }}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          sx={{ mb: 1, '& .MuiBreadcrumbs-li': { fontSize: 13 } }}
        >
          {breadcrumbs.map((c, i) =>
            c.to && i < breadcrumbs.length - 1 ? (
              <Link
                key={c.label}
                component={RouterLink}
                to={c.to}
                underline="hover"
                color="text.secondary"
                sx={{ fontSize: 13 }}
              >
                {c.label}
              </Link>
            ) : (
              <Typography
                key={c.label}
                color="text.primary"
                sx={{ fontSize: 13 }}
              >
                {c.label}
              </Typography>
            ),
          )}
        </Breadcrumbs>
      )}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
        spacing={2}
      >
        <Box>
          <Typography variant="h1">{title}</Typography>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {description}
            </Typography>
          )}
        </Box>
        {actions && (
          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            {actions}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}
