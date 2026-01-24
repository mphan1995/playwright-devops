import { defineConfig } from '@playwright/test';

const useWebServer = process.env.PW_USE_SERVER === '1' || Boolean(process.env.CI);

export default defineConfig({
  reporter: [
    ['list'],
    ['json', { outputFile: 'test-results/ui/ui-results.json' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:8080',
  },
  ...(useWebServer
    ? {
        webServer: {
          command: 'npm run serve',
          port: 8080,
          timeout: 120 * 1000,
          reuseExistingServer: !process.env.CI,
        },
      }
    : {}),
});
