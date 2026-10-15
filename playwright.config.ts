import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests', testMatch: '**/*.spec.ts', fullyParallel: true,
  use: { baseURL: 'http://127.0.0.1:4177', viewport: { width: 1280, height: 800 }, trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }, { name: 'webkit', use: { browserName: 'webkit' } }],
  webServer: { command: 'npm run dev -- --port 4177 --strictPort', url: 'http://127.0.0.1:4177/tests/fixture.html', reuseExistingServer: !process.env.CI },
});
