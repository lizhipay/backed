import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from './resources';

export type SupportedLanguage = 'zh-CN' | 'zh-TW' | 'ja-JP' | 'en-US';
export type LanguagePreference = 'auto' | SupportedLanguage;

export const LANGUAGE_STORAGE_KEY = 'backed-admin.language';

export const languageOptions: {
  value: LanguagePreference;
  labelKey: string;
}[] = [
  { value: 'auto', labelKey: 'languages.auto' },
  { value: 'zh-CN', labelKey: 'languages.zhCN' },
  { value: 'zh-TW', labelKey: 'languages.zhTW' },
  { value: 'ja-JP', labelKey: 'languages.jaJP' },
  { value: 'en-US', labelKey: 'languages.enUS' },
];

export function detectBrowserLanguage(): SupportedLanguage {
  const nav = typeof navigator === 'undefined' ? undefined : navigator;
  const langs = nav?.languages?.length ? nav.languages : [nav?.language ?? 'zh-CN'];
  for (const lang of langs) {
    const normalized = lang.toLowerCase();
    if (normalized.startsWith('zh-tw') || normalized.startsWith('zh-hk') || normalized.includes('hant')) {
      return 'zh-TW';
    }
    if (normalized.startsWith('zh')) return 'zh-CN';
    if (normalized.startsWith('ja')) return 'ja-JP';
    if (normalized.startsWith('en')) return 'en-US';
  }
  return 'zh-CN';
}

export function normalizeLanguagePreference(value: unknown): LanguagePreference {
  return value === 'zh-CN' || value === 'zh-TW' || value === 'ja-JP' || value === 'en-US' || value === 'auto'
    ? value
    : 'auto';
}

export function resolveLanguage(value: LanguagePreference): SupportedLanguage {
  return value === 'auto' ? detectBrowserLanguage() : value;
}

export function readLanguagePreference(): LanguagePreference {
  try {
    const storage = globalThis.localStorage;
    if (typeof storage?.getItem !== 'function') return 'auto';
    return normalizeLanguagePreference(storage.getItem(LANGUAGE_STORAGE_KEY));
  } catch {
    return 'auto';
  }
}

i18n.use(initReactI18next).init({
  resources,
  lng: resolveLanguage(readLanguagePreference()),
  fallbackLng: ['en-US', 'zh-CN'],
  interpolation: { escapeValue: false },
  returnNull: false,
});

export { i18n };
