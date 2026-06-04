import type { ReactNode } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

interface StatCardProps {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  /** e.g. "+12% vs last month" */
  trend?: string;
  trendColor?: 'success' | 'error' | 'warning' | 'text.secondary';
  delta?: string;
  tone?: 'success' | 'error' | 'warning' | 'info' | 'neutral';
}

/** Compact KPI card used in the dashboard and list-page metric rows. */
export function StatCard({
  label,
  value,
  icon,
  trend,
  trendColor = 'text.secondary',
  delta,
  tone,
}: StatCardProps) {
  const toneColor =
    tone === 'success'
      ? 'success.main'
      : tone === 'error'
        ? 'error.main'
        : tone === 'warning'
          ? 'warning.main'
          : 'text.secondary';
  const footer = trend ?? delta;

  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          {icon && (
            <Box
              sx={{
                color: 'primary.main',
                display: 'flex',
                bgcolor: 'panel.raised',
                borderRadius: 1.5,
                p: 0.75,
              }}
            >
              {icon}
            </Box>
          )}
        </Stack>
        <Typography variant="h2" sx={{ mt: 1.5 }}>
          {value}
        </Typography>
        {footer && (
          <Typography
            variant="caption"
            sx={{ color: tone ? toneColor : trendColor, mt: 0.5 }}
          >
            {footer}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
