import type { ReactNode } from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

interface SectionCardProps {
  title?: string;
  description?: string;
  /** Right-aligned header actions. */
  actions?: ReactNode;
  children: ReactNode;
  /** Remove inner padding (e.g. when embedding a full-bleed table). */
  disableContentPadding?: boolean;
  sx?: object;
}

/** A titled dark panel used to group page content. 12px radius, 1px border. */
export function SectionCard({
  title,
  description,
  actions,
  children,
  disableContentPadding,
  sx,
}: SectionCardProps) {
  return (
    <Card sx={{ width: '100%', ...sx }}>
      {(title || actions) && (
        <>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={2}
            sx={{ px: 2.5, py: 2 }}
          >
            <Box>
              {title && <Typography variant="h5">{title}</Typography>}
              {description && (
                <Typography variant="body2" color="text.secondary">
                  {description}
                </Typography>
              )}
            </Box>
            {actions && (
              <Stack direction="row" spacing={1}>
                {actions}
              </Stack>
            )}
          </Stack>
          <Divider />
        </>
      )}
      {disableContentPadding ? (
        <Box>{children}</Box>
      ) : (
        <CardContent>{children}</CardContent>
      )}
    </Card>
  );
}
