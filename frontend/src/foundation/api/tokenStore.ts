import { create } from 'zustand';

interface TokenState {
  accessToken: string | null;
  setAccessToken: (access: string | null) => void;
  clear: () => void;
}

export const useTokenStore = create<TokenState>((set) => ({
  accessToken: null,
  setAccessToken: (accessToken) => set({ accessToken }),
  clear: () => set({ accessToken: null }),
}));

export const tokenStore = {
  get access() {
    return useTokenStore.getState().accessToken;
  },
  set(access: string | null) {
    useTokenStore.getState().setAccessToken(access);
  },
  clear() {
    useTokenStore.getState().clear();
  },
};
