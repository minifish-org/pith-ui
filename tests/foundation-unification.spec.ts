import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => { await page.goto('/tests/fixture.html'); });

test('factory and retained action share pending, external disabling and stale-result rules', async ({ page }) => {
  const observed = await page.evaluate(async () => {
    const basePath = '/src/foundations.ts'; const primitivePath = '/src/primitives.ts';
    const { adoptAction } = await import(basePath);
    const { createButton } = await import(primitivePath);
    const results: unknown[] = [];
    for (const kind of ['factory', 'adopted'] as const) {
      let resolve!: (result: { ok: false; error: string }) => void;
      let calls = 0; let errors = 0;
      const options = { onAction() { calls++; return new Promise<{ ok: false; error: string }>(done => { resolve = done; }); }, onError() { errors++; } };
      const existing = document.createElement('button'); existing.className = 'pui-secondary-button';
      existing.type = 'button'; existing.dataset.command = 'save';
      const caption = document.createElement('span'); caption.textContent = 'Save'; existing.append(caption);
      const action = kind === 'factory' ? createButton({ label: 'Save', ...options }) : adoptAction(existing, { caption, ...options });
      document.body.append(action.element);
      action.element.click(); action.element.click();
      action.update({ label: 'Save', disabled: true });
      resolve({ ok: false, error: 'Keep disabled after a failed request' });
      await new Promise(done => setTimeout(done, 0));
      results.push({ kind, calls, errors, disabled: action.element.disabled, pending: !!action.element.dataset.controlPending });
      action.update({ label: 'Save', disabled: false }); action.element.click();
      action.destroy(); resolve({ ok: false, error: 'Ignore after destruction' });
      await new Promise(done => setTimeout(done, 0));
      results.push({ kind, calls, errors, sameCaption: kind === 'factory' || action.element.firstElementChild === caption, command: existing.dataset.command });
      action.element.remove();
    }
    return results;
  });
  expect(observed).toEqual([
    { kind: 'factory', calls: 1, errors: 1, disabled: true, pending: false },
    { kind: 'factory', calls: 2, errors: 1, sameCaption: true, command: 'save' },
    { kind: 'adopted', calls: 1, errors: 1, disabled: true, pending: false },
    { kind: 'adopted', calls: 2, errors: 1, sameCaption: true, command: 'save' },
  ]);
});

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

test('confirmation availability refresh keeps its failure and draft while the target becomes busy', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/primitives.ts'; const { createConfirmDialog } = await import(path);
    let unavailable = false;
    const dialog = createConfirmDialog({ title: 'Remove connection?', unavailable: () => unavailable,
      onConfirm: () => ({ ok: false, error: 'Server rejected this request' }) });
    dialog.open({ title: 'Remove connection?', message: 'Keep the same target' });
    Object.assign(window, { availabilityFixture: { dialog, set(value: boolean) { unavailable = value; dialog.refreshAvailability(); } } });
  });
  const remove = page.getByRole('button', { name: 'Remove', exact: true });
  await remove.click();
  await expect(page.getByRole('alert')).toHaveText('Server rejected this request');
  await page.evaluate(() => (window as unknown as { availabilityFixture: { set(value: boolean): void } }).availabilityFixture.set(true));
  await expect(remove).toBeDisabled();
  await expect(page.getByRole('alert')).toHaveText('Server rejected this request');
  await expect(page.getByText('Keep the same target')).toBeVisible();
  await page.evaluate(() => (window as unknown as { availabilityFixture: { set(value: boolean): void } }).availabilityFixture.set(false));
  await expect(remove).toBeEnabled();
  await expect(page.getByRole('alert')).toHaveText('Server rejected this request');
});

test('semantic secondary button preserves the accepted application presentation without a class patch', async ({ page }) => {
  const observed = await page.evaluate(async () => {
    const path = '/src/primitives.ts'; const { createButton } = await import(path);
    const original = createButton({ label: 'Refresh' }); original.element.classList.add('pui-secondary-button');
    const declared = createButton({ label: 'Refresh', appearance: 'secondary' });
    document.body.append(original.element, declared.element);
    const properties = ['height', 'padding', 'border', 'borderRadius', 'backgroundColor', 'color', 'fontSize', 'fontWeight', 'lineHeight', 'display', 'gap'] as const;
    const styles = (node: HTMLElement) => { const style = getComputedStyle(node); return Object.fromEntries(properties.map(property => [property, style[property]])); };
    const result = { original: styles(original.element), declared: styles(declared.element) };
    original.destroy(); declared.destroy(); return result;
  });
  expect(observed.declared).toEqual(observed.original);
});

test('shared action updates preserve pending owned by native copy and application adapters', async ({ page }) => {
  const observed = await page.evaluate(async () => {
    const basePath = '/src/foundations.ts'; const primitivePath = '/src/primitives.ts';
    const { adoptAction } = await import(basePath); const { createButton } = await import(primitivePath);
    const existing = document.createElement('button'); existing.dataset.controlPending = 'true'; existing.disabled = true;
    const adopted = adoptAction(existing); adopted.update({ disabled: false });
    const external = { disabled: existing.disabled, pending: existing.dataset.controlPending };
    delete existing.dataset.controlPending; adopted.update({ disabled: false });
    const copied = createButton({ label: 'Copy file' }); copied.element.dataset.copyPending = 'true'; copied.element.disabled = true;
    copied.update({ label: 'Copy file', disabled: false });
    const copyPending = copied.element.disabled;
    delete copied.element.dataset.copyPending; copied.update({ label: 'Copy file', disabled: false });
    return { external, externalReleased: !existing.disabled, copyPending, copyReleased: !copied.element.disabled };
  });
  expect(observed).toEqual({ external: { disabled: true, pending: 'true' }, externalReleased: true, copyPending: true, copyReleased: true });
});

test('copy failure preserves external disabling and destroy restores owned feedback nodes', async ({ page }) => {
  const observed = await page.evaluate(async () => {
    const path = '/src/files/systems.ts'; const primitivePath = '/src/primitives.ts';
    const { createCopyFeedback } = await import(path); const { createButton } = await import(primitivePath);
    const button = createButton({label:'Copy file'}); const caption = button.element.firstElementChild;
    const status = document.createElement('span'); document.body.append(button.element,status);
    let busy = false; let errors = 0;
    const feedback = createCopyFeedback({status,isDisabled:()=>busy,onError:()=>{errors++;}});
    await feedback.copy(button.element,async()=>{busy=true;throw new Error('Native clipboard failed');},'File copied.');
    const failure = {disabled:button.element.disabled,content:button.element.textContent,pending:button.element.hasAttribute('data-copy-pending'),errors};
    busy=false;
    await feedback.copy(button.element,async()=>{},'File copied.');
    const shown = button.element.textContent;
    feedback.destroy();
    const restored = {sameCaption:caption===button.element.firstElementChild,content:button.element.textContent,pending:button.element.hasAttribute('data-copy-pending'),disabled:button.element.disabled};
    button.update({label:'Copy updated file'});
    return {failure,shown,restored,updated:button.element.textContent};
  });
  expect(observed).toEqual({failure:{disabled:true,content:'Copy file',pending:false,errors:1},shown:'Copied',restored:{sameCaption:true,content:'Copy file',pending:false,disabled:false},updated:'Copy updated file'});
});

test('select reconciliation preserves native option identity, focus and multiple selections', async ({ page }) => {
  const observed = await page.evaluate(async () => {
    const path = '/src/foundations.ts'; const primitivePath = '/src/primitives.ts';
    const { reconcileSelectOptions } = await import(path); const { createSelect } = await import(primitivePath);
    const options = [{value:'a',label:'Alpha'},{value:'b',label:'Beta'},{value:'c',label:'Gamma'}];
    const single = createSelect({label:'Model',options,value:'b'}); document.body.append(single.element);
    const beta = single.control.options[1]; single.control.focus();
    single.update({label:'Model',options:[options[2],{value:'b',label:'Beta updated'},options[0]]});
    const retained = {focus:document.activeElement===single.control,value:single.getValue(),sameOption:single.control.options[1]===beta,label:beta.textContent};
    const multi = document.createElement('select'); multi.multiple=true;
    reconcileSelectOptions(multi,options); multi.options[0].selected=true; multi.options[2].selected=true;
    const alpha = multi.options[0], gamma = multi.options[2];
    reconcileSelectOptions(multi,[options[2],{value:'d',label:'Delta'},options[0]]);
    const multiple = {selected:[...multi.selectedOptions].map(option=>option.value),sameAlpha:multi.options[2]===alpha,sameGamma:multi.options[0]===gamma};
    reconcileSelectOptions(single.control,[options[0]],'missing');
    const missingPreferred = single.control.selectedIndex;
    single.update({label:'Model',options:[{value:'d',label:'Delta'}]});
    return {retained,multiple,missingPreferred,factoryFallback:single.getValue()};
  });
  expect(observed).toEqual({retained:{focus:true,value:'b',sameOption:true,label:'Beta updated'},multiple:{selected:['c','a'],sameAlpha:true,sameGamma:true},missingPreferred:-1,factoryFallback:'d'});
});

test('full access owns duplicate prevention, failure, external disabling and late destruction', async ({ page }) => {
  const observed = await page.evaluate(async () => {
    const path = '/src/tasks/permission.ts'; const { createFullAccessConfirmation } = await import(path);
    let calls = 0; let resolve!: (result: {ok:false;error:string}) => void;
    const block = createFullAccessConfirmation({title:'Current conversation'},{onConfirm:() => {calls++;return new Promise(done=>{resolve=done;});}});
    document.body.append(block.element); const button = block.confirmButton, error = (block.element as HTMLElement).querySelector<HTMLElement>('[role=alert]')!;
    button.click(); button.dispatchEvent(new MouseEvent('click',{bubbles:true}));
    block.update({disabled:true});
    const waiting = {calls,disabled:button.disabled,pending:button.dataset.controlPending};
    resolve({ok:false,error:'Permission change failed'}); await new Promise(done=>setTimeout(done,0));
    const failed = {calls,disabled:button.disabled,error:error.textContent,pending:button.hasAttribute('data-control-pending')};
    block.update({disabled:false}); button.click(); block.destroy(); resolve({ok:false,error:'Stale failure'});
    await new Promise(done=>setTimeout(done,0));
    return {waiting,failed,afterDestroy:{calls,connected:block.element.isConnected,error:error.textContent}};
  });
  expect(observed).toEqual({waiting:{calls:1,disabled:true,pending:'true'},failed:{calls:1,disabled:true,error:'Permission change failed',pending:false},afterDestroy:{calls:2,connected:false,error:''}});
});
