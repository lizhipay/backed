import { create } from 'zustand';
import type { CurrentUser } from '@/foundation/api/types';

interface AuthState {
  me: CurrentUser | null;
  permissions: Set<string>;
  /** True once the initial /me probe has resolved (success or failure). */
  initialized: boolean;
  setSession: (me: CurrentUser, permissions: string[]) => void;
  setInitialized: (v: boolean) => void;
  clear: () => void;
}

/**
 * Holds the current admin profile and their effective permission set. Tokens
 * live in the api token store; this store is the in-memory identity used by
 * guards, the nav, and `<Can>` checks.
 */
export const useAuthStore = create<AuthState>((set) => ({
  me: null,
  permissions: new Set(),
  initialized: false,
  setSession: (me, permissions) =>
    set({ me, permissions: new Set(permissions) }),
  setInitialized: (initialized) => set({ initialized }),
  clear: () => set({ me: null, permissions: new Set() }),
}));
