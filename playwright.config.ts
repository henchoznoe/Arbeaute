import { defineConfig, devices } from '@playwright/test'

const baseURL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://127.0.0.1:3100'

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  timeout: 90_000,
  snapshotPathTemplate:
    '{testDir}/{testFilePath}-snapshots/{arg}-{projectName}{ext}',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'list',
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      maxDiffPixelRatio: 0.05,
    },
  },
  use: {
    baseURL,
    locale: 'fr-CH',
    serviceWorkers: 'allow',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm exec next start -p 3100',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'mobile-small',
      use: {
        ...devices['iPhone SE'],
        browserName: 'chromium',
        viewport: { width: 360, height: 780 },
      },
    },
    {
      name: 'mobile-large',
      testMatch: /mobile-shells\.spec\.ts/,
      use: {
        ...devices['iPhone 15 Pro Max'],
        browserName: 'chromium',
        viewport: { width: 430, height: 932 },
      },
    },
  ],
})
