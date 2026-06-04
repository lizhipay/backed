import type { ReactElement, ReactNode } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { PageHeader } from './PageHeader';

export interface AppTab<T extends string> {
  value: T;
  label: string;
  icon?: ReactElement;
}

export function HorizontalTabs<T extends string>({
  tabs,
  value,
  onChange,
  ariaLabel,
}: {
  tabs: AppTab<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <Box sx={{ borderBottom: '1px solid', borderColor: 'border.main' }}>
      <Tabs
        value={value}
        onChange={(_, next) => onChange(next as T)}
        variant="scrollable"
        scrollButtons="auto"
        aria-label={ariaLabel}
        sx={{
          minHeight: 46,
          '& .MuiTabs-indicator': { height: 2 },
          '& .MuiTab-root': {
            minHeight: 46,
            px: 1.5,
            mr: 1,
            textTransform: 'none',
            color: 'text.secondary',
            fontWeight: 600,
          },
          '& .MuiTab-root.Mui-selected': { color: 'text.primary' },
        }}
      >
        {tabs.map((tab) => (
          <Tab
            key={tab.value}
            value={tab.value}
            label={tab.label}
            {...(tab.icon
              ? { icon: tab.icon, iconPosition: 'start' as const }
              : {})}
          />
        ))}
      </Tabs>
    </Box>
  );
}

export function SettingsLayout<T extends string>({
  title,
  description,
  tabs,
  value,
  onChange,
  ariaLabel,
  children,
  maxWidth = 1040,
}: {
  title: string;
  description?: string;
  tabs: AppTab<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  children: ReactNode;
  maxWidth?: number | string;
}) {
  return (
    <Box sx={{ width: '100%', maxWidth, mx: 'auto' }}>
      <PageHeader title={title} description={description} />
      <HorizontalTabs
        tabs={tabs}
        value={value}
        onChange={onChange}
        ariaLabel={ariaLabel}
      />
      <Box sx={{ pt: 2.75 }}>{children}</Box>
    </Box>
  );
}

export function SettingsPanel({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <Card
      sx={{
        width: '100%',
        overflow: 'hidden',
        bgcolor: 'panel.main',
        boxShadow: (theme) =>
          theme.palette.mode === 'light'
            ? '0 14px 40px rgba(15, 23, 42, 0.06)'
            : 'none',
        '& > .settings-section + .settings-section': {
          borderTop: '1px solid',
          borderColor: 'border.main',
        },
      }}
    >
      {children}
    </Card>
  );
}

export function SettingsSection({
  title,
  description,
  actions,
  children,
  contentMaxWidth = 560,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  contentMaxWidth?: number | string;
}) {
  return (
    <Box
      className="settings-section"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '220px minmax(0, 1fr)' },
        gap: { xs: 2, md: 4 },
        px: { xs: 2, md: 3 },
        py: { xs: 2.25, md: 3 },
      }}
    >
      <Box>
        <Typography variant="h5">{title}</Typography>
        {description && (
          <Typography color="text.secondary" variant="body2" sx={{ mt: 0.75 }}>
            {description}
          </Typography>
        )}
      </Box>
      <Stack spacing={2} sx={{ minWidth: 0, maxWidth: contentMaxWidth, width: '100%' }}>
        {children}
        {actions && (
          <Stack
            direction="row"
            justifyContent="flex-end"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
          >
            {actions}
          </Stack>
        )}
      </Stack>
    </Box>
  );
}

export function TabContent({
  children,
  maxWidth = 1080,
}: {
  children: ReactNode;
  maxWidth?: number | string;
}) {
  return (
    <Box sx={{ width: '100%', maxWidth, pt: 3 }}>
      {children}
    </Box>
  );
}

export function SettingsRow({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '260px minmax(0, 1fr)' },
          gap: { xs: 2, md: 4 },
          py: 3,
        }}
      >
        <Box>
          <Typography variant="h5">{title}</Typography>
          {description && (
            <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
              {description}
            </Typography>
          )}
        </Box>
        <Stack spacing={2} sx={{ minWidth: 0 }}>
          {children}
          {actions && (
            <Stack direction="row" justifyContent="flex-end" spacing={1}>
              {actions}
            </Stack>
          )}
        </Stack>
      </Box>
      <Divider />
    </Box>
  );
}
