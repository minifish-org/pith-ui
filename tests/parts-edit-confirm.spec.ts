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

async function openEditor(page: Page, purpose: 'message' | 'queue-message' = 'message', appearance: 'light' | 'dark' = 'light'): Promise<void> {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async ({initial, purpose, appearance}) => {
    document.documentElement.classList.add('pui'); document.documentElement.dataset.appearance = appearance; document.body.dataset.appearance = appearance;
    const h: EditConfirmHarness = {state: initial, confirmation: {title: ''}, values: [], confirms: 0, inputs: [], closed: 0, releases: []};
    const source = document.createElement('button'); source.textContent = 'Original opener'; source.id = 'original-opener'; document.body.append(source); source.focus();
    const mount = document.createElement('div'); document.body.append(mount);
    const callbacks = {onInput(value: string) {h.inputs.push(value);}, onClose() {h.closed++;}, onSubmit(value: string) {h.values.push(value); return new Promise<Result>(resolve => h.releases.push(resolve));}};

      const path = '/examples/assemblies/text-edit.ts'; const {mountTextEditor} = await import(path);
      h.editor = mountTextEditor(mount, {...initial, value: 'Original message 中文\nSecond paragraph.'}, {...callbacks, purpose}, {appearance});
    window.editConfirmHarness = h;
  }, {initial: editorState, purpose, appearance});
  await expect(page.getByRole('dialog', {name: 'Edit message', exact: true})).toBeVisible();
}

async function openConfirmation(page: Page, appearance: 'light' | 'dark' = 'light'): Promise<void> {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async ({initial, appearance}) => {
    document.documentElement.classList.add('pui'); document.documentElement.dataset.appearance = appearance; document.body.dataset.appearance = appearance;
    const h: EditConfirmHarness = {state: {title: ''}, confirmation: initial, values: [], confirms: 0, inputs: [], closed: 0, releases: []};
    const source = document.createElement('button'); source.textContent = 'Original opener'; source.id = 'original-opener'; document.body.append(source); source.focus();
    const mount = document.createElement('div'); document.body.append(mount);
    const callbacks = {onClose() {h.closed++;}, onConfirm() {h.confirms++; return new Promise<Result>(resolve => h.releases.push(resolve));}};

      const path = '/examples/assemblies/confirmation.ts'; const {mountConfirmation} = await import(path);
      h.confirm = mountConfirmation(mount, initial, callbacks, {appearance});
    window.editConfirmHarness = h;
  }, {initial: confirmState, appearance});
  await expect(page.getByRole('dialog', {name: 'Delete conversation?', exact: true})).toBeVisible();
}


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

test('parts confirmation preserves the original cancel-first destructive presentation and literal emphasized subject', async ({page}) => {
  await openConfirmation(page);
  await expect(page.getByRole('button', {name: 'Cancel', exact: true})).toBeFocused();
  await expect(page.locator('form strong')).toHaveText('Project 中文');
  await page.evaluate(() => window.editConfirmHarness.confirm!.update({...window.editConfirmHarness.confirmation, message: {before: 'Remove ', subject: '<script>literal</script>', after: '?'}, hint: 'A new hint.'}));
  await expect(page.locator('form strong')).toHaveText('<script>literal</script>');
  await expect(page.locator('dialog script')).toHaveCount(0);
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
