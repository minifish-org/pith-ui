import { test, expect } from '@playwright/test';
import packageMetadata from '../package.json' with { type: 'json' };
import {catalog} from '../showroom/catalog.js';
import {catalog as historicalCatalog} from '../tests/internal/showroom/catalog.js';

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
    await page.goto(`/tests/internal/showroom.html?item=${item}&theme=${theme}&state=normal&width=${viewport.width}&compare=none&motion=reduced`);
    await expect(page.locator('.gallery-demo-host')).toBeVisible();
    await expect(page.locator('.gallery-version')).toHaveText(packageMetadata.version);
    await expect(page.locator('.gallery-count')).toHaveText(`${historicalCatalog.length} 项 · 从完整界面逐层查看`);
    await expect(page.locator('.gallery-navigation button[data-item="application-reference"]')).toHaveCount(1);
    const applicationLink = page.locator('.gallery-related a[href*="item=application-reference"]');
    await expect(applicationLink).toHaveCount(item === 'workspace-reading' ? 0 : 1);
    if (item !== 'workspace-reading') await expect(applicationLink).toHaveText('受限入口参考应用 Application reference · 完整界面');
    // Assert new catalog metadata above, then normalize only that metadata and
    // release version. Component and measurement pixels remain unmodified and
    // continue to use the accepted 0.1.0 images, without updating any baseline.
    await page.locator('.gallery-count').evaluate(node => { node.textContent = '77 项 · 从完整界面逐层查看'; });
    await applicationLink.evaluateAll(nodes => nodes.forEach(node => node.remove()));
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
    // Reduced motion is already selected. Chromium's animation fast-forward
    // during a full-page capture can transiently reflow and clamp nested scrolls.
    await expect(page).toHaveScreenshot(`${item}-${theme}-${viewport.width}x${viewport.height}.png`, { fullPage: true, animations: 'allow' });
  });
}

for(const item of ['controls-form-page','controls-actions-page'])for(const theme of ['light','dark'] as const)for(const viewport of [...sizes,{width:390,height:844}]){
  test(`${item} ${theme} ${viewport.width}x${viewport.height}`,async({page})=>{
    await page.setViewportSize(viewport);await page.emulateMedia({colorScheme:theme,reducedMotion:'reduce'});
    const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`/?item=${item}&theme=${theme}&width=${viewport.width}&motion=reduced`);
    await expect(page.locator('.gallery-docs')).toContainText('pith-ui · 正式受限积木');
    await expect(page.locator('.gallery-version')).toHaveText(packageMetadata.version);
    await expect(page.locator('.gallery-count')).toHaveText(`${catalog.length} 项 · 正式积木与组合示例`);
    // These are new catalog links, not part of either accepted example. Assert
    // their real labels first, then retain the accepted navigation metadata for
    // the existing screenshots. Do not alter demo, measurement or layout pixels.
    const addedNavigation = ['content-column','surface','grid','brand','step','notification-region','breadcrumb','controls-layout-contexts','table'];
    for (const id of addedNavigation) {
      const entry = catalog.find(item => item.id === id);
      expect(entry).toBeDefined();
      await expect(page.locator(`.gallery-navigation button[data-item="${id}"]`)).toHaveText(entry!.title);
    }
    await page.locator('.gallery-navigation').evaluate((navigation, ids) => {
      for (const id of ids) navigation.querySelector(`button[data-item="${id}"]`)!.remove();
      // The new breadcrumb and composition example introduce categories. Remove
      // only those now-empty headings, never one containing an accepted block.
      for (const heading of navigation.querySelectorAll('h3')) {
        if (['导航','组合示例'].includes(heading.textContent ?? '') && (!heading.nextElementSibling || heading.nextElementSibling.tagName === 'H3')) heading.remove();
      }
    }, addedNavigation);
    await page.locator('.gallery-version').evaluate(node=>{node.textContent='0.3.0';});
    await page.locator('.gallery-count').evaluate(node=>{node.textContent='正式积木与组合示例';});
    await page.evaluate(async()=>{await document.fonts.ready;});
    await expect(page.locator('.gallery-spec-values')).toContainText('CSS px');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    expect(errors).toEqual([]);
    await expect(page).toHaveScreenshot(`${item}-${theme}-${viewport.width}x${viewport.height}.png`,{fullPage:true,animations:'allow'});
  });
}
