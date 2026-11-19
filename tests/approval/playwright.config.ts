import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: 'public-link.spec.ts',
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4173', serviceWorkers: 'block' },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    cwd: process.cwd(),
    reuseExistingServer: false,
  },
});
