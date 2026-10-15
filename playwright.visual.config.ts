import { chromium, defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './visual-tests', testMatch: '**/*.spec.ts', fullyParallel: false, workers: 1,
  snapshotDir: './visual-baselines/darwin-arm64',
  snapshotPathTemplate: '{snapshotDir}/{arg}{ext}',
  updateSnapshots: 'none',
  outputDir: './visual-results',
  reporter: 'list',
  // Ignore only tiny color rounding at antialiased edges; accept no changed pixels beyond it.
  expect: { toHaveScreenshot: { animations: 'disabled', caret: 'hide', scale: 'css', maxDiffPixels: 0, threshold: 0.02 } },
  use: {
    browserName: 'chromium',
    launchOptions: { executablePath: chromium.executablePath() },
    baseURL: 'http://127.0.0.1:4178', deviceScaleFactor: 1,
    locale: 'en-US', timezoneId: 'Asia/Singapore', reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  webServer: { command: 'npm run dev -- --port 4178 --strictPort', url: 'http://127.0.0.1:4178', reuseExistingServer: !process.env.CI },
});
