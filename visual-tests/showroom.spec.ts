import { test, expect } from '@playwright/test';
import packageMetadata from '../package.json' with { type: 'json' };

const pages = ['workspace-chat', 'workspace-reading', 'workspace-approval', 'settings-login-page', 'resources-files-page'] as const;
const sizes = [{ width: 900, height: 600 }, { width: 1280, height: 800 }, { width: 1440, height: 900 }] as const;
for (const item of pages) for (const theme of ['light', 'dark'] as const) for (const viewport of sizes) {
  test(`${item} ${theme} ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date('2026-10-15T23:59:00+08:00') });
    // Pause before navigation: font/network latency must not move the clock
    // beyond a fixed timestamp while the page is loading under test load.
    await page.clock.pauseAt(new Date('2026-10-16T00:00:00+08:00'));
    await page.goto(`/?item=${item}&theme=${theme}&state=normal&width=${viewport.width}&compare=none&motion=reduced`);
    await expect(page.locator('.gallery-demo-host')).toBeVisible();
    await expect(page.locator('.gallery-version')).toHaveText(packageMetadata.version);
    // Normalize release metadata only; component pixels stay compared against
    // the accepted 0.1.0 images without regenerating visual baselines.
    await page.locator('.gallery-version').evaluate(node => { node.textContent = '0.1.0'; });
    await page.evaluate(async () => { await document.fonts.ready; });
    // Complete the real reader's first frame and the gallery's measurement pass.
    await page.clock.runFor(300);
    await expect(page.locator('.gallery-spec-values')).toContainText('CSS px');
    if (item.startsWith('workspace-')) {
      // ResizeObserver delivery may follow font loading on the first cold page.
      // Advance its owned reader frames and assert the initial latest intent;
      // never force a scroll or accept a new image to hide this race.
      await expect.poll(async () => {
        await page.clock.runFor(100);
        return page.locator('.gallery-demo-host .pui-chat-scroll').evaluate(node => node.scrollHeight - node.clientHeight - node.scrollTop);
      }).toBeLessThanOrEqual(2);
    }
    expect(errors).toEqual([]);
    await expect(page).toHaveScreenshot(`${item}-${theme}-${viewport.width}x${viewport.height}.png`, { fullPage: true });
  });
}
