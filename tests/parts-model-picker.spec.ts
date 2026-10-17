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

async function openModel(page: Page, baseline = false): Promise<void> {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async ({initial, old}) => {
    const harness = {state: initial, calls: [], closed: 0} as unknown as ModelHarness;
    const callbacks = {
      onSubmit(value: Selection) {harness.calls.push(value); return new Promise<{ok: true} | {ok: false; error: string}>(resolve => {harness.release = resolve;});},
      onClose() {harness.closed++;},
    };
    if (old) {
      const path = '/src/app/index.ts';
      const {createApplication} = await import(path);
      const app = createApplication(document.body, {appearance: 'light'});
      harness.model = app.settings.openModels(initial, callbacks);
    } else {
      const path = '/examples/assemblies/model-picker.ts';
      const {mountModelPicker} = await import(path);
      const mount = document.body.appendChild(document.createElement('div'));
      harness.model = mountModelPicker(mount, initial, callbacks);
    }
    window.modelPartsHarness = harness;
  }, {initial: state, old: baseline});
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

test('the internal model recipe uses only the staging parts entry and preserves the old control geometry', async ({page, context}) => {
  const baseline = await context.newPage();
  await openModel(baseline, true);
  await openModel(page);
  const metrics = async (target: Page) => target.getByRole('dialog', {name: 'Choose a model', exact: true}).evaluate(dialog => {
    const base = dialog.getBoundingClientRect();
    const nodes = [...dialog.querySelectorAll('h2, label, input[type="search"], select, p, button')].filter(node => {
      const element = node as HTMLElement;
      return element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden' && !element.matches('.pui-select-backing, [role="option"]');
    });
    return {width: base.width, height: base.height, nodes: nodes.map(node => {
      const element = node as HTMLElement, box = element.getBoundingClientRect(), css = getComputedStyle(element);
      return {tag: node.tagName, text: node.tagName === 'SELECT' ? [...(node as HTMLSelectElement).options].map(option => option.textContent).join('|') : node.textContent?.trim(), x: box.x - base.x, y: box.y - base.y, width: box.width, height: box.height, font: css.fontSize, line: css.lineHeight, padding: css.padding, margin: css.margin, color: css.color, background: css.backgroundColor};
    })};
  });
  expect(await metrics(page)).toEqual(await metrics(baseline));
  await expect(page.getByRole('searchbox', {name: 'Model', exact: true})).toBeFocused();
  expect(await page.evaluate(() => window.modelPartsHarness.model.read())).toEqual(selection);
  await baseline.close();
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
  await page.evaluate(() => {window.modelPartsHarness.model.update({...window.modelPartsHarness.state, disabled: true}); window.modelPartsHarness.model.update({...window.modelPartsHarness.state, disabled: false});});
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
