import {test, expect, type Page} from '@playwright/test';

interface CopyHarness {
  button: {update(state: unknown): void; destroy(): void}; announcement: {destroy(): void}; tree: {destroy(): void};
  resolve?: (result: {ok: true} | {ok: false; error: string}) => void; calls: number; argumentCounts: number[]; errors: string[];
}
declare global {interface Window {copyPartsHarness: CopyHarness}}

async function setup(page: Page, icon = false): Promise<void> {
  await page.goto('/tests/fixture.html');await page.clock.install();
  await page.evaluate(async icon => {
    const path = '/src/parts/index.ts',p = await import(path),h = {calls: 0,argumentCounts: [],errors: []} as unknown as CopyHarness;
    h.announcement = p.createAnnouncementPart({message: ''});
    h.button = p.createCopyButtonPart({variant: icon ? 'quiet-icon' : 'secondary',...(icon ? {icon: 'copy'} : {}),label: icon ? 'Copy message' : 'Copy path',title: icon ? 'Copy message' : 'Copy path',
      announcement: h.announcement,successMessage: icon ? 'Message copied' : 'Path copied.',
      onCopy(...args: unknown[]) {h.argumentCounts.push(args.length);h.calls++;return new Promise(resolve => {h.resolve = resolve;});},onError(error: string) {h.errors.push(error);}});
    const mount = document.body.appendChild(document.createElement('div'));h.tree = p.mountParts(mount,p.createStackPart({children: [h.announcement,h.button]}));window.copyPartsHarness = h;
  },icon);
}

test('copy button owns pending, copied feedback and fixed restoration across availability snapshots', async ({page}) => {
  await setup(page);const button = page.getByRole('button',{name: 'Copy path',exact: true});await button.click();await expect(button).toBeDisabled();await expect(button).toHaveAttribute('aria-busy','true');
  await page.evaluate(() => {const h = window.copyPartsHarness;h.button.update({label: 'Copy path',variant: 'secondary',title: 'Copy path',disabled: false});document.querySelector('button')!.dispatchEvent(new MouseEvent('click',{bubbles: true}));});
  expect(await page.evaluate(() => ({calls: window.copyPartsHarness.calls,args: window.copyPartsHarness.argumentCounts}))).toEqual({calls: 1,args: [0]});
  await page.evaluate(() => window.copyPartsHarness.resolve!({ok: true}));
  const copied = page.getByRole('button',{name: 'Path copied.',exact: true});await expect(copied).toHaveText('Copied');await expect(copied).toHaveAttribute('title','Path copied.');await expect(page.getByRole('status')).toHaveText('Path copied.');
  await page.evaluate(() => window.copyPartsHarness.button.update({label: 'Copy path',variant: 'secondary',title: 'Copy path',disabled: false}));
  await expect(copied).toHaveText('Copied');await expect(copied).toHaveAttribute('title','Path copied.');await expect(copied).toBeDisabled();
  await page.clock.fastForward(1499);await expect(copied).toHaveText('Copied');await page.clock.fastForward(1);
  await expect(page.getByRole('button',{name: 'Copy path',exact: true})).toHaveText('Copy path');await expect(page.getByRole('button',{name: 'Copy path',exact: true})).toBeEnabled();
});

test('icon-only copy keeps the existing check glyph and restores its original icon', async ({page}) => {
  await setup(page,true);const button = page.getByRole('button',{name: 'Copy message',exact: true}),before = await button.locator('svg').evaluate(svg => svg.outerHTML);
  await button.click();await page.evaluate(() => window.copyPartsHarness.resolve!({ok: true}));
  const copied = page.getByRole('button',{name: 'Message copied',exact: true});
  expect(await copied.locator('svg').evaluate(svg => svg.outerHTML)).toBe(await page.evaluate(async () => {const path = '/src/dom.ts',{icon} = await import(path);return icon('check');}));
  await page.evaluate(() => window.copyPartsHarness.button.update({label: 'Copy message',variant: 'quiet-icon',icon: 'copy',title: 'Copy message',disabled: true}));
  await expect(copied.locator('svg')).toHaveCount(1);await expect(copied).toHaveAttribute('title','Message copied');await page.clock.fastForward(1500);
  const restored = page.getByRole('button',{name: 'Copy message',exact: true});expect(await restored.locator('svg').evaluate(svg => svg.outerHTML)).toBe(before);await expect(restored).toBeDisabled();
});

test('copy errors restore the original button and notify only the live owner', async ({page}) => {
  await setup(page);await page.getByRole('button',{name: 'Copy path',exact: true}).click();await page.evaluate(() => window.copyPartsHarness.resolve!({ok: false,error: 'Clipboard rejected'}));
  await expect(page.getByRole('button',{name: 'Copy path',exact: true})).toBeEnabled();await expect(page.getByRole('status')).toBeEmpty();
  expect(await page.evaluate(() => window.copyPartsHarness.errors)).toEqual(['Clipboard rejected']);
  await page.getByRole('button',{name: 'Copy path',exact: true}).click();await page.evaluate(() => {const h = window.copyPartsHarness;h.button.destroy();h.resolve!({ok: true});});await page.clock.fastForward(2000);
  await expect(page.getByRole('button')).toHaveCount(0);await expect(page.getByRole('status')).toBeEmpty();expect(await page.evaluate(() => window.copyPartsHarness.errors)).toEqual(['Clipboard rejected']);
});

test('announcement is a genuine borrowed part and its disposal retires copy feedback', async ({page}) => {
  await setup(page);expect(await page.getByRole('status').evaluate(node => ({tag: node.localName,classes: node.className,live: node.getAttribute('aria-live')}))).toEqual({tag: 'span',classes: 'pui-sr-only',live: 'polite'});
  await page.getByRole('button',{name: 'Copy path',exact: true}).click();await page.evaluate(() => {const h = window.copyPartsHarness;h.announcement.destroy();h.resolve!({ok: true});});await page.clock.fastForward(2000);
  // A copy control requires its borrowed live region. Losing that dependency
  // retires the control rather than leaving an enabled, inert action behind.
  await expect(page.getByRole('status')).toHaveCount(0);await expect(page.getByRole('button')).toHaveCount(0);
  expect(await page.evaluate(() => window.copyPartsHarness.calls)).toBe(1);
  await page.evaluate(() => {const h = window.copyPartsHarness;h.tree.destroy();h.tree.destroy();h.button.destroy();});await expect(page.locator('button')).toHaveCount(0);
});

test('copy feedback rejects foreign announcement and presentation timing options without taking the announcer', async ({page}) => {
  await page.goto('/tests/fixture.html');const result = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path);if (typeof p.createCopyButtonPart !== 'function') throw new Error('The formal copy button must exist before rejection checks.');
    const announcement = p.createAnnouncementPart({message: 'Still owned by caller'});let foreign = false,timing = false;
    try {p.createCopyButtonPart({label: 'Copy',announcement: {},successMessage: 'Copied',onCopy() {}});} catch {foreign = true;}
    try {p.createCopyButtonPart({label: 'Copy',announcement,successMessage: 'Copied',onCopy() {},duration: 50});} catch {timing = true;}
    const mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,announcement);const retained = mount.textContent;tree.destroy();return {foreign,timing,retained};
  });expect(result).toEqual({foreign: true,timing: true,retained: 'Still owned by caller'});
});
