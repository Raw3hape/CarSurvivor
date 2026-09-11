import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const chromeApp = existsSync('/Applications/Google Chrome.app');

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  outputDir: 'test-results',
  use: {
    baseURL: 'http://127.0.0.1:5174',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'off',
    video: 'off',
    viewport: { width: 1280, height: 800 },
    ...(chromeApp ? { channel: 'chrome' as const } : { browserName: 'chromium' as const }),
  },
  // 5173 is occupied by another project; this lab under test is 5174.
  webServer: {
    command: 'npx vite --host 127.0.0.1 --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
