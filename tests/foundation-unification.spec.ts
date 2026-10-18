import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.goto('/tests/fixture.html');});

test('adopted fields preserve draft, selection, native validation and host descriptions', async ({ page }) => {
  const observed = await page.evaluate(async () => {
    const path = '/src/foundations.ts'; const { adoptNativeControl } = await import(path);
    const label = document.createElement('label'); const input = document.createElement('input');
    input.type = 'url'; input.required = true; input.autocomplete = 'off'; input.value = 'https://example.test/中文';
    input.setAttribute('aria-describedby', 'host-hint');
    const hint = document.createElement('p'); hint.id = 'host-hint'; hint.textContent = 'Keep existing endpoint';
    const description = document.createElement('p'); const error = document.createElement('p');
    document.body.append(label, input, hint, description, error);
    const originalNodes = [...document.body.children];
    const field = adoptNativeControl(input, { label, description, error });
    input.focus();
    field.update({ label: 'Endpoint', description: 'Empty keeps the saved value', error: 'Connection failed' });
    const result = { value: field.getValue(), type: input.type, required: input.required, autocomplete: input.autocomplete,
      focus: document.activeElement === input, sameTree: originalNodes.every((node, index) => document.body.children[index] === node),
      described: input.getAttribute('aria-describedby')!.split(' '), error: error.textContent, invalid: input.getAttribute('aria-invalid') };
    field.update({ error: '', description: '' });
    field.destroy(); field.reset('https://late.test');
    return { ...result, described: result.described.map(id => id === 'host-hint' ? id : id === error.id ? 'error' : 'description'),
      remainingDescription: input.getAttribute('aria-describedby'), valueAfterDestroy: input.value };
  });
  expect(observed).toEqual({ value: 'https://example.test/中文', type: 'url', required: true, autocomplete: 'off',
    focus: true, sameTree: true, described: ['host-hint', 'description', 'error'], error: 'Connection failed', invalid: 'true',
    remainingDescription: 'host-hint', valueAfterDestroy: 'https://example.test/中文' });
});

test('product reconciliation retains controllers and disposes removed or destroyed nodes', async ({ page }) => {
  const observed = await page.evaluate(async () => {
    const path = '/src/foundations.ts'; const { adoptProductParts } = await import(path);
    const owner = document.createElement('section');
    owner.innerHTML = '<form><label for="draft">Draft</label><textarea id="draft">Original</textarea><div class="pui-form-error" role="alert"></div><div class="pui-modal-footer"><button type="submit" class="pui-primary-button">Save</button></div></form>';
    document.body.append(owner);
    const original = owner.innerHTML;
    const parts = adoptProductParts(owner);
    const control = owner.querySelector('textarea')!; const error = owner.querySelector<HTMLElement>('[role="alert"]')!;
    const first = parts.control(control); control.value = 'Draft 中文'; control.focus(); control.setSelectionRange(1, 4);
    parts.update(); parts.feedback(error).update({ message: '<unsafe> failure', tone: 'error' });
    const retained = { handle: parts.control(control) === first, value: control.value, focus: document.activeElement === control,
      selection: [control.selectionStart, control.selectionEnd], error: error.textContent, errorHidden: error.hasAttribute('hidden'),
      unsafe: !!error.querySelector('unsafe'), rows: owner.querySelectorAll('textarea').length, originalHadHidden: original.includes('hidden') };
    control.remove(); parts.update(); first.reset('Stale removed node');
    const valueAfterRemoval = control.value;
    const button = owner.querySelector('button')!; const action = parts.action(button);
    parts.destroy(); action.update({ label: 'Late replacement' });
    parts.action(button).update({ label: 'Late lookup replacement' });
    return { retained, valueAfterRemoval, buttonLabelAfterDestroy: button.textContent };
  });
  expect(observed).toEqual({ retained: { handle: true, value: 'Draft 中文', focus: true, selection: [1, 4],
    error: '<unsafe> failure', errorHidden: false, unsafe: false, rows: 1, originalHadHidden: false },
    valueAfterRemoval: 'Draft 中文', buttonLabelAfterDestroy: 'Save' });
});
