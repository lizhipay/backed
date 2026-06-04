import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'dark' | 'light' | 'auto';
export type Density = 'compact' | 'comfortable';

interface ThemeState {
  mode: ThemeMode;
  density: Density;
  sidebarCollapsed: boolean;
  setMode: (mode: ThemeMode) => void;
  setDensity: (density: Density) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
}

/**
 * Persists appearance preferences locally. `mode` is the user's explicit choice;
 * "auto" defers to the OS at render time (see useResolvedColorScheme). Switching
 * mode never touches the router or component state, so filters/inputs survive.
 */
export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'dark',
      density: 'comfortable',
      sidebarCollapsed: false,
      setMode: (mode) => set({ mode }),
      setDensity: (density) => set({ density }),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
    }),
    { name: 'backed-admin.appearance' },
  ),
);
