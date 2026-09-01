import { defineConfig, devices } from '@playwright/test';

/**
 * The end-to-end suite of §13, and the accessibility gate of §5.
 *
 * It runs against the **production export**, not the dev server: §14's budgets
 * and §5's contrast are properties of what ships, and a development bundle
 * differs from it in both. `pnpm --filter @runtrack/web build` writes `dist`,
 * and this serves it statically.
 *
 * There is no back-end here. Every request is intercepted (see `e2e/api.ts`):
 * the point is the screens and their accessibility, and a suite that needs a
 * database running is a suite nobody runs.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: process.env['CI'] === 'true',
  retries: 0,
  reporter: process.env['CI'] === 'true' ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // `--single` so the file-system router's client-side routes resolve: the
    // export is a single-page application, and a 404 on a deep link would be
    // the server's, not the application's.
    command: 'pnpm exec serve dist --single --listen 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: process.env['CI'] !== 'true',
    timeout: 120_000,
  },
});
