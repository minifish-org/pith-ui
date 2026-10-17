import {test, expect} from '@playwright/test';
import type {Part, MountedParts} from '../src/parts/ownership.js';

declare global {interface Window {partsThemeFixture: {mount: HTMLElement; root: Part; tree: MountedParts; first: Element}}}
test.beforeEach(async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(() => document.body.classList.remove('pui'));
});

test('a mount owns a finite local appearance and changes it without replacing its parts', async ({page}) => {
  await page.emulateMedia({colorScheme: 'dark'});
  await page.evaluate(async () => {
    const path = '/src/parts/index.ts'; const {createButtonPart, mountParts} = await import(path);
    const mount = document.createElement('div'); mount.id = 'theme-mount'; mount.className = 'host-class'; document.body.append(mount);
    const root = createButtonPart({label: 'Themed control'});
    const tree = mountParts(mount, root);
    window.partsThemeFixture = {mount, root, tree, first: mount.firstElementChild!};
  });
  const mount = page.locator('#theme-mount');
  await expect(mount).toHaveClass('host-class pui');
  await expect(mount).toHaveAttribute('data-appearance', 'system');
  expect(await page.evaluate(() => window.partsThemeFixture.tree.readAppearance())).toBe('system');
  expect(await mount.evaluate(node => getComputedStyle(node).getPropertyValue('--pui-text').trim())).toBe('#F0F1F3');
  await page.evaluate(() => window.partsThemeFixture.tree.setAppearance('light'));
  await expect(mount).toHaveAttribute('data-appearance', 'light');
  expect(await mount.evaluate(node => getComputedStyle(node).getPropertyValue('--pui-text').trim())).toBe('#1F2530');
  await page.evaluate(() => window.partsThemeFixture.tree.setAppearance('dark'));
  expect(await page.evaluate(() => window.partsThemeFixture.tree.readAppearance())).toBe('dark');
  expect(await page.evaluate(() => window.partsThemeFixture.first === window.partsThemeFixture.mount.firstElementChild)).toBe(true);
  expect(await page.evaluate(() => [document.documentElement.className, document.documentElement.getAttribute('data-appearance'), document.body.className])).toEqual(['', null, '']);
});

test('root destruction releases its mount and restores only the original theme attributes', async ({page}) => {
  await page.evaluate(async () => {
    const path = '/src/parts/index.ts'; const {createTextPart, mountParts} = await import(path);
    const mount = document.createElement('div'); mount.id = 'theme-mount'; mount.className = 'host-class'; mount.setAttribute('data-appearance', 'host-preference'); document.body.append(mount);
    const root = createTextPart({text: 'Old tree'}); const tree = mountParts(mount, root, {appearance: 'dark'});
    mount.classList.add('host-later');
    window.partsThemeFixture = {mount, root, tree, first: mount.firstElementChild!};
    root.destroy(); root.destroy();
  });
  const mount = page.locator('#theme-mount');
  await expect(mount).toBeEmpty();
  await expect(mount).toHaveClass('host-class host-later');
  await expect(mount).toHaveAttribute('data-appearance', 'host-preference');
  const remounted = await page.evaluate(async () => {
    const path = '/src/parts/index.ts'; const {createTextPart, mountParts} = await import(path);
    const {mount, tree} = window.partsThemeFixture;
    const next = mountParts(mount, createTextPart({text: 'Next tree'}), {appearance: 'light'});
    tree.destroy();
    const retained = mount.textContent === 'Next tree' && mount.getAttribute('data-appearance') === 'light';
    next.destroy(); next.destroy();
    return retained;
  });
  expect(remounted).toBe(true);
  await expect(mount).toHaveAttribute('data-appearance', 'host-preference');
  await expect(mount).toHaveClass('host-class host-later');
});

test('an existing library scope survives teardown, while an absent appearance stays absent', async ({page}) => {
  const restored = await page.evaluate(async () => {
    const path = '/src/parts/index.ts'; const {createTextPart, mountParts} = await import(path);
    const mount = document.createElement('div'); mount.className = 'pui host-class';
    const tree = mountParts(mount, createTextPart({text: 'Scoped'}), {appearance: 'dark'});
    tree.destroy();
    return {className: mount.className, appearance: mount.getAttribute('data-appearance'), childCount: mount.childElementCount};
  });
  expect(restored).toEqual({className: 'pui host-class', appearance: null, childCount: 0});
});

test('mount and appearance updates reject styling escapes and invalid values before ownership changes', async ({page}) => {
  const checks = await page.evaluate(async () => {
    const path = '/src/parts/index.ts'; const {createTextPart, mountParts} = await import(path);
    const root = createTextPart({text: 'Valid after rejected options'}); const mount = document.createElement('div');
    const rejected = (action: () => void) => {try {action(); return false;} catch {return true;}};
    const result = [
      rejected(() => mountParts(mount, root, {style: {padding: 100}} as never)),
      rejected(() => mountParts(mount, root, {appearance: 'invented'} as never)),
      rejected(() => mountParts(mount, root, {className: 'override'} as never)),
    ];
    const tree = mountParts(mount, root, {appearance: 'light'});
    result.push(rejected(() => tree.setAppearance('invented' as never)));
    result.push(tree.readAppearance() === 'light' && mount.classList.contains('pui'));
    tree.destroy(); return result;
  });
  expect(checks).toEqual([true, true, true, true, true]);
});
