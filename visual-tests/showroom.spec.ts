import { test, expect } from '@playwright/test';

const pages = ['workspace-chat', 'workspace-reading', 'workspace-approval', 'settings-login-page', 'resources-files-page'] as const;
const sizes = [{ width: 900, height: 600 }, { width: 1280, height: 800 }, { width: 1440, height: 900 }] as const;
for (const item of pages) for (const theme of ['light', 'dark'] as const) for (const viewport of sizes) {
  test(`${item} ${theme} ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date('2026-10-16T00:00:00+08:00') });
    await page.goto(`/?item=${item}&theme=${theme}&state=normal&width=${viewport.width}&compare=none&motion=reduced`);
    await expect(page.locator('.gallery-demo-host')).toBeVisible();
    await page.evaluate(async () => { await document.fonts.ready; });
    // Complete the real reader's first frame and the gallery's measurement pass.
    await page.clock.runFor(300);
    await page.clock.pauseAt(new Date('2026-10-16T00:00:01+08:00'));
    await expect(page.locator('.gallery-spec-values')).toContainText('CSS px');
    expect(errors).toEqual([]);
    await expect(page).toHaveScreenshot(`${item}-${theme}-${viewport.width}x${viewport.height}.png`, { fullPage: true });
  });
}
