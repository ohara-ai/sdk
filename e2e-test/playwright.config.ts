import { defineConfig, devices } from '@playwright/test'

const isDocker = !!process.env.PW_TEST_CONNECT_WS_ENDPOINT
const port = process.env.TEST_PORT || '3000'

const baseURL = process.env.BASE_URL
  || (isDocker ? `http://host.docker.internal:${port}` : `http://localhost:${port}`)

export default defineConfig({
  testDir: './browser-tests',
  testMatch: '*.test.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: true,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer:
    process.env.BASE_URL || isDocker
      ? undefined
      : {
          command: 'npm run dev',
          url: `http://localhost:${port}`,
          reuseExistingServer: true,
          timeout: 120 * 1000,
        },
})
