import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './stories',
  workers: 1,
  retries: 0,
  outputDir: '../test-results/stories',
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:6006', browserName: 'chromium', headless: true },
  webServer: {
    cwd: process.cwd(),
    command: 'npx http-server apps/web/storybook-static -p 6006 --silent',
    url: 'http://127.0.0.1:6006',
    reuseExistingServer: false,
    timeout: 30000,
  },
});
