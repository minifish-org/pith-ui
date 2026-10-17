import { defineConfig } from '@playwright/test';

// Parallel checkouts need distinct servers; never silently test another checkout.
const port = Number(process.env.PITH_UI_TEST_PORT ?? 4177);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid PITH_UI_TEST_PORT');
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests', testMatch: '**/*.spec.ts', fullyParallel: true,
  use: { baseURL, viewport: { width: 1280, height: 800 }, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }, { name: 'webkit', use: { browserName: 'webkit' } }],
  webServer: { command: `npm run dev -- --port ${port} --strictPort`, url: `${baseURL}/tests/fixture.html`, reuseExistingServer: !process.env.CI },
});
