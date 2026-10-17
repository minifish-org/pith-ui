import {test, expect, type Page} from '@playwright/test';

type Result = {ok: true} | {ok: false; error: string};
interface EditorState {title: string; description?: string; note?: string; error?: string; submitLabel?: string; disabled?: boolean; pending?: boolean; inputDisabled?: boolean; closeDisabled?: boolean}
interface EditorHandle {
  read(): string;
  update(state: EditorState): void;
  reset(value: string): void;
  open(input: {value: string; title?: string; description?: string; note?: string}): void;
  close(): void;
  focus(): void;
  isOpen(): boolean;
  destroy(): void;
}
interface ConfirmState {title: string; description?: string; message?: {before: string; subject?: string; after?: string}; hint?: string; error?: string; confirmLabel?: string; disabled?: boolean; pending?: boolean; closeDisabled?: boolean}
interface ConfirmHandle {update(state: ConfirmState): void; open(state?: ConfirmState): void; close(): void; isOpen(): boolean; destroy(): void}
interface EditConfirmHarness {
  editor?: EditorHandle;
  confirm?: ConfirmHandle;
  state: EditorState;
  confirmation: ConfirmState;
  values: string[];
  confirms: number;
  inputs: string[];
  closed: number;
  releases: Array<(result: Result) => void>;
  input?: HTMLTextAreaElement;
}
declare global {interface Window {editConfirmHarness: EditConfirmHarness}}
const editorState: EditorState = {title: 'Edit message', description: 'Revise the original request.', note: 'Send again to replace this message and its following replies.', submitLabel: 'Send again'};
const confirmState: ConfirmState = {title: 'Delete conversation?', message: {before: 'Permanently delete ', subject: 'Project 中文', after: ', including its saved history?'}, hint: 'Deleted conversation data cannot be recovered.', confirmLabel: 'Delete conversation'};

async function openEditor(page: Page, old = false, purpose: 'message' | 'queue-message' = 'message', appearance: 'light' | 'dark' = 'light'): Promise<void> {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async ({initial, old, purpose, appearance}) => {
    document.documentElement.classList.add('pui'); document.documentElement.dataset.appearance = appearance; document.body.dataset.appearance = appearance;
    const h: EditConfirmHarness = {state: initial, confirmation: {title: ''}, values: [], confirms: 0, inputs: [], closed: 0, releases: []};
    const source = document.createElement('button'); source.textContent = 'Original opener'; source.id = 'original-opener'; document.body.append(source); source.focus();
    const mount = document.createElement('div'); document.body.append(mount);
    const callbacks = {onInput(value: string) {h.inputs.push(value);}, onClose() {h.closed++;}, onSubmit(value: string) {h.values.push(value); return new Promise<Result>(resolve => h.releases.push(resolve));}};
    if (old) {
      const path = '/src/primitives.ts'; const {createTextEditDialog} = await import(path);
      const block = createTextEditDialog({...initial, ...callbacks, label: purpose === 'message' ? 'Message' : 'Pending message'});
      block.control.rows = purpose === 'message' ? 8 : 5; mount.append(block.element);
      h.editor = {read: block.getValue, update: block.update, reset: value => block.open({value}), open: block.open,
        close: block.close, focus: block.focus, isOpen: () => block.element.open, destroy: block.destroy};
      block.open({value: 'Original message 中文\nSecond paragraph.'});
    } else {
      const path = '/examples/assemblies/text-edit.ts'; const {mountTextEditor} = await import(path);
      h.editor = mountTextEditor(mount, {...initial, value: 'Original message 中文\nSecond paragraph.'}, {...callbacks, purpose}, {appearance});
    }
    window.editConfirmHarness = h;
  }, {initial: editorState, old, purpose, appearance});
  await expect(page.getByRole('dialog', {name: 'Edit message', exact: true})).toBeVisible();
}

async function openConfirmation(page: Page, old = false, appearance: 'light' | 'dark' = 'light'): Promise<void> {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async ({initial, old, appearance}) => {
    document.documentElement.classList.add('pui'); document.documentElement.dataset.appearance = appearance; document.body.dataset.appearance = appearance;
    const h: EditConfirmHarness = {state: {title: ''}, confirmation: initial, values: [], confirms: 0, inputs: [], closed: 0, releases: []};
    const source = document.createElement('button'); source.textContent = 'Original opener'; source.id = 'original-opener'; document.body.append(source); source.focus();
    const mount = document.createElement('div'); document.body.append(mount);
    const callbacks = {onClose() {h.closed++;}, onConfirm() {h.confirms++; return new Promise<Result>(resolve => h.releases.push(resolve));}};
    if (old) {
      const path = '/src/primitives.ts'; const {createConfirmDialog} = await import(path);
      const text = document.createDocumentFragment(); text.append(initial.message!.before); const subject = document.createElement('strong'); subject.textContent = initial.message!.subject!; text.append(subject, initial.message!.after!);
      const block = createConfirmDialog({...initial, message: text, ...callbacks}); mount.append(block.element); block.open();
      h.confirm = {update: next => block.update({...next, message: next.message ? `${next.message.before}${next.message.subject ?? ''}${next.message.after ?? ''}` : undefined}), open: next => block.open(next ? {...next, message: next.message?.before} : undefined), close: block.close, isOpen: () => block.element.open, destroy: block.destroy};
    } else {
      const path = '/examples/assemblies/confirmation.ts'; const {mountConfirmation} = await import(path);
      h.confirm = mountConfirmation(mount, initial, callbacks, {appearance});
    }
    window.editConfirmHarness = h;
  }, {initial: confirmState, old, appearance});
  await expect(page.getByRole('dialog', {name: 'Delete conversation?', exact: true})).toBeVisible();
}

async function openDeskScene(page: Page, kind: 'message' | 'queue-message' | 'confirmation', appearance: 'light' | 'dark' = 'light'): Promise<void> {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async ({kind, editor, confirmation, appearance}) => {
    document.documentElement.classList.add('pui'); document.documentElement.dataset.appearance = appearance; document.body.dataset.appearance = appearance;
    const path = '/src/app/index.ts'; const {createApplication} = await import(path);
    const mount = document.body.appendChild(document.createElement('div'));
    const app = createApplication(mount, {appearance});
    if (kind === 'confirmation') app.workspace.openConfirmation({title: confirmation.title, action: confirmation.confirmLabel!, description: confirmation.message!, hint: confirmation.hint}, {onConfirm: () => ({ok: true})});
    else app.workspace[kind === 'message' ? 'openMessageEditor' : 'openQueueEditor']({...editor, value: 'Original message 中文\nSecond paragraph.'}, {onSubmit: () => ({ok: true})});
  }, {kind, editor: editorState, confirmation: confirmState, appearance});
  await expect(page.locator('dialog[open]')).toBeVisible();
}

async function presentation(page: Page): Promise<unknown> {
  return page.evaluate(() => {
    for (const animation of document.getAnimations()) if (animation.effect?.getTiming().iterations !== Infinity) animation.finish();
    const dialog = document.querySelector('dialog[open]')!;
    const origin = dialog.getBoundingClientRect();
    const take = (element: Element | null) => {
      if (!element) return null;
      const box = element.getBoundingClientRect(), style = getComputedStyle(element);
      return {tag: element.localName, box: [box.x - origin.x, box.y - origin.y, box.width, box.height].map(value => Math.round(value * 100) / 100),
        styles: ['font-family', 'font-size', 'font-weight', 'line-height', 'color', 'background-color', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-bottom', 'gap', 'border-top-width', 'border-top-color', 'border-top-left-radius', 'outline-style', 'box-shadow'].map(property => style.getPropertyValue(property))};
    };
    const buttons = [...dialog.querySelectorAll('button')];
    return {dialog: take(dialog), header: take(dialog.querySelector('header')), heading: take(dialog.querySelector('h2')),
      description: take(dialog.querySelector('header p')), field: take(dialog.querySelector('.pui-field')), label: take(dialog.querySelector('label')),
      textarea: take(dialog.querySelector('textarea')), rows: dialog.querySelector('textarea')?.rows,
      note: take(dialog.querySelector('form > p')), notice: take(dialog.querySelector('[role=alert]')),
      actions: take(dialog.querySelector('.pui-actions')), buttons: buttons.map(take),
      formChildren: [...dialog.querySelector('form')!.children].map(element => element.localName),
      svg: [...dialog.querySelectorAll('svg')].map(svg => svg.innerHTML)};
  });
}

test('prompt button purposes retain ordinary, primary, danger and close-icon presentation through the same button part', async ({page}) => {
  await page.goto('/tests/fixture.html');
  const values = await page.evaluate(async () => {
    const oldPath = '/src/primitives.ts', partsPath = '/src/parts/index.ts';
    const old = await import(oldPath), parts = await import(partsPath);
    const inspect = (root: Element) => [...root.querySelectorAll('button')].map(button => {
      const style = getComputedStyle(button), box = button.getBoundingClientRect();
      return {classes: [...button.classList].sort(), caption: button.querySelector('span')?.textContent, captionClasses: button.querySelector('span')?.className,
        label: button.getAttribute('aria-label'), width: box.width, height: box.height,
        styles: ['font-size', 'font-weight', 'line-height', 'color', 'background-color', 'border-top-width', 'border-top-color', 'border-radius', 'padding-top', 'padding-right'].map(key => style.getPropertyValue(key)), svg: button.querySelector('svg')?.innerHTML};
    });
    const baseline = document.createElement('div'); document.body.append(baseline);
    const blocks = [old.createButton({label: 'Cancel'}), old.createButton({label: 'Save', intent: 'primary', type: 'submit'}), old.createButton({label: 'Remove', intent: 'danger', type: 'submit'}), old.createIconButton({label: 'Close', icon: 'close'})];
    baseline.append(...blocks.map(block => block.element)); const before = inspect(baseline); baseline.remove(); blocks.forEach(block => block.destroy());
    const mount = document.createElement('div'); document.body.append(mount);
    const buttons = [parts.createButtonPart({purpose: 'prompt', label: 'Cancel', variant: 'standard'}), parts.createButtonPart({purpose: 'prompt', label: 'Save', variant: 'primary', type: 'submit'}), parts.createButtonPart({purpose: 'prompt', label: 'Remove', variant: 'danger', type: 'submit'}), parts.createButtonPart({purpose: 'prompt', label: 'Close', variant: 'quiet-icon', icon: 'close'})];
    const mounted = parts.mountParts(mount, parts.createStackPart({children: buttons}), {appearance: 'light'});
    const after = inspect(mount); mounted.destroy(); return {before, after};
  });
  expect(values.after).toEqual(values.before);
});

test('bounded message field purposes preserve existing textarea rows and a single shared label/control group', async ({page}) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async () => {
    const path = '/src/parts/index.ts'; const parts = await import(path);
    const mount = document.createElement('div'); document.body.append(mount);
    const message = parts.createTextareaPart({purpose: 'message', label: 'Message', value: 'A draft'});
    const queued = parts.createTextareaPart({purpose: 'queue-message', label: 'Pending message'});
    const label = parts.createFieldLabelPart({label: 'Message', control: message});
    const field = parts.createFieldGroupPart({children: [label, message]});
    const mounted = parts.mountParts(mount, parts.createStackPart({children: [field, queued]}));
    const rows = [...mount.querySelectorAll('textarea')].map(control => ({rows: control.rows, classes: control.className}));
    const group = mount.querySelector('.pui-field')!, control = mount.querySelector('textarea')!;
    const value = {rows, children: [...group.children].map(node => node.localName), wrapperCount: group.querySelectorAll('div').length,
      label: group.querySelector('label')!.htmlFor === control.id, handles: [field, message].map(part => Object.values(part).some(value => value instanceof Node))};
    mounted.destroy(); return value;
  });
  expect(result).toEqual({rows: [{rows: 8, classes: 'pui-control'}, {rows: 5, classes: 'pui-control'}], children: ['label', 'textarea'], wrapperCount: 0, label: true, handles: [false, false]});
});

for (const kind of ['message', 'queue-message'] as const) test(`parts text editor preserves the original ${kind} structure, geometry, type and error presentation`, async ({page}) => {
  await openEditor(page, true, kind);
  await page.evaluate(() => window.editConfirmHarness.editor!.update({...window.editConfirmHarness.state, error: 'The original request failed.'}));
  const baseline = await presentation(page);
  await openEditor(page, false, kind);
  await page.evaluate(() => window.editConfirmHarness.editor!.update({...window.editConfirmHarness.state, error: 'The original request failed.'}));
  expect(await presentation(page)).toEqual(baseline);
  await expect(page.getByRole('textbox', {name: kind === 'message' ? 'Message' : 'Pending message', exact: true})).toBeFocused();
});

for (const kind of ['message', 'queue-message', 'confirmation'] as const) test(`parts assembly preserves the actual Desk ${kind} scene, including its dynamically created generic dialog`, async ({page}) => {
  await openDeskScene(page, kind);
  await expect(page.locator('dialog[open]')).toHaveClass('pui-dialog');
  expect(await page.locator('dialog[open]').evaluate(element => element.getBoundingClientRect().width)).toBe(600);
  const baseline = await presentation(page);
  if (kind === 'confirmation') await openConfirmation(page); else await openEditor(page, false, kind);
  expect(await presentation(page)).toEqual(baseline);
});

for (const kind of ['message', 'queue-message', 'confirmation'] as const) test(`explicit dark ${kind} assembly preserves Desk colors even when the operating system is light`, async ({page}) => {
  await page.emulateMedia({colorScheme: 'light'});
  await openDeskScene(page, kind, 'dark'); const baseline = await presentation(page);
  const background = await page.locator('dialog[open]').evaluate(element => getComputedStyle(element).backgroundColor);
  if (kind === 'confirmation') await openConfirmation(page, false, 'dark'); else await openEditor(page, false, kind, 'dark');
  expect(await page.locator('dialog[open]').evaluate(element => getComputedStyle(element).backgroundColor)).toBe(background);
  expect(await presentation(page)).toEqual(baseline);
});

test('parts confirmation preserves the original cancel-first destructive presentation and literal emphasized subject', async ({page}) => {
  await openConfirmation(page, true); const baseline = await presentation(page);
  await openConfirmation(page); expect(await presentation(page)).toEqual(baseline);
  await expect(page.getByRole('button', {name: 'Cancel', exact: true})).toBeFocused();
  await expect(page.locator('form strong')).toHaveText('Project 中文');
  await page.evaluate(() => window.editConfirmHarness.confirm!.update({...window.editConfirmHarness.confirmation, message: {before: 'Remove ', subject: '<script>literal</script>', after: '?'}, hint: 'A new hint.'}));
  await expect(page.locator('form strong')).toHaveText('<script>literal</script>');
  await expect(page.locator('script')).toHaveCount(0);
});

test('text metadata updates preserve the exact draft node, composition, selection, input callback and submit label', async ({page}) => {
  await openEditor(page);
  const input = page.getByRole('textbox', {name: 'Message', exact: true});
  await input.fill('My edited request 中文\nKeep the second paragraph.');
  await input.evaluate(element => {const field = element as HTMLTextAreaElement; field.setSelectionRange(3, 12); field.dispatchEvent(new CompositionEvent('compositionstart', {bubbles: true})); window.editConfirmHarness.input = field;});
  await page.evaluate(() => window.editConfirmHarness.editor!.update({...window.editConfirmHarness.state, description: 'Metadata arrived.', note: 'The message retains its images.', submitLabel: 'Send edited message', error: 'Recoverable metadata notice.'}));
  expect(await input.evaluate(element => ({same: element === window.editConfirmHarness.input, focus: element === document.activeElement, selection: [(element as HTMLTextAreaElement).selectionStart, (element as HTMLTextAreaElement).selectionEnd]}))).toEqual({same: true, focus: true, selection: [3, 12]});
  await expect(input).toHaveValue('My edited request 中文\nKeep the second paragraph.');
  await input.evaluate(element => element.dispatchEvent(new CompositionEvent('compositionend', {bubbles: true})));
  await expect(page.getByRole('button', {name: 'Send edited message', exact: true})).toBeEnabled();
  expect(await page.evaluate(() => window.editConfirmHarness.inputs.at(-1))).toBe('My edited request 中文\nKeep the second paragraph.');
});

test('pending text submission remains single while availability changes, failure retains the draft, and reset rejects a stale result', async ({page}) => {
  await openEditor(page);
  const input = page.getByRole('textbox', {name: 'Message', exact: true}), submit = page.getByRole('button', {name: 'Send again', exact: true});
  await input.fill('Unsaved edited request'); await submit.click(); await expect(submit).toBeDisabled();
  await page.evaluate(() => {const h = window.editConfirmHarness; h.editor!.update({...h.state, disabled: true}); h.editor!.update({...h.state, disabled: false}); document.querySelector('form')!.requestSubmit();});
  await expect(submit).toBeDisabled(); expect(await page.evaluate(() => window.editConfirmHarness.values)).toEqual(['Unsaved edited request']);
  await page.evaluate(() => window.editConfirmHarness.releases[0]!({ok: false, error: 'Save rejected'}));
  await expect(page.getByRole('alert')).toHaveText('Save rejected'); await expect(input).toHaveValue('Unsaved edited request'); await expect(submit).toBeEnabled();
  await submit.click();
  await page.evaluate(() => {window.editConfirmHarness.editor!.reset('A different target'); window.editConfirmHarness.releases[1]!({ok: true});});
  await expect(page.getByRole('dialog')).toBeVisible(); await expect(input).toHaveValue('A different target'); await expect(submit).toBeEnabled();
  await submit.click(); await page.evaluate(() => window.editConfirmHarness.releases[2]!({ok: true}));
  await expect(page.getByRole('dialog')).toBeHidden(); await expect(page.locator('#original-opener')).toBeFocused();
  expect(await page.evaluate(() => window.editConfirmHarness.closed)).toBe(1);
});

test('close and reopen isolate earlier editor outcomes while explicit input disabling preserves copyable text', async ({page}) => {
  await openEditor(page);
  await page.getByRole('button', {name: 'Send again', exact: true}).click();
  await page.evaluate(() => {const h = window.editConfirmHarness; h.editor!.close(); h.editor!.open({value: 'New opening', title: 'Edit the next message'}); h.releases[0]!({ok: false, error: 'Retired failure'});});
  await expect(page.getByRole('dialog', {name: 'Edit the next message', exact: true})).toBeVisible();
  await expect(page.getByRole('alert')).toBeHidden();
  await page.evaluate(() => window.editConfirmHarness.editor!.update({title: 'Edit the next message', inputDisabled: true, disabled: true, error: 'The conversation changed. Your text is kept here so you can copy it.'}));
  await expect(page.getByRole('textbox')).toBeDisabled(); await expect(page.getByRole('textbox')).toHaveValue('New opening');
  await expect(page.getByRole('button', {name: 'Send again', exact: true})).toBeDisabled();
});

test('editor close-disabled guards close icon, cancel and Escape; standalone backdrop is inert; destroy is terminal', async ({page}) => {
  await openEditor(page);
  await page.locator('dialog').evaluate(dialog => {const box = dialog.getBoundingClientRect(); dialog.dispatchEvent(new MouseEvent('click', {bubbles: true, clientX: box.left - 5, clientY: box.top - 5}));});
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.evaluate(() => window.editConfirmHarness.editor!.update({...window.editConfirmHarness.state, closeDisabled: true}));
  await expect(page.getByRole('button', {name: 'Cancel', exact: true})).toBeDisabled();
  await expect(page.getByRole('button', {name: 'Close Edit message', exact: true})).toBeDisabled();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toBeVisible();
  await page.evaluate(() => {const h = window.editConfirmHarness; h.editor!.destroy(); h.editor!.destroy(); h.editor!.open({value: 'Must not reopen'});});
  await expect(page.locator('dialog, textarea')).toHaveCount(0); await expect(page.locator('#original-opener')).toBeFocused();
  expect(await page.evaluate(() => window.editConfirmHarness.editor!.isOpen())).toBe(false);
});

test('confirmation local pending survives snapshot updates; cancellation, rejection and a reopened target never replay the write', async ({page}) => {
  await openConfirmation(page);
  await page.getByRole('button', {name: 'Cancel', exact: true}).click(); await expect(page.getByRole('dialog')).toBeHidden();
  expect(await page.evaluate(() => window.editConfirmHarness.confirms)).toBe(0);
  await page.evaluate(() => window.editConfirmHarness.confirm!.open());
  const submit = page.getByRole('button', {name: 'Delete conversation', exact: true});
  await submit.click(); await expect(submit).toBeDisabled();
  await page.evaluate(() => {const h = window.editConfirmHarness; h.confirm!.update({...h.confirmation, disabled: true}); h.confirm!.update({...h.confirmation, disabled: false}); document.querySelector('form')!.requestSubmit();});
  await expect(submit).toBeDisabled(); expect(await page.evaluate(() => window.editConfirmHarness.confirms)).toBe(1);
  await page.evaluate(() => window.editConfirmHarness.releases[0]!({ok: false, error: 'Delete rejected'}));
  await expect(page.getByRole('alert')).toHaveText('Delete rejected'); await expect(submit).toBeEnabled();
  await submit.click();
  await page.evaluate(() => {const h = window.editConfirmHarness; h.confirm!.close(); h.confirm!.open({...h.confirmation, title: 'Delete another conversation?', message: {before: 'Remove ', subject: 'A different target', after: '?'}, confirmLabel: 'Delete another'}); h.releases[1]!({ok: true});});
  await expect(page.getByRole('dialog', {name: 'Delete another conversation?', exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Cancel', exact: true})).toBeFocused();
  await page.getByRole('button', {name: 'Delete another', exact: true}).click();
  await page.evaluate(() => {const h = window.editConfirmHarness; h.confirm!.destroy(); h.releases[2]!({ok: false, error: 'Closed result'});});
  await expect(page.locator('dialog, form')).toHaveCount(0); expect(await page.evaluate(() => window.editConfirmHarness.confirms)).toBe(3);
});
