import {
  DataGrid,
  type DataGridProps,
  type GridValidRowModel,
} from '@mui/x-data-grid';
import Card from '@mui/material/Card';
import type { SxProps, Theme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
import { EmptyState } from './EmptyState';

/**
 * MUI X Data Grid wrapped in our dark panel styling. Defaults to autosizing
 * rows, a styled toolbar-less grid, and a foundation EmptyState overlay. Spans
 * 100% width per the layout rules.
 */
export function DataTable<R extends GridValidRowModel>({
  sx,
  frame = true,
  cardSx,
  emptyTitle,
  emptyDescription,
  ...props
}: DataGridProps<R> & {
  frame?: boolean;
  cardSx?: SxProps<Theme>;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const { t } = useTranslation();
  const grid = (
    <DataGrid<R>
      autoHeight
      disableColumnMenu
      rowHeight={56}
      columnHeaderHeight={48}
      pageSizeOptions={[10, 25, 50]}
      initialState={{
        pagination: { paginationModel: { pageSize: 10, page: 0 } },
        ...props.initialState,
      }}
      slots={{
        noRowsOverlay: () => (
          <EmptyState
            title={emptyTitle ?? t('states.emptyTitle')}
            description={
              emptyDescription ?? t('states.emptyDescription')
            }
          />
        ),
        ...props.slots,
      }}
      sx={{
        border: 'none',
        '--DataGrid-overlayHeight': '300px',
        '& .MuiDataGrid-columnHeaders': {
          bgcolor: 'panel.raised',
        },
        '& .MuiDataGrid-columnHeaderTitle': {
          fontWeight: 600,
          fontSize: 13,
          color: 'text.secondary',
        },
        '& .MuiDataGrid-cell': {
          fontSize: 13,
          borderColor: 'border.main',
        },
        '& .MuiDataGrid-columnSeparator': { display: 'none' },
        '& .MuiDataGrid-footerContainer': { borderColor: 'border.main' },
        '& .MuiDataGrid-row:hover': { bgcolor: 'panel.raised' },
        ...sx,
      }}
      {...props}
    />
  );
  return frame ? <Card sx={{ width: '100%', ...cardSx }}>{grid}</Card> : grid;
}
