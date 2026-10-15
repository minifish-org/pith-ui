import { test, expect } from '@playwright/test';
import type { TextEditBlock, ButtonBlock, MenuState } from '../src/primitives.js';

interface Fixture {
  editor: TextEditBlock;
  resolve: (result: { ok: true } | { ok: false; error: string }) => void;
  calls: number;
  button: ButtonBlock;
  updateMenu: (state: MenuState) => void;
}
declare global { interface Window { primitiveFixture: Fixture; } }

test.beforeEach(async ({ page }) => { await page.goto('/tests/fixture.html'); });

test('text edits retain draft and selection through updates, failure and a stale response', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/primitives.ts'; const { createTextEditDialog } = await import(path);
    const opener = document.createElement('button'); opener.textContent = 'Open editor'; document.body.append(opener); opener.focus();
    const editor = createTextEditDialog({ title: 'Edit', onSubmit() { window.primitiveFixture.calls++; return new Promise(resolve => { window.primitiveFixture.resolve = resolve; }); } });
    window.primitiveFixture = { editor, calls: 0 } as Fixture;
    editor.open({ value: 'Original text' });
  });
  const input = page.getByRole('textbox', { name: 'Message' });
  await expect(input).toBeFocused(); await input.fill('Edited text 中文');
  await input.evaluate((el: HTMLTextAreaElement) => { el.setSelectionRange(2, 6); });
  await page.evaluate(() => window.primitiveFixture.editor.update({ title: 'Edit', note: 'A snapshot arrived' }));
  expect(await input.evaluate((el: HTMLTextAreaElement) => [el.value, el.selectionStart, el.selectionEnd])).toEqual(['Edited text 中文', 2, 6]);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
  await page.evaluate(() => window.primitiveFixture.editor.update({ title: 'Edit' }));
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
  await page.evaluate(() => window.primitiveFixture.resolve({ ok: false, error: 'Try again' }));
  await expect(page.getByRole('alert')).toHaveText('Try again'); await expect(input).toHaveValue('Edited text 中文');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.evaluate(() => { window.primitiveFixture.editor.close(); window.primitiveFixture.editor.open({ value: 'A different target' }); });
  await page.evaluate(() => window.primitiveFixture.resolve({ ok: false, error: 'Old target failed' }));
  await expect(input).toHaveValue('A different target'); await expect(page.getByRole('alert')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
  await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: 'Open editor', exact: true })).toBeFocused();
});

test('confirmation is cancel-first, prevents duplicate writes, and ignores closed writes', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/primitives.ts'; const { createConfirmDialog } = await import(path);
    const confirmation = createConfirmDialog({ title: 'Delete?', onConfirm() { window.primitiveFixture.calls++; return new Promise(resolve => { window.primitiveFixture.resolve = resolve; }); } });
    window.primitiveFixture = { calls: 0 } as Fixture;
    (window.primitiveFixture as unknown as { confirmation: typeof confirmation }).confirmation = confirmation;
    confirmation.open({ title: 'Delete?', message: 'Remove this record' });
  });
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Remove', exact: true })).toBeDisabled();
  await page.locator('form').evaluate((form: HTMLFormElement) => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
  expect(await page.evaluate(() => window.primitiveFixture.calls)).toBe(1);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.evaluate(() => window.primitiveFixture.resolve({ ok: false, error: 'Too late' }));
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('fields use native behavior, auxiliary buttons never submit, updates preserve input', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/primitives.ts'; const { createSecretInput, createSelect } = await import(path);
    const form = document.createElement('form'); let submissions = 0; form.onsubmit = event => { event.preventDefault(); form.dataset.submissions = String(++submissions); };
    const secret = createSecretInput({ label: 'API key', value: 'Keep this secret' });
    form.append(secret.element); document.body.append(form);
    secret.update({ label: 'API key', description: 'Empty retains the current key' });
    const choices = createSelect({ label: 'Models', multiple: true, size: 5, options: Array.from({ length: 8 }, (_, index) => ({ value: String(index), label: `Model ${index}` })) });
    form.append(choices.element);
  });
  await page.getByRole('button', { name: 'Show', exact: true }).click();
  await expect(page.getByLabel('API key', { exact: true })).toHaveValue('Keep this secret');
  await expect(page.getByLabel('API key', { exact: true })).toHaveAttribute('type', 'text');
  await expect(page.locator('form')).not.toHaveAttribute('data-submissions');
  expect(await page.getByLabel('Models').evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(100);
});

test('menu keyboard navigation skips disabled actions and Escape restores focus', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/primitives.ts'; const { createMenu } = await import(path);
    const menu = createMenu({ label: 'Actions', items: [{ id: 'first', label: 'First', onAction() {} }, { id: 'blocked', label: 'Blocked', disabled: true, onAction() {} }, { id: 'last', label: 'Last', onAction() {} }] });
    document.body.append(menu.element);
  });
  await page.getByRole('button', { name: 'Actions', exact: true }).press('ArrowDown');
  await expect(page.getByRole('menuitem', { name: 'First', exact: true })).toBeFocused();
  await page.keyboard.press('ArrowDown'); await expect(page.getByRole('menuitem', { name: 'Last', exact: true })).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: 'Actions', exact: true })).toBeFocused();
  await expect(page.getByRole('menu')).toBeHidden();
});

test('destroy releases outside listeners and disables late action UI callbacks', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/primitives.ts'; const { createButton } = await import(path);
    const button = createButton({ label: 'Run', onAction() { return new Promise(resolve => { window.primitiveFixture.resolve = resolve; }); }, onError() { window.primitiveFixture.calls++; } });
    window.primitiveFixture = { button, calls: 0 } as Fixture; document.body.append(button.element);
  });
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await page.evaluate(() => { window.primitiveFixture.button.destroy(); window.primitiveFixture.button.destroy(); window.primitiveFixture.resolve({ ok: false, error: 'Late error' }); });
  expect(await page.evaluate(() => window.primitiveFixture.calls)).toBe(0);
});
