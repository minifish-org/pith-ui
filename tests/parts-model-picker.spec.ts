import {expect, test, type Page} from '@playwright/test';

interface Selection {provider: string; model: string; thinkingLevel: string}
interface ModelState {
  editor?: {providers: Array<{id: string; name: string; model?: string; thinkingLevel?: string}> | null; models: Array<{id: string; name: string; provider: string; thinkingLevels?: string[] | null; supportsImages: boolean; contextWindow: number; maxTokens: number}> | null; selection: Selection; disabled?: boolean};
  disabled?: boolean; loading?: boolean; error?: string;
}
interface ModelHarness {
  state: ModelState;
  calls: Selection[];
  closed: number;
  release?: (result: {ok: true} | {ok: false; error: string}) => void;
  model: {read(): Selection; update(state: ModelState): void; reset(value: Selection): void; focus(): void; close(): void; isOpen(): boolean; destroy(): void};
}
declare global {interface Window {modelPartsHarness: ModelHarness}}

const selection = {provider: 'alpha', model: 'a-one', thinkingLevel: 'high'};
const state: ModelState = {editor: {
  providers: [{id: 'alpha', name: 'Alpha provider'}, {id: 'beta', name: 'Beta provider', model: 'b-one', thinkingLevel: 'off'}],
  models: [
    {id: 'a-one', name: 'Alpha One', provider: 'alpha', thinkingLevels: ['off', 'medium', 'high'], supportsImages: true, contextWindow: 128000, maxTokens: 8192},
    {id: 'a-two', name: 'Alpha Two', provider: 'alpha', thinkingLevels: ['off', 'high'], supportsImages: false, contextWindow: 64000, maxTokens: 4096},
    {id: 'b-one', name: 'Beta One', provider: 'beta', supportsImages: false, contextWindow: 32000, maxTokens: 2048},
  ], selection,
}};

async function openModel(page: Page, appearance: 'light' | 'dark' = 'light', initialState: ModelState = state): Promise<void> {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async ({initial, theme}) => {
    document.documentElement.classList.add('pui'); document.documentElement.dataset.appearance = theme;
    // This generic fixture already has its own .pui scope on body; an explicit
    // appearance must be applied there too rather than shadowed by its fallback.
    document.body.dataset.appearance = theme;
    const harness = {state: initial, calls: [], closed: 0} as unknown as ModelHarness;
    const callbacks = {
      onSubmit(value: Selection) {harness.calls.push(value); return new Promise<{ok: true} | {ok: false; error: string}>(resolve => {harness.release = resolve;});},
      onClose() {harness.closed++;},
    };

      const path = '/examples/assemblies/model-picker.ts';
      const {mountModelPicker} = await import(path);
      const mount = document.body.appendChild(document.createElement('div'));
      harness.model = mountModelPicker(mount, initial, callbacks, {appearance: theme});
    window.modelPartsHarness = harness;
  }, {initial: initialState, theme: appearance});
  await expect(page.getByRole('dialog', {name: 'Choose a model', exact: true})).toBeVisible();
}

test('generic native form and modal own validation, pending, focus and teardown without DOM handles', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const path = '/src/parts/index.ts';
    const {createDialogPart, createFormPart, createInputPart, createFieldLabelPart, createButtonPart, createFooterPart, createFeedbackPart, mountParts} = await import(path);
    let calls = 0, release: ((result: {ok: boolean; error?: string}) => void) | undefined;
    const source = document.createElement('button'); source.textContent = 'Original focus'; document.body.append(source); source.focus();
    const field = createInputPart({kind: 'url', label: 'Endpoint', required: true});
    const label = createFieldLabelPart({label: 'Endpoint', control: field});
    const error = createFeedbackPart({message: '', tone: 'error'});
    const submit = createButtonPart({label: 'Save', type: 'submit', variant: 'primary'});
    const form = createFormPart({children: [label, field, error, createFooterPart({children: [submit]})], onSubmit() {calls++; return new Promise(resolve => {release = resolve;});}, onPending(pending: boolean) {submit.update({label: 'Save', variant: 'primary', pending});}, onError(message: string) {error.update({message, tone: 'error'});}});
    const dialog = createDialogPart({title: 'Generic form', children: [form]});
    const mount = document.body.appendChild(document.createElement('div'));
    const mounted = mountParts(mount, dialog); dialog.open(); field.focus();
    Object.assign(window, {genericPartsHarness: {field, form, dialog, mounted, calls: () => calls, finish: (result: {ok: boolean; error?: string}) => release?.(result), keys: [dialog, form, error].map(value => Object.keys(value))}});
  });
  const endpoint = page.getByRole('textbox', {name: 'Endpoint', exact: true});
  await page.getByRole('button', {name: 'Save', exact: true}).click();
  expect(await page.evaluate(() => (window as unknown as {genericPartsHarness: {calls(): number}}).genericPartsHarness.calls())).toBe(0);
  await endpoint.fill('https://edited.example');
  await page.getByRole('button', {name: 'Save', exact: true}).click();
  await expect(page.getByRole('button', {name: 'Save', exact: true})).toBeDisabled();
  await expect(endpoint).toHaveValue('https://edited.example');
  await page.evaluate(() => (window as unknown as {genericPartsHarness: {finish(value: unknown): void}}).genericPartsHarness.finish({ok: false, error: '<Failed safely>'}));
  await expect(page.getByRole('alert')).toHaveText('<Failed safely>');
  await expect(page.getByRole('button', {name: 'Save', exact: true})).toBeEnabled();
  expect(await page.evaluate(() => (window as unknown as {genericPartsHarness: {keys: string[][]}}).genericPartsHarness.keys.every(keys => keys.every(key => !['element', 'node', 'form', 'control', 'style', 'className', 'body'].includes(key))))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', {name: 'Original focus'})).toBeFocused();
  await page.evaluate(() => (window as unknown as {genericPartsHarness: {mounted: {destroy(): void}}}).genericPartsHarness.mounted.destroy());
  await expect(page.locator('dialog')).toHaveCount(0);
});

test('an unmounted dialog cannot render outside the checked parts mount', async ({page}) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async () => {
    const path = '/src/parts/index.ts';
    const {createDialogPart, mountParts} = await import(path);
    const dialog = createDialogPart({title: 'Mount-owned dialog', children: []});
    dialog.open();
    const before = {open: dialog.isOpen(), count: document.querySelectorAll('dialog').length};
    const mounted = mountParts(document.body.appendChild(document.createElement('div')), dialog);
    dialog.open();
    const after = {open: dialog.isOpen(), count: document.querySelectorAll('dialog[open]').length};
    mounted.destroy();
    return {before, after};
  });
  expect(result).toEqual({before: {open: false, count: 0}, after: {open: true, count: 1}});
});

for (const appearance of ['light', 'dark'] as const) for (const viewport of [{width: 900, height: 600}, {width: 1280, height: 800}, {width: 1440, height: 900}, {width: 390, height: 844}]) test(`${appearance} ${viewport.width}: the internal model recipe preserves the old visible geometry and presentation`, async ({page, context}) => {
  await page.setViewportSize(viewport);await openModel(page,appearance);
  expect(await page.getByRole('dialog').evaluate(dialog => getComputedStyle(dialog).backgroundColor)).toBe(appearance === 'dark' ? 'rgb(34, 37, 42)' : 'rgb(255, 255, 255)');
  await expect(page.getByRole('searchbox', {name: 'Model', exact: true})).toBeFocused();
  expect(await page.evaluate(() => window.modelPartsHarness.model.read())).toEqual(selection);
});

test('model catalog feedback retains search and selection while provider changes own fresh effort choices', async ({page}) => {
  await openModel(page);
  const search = page.getByRole('searchbox', {name: 'Model', exact: true});
  await search.fill('Two');
  const list = page.getByRole('listbox', {name: 'Choose model', exact: true});
  await list.selectOption('a-two');
  await search.focus();
  await search.evaluate((input: HTMLInputElement) => input.setSelectionRange(1, 2));
  await page.evaluate(() => {const harness = window.modelPartsHarness; harness.model.update({...harness.state, error: 'Catalog warning', editor: {...harness.state.editor!, models: harness.state.editor!.models!.map(model => ({...model, name: model.name + ' revised'}))}});});
  await expect(search).toHaveValue('Two');
  await expect(list).toHaveValue('a-two');
  await expect(search).toBeFocused();
  expect(await search.evaluate((input: HTMLInputElement) => [input.selectionStart, input.selectionEnd])).toEqual([1, 2]);
  await page.getByRole('combobox', {name: 'Provider', exact: true}).click();
  await page.getByRole('option', {name: 'Beta provider', exact: true}).click();
  await expect(search).toHaveValue('');
  await expect(list).toHaveValue('b-one');
  await expect(page.getByRole('combobox', {name: 'Thinking effort', exact: true})).toHaveCount(0);
  expect(await page.evaluate(() => window.modelPartsHarness.model.read())).toEqual({provider: 'beta', model: 'b-one', thinkingLevel: 'off'});
});

test('model submit keeps failed drafts, prevents repeats and ignores successful results after an explicit reset', async ({page}) => {
  await openModel(page);
  const submit = page.getByRole('button', {name: 'Use model', exact: true});
  await submit.click();
  await expect(submit).toBeDisabled();
  await page.evaluate(() => {window.modelPartsHarness.model.update({...window.modelPartsHarness.state, disabled: true}); window.modelPartsHarness.model.update({...window.modelPartsHarness.state});});
  await expect(submit).toBeDisabled();
  expect(await page.evaluate(() => window.modelPartsHarness.calls)).toEqual([selection]);
  await page.evaluate(() => window.modelPartsHarness.release!({ok: false, error: 'Save failed'}));
  await expect(page.getByRole('alert')).toHaveText('Save failed');
  expect(await page.evaluate(() => window.modelPartsHarness.model.read())).toEqual(selection);
  await submit.click();
  await page.evaluate(() => {window.modelPartsHarness.model.reset({provider: 'beta', model: 'b-one', thinkingLevel: 'off'}); window.modelPartsHarness.release!({ok: true});});
  await expect(page.getByRole('dialog', {name: 'Choose a model', exact: true})).toBeVisible();
  expect(await page.evaluate(() => window.modelPartsHarness.model.read())).toEqual({provider: 'beta', model: 'b-one', thinkingLevel: 'off'});
  await submit.click();
  await page.evaluate(() => window.modelPartsHarness.release!({ok: true}));
  await expect(page.locator('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => window.modelPartsHarness.closed)).toBe(1);
});

test('closing and destroying the model assembly retire pending UI without replacing a later tree', async ({page}) => {
  await openModel(page);
  await page.getByRole('button', {name: 'Use model', exact: true}).click();
  await page.evaluate(() => {window.modelPartsHarness.model.destroy(); window.modelPartsHarness.model.destroy(); window.modelPartsHarness.release!({ok: false, error: 'Retired failure'});});
  await expect(page.locator('dialog, select, [role="listbox"]')).toHaveCount(0);
  expect(await page.evaluate(() => ({closed: window.modelPartsHarness.closed, selection: window.modelPartsHarness.model.read(), open: window.modelPartsHarness.model.isOpen()}))).toEqual({closed: 1, selection, open: false});
});

for (const appearance of ['light', 'dark'] as const) test(`${appearance}: initial loading keeps the old empty native choices and defers search behavior until the catalog arrives`, async ({page, context}) => {
  await openModel(page,appearance,{loading:true});
  const search=page.getByRole('searchbox',{name:'Model',exact:true});await search.fill('Typing before catalog');
  await page.evaluate(initial=>window.modelPartsHarness.model.update(initial),state);
  await expect(page.getByRole('searchbox', {name: 'Model', exact: true})).toHaveValue('');
  await expect(page.getByRole('combobox', {name: 'Provider', exact: true})).toHaveJSProperty('tagName', 'BUTTON');
  expect(await page.evaluate(() => window.modelPartsHarness.model.read())).toEqual(selection);
});
