import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      // 401 from an authorized endpoint counts as "ready" for Playwright.
      command: 'dotnet run --project ../backend/FleetGo.Api --urls http://localhost:5200',
      url: 'http://localhost:5200/api/v1/routes/today',
      reuseExistingServer: true,
      timeout: 180_000,
    },
    {
      command: 'npm start',
      url: 'http://localhost:4200',
      reuseExistingServer: true,
      timeout: 180_000,
    },
  ],
});
