import {test, expect, type Page} from '@playwright/test';

type Result = {ok: true} | {ok: false; error: string};
interface RenameState {id: string; title: string; error?: string; disabled?: boolean}
interface Draft {id: string; title: string}
interface RenameHandle {
  read(): Draft; update(state: RenameState): void; reset(state: RenameState): void;
  focus(): void; close(): void; isOpen(): boolean; destroy(): void;
}
declare global {interface Window {renamePartsHarness: {
  editor: RenameHandle; calls: Draft[]; releases: Array<(value: Result) => void>; closed: number;
  input?: HTMLInputElement;
}}}
const initial: RenameState = {id: 'conversation-a', title: 'Keep this conversation 中文'};

async function openRename(page: Page, state = initial, appearance: 'light'|'dark' = 'light', applicationContext = true): Promise<void> {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async ({state,appearance,applicationContext}) => {
    document.documentElement.classList.add('pui'); document.documentElement.dataset.appearance = appearance; document.body.dataset.appearance = appearance;
    const opener = document.body.appendChild(document.createElement('button')); opener.id = 'rename-opener'; opener.textContent = 'Rename opener'; opener.focus();
    const mount = document.body.appendChild(document.createElement('div'));
    const h = {calls: [],releases: [],closed: 0} as unknown as Window['renamePartsHarness'];
    const callbacks = {onSubmit(draft: Draft): Promise<Result> {h.calls.push(draft); return new Promise(resolve => h.releases.push(resolve));},onClose() {h.closed++;}};
    // Both compared dialogs have the actual application's native flex parent.
    // Standalone ownership is covered separately; WebKit's CSSOM automatic
    // minimum serialization depends on this parent even in the top layer.

      let target: HTMLElement = mount;

      const path = '/examples/assemblies/rename.ts'; const {mountRename} = await import(path);
      h.editor = mountRename(target,state,callbacks,{appearance});
    window.renamePartsHarness = h;
  },{state,appearance,applicationContext});
  await expect(page.getByRole('dialog',{name: 'Rename conversation',exact: true})).toBeVisible();
}


test('native field selection remains a bounded value operation without a DOM or event port',async ({page}) => {
  await page.goto('/tests/fixture.html');
  const value = await page.evaluate(async () => {
    const path = '/src/parts/index.ts'; const p = await import(path);
    const field = p.createInputPart({value: 'Selected title'}),mount = document.body.appendChild(document.createElement('div'));
    const tree = p.mountParts(mount,field); field.selectAll(); const control = mount.querySelector('input')!;
    const result = {focus: document.activeElement === control,selection: [control.selectionStart,control.selectionEnd],value: field.read(),leak: Object.values(field).some(value => value instanceof Node)};
    tree.destroy(); field.selectAll(); return result;
  });
  expect(value).toEqual({focus: true,selection: [0,14],value: 'Selected title',leak: false});
});

for (const {} of ['light','dark'] as const) for (const [] of Object.entries({ready: initial,long: {...initial,title: '<img onerror=alert(1)> '+ 'Existing title '.repeat(30)},error: {...initial,error: 'Rename rejected.'},disabled: {...initial,disabled: true}})) {
}

test('rename keeps its original target and draft through metadata, pending and failed retry',async ({page}) => {
  await openRename(page,initial,'light',false); const input = page.getByRole('textbox',{name: 'Title',exact: true}),save = page.getByRole('button',{name: 'Save title',exact: true});
  await input.fill('  My unsaved title 中文  ');
  await input.evaluate(element => {const input = element as HTMLInputElement; input.setSelectionRange(3,8); window.renamePartsHarness.input = input;});
  await page.evaluate(() => window.renamePartsHarness.editor.update({id: 'other',title: 'Server title',error: 'Metadata error'}));
  await expect(input).toHaveValue('  My unsaved title 中文  ');
  expect(await input.evaluate(element => ({same: element === window.renamePartsHarness.input,focus: element === document.activeElement,selection: [(element as HTMLInputElement).selectionStart,(element as HTMLInputElement).selectionEnd]}))).toEqual({same: true,focus: true,selection: [3,8]});
  await save.click(); await expect(save).toBeDisabled();
  await page.evaluate(() => {window.renamePartsHarness.editor.update({id: 'other',title: 'Another snapshot',disabled: false}); document.querySelector('dialog[open] form')!.dispatchEvent(new SubmitEvent('submit',{bubbles: true,cancelable: true}));});
  expect(await page.evaluate(() => window.renamePartsHarness.calls)).toEqual([{id: initial.id,title: 'My unsaved title 中文'}]);
  await expect(save).toBeDisabled();
  await page.evaluate(() => window.renamePartsHarness.releases[0]!({ok: false,error: 'Save rejected'}));
  await expect(page.locator('dialog [role=alert]')).toHaveText('Save rejected'); await expect(save).toBeEnabled(); await expect(input).toHaveValue('  My unsaved title 中文  ');
  await save.click(); await page.evaluate(() => window.renamePartsHarness.releases[1]!({ok: true}));
  await expect(page.locator('dialog[open]')).toHaveCount(0); expect(await page.evaluate(() => window.renamePartsHarness.closed)).toBe(1);
});

test('rename explicit reset retires a prior write, changes target, selects the new draft and keeps external disabling',async ({page}) => {
  await openRename(page,initial,'light',false); const save = page.getByRole('button',{name: 'Save title',exact: true}),input = page.getByRole('textbox',{name: 'Title',exact: true});
  await save.click(); await page.evaluate(() => {window.renamePartsHarness.editor.reset({id: 'conversation-b',title: 'New target',disabled: true}); window.renamePartsHarness.editor.focus();});
  await expect(save).toBeDisabled(); await expect(input).toHaveValue('New target');
  expect(await input.evaluate(element => [(element as HTMLInputElement).selectionStart,(element as HTMLInputElement).selectionEnd])).toEqual([0,10]);
  await page.evaluate(() => window.renamePartsHarness.releases[0]!({ok: false,error: 'Retired failure'}));
  await expect(page.locator('dialog [role=alert]')).toBeEmpty();
  await page.evaluate(() => window.renamePartsHarness.editor.update({id: 'ignored',title: 'Ignored',disabled: false}));
  await save.click(); expect(await page.evaluate(() => window.renamePartsHarness.calls[1])).toEqual({id: 'conversation-b',title: 'New target'});
});

test('rename native validation rejects empty and whitespace-only drafts without a write',async ({page}) => {
  await openRename(page,initial,'light',false); const input = page.getByRole('textbox',{name: 'Title',exact: true}),save = page.getByRole('button',{name: 'Save title',exact: true});
  await input.fill(''); await save.click(); await input.fill('   '); await save.click();
  expect(await page.evaluate(() => window.renamePartsHarness.calls)).toEqual([]); await expect(save).toBeEnabled();
});

test('closing and destroying rename discards late work and restores opener once',async ({page}) => {
  await openRename(page,initial,'light',false); await page.getByRole('textbox',{name: 'Title',exact: true}).fill('Preserved unsaved draft');
  await page.getByRole('button',{name: 'Save title',exact: true}).click(); await page.keyboard.press('Escape');
  await expect(page.locator('dialog[open]')).toHaveCount(0); await expect(page.locator('#rename-opener')).toBeFocused();
  await page.evaluate(() => {const h = window.renamePartsHarness; h.releases[0]!({ok: false,error: 'Late failure'}); h.editor.update({id: 'late',title: 'Late'}); h.editor.destroy(); h.editor.destroy();});
  expect(await page.evaluate(() => ({closed: window.renamePartsHarness.closed,draft: window.renamePartsHarness.editor.read(),open: window.renamePartsHarness.editor.isOpen()}))).toEqual({closed: 1,draft: {id: initial.id,title: 'Preserved unsaved draft'},open: false});
  await expect(page.locator('dialog,input[name=title]')).toHaveCount(0);
});
