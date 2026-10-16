import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/tests/fixture.html'); });

test('primary hover and selected rows use the same theme semantics as product controls', async ({ page }) => {
  for (const theme of ['light', 'dark'] as const) {
    await page.evaluate(async theme => {
      const path = '/src/index.ts'; const { createButton, createListRow, setAppearance } = await import(path);
      document.body.replaceChildren(); setAppearance(document.body, theme);
      const button = createButton({ label: 'Primary', intent: 'primary' }); const row = createListRow({ title: 'Selected', selected: true }); document.body.append(button.element, row.element);
    }, theme);
    await page.getByRole('button', { name: 'Primary', exact: true }).hover();
    await expect.poll(() => page.getByRole('button', { name: 'Primary', exact: true }).evaluate(node => {
      const color = document.createElement('span'); color.style.color = 'var(--pui-accent-hover)'; node.append(color); const expected = getComputedStyle(color).color; color.remove(); return getComputedStyle(node).backgroundColor === expected;
    })).toBe(true);
    expect(await page.locator('.pui-list-row').evaluate(node => {
      const color = document.createElement('span'); color.style.color = 'var(--pui-surface-selected)'; node.append(color); const expected = getComputedStyle(color).color; color.remove(); return getComputedStyle(node).backgroundColor === expected;
    })).toBe(true);
  }
});

test('permission dropdown anchors to the complete control rather than just its text', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/tasks/permission.ts'; const { createPermissionControl } = await import(path);
    const permission = createPermissionControl({ mode: 'ask', description: 'Ask before changes' }); document.body.style.padding = '60px'; document.body.append(permission.element);
  });
  await page.getByRole('combobox').click();
  const control = await page.locator('.pui-permission-control').boundingBox(); const popup = await page.getByRole('listbox').boundingBox();
  expect(control).not.toBeNull(); expect(popup).not.toBeNull();
  expect(Math.abs(popup!.x - control!.x)).toBeLessThanOrEqual(1);
  expect(popup!.y).toBeGreaterThanOrEqual(control!.y + control!.height);
  expect(popup!.y - control!.y - control!.height).toBeLessThanOrEqual(8);
  expect(popup!.width).toBeGreaterThanOrEqual(control!.width);
});

test('keyboard focus is visible, light and consistent across control families', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/index.ts'; const ui = await import(path);
    const blocks = [ui.createButton({ label: 'Action' }), ui.createIconButton({ label: 'Icon action', icon: 'plus' }), ui.createTextInput({ label: 'Text' }), ui.createSearchInput({ label: 'Search' }), ui.createNumberInput({ label: 'Number' }), ui.createTextArea({ label: 'Multiline' }), ui.createCheckbox({ label: 'Enabled' }), ui.createSelect({ label: 'Choice', options: [{ value: 'a', label: 'A' }] }), ui.createDisclosure({ title: 'Details', content: document.createTextNode('Content') })];
    for (const block of blocks) document.body.append(block.element);
    const legacy = document.createElement('div'); legacy.className = 'pui-modal'; legacy.innerHTML = '<button class="pui-secondary-button">Product action</button><input aria-label="Product input"><textarea aria-label="Product text"></textarea>'; document.body.append(legacy);
    const menu = ui.createMenu({ label: 'Menu', items: [{ id: 'one', label: 'Menu item', onAction() {} }] }); document.body.append(menu.element); menu.open();
  });
  await page.keyboard.press('Tab');
  for (const locator of [page.getByRole('button', { name: 'Action', exact: true }), page.getByRole('button', { name: 'Icon action' }), page.getByRole('textbox', { name: 'Text', exact: true }), page.getByRole('searchbox'), page.getByRole('spinbutton'), page.getByRole('textbox', { name: 'Multiline' }), page.getByRole('checkbox'), page.getByRole('combobox'), page.locator('summary'), page.getByRole('button', { name: 'Product action' }), page.getByRole('textbox', { name: 'Product input' }), page.getByRole('textbox', { name: 'Product text' })]) {
    await locator.focus();
    const focus = await locator.evaluate(node => { const style = getComputedStyle(node); return { visible: node.matches(':focus-visible'), width: parseFloat(style.outlineWidth), offset: parseFloat(style.outlineOffset), shadow: style.boxShadow }; });
    expect(focus.visible).toBe(true); expect(focus.width).toBeGreaterThan(0); expect(focus.width).toBeLessThanOrEqual(1.5); expect(focus.offset).toBeLessThanOrEqual(2); expect(focus.shadow).toBe('none');
  }
  await page.getByRole('button', { name: 'Menu', exact: true }).press('ArrowDown');
  const menuFocus = await page.getByRole('menuitem').evaluate(node => parseFloat(getComputedStyle(node).outlineWidth)); expect(menuFocus).toBeGreaterThan(0); expect(menuFocus).toBeLessThanOrEqual(1.5);
});

test('native multi-row choices use readable type and fit their actual platform rows', async ({ page, browserName }) => {
  await page.evaluate(async () => {
    const path = '/src/primitives.ts'; const { createSelect } = await import(path);
    const select = createSelect({ label: 'Multiple models', multiple: true, size: 5, options: Array.from({ length: 8 }, (_, i) => ({ value: String(i), label: `Model ${i}` })) }); document.body.append(select.element);
  });
  const list = page.getByRole('listbox', { name: 'Multiple models' });
  const metrics = await list.evaluate((node: HTMLSelectElement) => {
    const style = getComputedStyle(node);
    return { height: node.clientHeight, rows: node.size, row: node.options[0].getBoundingClientRect().height,
      font: parseFloat(style.fontSize), padding: parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) };
  });
  expect(metrics.font).toBeGreaterThanOrEqual(16);
  expect(metrics.row).toBeGreaterThanOrEqual(metrics.font + 3);
  // WebKit's native rows follow system-font metrics and ignore option padding.
  // Do not conceal cramped rows with a taller empty container or replace its keyboard behavior.
  if (browserName !== 'webkit') expect(metrics.row).toBeGreaterThanOrEqual(32);
  expect(metrics.height).toBeLessThanOrEqual(metrics.row * metrics.rows + metrics.padding + 2);
  await list.selectOption(['1', '3']); expect(await list.evaluate((node: HTMLSelectElement) => [...node.selectedOptions].map(option => option.value))).toEqual(['1', '3']);
});

test('permission keyboard focus has one outer ring in ordinary and forced colors', async ({page, browserName}) => {
  await page.evaluate(async () => {
    const path='/src/tasks/permission.ts'; const {createPermissionControl}=await import(path);
    document.body.append(createPermissionControl({mode:'ask',description:'Ask before changes'}).element);
  });
  await page.keyboard.press('Tab'); await expect(page.getByRole('combobox')).toBeFocused();
  const rings = () => page.locator('.pui-permission-control').evaluate(node => {
    const inner=getComputedStyle(node.querySelector('[role="combobox"]')!),outer=getComputedStyle(node);
    return {inner:parseFloat(inner.outlineWidth),outer:parseFloat(outer.outlineWidth),shadow:inner.boxShadow};
  });
  expect(await rings()).toEqual({inner:0,outer:1,shadow:'none'});
  if (browserName === 'chromium') {
    await page.emulateMedia({forcedColors:'active'});
    expect(await rings()).toEqual({inner:0,outer:1,shadow:'none'});
  }
});
