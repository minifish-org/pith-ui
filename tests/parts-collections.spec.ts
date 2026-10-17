import {test, expect} from '@playwright/test';
import type {collectionsFixture} from './parts-collections-fixture.js';
declare global {interface Window {collectionsFixture: typeof collectionsFixture}}

test.beforeEach(async ({page}) => {
  await page.goto('/tests/parts-collections-fixture.html');
  await page.waitForFunction(() => !!window.collectionsFixture, undefined, {timeout: 10_000});
});

test('keyed lists retain row controls through reordering and own removed row lifetimes', async ({page}) => {
  const list = page.getByRole('list', {name: 'Saved entries'});
  await expect(list.getByRole('listitem')).toHaveCount(2);
  await expect(page.getByText('Beta', {exact: true}).locator('../..')).toHaveClass(/pui-selected/);
  const edit = page.getByRole('button', {name: 'Edit Alpha', exact: true});
  await edit.focus();
  await edit.evaluate(node => node.setAttribute('data-original', 'yes'));
  await page.evaluate(() => window.collectionsFixture.reorder());
  await expect(edit).toBeFocused();
  await expect(edit).toHaveAttribute('data-original', 'yes');
  await expect(list.getByRole('listitem').first()).toContainText('Beta');
  await edit.click();
  expect(await page.evaluate(() => window.collectionsFixture.calls)).toEqual(['edit']);
  await page.evaluate(() => window.collectionsFixture.removeAlpha());
  await expect(edit).toHaveCount(0);
  expect(await page.evaluate(() => {try {window.collectionsFixture.root.replace([window.collectionsFixture.alpha]); return false;} catch {return true;}})).toBe(true);
});

test('invalid list keys and foreign contents fail atomically before changing live rows', async ({page}) => {
  expect(await page.evaluate(() => window.collectionsFixture.invalidListUpdates())).toEqual([true, true, true]);
  await expect(page.getByRole('list', {name: 'Saved entries'}).getByRole('listitem')).toHaveCount(2);
  await expect(page.getByRole('button', {name: 'Edit Alpha', exact: true})).toBeVisible();
});

test('anchored menu preserves old markup, skips disabled rows and restores source on Escape', async ({page}) => {
  await page.getByRole('button', {name: 'Open actions', exact: true}).click();
  const menu = page.getByRole('menu', {name: 'Entry actions'});
  await expect(menu).toHaveClass('pui-sidebar-conversation-menu pui-context-menu');
  await expect(page.getByRole('menuitem', {name: 'First action'})).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menuitemcheckbox', {name: 'Last action'})).toBeFocused();
  await expect(page.getByRole('menuitemcheckbox', {name: 'Last action'})).toHaveAttribute('aria-checked', 'true');
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(page.getByRole('button', {name: 'Open actions', exact: true})).toBeFocused();
  await page.getByRole('button', {name: 'Open actions', exact: true}).click();
  await page.getByRole('button', {name: 'Outside', exact: true}).click();
  await expect(menu).toBeHidden();
});

test('async menu actions keep one write pending through snapshots and ignore closed failures', async ({page}) => {
  await page.getByRole('button', {name: 'Open actions', exact: true}).click();
  const last = page.getByRole('menuitemcheckbox', {name: 'Last action'});
  await last.click();
  await expect(last).toBeDisabled();
  await page.evaluate(() => window.collectionsFixture.updatePending());
  await expect(last).toBeDisabled();
  await last.evaluate((node: HTMLButtonElement) => node.click());
  expect(await page.evaluate(() => window.collectionsFixture.calls)).toEqual(['last']);
  await page.evaluate(() => window.collectionsFixture.finish({ok: false, error: 'Retry this action'}));
  await expect(last).toBeEnabled();
  expect(await page.evaluate(() => window.collectionsFixture.calls)).toEqual(['last', 'Retry this action']);
  await last.click();
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.collectionsFixture.finish({ok: false, error: 'Closed failure'}));
  expect(await page.evaluate(() => window.collectionsFixture.calls)).toEqual(['last', 'Retry this action', 'last']);
});

test('nested floating surfaces dismiss one layer at a time and respect modal Escape precedence', async ({page}) => {
  await page.getByRole('button', {name: 'Open popover', exact: true}).click();
  const popover = page.getByRole('region', {name: 'Nested surface'});
  await expect(popover).toBeVisible();
  await page.getByRole('button', {name: 'Nested menu', exact: true}).click();
  await expect(page.getByRole('menu', {name: 'Nested actions'})).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu', {name: 'Nested actions'})).toBeHidden();
  await expect(popover).toBeVisible();
  await expect(page.getByRole('button', {name: 'Nested menu', exact: true})).toBeFocused();
  await page.evaluate(() => window.collectionsFixture.makeModal());
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', {name: 'Related modal', includeHidden: true})).not.toHaveAttribute('open');
  await expect(popover).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(popover).toBeHidden();
});

test('destroying a borrowed trigger root closes the floating surface and releases document listeners', async ({page}) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.evaluate(() => window.collectionsFixture.makeStaleSource());
  await page.getByRole('button', {name: 'Temporary source', exact: true}).click();
  const menu = page.getByRole('menu', {name: 'Entry actions'});
  await expect(menu).toBeVisible();
  await page.evaluate(() => window.collectionsFixture.destroyStaleSource());
  await expect(menu).toBeHidden();
  await page.getByRole('button', {name: 'Open actions', exact: true}).click();
  await expect(menu).toBeVisible();
  await page.evaluate(() => window.collectionsFixture.mounted.destroy());
  await expect(page.locator('#collections-mount')).toBeEmpty();
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
});
