import { create } from 'zustand';
import {
  LANGUAGE_STORAGE_KEY,
  i18n,
  readLanguagePreference,
  resolveLanguage,
  type LanguagePreference,
  type SupportedLanguage,
} from './i18n';

interface LanguageState {
  preference: LanguagePreference;
  resolved: SupportedLanguage;
  setPreference: (preference: LanguagePreference) => void;
}

export const useLanguageStore = create<LanguageState>((set) => {
  const preference = readLanguagePreference();
  return {
    preference,
    resolved: resolveLanguage(preference),
    setPreference: (next) => {
      const resolved = resolveLanguage(next);
      try {
        if (typeof globalThis.localStorage?.setItem === 'function') {
          globalThis.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
        }
      } catch {
        // Ignore storage errors; the in-memory language state still updates.
      }
      void i18n.changeLanguage(resolved);
      set({ preference: next, resolved });
    },
  };
});
