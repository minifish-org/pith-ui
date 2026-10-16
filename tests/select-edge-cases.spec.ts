import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/tests/fixture.html'); });

test('an explicit valid reset clears native validation feedback', async ({ page }) => {
  const state = await page.evaluate(async () => {
    const path = '/src/primitives.ts'; const { createSelect } = await import(path);
    const select = createSelect({ label: 'Required choice', required: true, value: '', options: [
      { value: '', label: 'Choose a value' }, { value: 'valid', label: 'Valid value' },
    ] });
    document.body.append(select.element); select.control.reportValidity();
    const trigger = select.element.querySelector('[role="combobox"]')!;
    const wasInvalid = trigger.getAttribute('aria-invalid') === 'true';
    select.reset('valid');
    return { wasInvalid, valid: select.control.validity.valid, markedInvalid: trigger.getAttribute('aria-invalid') === 'true' };
  });
  expect(state).toEqual({ wasInvalid: true, valid: true, markedInvalid: false });
});

test('reporting form validation focuses the first invalid selector', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/primitives.ts'; const { createSelect } = await import(path);
    const form = document.createElement('form');
    for (const label of ['First required choice', 'Second required choice']) {
      const select = createSelect({ label, required: true, value: '', options: [{ value: '', label: 'Choose a value' }] });
      form.append(select.element);
    }
    document.body.append(form); form.reportValidity();
  });
  await expect(page.getByRole('combobox', { name: 'First required choice', exact: false })).toBeFocused();
});

test('checking validity alone does not move focus away from another input', async ({ page }) => {
  const keptFocus = await page.evaluate(async () => {
    const path = '/src/primitives.ts'; const { createSelect } = await import(path);
    const select = createSelect({ label: 'Required choice', required: true, value: '', options: [{ value: '', label: 'Choose a value' }] });
    const other = document.createElement('input'); document.body.append(select.element, other); other.focus();
    select.control.checkValidity();
    return document.activeElement === other;
  });
  expect(keptFocus).toBe(true);
});

test('hidden options and groups stay unavailable when their native visibility changes', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/foundations.ts'; const { adoptNativeControl } = await import(path);
    const select = document.createElement('select'); select.setAttribute('aria-label', 'Visible choices');
    select.innerHTML = '<option value="one">First visible</option><option value="secret" hidden>Hidden option</option><optgroup label="Hidden group" hidden><option value="group-secret">Hidden group option</option></optgroup><option value="two">Second visible</option>';
    document.body.append(select); adoptNativeControl(select);
  });
  const trigger = page.getByRole('combobox', { name: 'Visible choices', exact: true });
  await trigger.click();
  await expect(page.getByRole('option', { name: 'Hidden option', exact: true })).toHaveCount(0);
  await expect(page.getByRole('option', { name: 'Hidden group option', exact: true })).toHaveCount(0);
  await trigger.press('ArrowDown'); await trigger.press('Enter');
  await expect(trigger).toHaveText('Second visible');
  await page.locator('select').evaluate(select => {
    select.querySelector('option[value="secret"]')!.removeAttribute('hidden');
    select.querySelector('optgroup')!.removeAttribute('hidden');
  });
  await trigger.click();
  await expect(page.getByRole('option', { name: 'Hidden option', exact: true })).toBeVisible();
  await expect(page.getByRole('option', { name: 'Hidden group option', exact: true })).toBeVisible();
});

test('opening a hidden anchored surface does not announce an open session or retain listeners', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const path = '/src/primitives.ts'; const { createPopover } = await import(path);
    const originalAdd = document.addEventListener, originalRemove = document.removeEventListener;
    const listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
    const key = (type: string, options?: boolean | EventListenerOptions) => `${type}/${typeof options === 'boolean' ? options : !!options?.capture}`;
    document.addEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
      const id = key(type, options), group = listeners.get(id) ?? new Set<EventListenerOrEventListenerObject>();
      group.add(listener); listeners.set(id, group); originalAdd.call(document, type, listener, options);
    }) as typeof document.addEventListener;
    document.removeEventListener = ((type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) => {
      listeners.get(key(type, options))?.delete(listener); originalRemove.call(document, type, listener, options);
    }) as typeof document.removeEventListener;
    const toggles: boolean[] = [], content = document.createElement('p'); content.textContent = 'Details';
    const popover = createPopover({ label: 'Hidden details', content, onToggle: (open: boolean) => { toggles.push(open); } });
    document.body.append(popover.element); popover.element.hidden = true; popover.open();
    const state = { open: popover.isOpen(), expanded: popover.trigger.getAttribute('aria-expanded'), toggles: [...toggles] };
    popover.destroy();
    const remainingListeners = [...listeners.values()].reduce((total, group) => total + group.size, 0);
    document.addEventListener = originalAdd; document.removeEventListener = originalRemove;
    return { ...state, remainingListeners };
  });
  expect(result).toEqual({ open: false, expanded: 'false', toggles: [], remainingListeners: 0 });
});

test('closing and reopening a parent modal leaves the selector ready for its first click', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/primitives.ts'; const { createSelect, createDialog } = await import(path);
    const select = createSelect({ label: 'Modal choice', options: [{ value: 'a', label: 'Alpha' }, { value: 'b', label: 'Beta' }] });
    const dialog = createDialog({ title: 'Parent dialog', content: select.element }); dialog.open();
    Object.assign(window, { edgeModal: dialog });
  });
  const trigger = page.getByRole('combobox', { name: 'Modal choice', exact: true });
  await trigger.click(); await expect(page.getByRole('listbox')).toBeVisible();
  await page.evaluate(async () => {
    const dialog = (window as unknown as { edgeModal: { close(): void; open(): void } }).edgeModal;
    dialog.close(); await new Promise(resolve => setTimeout(resolve, 0)); dialog.open();
  });
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await trigger.click(); await expect(page.getByRole('listbox')).toBeVisible();
});

test('shared native adoption retains the selector until the final owner releases it', async ({ page }) => {
  const state = await page.evaluate(async () => {
    const path = '/src/foundations.ts'; const { adoptNativeControl } = await import(path);
    const select = document.createElement('select'); select.setAttribute('aria-label', 'Shared choice'); select.tabIndex = 3;
    select.innerHTML = '<option value="a">Alpha</option><option value="b">Beta</option>'; document.body.append(select);
    const first = adoptNativeControl(select), second = adoptNativeControl(select);
    first.destroy(); first.destroy();
    const afterFirst = document.querySelectorAll('.pui-select-trigger').length;
    second.reset('b'); second.focus();
    const retained = document.activeElement?.textContent === 'Beta';
    second.destroy(); second.destroy();
    return { afterFirst, retained, afterLast: document.querySelectorAll('.pui-select-trigger').length,
      restored: select.parentElement === document.body && !select.hasAttribute('aria-hidden') && select.tabIndex === 3 };
  });
  expect(state).toEqual({ afterFirst: 1, retained: true, afterLast: 0, restored: true });
});
