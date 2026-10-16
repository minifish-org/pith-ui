import {test, expect} from '@playwright/test';

test.beforeEach(async ({page}) => {await page.goto('/tests/fixture.html');});

test('shell and feature dialogs share close behavior while unchanged content retains its draft and focus', async ({page}) => {
  await page.evaluate(async () => {
    const [{installDialogLifecycle}, {createFeatureDialogFrame}] = await Promise.all([import('../src/surface.js'), import('../src/forms/dialog-frame.js')]);
    const opener = document.createElement('button'); opener.textContent = 'Open feature'; document.body.append(opener); opener.focus();
    const dialog = document.createElement('dialog'); dialog.className = 'pui-modal'; document.body.append(dialog);
    let shellCloses = 0; let frameCloses = 0; let destroyed = 0;
    const shell = installDialogLifecycle(dialog, {onClose() {document.body.dataset.shellCloses = String(++shellCloses);}});
    const frame = createFeatureDialogFrame({dialog, onClose() {document.body.dataset.frameCloses = String(++frameCloses);}});
    const body = document.createElement('input'); body.setAttribute('aria-label', 'Retained draft'); body.value = 'Original';
    const content = {element: body, destroy() {document.body.dataset.contentDestroyed = String(++destroyed); body.remove();}};
    frame.open({title: 'Feature', body: content}); body.focus(); body.value = 'Edited 中文'; body.setSelectionRange(2, 5);
    frame.update({title: 'Updated feature', body: content});
    document.body.dataset.retained = JSON.stringify({focused: document.activeElement === body, selection: [body.selectionStart, body.selectionEnd], value: body.value});
    Object.assign(window, {surfaceFixture: {shell, frame}});
  });
  expect(JSON.parse((await page.locator('body').getAttribute('data-retained'))!)).toEqual({focused: true, selection: [2, 5], value: 'Edited 中文'});
  await page.getByRole('button', {name: 'Close updated feature', exact: true}).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.locator('body')).toHaveAttribute('data-shell-closes', '1');
  await expect(page.locator('body')).toHaveAttribute('data-frame-closes', '1');
  await expect(page.locator('body')).toHaveAttribute('data-content-destroyed', '1');
  await expect(page.getByRole('button', {name: 'Open feature', exact: true})).toBeFocused();
});

test('queued close events do not dispose reopened content or restore outside focus', async ({page}) => {
  const result = await page.evaluate(async () => {
    const [{installDialogLifecycle}, {createFeatureDialogFrame}] = await Promise.all([import('../src/surface.js'), import('../src/forms/dialog-frame.js')]);
    const dialog = document.createElement('dialog'); document.body.append(dialog);
    let closes = 0; let firstDestroyed = 0;
    const shell = installDialogLifecycle(dialog, {onClose() {closes++;}});
    const frame = createFeatureDialogFrame({dialog});
    const first = document.createElement('p'); first.textContent = 'Old';
    frame.open({title: 'Old', body: {element: first, destroy() {firstDestroyed++; first.remove();}}});
    frame.close();
    const next = document.createElement('input'); next.value = 'Current';
    frame.open({title: 'Current', body: next}); next.focus();
    await new Promise(resolve => setTimeout(resolve, 40));
    const result = {open: dialog.open, closes, firstDestroyed, retained: next.isConnected, focused: document.activeElement === next};
    frame.destroy(); shell.destroy(); return result;
  });
  expect(result).toEqual({open: true, closes: 0, firstDestroyed: 1, retained: true, focused: true});
});

test('shared dialog lifecycle respects disabled cancellation, Escape and geometric backdrop closing', async ({page}) => {
  await page.evaluate(async () => {
    const {installDialogLifecycle} = await import('../src/surface.js');
    const opener = document.createElement('button'); opener.textContent = 'Open surface'; document.body.append(opener);
    const dialog = document.createElement('dialog'); dialog.style.width = '300px'; dialog.innerHTML = '<p>Dialog body</p>'; document.body.append(dialog);
    let blocked = true;
    const surface = installDialogLifecycle(dialog, {canClose: () => !blocked});
    opener.onclick = () => surface.open();
    Object.assign(window, {surfaceFixture: {allow() {blocked = false;}}});
  });
  await page.getByRole('button', {name: 'Open surface', exact: true}).click();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toBeVisible();
  await page.mouse.click(2, 2); await expect(page.getByRole('dialog')).toBeVisible();
  await page.evaluate(() => (window as unknown as {surfaceFixture: {allow(): void}}).surfaceFixture.allow());
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByRole('button', {name: 'Open surface', exact: true})).toBeFocused();
  await page.getByRole('button', {name: 'Open surface', exact: true}).click();
  await page.mouse.click(2, 2); await expect(page.getByRole('dialog')).toBeHidden();
});

test('an explicit backdrop veto wins when the shell and a child share a dialog', async ({page}) => {
  await page.evaluate(async () => {
    const {installDialogLifecycle} = await import('../src/surface.js');
    const dialog = document.createElement('dialog'); dialog.style.width = '300px'; dialog.innerHTML = '<p>Shared body</p>'; document.body.append(dialog);
    const shell = installDialogLifecycle(dialog);
    const child = installDialogLifecycle(dialog, {closeOnBackdrop: false});
    Object.assign(window, {surfaceFixture: {child}}); shell.open();
  });
  await page.mouse.click(2, 2); await expect(page.getByRole('dialog')).toBeVisible();
  await page.evaluate(() => (window as unknown as {surfaceFixture: {child: {destroy(): void}}}).surfaceFixture.child.destroy());
  await page.mouse.click(2, 2); await expect(page.getByRole('dialog')).toBeHidden();
});

test('explicit focus returns and dialogs opened by close callbacks take precedence over default focus restoration', async ({page}) => {
  await page.evaluate(async () => {
    const {installDialogLifecycle} = await import('../src/surface.js');
    const original = document.createElement('button'); original.textContent = 'Original opener';
    const explicit = document.createElement('button'); explicit.textContent = 'Explicit return';
    const first = document.createElement('dialog'); first.innerHTML = '<button>First content</button>';
    const second = document.createElement('dialog'); second.innerHTML = '<input aria-label="Second content" />';
    document.body.append(original, explicit, first, second); original.focus();
    let next = false;
    const following = installDialogLifecycle(second);
    const current = installDialogLifecycle(first, {returnFocus: () => explicit, onClose() {if (next) following.open();}});
    current.open();
    Object.assign(window, {surfaceFixture: {reopen() {next = true; current.open();}}});
  });
  await page.keyboard.press('Escape'); await expect(page.getByRole('button', {name: 'Explicit return', exact: true})).toBeFocused();
  await page.evaluate(() => (window as unknown as {surfaceFixture: {reopen(): void}}).surfaceFixture.reopen());
  await page.keyboard.press('Escape'); await expect(page.getByRole('textbox', {name: 'Second content', exact: true})).toBeFocused();
});

test('context menus share keyboard navigation, retain keyed actions, and own outside, scroll and resize dismissal', async ({page}) => {
  await page.evaluate(async () => {
    const {createContextMenu} = await import('../src/navigation/context-menu.js');
    const trigger = document.createElement('button'); trigger.textContent = 'Open context';
    const outside = document.createElement('button'); outside.textContent = 'Outside';
    const state = {label: 'Context actions', items: [{id: 'first', label: 'First'}, {id: 'disabled', label: 'Disabled', disabled: true}, {id: 'last', label: 'Last'}]};
    const menu = createContextMenu({onDismiss(restore) {document.body.dataset.restored = String(restore);}});
    document.body.append(trigger, outside, menu.element); trigger.onclick = () => menu.open(trigger, state);
    Object.assign(window, {surfaceFixture: {menu, state}});
  });
  await page.getByRole('button', {name: 'Open context', exact: true}).click();
  await expect(page.getByRole('menuitem', {name: 'First', exact: true})).toBeFocused();
  await page.keyboard.press('ArrowDown'); await expect(page.getByRole('menuitem', {name: 'Last', exact: true})).toBeFocused();
  const retained = await page.evaluate(() => {
    const {menu, state} = (window as unknown as {surfaceFixture: {menu: {element: HTMLElement; update(state: unknown): void}; state: unknown}}).surfaceFixture;
    const button = document.activeElement; menu.update(state); return button === document.activeElement && menu.element.contains(button);
  });
  expect(retained).toBe(true);
  await page.keyboard.press('Home'); await expect(page.getByRole('menuitem', {name: 'First', exact: true})).toBeFocused();
  await page.keyboard.press('End'); await expect(page.getByRole('menuitem', {name: 'Last', exact: true})).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.getByRole('button', {name: 'Open context', exact: true})).toBeFocused();
  await expect(page.getByRole('menu')).toBeHidden();
  await page.getByRole('button', {name: 'Open context', exact: true}).click();
  await page.getByRole('button', {name: 'Outside', exact: true}).click(); await expect(page.getByRole('menu')).toBeHidden();
  await page.getByRole('button', {name: 'Open context', exact: true}).click();
  await page.evaluate(() => document.dispatchEvent(new Event('scroll'))); await expect(page.getByRole('menu')).toBeHidden();
  await page.getByRole('button', {name: 'Open context', exact: true}).click();
  await page.evaluate(() => window.dispatchEvent(new Event('resize'))); await expect(page.getByRole('menu')).toBeHidden();
});

test('rename owns typed submission, pending, retained draft, disabled state and stale response protection', async ({page}) => {
  await page.evaluate(async () => {
    const {createRenameConversation} = await import('../src/navigation/navigation.js');
    const dialog = document.createElement('dialog'); document.body.append(dialog);
    let calls = 0; let resolve: (result: {ok: false; error: string}) => void = () => {};
    const block = createRenameConversation({id: 'first', title: 'Original'}, {dialog, onSubmit(draft) {document.body.dataset.draft = JSON.stringify(draft); document.body.dataset.calls = String(++calls); return new Promise(done => {resolve = done;});}});
    dialog.append(block.element); block.open();
    Object.assign(window, {surfaceFixture: {block, resolve(result: {ok: false; error: string}) {resolve(result);}}});
  });
  const input = page.getByLabel('Title', {exact: true});
  await input.fill('Edited 中文'); await input.evaluate((node: HTMLInputElement) => node.setSelectionRange(2, 5));
  await page.evaluate(() => {
    const block = (window as unknown as {surfaceFixture: {block: {update(state: unknown): void}}}).surfaceFixture.block;
    block.update({id: 'first', title: 'Snapshot', disabled: false});
  });
  expect(await input.evaluate((node: HTMLInputElement) => [node.value, node.selectionStart, node.selectionEnd])).toEqual(['Edited 中文', 2, 5]);
  await page.getByRole('button', {name: 'Save title', exact: true}).click();
  await page.locator('form').evaluate((form: HTMLFormElement) => form.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true})));
  await expect(page.locator('body')).toHaveAttribute('data-calls', '1');
  await expect(page.getByRole('button', {name: 'Save title', exact: true})).toBeDisabled();
  await page.evaluate(() => (window as unknown as {surfaceFixture: {resolve(result: unknown): void}}).surfaceFixture.resolve({ok: false, error: 'Try again'}));
  await expect(page.getByRole('alert')).toHaveText('Try again'); await expect(input).toHaveValue('Edited 中文');
  await page.getByRole('button', {name: 'Save title', exact: true}).click();
  await page.evaluate(() => {
    const fixture = (window as unknown as {surfaceFixture: {block: {close(): void; open(state: unknown): void}; resolve(result: unknown): void}}).surfaceFixture;
    fixture.block.close(); fixture.block.open({id: 'next', title: 'New target'}); fixture.resolve({ok: false, error: 'Old failure'});
  });
  await expect(input).toHaveValue('New target'); await expect(page.locator('.pui-form-error')).toHaveText(''); await expect(page.locator('.pui-form-error')).toBeHidden();
  await expect(page.getByRole('button', {name: 'Save title', exact: true})).toBeEnabled();
});

test('workspace picker owns native selection, typed submissions and keyed list updates without resetting a draft', async ({page}) => {
  await page.evaluate(async () => {
    const {createWorkspacePicker} = await import('../src/navigation/navigation.js');
    const state = {workspaces: [{id: 'a', name: 'Project', path: '/demo/a'}]};
    const block = createWorkspacePicker(state, {onPick: async () => ({path: '/demo/chosen'}), onSubmit(path) {document.body.dataset.path = path; document.body.dataset.submits = String(Number(document.body.dataset.submits || 0) + 1); return {ok: false, error: 'Add failed'};}, onSelect(id) {document.body.dataset.selected = id;}});
    document.body.append(block.element);
    Object.assign(window, {surfaceFixture: {block, state}});
  });
  const input = page.getByRole('textbox', {name: 'Absolute folder path', exact: true});
  await input.fill('/demo/typed');
  const identity = await page.evaluate(() => {
    const {block, state} = (window as unknown as {surfaceFixture: {block: {element: HTMLElement; update(state: unknown): void}; state: unknown}}).surfaceFixture;
    const row = block.element.querySelector<HTMLButtonElement>('[data-modal-workspace]')!; row.focus(); block.update(state); return row === document.activeElement;
  });
  expect(identity).toBe(true); await expect(input).toHaveValue('/demo/typed');
  await page.getByRole('button', {name: 'Project /demo/a', exact: true}).click(); await expect(page.locator('body')).toHaveAttribute('data-selected', 'a');
  await page.getByRole('button', {name: 'Choose a folder…', exact: true}).click();
  await expect(input).toHaveValue('/demo/chosen'); await expect(page.getByRole('alert')).toHaveText('Add failed');
  await expect(page.locator('body')).toHaveAttribute('data-path', '/demo/chosen'); await expect(page.locator('body')).toHaveAttribute('data-submits', '1');
});

test('late folder picker results cannot replace a reopened draft or start a write', async ({page}) => {
  await page.evaluate(async () => {
    const {createWorkspacePicker} = await import('../src/navigation/navigation.js');
    const dialog = document.createElement('dialog'); document.body.append(dialog);
    let resolve: (result: {path: string}) => void = () => {};
    const block = createWorkspacePicker({workspaces: []}, {dialog, onPick() {return new Promise(done => {resolve = done;});}, onSubmit() {document.body.dataset.written = 'true'; return {ok: true};}});
    dialog.append(block.element); block.open();
    Object.assign(window, {surfaceFixture: {block, dialog, resolve(result: {path: string}) {resolve(result);}}});
  });
  await page.getByRole('textbox', {name: 'Absolute folder path', exact: true}).fill('/demo/current');
  await page.getByRole('button', {name: 'Choose a folder…', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Choose a folder…', exact: true})).toBeDisabled();
  await page.evaluate(() => {
    const fixture = (window as unknown as {surfaceFixture: {block: {open(): void}; dialog: HTMLDialogElement; resolve(result: {path: string}): void}}).surfaceFixture;
    fixture.dialog.close(); fixture.block.open(); fixture.resolve({path: '/demo/stale'});
  });
  await expect(page.getByRole('textbox', {name: 'Absolute folder path', exact: true})).toHaveValue('/demo/current');
  await expect(page.getByRole('button', {name: 'Choose a folder…', exact: true})).toBeEnabled();
  expect(await page.locator('body').getAttribute('data-written')).toBeNull();
});
