/// <reference types="vitest/config" />
import type { UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

interface AppConfig extends UserConfig {
  test: {
    globals: boolean;
    environment: string;
    setupFiles: string;
    css: boolean;
  };
}

function normalizeBase(value?: string) {
  if (!value) return '/';
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

const config: AppConfig = {
  base: normalizeBase(process.env.VITE_ADMIN_BASE),
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
  },
};

export default config;
