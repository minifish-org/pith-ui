import {test,expect,type Page} from '@playwright/test';

type Result = {ok: true}|{ok: false;error: string};
interface State {placeholder?: string;disabled?: boolean;readOnly?: boolean;action?: 'send'|'queue'|'stop';actionDisabled?: boolean;model?: {label: string;description: string;disabled?: boolean};thinking?: {options: Array<{value: string;label: string}>;value: string;disabled?: boolean}}
interface Composer {updateComposer(state: State): void;updatePermission(state: {mode: string;description: string}): void;readDraft(): string;resetDraft(text: string): void;focusComposer(): void;pickImages(): void;insertReferences(paths: readonly string[]): void;destroy(): void}
interface Harness {composer: Composer;state: State;inputs: string[];submits: string[];stops: number;models: number;thinking: string[];files: string[][];blurs: number;releases: Array<(result: Result) => void>;tree: {destroy(): void};input?: Element}
declare global {interface Window {composerPartsHarness: Harness}}
const base: State = {action: 'send',model: {label: 'Original model 中文',description: 'Original provider model'},thinking: {options: [{value: 'off',label: 'Off'},{value: 'high',label: 'High'}],value: 'high'}};
async function setup(page: Page,state: State = base,appearance: 'light'|'dark' = 'light',pending = false): Promise<void> {
  await page.goto('/tests/fixture.html');await page.emulateMedia({colorScheme: appearance === 'light' ? 'dark' : 'light'});
  await page.evaluate(async ({state,appearance,pending}) => {
    document.body.dataset.appearance = appearance;const h = {state,inputs: [],submits: [],stops: 0,models: 0,thinking: [],files: [],blurs: 0,releases: []} as unknown as Harness;
    const result = (): Result|Promise<Result> => pending ? new Promise(resolve => h.releases.push(resolve)) : {ok: true};
    const callbacks = {onSubmit(text: string) {h.submits.push(text);return result();},onStop() {h.stops++;return result();},onInput(text: string) {h.inputs.push(text);},onBlur() {h.blurs++;},onAction(action: string) {if (action === 'model') h.models++;},onThinkingChange(value: string) {h.thinking.push(value);},onImages(files: File[]) {h.files.push(files.map(file => file.name));}};
const contextPath = '/tests/region-context.ts', {mountRegion} = await import(contextPath);
    const mount = document.body.appendChild(document.createElement('div')),recipePath = '/examples/assemblies/composer.ts',{composeComposer} = await import(recipePath),composer = composeComposer(state,callbacks);
    h.tree = mountRegion(mount,composer.part,'composer',appearance);composer.updatePermission({mode: 'ask',description: 'Changes and commands require approval.'});h.composer = composer;
        window.composerPartsHarness = h;
  },{state,appearance,pending});await page.mouse.move(0,0);
}

test('message input and image picker keep native controls and reject presentation parameters',async ({page}) => {
  await page.goto('/tests/fixture.html');const value = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path);let pixels = false,css = false;
    try {p.createMessageInputPart({label: 'Message',maxHeight: 500});} catch {pixels = true;}try {p.createFilePickerPart({kind: 'images',accept: '*/*',onFiles() {}});} catch {css = true;}
    const input = p.createMessageInputPart({label: 'Message'}),picker = p.createFilePickerPart({kind: 'images',onFiles() {}}),form = p.createFormPart({purpose: 'composer',children: [picker,input]});const mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,form);
    input.reset('Before selected after');const native = mount.querySelector('textarea')!;native.setSelectionRange(7,15);const selected = input.readSelection();input.replaceSelection('new');
    const value = {pixels,css,root: mount.firstElementChild!.localName,children: [...mount.firstElementChild!.children].map(node => node.localName),rows: native.rows,selected,result: input.read(),caret: native.selectionStart,accept: mount.querySelector('input')!.accept,multiple: mount.querySelector('input')!.multiple,leaks: [input,picker,form].some(part => Object.values(part).some(value => value instanceof Node))};tree.destroy();return value;
  });expect(value).toEqual({pixels: true,css: true,root: 'form',children: ['input','textarea'],rows: 1,selected: {before: 'Before ',selected: 'selected',after: ' after'},result: 'Before new after',caret: 10,accept: 'image/png,image/jpeg,image/gif,image/webp',multiple: true,leaks: false});
});
test('narrow composers retain the permission state without a persistent explanatory footer',async ({page}) => {
  await page.setViewportSize({width: 480,height: 600});await setup(page);
  await page.evaluate(() => window.composerPartsHarness.composer.updatePermission({mode: 'full-access',description: 'Full access: all enabled tools run without asking.'}));
  await expect(page.getByRole('combobox',{name: 'Conversation permissions',exact: true})).toContainText('Full access');
  await expect(page.getByText('Full access: all enabled tools run without asking.',{exact: true})).not.toBeVisible();
  await expect(page.getByRole('button',{name: 'Send message',exact: true})).toBeVisible();
});
test('ordinary projections retain the draft, native field, focus and selection while reset invalidates pending work',async ({page}) => {

    await setup(page,base,'light',true);const field = page.getByRole('textbox',{name: 'Message Pith',exact: true});await field.fill('  Original draft 中文  ');await field.evaluate(node => {const input = node as HTMLTextAreaElement;input.focus();input.setSelectionRange(3,12);window.composerPartsHarness.input = input;});
    await page.evaluate(() => {const h = window.composerPartsHarness;h.composer.updateComposer({...h.state,placeholder: 'Updated placeholder'});});expect(await field.evaluate(node => ({same: node === window.composerPartsHarness.input,focus: node === document.activeElement,selection: [(node as HTMLTextAreaElement).selectionStart,(node as HTMLTextAreaElement).selectionEnd]}))).toEqual({same: true,focus: true,selection: [3,12]});await expect(field).toHaveValue('  Original draft 中文  ');
    await page.getByRole('button',{name: 'Send message',exact: true}).click();await expect(page.getByRole('button',{name: 'Send message',exact: true})).toBeDisabled();await page.evaluate(() => {const h = window.composerPartsHarness;h.composer.updateComposer({...h.state,actionDisabled: false});h.composer.resetDraft('Replacement draft');h.releases[0]!({ok: false,error: 'Retired send'});});await expect(field).toHaveValue('Replacement draft');await expect(page.getByRole('button',{name: 'Send message',exact: true})).toBeEnabled();await expect(page.locator('.pui-composer')).not.toContainText('Retired send');expect(await page.evaluate(() => window.composerPartsHarness.submits)).toEqual(['  Original draft 中文  ']);
});
test('Enter, Shift+Enter, composition and stop retain the old distinct submit behavior',async ({page}) => {

    await setup(page);const field = page.getByRole('textbox',{name: 'Message Pith',exact: true});await field.fill('First');await field.press('Shift+Enter');await expect(field).toHaveValue('First\n');await field.evaluate(node => node.dispatchEvent(new KeyboardEvent('keydown',{key: 'Enter',isComposing: true,bubbles: true,cancelable: true})));expect(await page.evaluate(() => window.composerPartsHarness.submits)).toEqual([]);await field.press('Enter');expect(await page.evaluate(() => window.composerPartsHarness.submits)).toEqual(['First\n']);await expect(field).toHaveValue('First\n');
    await page.evaluate(() => {const h = window.composerPartsHarness;h.composer.updateComposer({...h.state,action: 'stop',readOnly: true});});await field.press('Enter');expect(await page.evaluate(() => window.composerPartsHarness.stops)).toBe(0);await page.getByRole('button',{name: 'Stop agent',exact: true}).click();expect(await page.evaluate(() => window.composerPartsHarness.stops)).toBe(1);
});
test('a successful send button activation submits once and keeps the draft',async ({page}) => {
  await setup(page);const field = page.getByRole('textbox',{name: 'Message Pith',exact: true});await field.fill('Once');await page.getByRole('button',{name: 'Send message',exact: true}).click();expect(await page.evaluate(() => window.composerPartsHarness.submits)).toEqual(['Once']);await expect(field).toHaveValue('Once');
});
test('file chooser accepts repeated selection, paste reports image files, and model/effort intents stay separate',async ({page}) => {

    await setup(page);const picker = page.locator('.pui-composer input[type=file]');for (let index = 0;index < 2;index++) await picker.setInputFiles({name: 'Repeated.png',mimeType: 'image/png',buffer: Buffer.from('image payload')});
    await page.getByRole('textbox',{name: 'Message Pith',exact: true}).evaluate(node => {const data = new DataTransfer();data.items.add(new File(['image'],'Clipboard.png',{type: 'image/png'}));const event = new Event('paste',{bubbles: true,cancelable: true});Object.defineProperty(event,'clipboardData',{value: data});node.dispatchEvent(event);});
    await page.getByRole('button',{name: 'Choose model',exact: true}).click();await page.getByRole('combobox',{name: 'Thinking effort',exact: true}).click();await page.getByRole('option',{name: 'Off',exact: true}).click();
    expect(await page.evaluate(() => ({files: window.composerPartsHarness.files,models: window.composerPartsHarness.models,thinking: window.composerPartsHarness.thinking,submits: window.composerPartsHarness.submits}))).toEqual({files: [['Repeated.png'],['Repeated.png'],['Clipboard.png']],models: 1,thinking: ['off'],submits: []});
});
test('CommonMark references replace the selected range and parent disposal retires all pending UI work',async ({page}) => {

    await setup(page,base,'light',true);const field = page.getByRole('textbox',{name: 'Message Pith',exact: true});await field.fill('Before SELECT after');await field.evaluate(node => (node as HTMLTextAreaElement).setSelectionRange(7,13));await page.evaluate(() => window.composerPartsHarness.composer.insertReferences(['a`b.md',' leading space','   ']));await expect(field).toHaveValue('Before ``a`b.md`` `  leading space ` `   ` after');await expect(field).toBeFocused();
    await page.getByRole('button',{name: 'Send message',exact: true}).click();await page.evaluate(() => {const h = window.composerPartsHarness;h.tree.destroy();h.releases[0]!({ok: false,error: 'Late disposed send'});h.composer.updateComposer(h.state);h.composer.resetDraft('Late');h.composer.pickImages();h.composer.destroy();});await expect(page.locator('.pui-composer')).toHaveCount(0);
});
