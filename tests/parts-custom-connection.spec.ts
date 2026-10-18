import {test,expect,type Page} from '@playwright/test';

type Result = {ok: true} | {ok: false;error: string};
interface Model {id: string;name?: string;contextWindow?: number;maxTokens?: number;reasoning?: boolean;input?: readonly string[];cost?: {input: number;output: number;cacheRead: number;cacheWrite: number}}
interface State {name: string;baseUrl: string;api: string;editing: boolean;models: readonly Model[];error?: string;disabled?: boolean}
interface ModelDraft {sourceIndex: number;id: string;name: string;contextWindow: number;maxTokens: number;reasoning: boolean;images: boolean;prices: {input: string;output: string;cacheRead: string;cacheWrite: string}}
interface Draft {name: string;baseUrl: string;api: string;apiKey: string;models: ModelDraft[]}
interface Session {read(): Draft;update(state: State): void;clearSecrets(): void;fail(message: string): void;close(): void;isOpen(): boolean;destroy(): void}
interface Loading {update(state: {error?: string}): void;fail(message: string): void;close(): void;isOpen(): boolean;destroy(): void}
interface Harness {session: Session;loading?: Loading;initial: State;values: Draft[];releases: Array<(result: Result) => void>;closed: number;control?: HTMLInputElement;shared?: {setAppearance(mode: 'light' | 'dark'): void;destroy(): void}}
declare global {interface Window {customPartsHarness: Harness}}
const model: Model = {id: 'balanced-model',name: 'Balanced 中文',contextWindow: 128000,maxTokens: 8192,reasoning: true,input: ['text','image'],cost: {input: 0,output: 1.25,cacheRead: 0.125,cacheWrite: 2.5}};
const initial: State = {name: 'Independent endpoint',baseUrl: 'https://endpoint.example/v1',api: 'openai-completions',editing: false,models: [model]};
interface Options {appearance?: 'light' | 'dark';state?: State;pending?: boolean;applicationContext?: boolean}

async function openCustom(page: Page,options: Options = {}): Promise<void> {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async ({options,initial}) => {
    const appearance = options.appearance ?? 'light';document.documentElement.classList.add('pui');document.documentElement.dataset.appearance = appearance;document.body.dataset.appearance = appearance;
    const opener = document.createElement('button');opener.id = 'custom-opener';opener.textContent = 'Custom opener';document.body.append(opener);opener.focus();
    const mount = document.body.appendChild(document.createElement('div'));if (options.applicationContext) mount.classList.add('pui-app');
    const h = {initial: options.state ?? initial,values: [],releases: [],closed: 0} as unknown as Harness;
    const callbacks = {onSubmit(draft: Draft): Result | Promise<Result> {h.values.push(draft);return options.pending ? new Promise(resolve => h.releases.push(resolve)) : {ok: true};},onClose() {h.closed++;}};
    const path = '/examples/assemblies/custom-connection.ts';const {mountCustomConnection} = await import(path);h.session = mountCustomConnection(mount,h.initial,callbacks,{appearance});
    window.customPartsHarness = h;
  },{options,initial});
  await expect(page.getByRole('dialog')).toBeVisible();
}

async function openLoading(page: Page,editing: boolean,appearance: 'light' | 'dark'): Promise<void> {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async ({editing,appearance}) => {
    document.documentElement.classList.add('pui');document.documentElement.dataset.appearance = appearance;document.body.dataset.appearance = appearance;
    const mount = document.body.appendChild(document.createElement('div'));mount.classList.add('pui-app');const h = {closed: 0} as Harness;
    const path = '/examples/assemblies/custom-connection.ts';const {mountCustomConnectionLoading} = await import(path);h.loading = mountCustomConnectionLoading(mount,{editing},{onClose() {h.closed++;}},{appearance});
    window.customPartsHarness = h;
  },{editing,appearance});
  await expect(page.getByRole('dialog',{name: editing ? 'Edit model connection' : 'Add model connection',exact: true})).toBeVisible();
}

async function presentation(page: Page): Promise<unknown> {
  return page.evaluate(async () => {
    await document.fonts.ready;for (const animation of document.getAnimations()) if (animation.effect?.getTiming().iterations !== Infinity) animation.finish();
    const dialog = document.querySelector('dialog[open]')!,origin = dialog.getBoundingClientRect();
    const inspect = (node: Element) => {
      const box = node.getBoundingClientRect(),style = getComputedStyle(node);
      return {tag: node.localName,text: [...node.childNodes].filter(child => child.nodeType === Node.TEXT_NODE).map(child => child.textContent).join('').trim(),
        box: [box.x-origin.x,box.y-origin.y,box.width,box.height].map(value => Math.round(value*100)/100),
        style: ['display','font-family','font-size','font-weight','line-height','color','background-color','margin-top','margin-bottom','padding-top','padding-right','padding-bottom','padding-left','border-top-width','border-top-color','border-radius','gap','overflow-x','overflow-y','min-width','min-height','height'].map(key => style.getPropertyValue(key)),
        role: node.getAttribute('role'),
        ...(node instanceof HTMLInputElement ? {value: node.value,name: node.name,type: node.type,checked: node.checked,disabled: node.disabled,readOnly: node.readOnly,required: node.required,min: node.min,step: node.step,placeholder: node.placeholder,autocomplete: node.autocomplete} : {}),
        ...(node instanceof HTMLButtonElement ? {type: node.type,label: node.getAttribute('aria-label'),disabled: node.disabled} : {}),
        ...(node instanceof HTMLSelectElement ? {value: node.value,disabled: node.disabled,options: [...node.options].map(option => [option.value,option.textContent])} : {})};
    };
    const nodes = [...dialog.querySelectorAll('h2,p,label,input,select,fieldset,legend,summary,button,[role=alert],.pui-modal-footer')].filter(node => !node.closest('[hidden]'));
    return {dialog: inspect(dialog),nodes: nodes.map(inspect),svg: [...dialog.querySelectorAll('svg')].map(svg => svg.innerHTML),overflow: [dialog.clientWidth,dialog.scrollWidth,dialog.clientHeight,dialog.scrollHeight]};
  });
}


for (const appearance of ['light','dark'] as const) for (const editing of [false,true]) test(`${appearance} ${editing ? 'editing' : 'new'} custom loading preserves status and independent frame errors`,async ({page}) => {
  await openLoading(page,editing,appearance);const loading = await presentation(page);await page.evaluate(() => window.customPartsHarness.loading!.update({error: 'Connection read rejected'}));const error = await presentation(page);
  await page.evaluate(() => window.customPartsHarness.loading!.fail('Frame rejected'));const frame = await presentation(page);
  await openLoading(page,editing,appearance);expect(await presentation(page)).toEqual(loading);await page.evaluate(() => window.customPartsHarness.loading!.update({error: 'Connection read rejected'}));expect(await presentation(page)).toEqual(error);
  await page.evaluate(() => window.customPartsHarness.loading!.fail('Frame rejected'));expect(await presentation(page)).toEqual(frame);await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('existing missing limits remain blank while Add model alone uses defaults and keeps monotonic source indices after removal',async ({page}) => {
  await openCustom(page,{state: {...initial,models: [{id: 'existing'}]},pending: true});await expect(page.getByRole('spinbutton',{name: 'Context tokens',exact: true})).toHaveValue('');await expect(page.getByRole('spinbutton',{name: 'Max output tokens',exact: true})).toHaveValue('');
  await page.getByRole('button',{name: 'Save connection',exact: true}).click();expect(await page.evaluate(() => window.customPartsHarness.values)).toEqual([]);
  await page.getByRole('button',{name: 'Add model',exact: true}).click();await expect(page.getByRole('spinbutton',{name: 'Context tokens',exact: true}).nth(1)).toHaveValue('128000');await expect(page.getByRole('spinbutton',{name: 'Max output tokens',exact: true}).nth(1)).toHaveValue('8192');
  await page.getByRole('button',{name: 'Remove model',exact: true}).first().click();await page.getByRole('button',{name: 'Add model',exact: true}).click();
  expect(await page.locator('legend').allTextContents()).toEqual(['Model 2','Model 3']);expect(await page.evaluate(() => window.customPartsHarness.session.read().models.map(model => ({index: model.sourceIndex,prices: model.prices})))).toEqual([
    {index: 1,prices: {input: '',output: '',cacheRead: '',cacheWrite: ''}},{index: 2,prices: {input: '',output: '',cacheRead: '',cacheWrite: ''}},
  ]);
});

test('ordinary availability snapshots retain endpoint and model drafts, protocol, row count, caret and open price disclosure',async ({page}) => {
  await openCustom(page);await page.getByRole('textbox',{name: 'Connection name',exact: true}).fill('Changed endpoint');const id = page.getByRole('textbox',{name: 'Model ID',exact: true}).first();await id.fill('Unsaved model ID');
  await page.getByText('Price estimate (optional)',{exact: true}).click();await page.getByRole('spinbutton',{name: 'Input',exact: true}).fill('0.00125');await page.getByRole('button',{name: 'Add model',exact: true}).click();
  await id.evaluate(node => {const control = node as HTMLInputElement;control.focus();control.setSelectionRange(2,9);window.customPartsHarness.control = control;});
  await page.evaluate(() => {const h = window.customPartsHarness;h.session.update({...h.initial,name: 'Late name',models: [],disabled: true,error: 'Metadata message'});h.session.update({...h.initial,disabled: false});});
  await expect(page.getByRole('textbox',{name: 'Connection name',exact: true})).toHaveValue('Changed endpoint');await expect(page.locator('fieldset')).toHaveCount(2);await expect(page.locator('details').first()).toHaveAttribute('open','');
  expect(await id.evaluate(node => ({same: node === window.customPartsHarness.control,focus: node === document.activeElement,selection: [(node as HTMLInputElement).selectionStart,(node as HTMLInputElement).selectionEnd]}))).toEqual({same: true,focus: true,selection: [2,9]});await expect(page.getByRole('spinbutton',{name: 'Input',exact: true}).first()).toHaveValue('0.00125');
});

test('draft payloads retain raw endpoint/key text, trimmed model identities, boolean capabilities and zero versus unknown prices',async ({page}) => {
  await openCustom(page,{pending: true});await page.getByRole('textbox',{name: 'Connection name',exact: true}).fill(' Endpoint draft ');await page.getByLabel('API key',{exact: true}).fill(' private key ');
  await page.getByRole('textbox',{name: 'Model ID',exact: true}).fill(' edited-id ');await page.getByRole('textbox',{name: 'Display name',exact: true}).fill(' Edited name ');
  await page.getByRole('button',{name: 'Save connection',exact: true}).click();expect(await page.evaluate(() => window.customPartsHarness.values)).toEqual([{name: ' Endpoint draft ',baseUrl: initial.baseUrl,api: initial.api,apiKey: ' private key ',models: [{sourceIndex: 0,id: 'edited-id',name: 'Edited name',contextWindow: 128000,maxTokens: 8192,reasoning: true,images: true,prices: {input: '0',output: '1.25',cacheRead: '0.125',cacheWrite: '2.5'}}]}]);
});

test('pending save blocks repeated save/add/remove while allowing text and protocol drafts and Cancel',async ({page}) => {
  await openCustom(page,{pending: true});await page.getByRole('button',{name: 'Save connection',exact: true}).click();
  await expect(page.getByRole('button',{name: 'Add model',exact: true})).toBeDisabled();await expect(page.getByRole('button',{name: 'Remove model',exact: true})).toBeDisabled();await expect(page.getByRole('button',{name: 'Cancel',exact: true})).toBeEnabled();
  await expect(page.getByRole('textbox',{name: 'Connection name',exact: true})).toBeEnabled();await expect(page.getByRole('combobox',{name: 'API protocol',exact: true})).toBeEnabled();
  await page.evaluate(() => {const h = window.customPartsHarness;h.session.update({...h.initial,disabled: true});h.session.update({...h.initial,disabled: false});document.querySelector('dialog[open] form')!.dispatchEvent(new SubmitEvent('submit',{bubbles: true,cancelable: true}));});
  expect(await page.evaluate(() => window.customPartsHarness.values.length)).toBe(1);await page.evaluate(() => window.customPartsHarness.releases[0]!({ok: false,error: 'Provider rejected this draft'}));await expect(page.locator('form [role=alert]').last()).toHaveText('Provider rejected this draft');await expect(page.getByRole('button',{name: 'Save connection',exact: true})).toBeEnabled();
});

test('clear secrets and failed save keep model drafts; a successful current save closes and returns isolated readable model data',async ({page}) => {
  await openCustom(page,{pending: true});await page.getByLabel('API key',{exact: true}).fill('secret draft');await page.evaluate(() => window.customPartsHarness.session.clearSecrets());await expect(page.getByLabel('API key',{exact: true})).toHaveValue('');
  await page.getByLabel('API key',{exact: true}).fill('Keep on failure');await page.getByRole('button',{name: 'Save connection',exact: true}).click();await page.evaluate(() => window.customPartsHarness.releases[0]!({ok: false,error: 'Rejected'}));await expect(page.getByLabel('API key',{exact: true})).toHaveValue('Keep on failure');
  await page.getByRole('button',{name: 'Save connection',exact: true}).click();await page.evaluate(() => window.customPartsHarness.releases[1]!({ok: true}));await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.locator('#custom-opener')).toBeFocused();
  expect(await page.evaluate(() => {const h = window.customPartsHarness;const draft = h.session.read();draft.models[0]!.prices.input = 'modified copy';return {read: h.session.read(),closed: h.closed};})).toMatchObject({read: {apiKey: '',models: [{prices: {input: '0'}}]},closed: 1});
});

test('a custom composition shares its owner theme and parent destruction clears its retained native key before late outcomes',async ({page}) => {
  await page.goto('/tests/fixture.html');await page.evaluate(async initial => {
    const recipePath = '/examples/assemblies/custom-connection.ts',partsPath = '/src/parts/index.ts';const {composeCustomConnection} = await import(recipePath),p = await import(partsPath);
    const h = {initial,values: [],releases: [],closed: 0} as unknown as Harness;const session = composeCustomConnection(initial,{onSubmit(draft: Draft) {h.values.push(draft);return new Promise<Result>(resolve => h.releases.push(resolve));},onClose() {h.closed++;}});h.session = session;
    const mount = document.body.appendChild(document.createElement('div'));h.shared = p.mountParts(mount,p.createStackPart({children: [p.createTextPart({text: 'Workspace'}),session.part]}),{appearance: 'light'});session.open();window.customPartsHarness = h;
  },initial);
  const key = page.getByLabel('API key',{exact: true});await key.fill('Private pending key');await key.evaluate(node => {const input = node as HTMLInputElement;input.focus();input.setSelectionRange(2,9);window.customPartsHarness.control = input;});
  await page.evaluate(() => window.customPartsHarness.shared!.setAppearance('dark'));await expect(page.getByRole('dialog')).toHaveCSS('background-color','rgb(34, 37, 42)');await expect(key).toBeFocused();expect(await key.evaluate(node => [(node as HTMLInputElement).selectionStart,(node as HTMLInputElement).selectionEnd])).toEqual([2,9]);
  await page.getByRole('button',{name: 'Save connection',exact: true}).click();await page.evaluate(() => window.customPartsHarness.shared!.destroy());await expect(page.locator('dialog,input')).toHaveCount(0);
  const value = await page.evaluate(async () => {const h = window.customPartsHarness;h.releases[0]!({ok: false,error: 'Retired failure'});await new Promise(resolve => setTimeout(resolve,0));h.session.update({...h.initial,error: 'Late snapshot'});h.session.fail('Late frame');h.session.destroy();return {closed: h.closed,open: h.session.isOpen(),native: h.control!.value,read: h.session.read()};});expect(value).toMatchObject({closed: 1,open: false,native: '',read: {apiKey: ''}});
});
