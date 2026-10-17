import {test, expect} from '@playwright/test';
import type {fixture} from './parts-fixture.js';
declare global {interface Window {partsFixture: typeof fixture}}

test.beforeEach(async ({page}) => {
  await page.goto('/tests/parts-fixture.html');
  await page.waitForFunction(() => !!window.partsFixture, undefined, {timeout: 10_000});
});

test('formal part handles expose content, state and lifecycle without DOM or style ports', async ({page}) => {
  const details = await page.evaluate(() => window.partsFixture.inspect());
  for (const keys of details.handles) {
    expect(keys).not.toEqual(expect.arrayContaining(['element']));
    expect(keys.some(key => ['element', 'control', 'node', 'body', 'className', 'style', 'html', 'render', 'part'].includes(key))).toBe(false);
  }
  await expect(page.getByText('<Safe text>', {exact: true})).toBeVisible();
  await expect(page.locator('#parts-mount svg')).toHaveCount(3);
  expect(await page.getByRole('img', {name: 'Folder'}).evaluate(node => node.tagName.toLowerCase())).toBe('svg');
  const checks = await page.evaluate(() => window.partsFixture.ownershipChecks());
  expect(Object.values(checks)).toEqual(Object.keys(checks).map(() => true));
});

test('button variants preserve retained direct text and svg markup without a wrapper per node', async ({page}) => {
  const expected = [
    ['Standard', 'pui-button'], ['Save', 'pui-primary-button'],
    ['Secondary', 'pui-secondary-button'], ['Delete', 'pui-secondary-button pui-destructive-button'],
    ['Close', 'pui-quiet-icon'],
  ];
  for (const [label, className] of expected) {
    const button = page.getByRole('button', {name: label, exact: true});
    await expect(button).toHaveAttribute('class', className!);
    expect(await button.locator('span, div').count()).toBe(0);
    await expect(button).toHaveAttribute('type', 'button');
  }
  await expect(page.getByRole('button', {name: 'Close', exact: true})).toHaveText('');
  await expect(page.getByRole('group', {name: 'Document tools'})).toHaveAttribute('data-pui-action-layout', 'toolbar');
  expect(await page.locator('#parts-mount > div').count()).toBe(1);
});

test('pending updates retain one write and node identity; destroyed children ignore late callbacks', async ({page}) => {
  const button = page.getByRole('button', {name: 'Save', exact: true});
  await button.focus();
  await button.evaluate(node => {node.setAttribute('data-original-node', 'true');});
  await button.click();
  await expect(button).toBeDisabled();
  await expect(button).toHaveAttribute('aria-busy', 'true');
  await page.evaluate(() => {window.partsFixture.update(); window.partsFixture.reorder();});
  const updated = page.getByRole('button', {name: 'Saved label', exact: true});
  await expect(updated).toHaveAttribute('data-original-node', 'true');
  await expect(updated).toBeDisabled();
  await updated.evaluate((node: HTMLButtonElement) => node.click());
  expect(await page.evaluate(() => window.partsFixture.calls)).toEqual(['save']);
  await page.evaluate(() => window.partsFixture.finish({ok: false, error: 'Try again'}));
  await expect(updated).toBeEnabled();
  expect(await page.evaluate(() => window.partsFixture.calls)).toEqual(['save', 'Try again']);
  await updated.click();
  await page.evaluate(() => {
    window.partsFixture.mounted.destroy(); window.partsFixture.mounted.destroy();
    window.partsFixture.finish({ok: false, error: 'Late error'});
  });
  await expect(page.locator('#parts-mount')).toBeEmpty();
  expect(await page.evaluate(() => window.partsFixture.calls)).toEqual(['save', 'Try again', 'save']);
});

test('layout replacement disposes removed ownership and preserves retained children', async ({page}) => {
  await page.evaluate(() => window.partsFixture.root.replace([window.partsFixture.toolbar, window.partsFixture.actions]));
  await expect(page.getByText('<Safe text>', {exact: true})).toHaveCount(0);
  expect(await page.evaluate(() => {
    try {window.partsFixture.root.replace([window.partsFixture.caption]); return false;} catch {return true;}
  })).toBe(true);
  await expect(page.getByRole('button', {name: 'Save', exact: true})).toBeVisible();
});
