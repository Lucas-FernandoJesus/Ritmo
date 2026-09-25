import { defineConfig, devices } from '@playwright/test'

const previewPort = 4173
const previewUrl = `http://127.0.0.1:${previewPort}`

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  globalTeardown: './e2e/global-teardown.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: previewUrl,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    serviceWorkers: 'allow',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'node ./e2e/preview-server.mjs',
    url: previewUrl,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      RITMO_BASE_PATH: '/',
    },
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
