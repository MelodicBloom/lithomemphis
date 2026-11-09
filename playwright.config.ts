import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 30_000,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  updateSnapshots: process.env.CI ? 'none' : 'missing',
  expect: {
    toHaveScreenshot: { maxDiffPixels: 0, threshold: 0, animations: 'disabled', caret: 'hide' },
  },
  use: {
    baseURL: 'http://127.0.0.1:4173',
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    trace: 'on',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      args: ['--font-render-hinting=none', '--disable-skia-runtime-opts', '--disable-font-subpixel-positioning', '--disable-lcd-text'],
    },
  },
  webServer: [
    {
      command: 'npx vite preview --host 127.0.0.1 --port 4173 --strictPort',
      url: 'http://127.0.0.1:4173/lab/press-cycle',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: 'python3 -m http.server 6007 --bind 127.0.0.1 --directory storybook-static',
      url: 'http://127.0.0.1:6007/index.json',
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
    },
  ],
})
