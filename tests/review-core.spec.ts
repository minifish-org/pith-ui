import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/tests/fixture.html'); });

test('a completed menu action cannot close a reopened target', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/primitives.ts'; const { createMenu } = await import(path);
    let resolve!: (value: { ok: true }) => void;
    const menu = createMenu({ label: 'Actions', items: [{ id: 'old', label: 'Old target', onAction: () => new Promise(done => { resolve = done; }) }] });
    document.body.append(menu.element);
    Object.assign(window, { coreReview: { menu, finish: () => resolve({ ok: true }) } }); menu.open();
  });
  await page.getByRole('menuitem', { name: 'Old target' }).click();
  await page.evaluate(() => {
    const fixture = (window as any).coreReview;
    fixture.menu.close(); fixture.menu.update({ label: 'Actions', items: [{ id: 'new', label: 'New target', onAction() {} }] }); fixture.menu.open(); fixture.finish();
  });
  await expect(page.getByRole('menuitem', { name: 'New target' })).toBeVisible();
});

test('disabled secrets cannot be revealed before their first update', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/primitives.ts'; const { createSecretInput } = await import(path);
    const input = createSecretInput({ label: 'API key', value: 'demo-only', disabled: true }); document.body.append(input.element);
  });
  await expect(page.getByRole('button', { name: 'Show', exact: true })).toBeDisabled();
  await expect(page.getByLabel('API key', { exact: true })).toHaveAttribute('type', 'password');
});

test('native reset consistently restores construction values without replacing fields', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const path = '/src/primitives.ts'; const { createTextInput, createCheckbox, createSelect } = await import(path);
    const form = document.createElement('form');
    const text = createTextInput({ label: 'Text', value: 'Initial text' }); const check = createCheckbox({ label: 'Checked', checked: true });
    const select = createSelect({ label: 'Choice', value: 'b', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] });
    form.append(text.element, check.element, select.element); document.body.append(form);
    text.reset('Edited'); check.reset(false); select.reset('a'); form.reset(); await Promise.resolve();
    return { text: text.getValue(), checked: check.getValue(), choice: select.getValue(), same: form.contains(text.control) && form.contains(check.control) && form.contains(select.control) };
  });
  expect(result).toEqual({ text: 'Initial text', checked: true, choice: 'b', same: true });
});

test('a select follows disabled fieldset transitions and only its visible trigger is focusable', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/index.ts'; const { createSelect, focusableElements } = await import(path);
    const fieldset = document.createElement('fieldset'); fieldset.disabled = true; document.body.append(fieldset);
    const select = createSelect({ label: 'Grouped choice', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] }); fieldset.append(select.element);
    select.update({ label: 'Grouped choice', options: [{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] });
    Object.assign(window, { coreReview: { fieldset, select, focusableElements } });
  });
  await expect(page.getByRole('combobox')).toBeDisabled();
  await page.evaluate(() => { (window as any).coreReview.fieldset.disabled = false; });
  await expect(page.getByRole('combobox')).toBeEnabled();
  await page.getByRole('combobox').click(); await page.getByRole('option', { name: 'B', exact: true }).click();
  expect(await page.evaluate(() => {
    const fixture = (window as any).coreReview;
    return { value: fixture.select.getValue(), targets: fixture.focusableElements(fixture.fieldset).map((node: HTMLElement) => node.getAttribute('role')) };
  })).toEqual({ value: 'b', targets: ['combobox'] });
});

test('Cancel observes the same close-disabled policy as the other dialog exits', async ({ page }) => {
  for (const kind of ['confirm', 'edit'] as const) {
    await page.evaluate(async kind => {
      const path = '/src/primitives.ts'; const { createConfirmDialog, createTextEditDialog } = await import(path);
      const dialog = kind === 'confirm' ? createConfirmDialog({ title: 'Keep open', closeDisabled: true, onConfirm: () => ({ ok: true }) }) : createTextEditDialog({ title: 'Keep open', closeDisabled: true });
      Object.assign(window, { coreReview: { dialog } });
      if (kind === 'confirm') dialog.open(); else dialog.open({ value: 'Draft' });
    }, kind);
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled();
    await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toBeVisible();
    await page.evaluate(() => { (window as any).coreReview.dialog.update({ title: 'Keep open', closeDisabled: false }); });
    await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await expect(page.getByRole('dialog')).toBeHidden();
    await page.evaluate(() => { (window as any).coreReview.dialog.destroy(); });
  }
});
