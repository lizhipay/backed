import { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import CheckOutlinedIcon from '@mui/icons-material/CheckOutlined';
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined';
import { useTranslation } from 'react-i18next';
import { api } from '@/foundation/api';
import { useAuthStore } from '@/foundation/auth';
import { languageOptions, type LanguagePreference } from './i18n';
import { useLanguageStore } from './languageStore';

export function LanguageIconMenu() {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const preference = useLanguageStore((s) => s.preference);
  const setPreference = useLanguageStore((s) => s.setPreference);
  const me = useAuthStore((s) => s.me);
  const open = Boolean(anchorEl);

  const handleChange = (next: LanguagePreference) => {
    setPreference(next);
    setAnchorEl(null);
    if (me) {
      void api.patch('/me', { language_preference: next });
    }
  };

  return (
    <>
      <Tooltip title={t('settings.language')}>
        <IconButton
          size="small"
          onClick={(event) => setAnchorEl(event.currentTarget)}
          aria-label={t('settings.language')}
          aria-controls={open ? 'language-menu' : undefined}
          aria-haspopup="menu"
          aria-expanded={open ? 'true' : undefined}
          sx={{
            width: 34,
            height: 34,
            color: open ? 'primary.main' : 'text.secondary',
            '&:hover': { bgcolor: 'sidebar.active', color: 'text.primary' },
          }}
        >
          <LanguageOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        id="language-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        MenuListProps={{ dense: true, 'aria-label': t('settings.language') }}
      >
        {languageOptions.map((option) => (
          <MenuItem
            key={option.value}
            selected={option.value === preference}
            onClick={() => handleChange(option.value)}
          >
            <ListItemText>{t(option.labelKey)}</ListItemText>
            {option.value === preference && (
              <ListItemIcon sx={{ minWidth: 28, justifyContent: 'flex-end' }}>
                <CheckOutlinedIcon fontSize="small" />
              </ListItemIcon>
            )}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
