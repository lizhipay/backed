import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { useTranslation } from 'react-i18next';
import { api } from '@/foundation/api';
import { useAuthStore } from '@/foundation/auth';
import { languageOptions, type LanguagePreference } from './i18n';
import { useLanguageStore } from './languageStore';

interface LanguageSelectProps {
  size?: 'small' | 'medium';
  fullWidth?: boolean;
}

export function LanguageSelect({ size = 'small', fullWidth }: LanguageSelectProps) {
  const { t } = useTranslation();
  const preference = useLanguageStore((s) => s.preference);
  const setPreference = useLanguageStore((s) => s.setPreference);
  const me = useAuthStore((s) => s.me);

  const handleChange = (next: LanguagePreference) => {
    setPreference(next);
    if (me) {
      void api.patch('/me', { language_preference: next });
    }
  };

  return (
    <TextField
      select
      size={size}
      fullWidth={fullWidth}
      label={t('settings.language')}
      value={preference}
      onChange={(event) => handleChange(event.target.value as LanguagePreference)}
    >
      {languageOptions.map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {t(option.labelKey)}
        </MenuItem>
      ))}
    </TextField>
  );
}
