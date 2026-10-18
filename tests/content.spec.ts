import type {installConversationReader} from '../src/content/conversation-reader.js';
declare global {interface Window {contentFixture: {reader?: ReturnType<typeof installConversationReader>}}}
import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.goto('/tests/fixture.html');});

test('destroying the reader removes its keyboard interception and pending frame', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/content/conversation-reader.ts'; const { installConversationReader } = await import(path);
    const element = document.createElement('section'); element.innerHTML = '<div data-find hidden><input aria-label="Find"><span data-find-count></span><button data-find-previous>Previous</button><button data-find-next>Next</button><button data-find-close>Close</button></div><div data-scroll tabindex="0"><div data-messages><article data-reading-id="a">a+b a+b</article></div></div><button data-latest>Latest</button>';
    document.body.append(element);
    const reader = installConversationReader(element.querySelector('[data-scroll]')!, element.querySelector('[data-messages]')!, element.querySelector('[data-find]')!, element.querySelector('[data-latest]')!, { keyboardTarget: element });
    reader.beforeRender('a'); reader.afterRender(); reader.openFind(); window.contentFixture = {reader};
  });
  await page.getByLabel('Find', { exact: true }).fill('a+b');
  await expect(page.locator('[data-find-count]')).toHaveText('1 / 2');
  await page.getByLabel('Find', { exact: true }).press('Enter');
  await expect(page.locator('[data-find-count]')).toHaveText('2 / 2');
  await page.evaluate(() => { window.contentFixture.reader!.destroy(); window.contentFixture.reader!.destroy(); });
  expect(await page.evaluate(() => { const event = new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, cancelable: true, bubbles: true }); document.querySelector('[data-scroll]')!.dispatchEvent(event); return event.defaultPrevented; })).toBe(false);
  await expect(page.locator('mark')).toHaveCount(0);
});
