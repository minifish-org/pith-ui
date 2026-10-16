import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/tests/fixture.html'); });

test('single choice uses a shared listbox, skips disabled options and keeps native form data', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/primitives.ts'; const { createSelect } = await import(path);
    const form = document.createElement('form');
    const select = createSelect({ label: 'Provider', value: 'one', options: [
      { value: 'one', label: 'First provider' }, { value: 'blocked', label: 'Unavailable provider', disabled: true },
      { value: 'two', label: 'Second provider' },
    ], onChange: (value: string) => { document.body.dataset.changed = value; } });
    select.control.name = 'provider'; form.append(select.element); document.body.append(form);
    Object.assign(window, { selectFixture: { select, form } });
  });
  const trigger = page.getByRole('combobox', { name: 'Provider', exact: true });
  await expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
  await trigger.press('Enter');
  await expect(page.getByRole('listbox')).toBeVisible();
  await expect(page.getByRole('option', { name: 'First provider', exact: true })).toHaveAttribute('aria-selected', 'true');
  await trigger.press('ArrowDown'); await trigger.press('Enter');
  await expect(trigger).toHaveText('Second provider');
  await expect(page.getByRole('listbox')).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(page.locator('body')).toHaveAttribute('data-changed', 'two');
  expect(await page.locator('form').evaluate(form => new FormData(form as HTMLFormElement).get('provider'))).toBe('two');
});

test('escape cancels navigation, typeahead handles Chinese, disabled updates close an open list', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/primitives.ts'; const { createSelect } = await import(path);
    const options = [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }, { value: 'zh', label: '中文模型' }];
    const select = createSelect({ label: 'Model', options, value: 'a' });
    document.body.append(select.element); Object.assign(window, { selectFixture: { select, options } });
  });
  const trigger = page.getByRole('combobox', { name: 'Model', exact: true });
  await trigger.click(); await trigger.press('ArrowDown'); await trigger.press('Escape');
  await expect(trigger).toHaveText('Alpha'); await expect(trigger).toBeFocused();
  await trigger.click(); await trigger.press('中'); await trigger.press('Enter');
  await expect(trigger).toHaveText('中文模型');
  await trigger.click();
  await page.evaluate(() => {
    const f = (window as unknown as { selectFixture: { select: { update(state: unknown): void }; options: unknown } }).selectFixture;
    f.select.update({ label: 'Model', options: f.options, disabled: true });
  });
  await expect(trigger).toBeDisabled(); await expect(page.getByRole('listbox')).toBeHidden();
});

test('open list preserves stable options and active item through feedback updates, reset and form reset synchronize', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/primitives.ts'; const { createSelect } = await import(path);
    const options = [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }];
    const form = document.createElement('form');
    const select = createSelect({ label: 'Model', options, value: 'b' });
    form.append(select.element); document.body.append(form);
    Object.assign(window, { selectFixture: { select, options, form } });
  });
  const trigger = page.getByRole('combobox', { name: 'Model', exact: true });
  await trigger.click();
  const before = await trigger.getAttribute('aria-activedescendant');
  await page.evaluate(() => {
    const f = (window as unknown as { selectFixture: { select: { update(state: unknown): void }; options: unknown } }).selectFixture;
    f.select.update({ label: 'Model', options: f.options, error: 'Keep current selection' });
  });
  await expect(trigger).toHaveAttribute('aria-activedescendant', before!);
  await expect(trigger).toHaveAttribute('aria-invalid', 'true'); await expect(trigger).toBeFocused();
  await trigger.press('Escape');
  await page.evaluate(() => (window as unknown as { selectFixture: { select: { reset(value: string): void } } }).selectFixture.select.reset('a'));
  await expect(trigger).toHaveText('Alpha');
  await page.locator('form').evaluate(form => (form as HTMLFormElement).reset());
  await expect(trigger).toHaveText('Beta');
});

test('required selection stays a real validated field and auxiliary trigger never submits', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/primitives.ts'; const { createSelect } = await import(path);
    const form = document.createElement('form');
    form.addEventListener('submit', event => { event.preventDefault(); document.body.dataset.submitted = 'true'; });
    const select = createSelect({ label: 'Required choice', required: true, value: '', options: [
      { value: '', label: 'Choose a value' }, { value: 'valid', label: 'Valid value' },
    ] });
    const submit = document.createElement('button'); submit.type = 'submit'; submit.textContent = 'Save';
    form.append(select.element, submit); document.body.append(form);
  });
  const trigger = page.getByRole('combobox', { name: 'Required choice', exact: false });
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('body')).not.toHaveAttribute('data-submitted');
  await expect(trigger).toBeFocused();
  await trigger.click(); await page.getByRole('option', { name: 'Valid value', exact: true }).click();
  await expect(page.locator('body')).not.toHaveAttribute('data-submitted');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-submitted', 'true');
});

test('single select defaults to first enabled option and multiple selection remains a native listbox', async ({ page }) => {
  const state = await page.evaluate(async () => {
    const path = '/src/primitives.ts'; const { createSelect } = await import(path);
    const options = [{ value: 'off', label: 'Disabled', disabled: true }, { value: 'on', label: 'Enabled' }];
    const single = createSelect({ label: 'Single', options });
    const multiple = createSelect({ label: 'Multiple', multiple: true, size: 5, options });
    document.body.append(single.element, multiple.element);
    return { initial: single.getValue(), multiple: multiple.control.multiple, height: multiple.control.getBoundingClientRect().height };
  });
  expect(state).toEqual({ initial: 'on', multiple: true, height: expect.any(Number) });
  expect(state.height).toBeGreaterThanOrEqual(100);
  await expect(page.getByRole('listbox', { name: 'Multiple', exact: true })).toHaveJSProperty('tagName', 'SELECT');
});

test('selection inside a modal stays above clipping and Escape closes only the selector', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/primitives.ts'; const { createSelect, createDialog } = await import(path);
    const select = createSelect({ label: 'In dialog', options: Array.from({ length: 25 }, (_, index) => ({ value: String(index), label: `Choice ${index}` })) });
    const dialog = createDialog({ title: 'Settings', content: select.element });
    dialog.element.style.overflow = 'hidden'; dialog.element.style.height = '140px'; dialog.open();
  });
  const trigger = page.getByRole('combobox', { name: 'In dialog', exact: true });
  await trigger.click();
  const popup = page.getByRole('listbox'); await expect(popup).toBeVisible();
  expect(await popup.evaluate(node => { const rect = node.getBoundingClientRect(); return document.elementFromPoint(rect.left + 12, rect.top + 12)?.closest('[role="listbox"]') === node; })).toBe(true);
  await trigger.press('Escape');
  await expect(popup).toBeHidden(); await expect(page.getByRole('dialog')).toBeVisible(); await expect(trigger).toBeFocused();
});

test('outside click and Tab dismiss; destruction restores retained native control and prevents late DOM mutation', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/primitives.ts'; const { createSelect, createButton } = await import(path);
    const select = createSelect({ label: 'Choice', options: [{ value: 'a', label: 'Alpha' }] });
    const after = createButton({ label: 'After' }); document.body.append(select.element, after.element);
    Object.assign(window, { selectFixture: { select } });
  });
  const trigger = page.getByRole('combobox', { name: 'Choice', exact: true });
  await trigger.click(); await trigger.press('Tab');
  await expect(page.getByRole('listbox')).toBeHidden(); await expect(page.getByRole('button', { name: 'After', exact: true })).toBeFocused();
  await trigger.click(); await page.getByRole('button', { name: 'After', exact: true }).click();
  await expect(page.getByRole('listbox')).toBeHidden();
  await trigger.click();
  const state = await page.evaluate(async () => {
    const f = (window as unknown as { selectFixture: { select: { destroy(): void; control: HTMLSelectElement; reset(value: string): void } } }).selectFixture;
    f.select.destroy(); f.select.destroy(); const before = document.body.innerHTML;
    f.select.control.setAttribute('disabled', ''); await new Promise(done => setTimeout(done, 0));
    return { popups: document.querySelectorAll('.pui-select-popup').length, restored: !f.select.control.hasAttribute('aria-hidden'), mutations: document.body.innerHTML.replace(' disabled=""', '') === before };
  });
  expect(state).toEqual({ popups: 0, restored: true, mutations: true });
});
