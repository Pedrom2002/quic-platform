import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'node:fs'

// Local-only credentials for an isolated [E2E TEST] org/user/event/artist —
// see .env.e2e.local (gitignored). CI supplies the same vars as secrets.
if (existsSync('.env.e2e.local')) process.loadEnvFile('.env.e2e.local')

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev',
        url: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 60_000,
      },
})
