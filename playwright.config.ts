import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/integration',
  timeout: 30000,
  use: {
    headless: false,
    viewport: null,
    launchOptions: {
      slowMo: 100,
    },
  },
  projects: [
    {
      name: 'electron',
      testMatch: /.*\.playwright\.test\.ts/,
    },
  ],
});
