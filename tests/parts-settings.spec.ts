import {test, expect, type Page} from '@playwright/test';

type Result = {ok: true} | {ok: false; error: string};
type Appearance = 'light' | 'dark' | 'system';
interface SettingsState {
  baseUrl: string; hasApiKey: boolean; ready?: boolean; testing?: boolean; disabled?: boolean; error?: string;
  appearance?: {mode: Appearance; disabled?: boolean; error?: string}; testResult?: {message: string; ok?: boolean};
}
interface Draft {provider: string; baseUrl: string; apiKey: string}
interface Provider {id: string; name: string; configured?: boolean; signedIn?: boolean}
interface ProviderActions {id: string; oauth: boolean; signedIn: boolean; custom: boolean; disabled?: boolean}
interface Credential {status: string; hidden: boolean; required: boolean; placeholder: string; removeVisible: boolean; hint?: string; providerActions?: ProviderActions}
interface UpdateState {version: string; enabled: boolean; phase: string; availableVersion: string; progress: number; message: string}
interface SettingsHandle {
  read(): Draft; update(state: SettingsState): void; setProviders(values: readonly Provider[], selected?: string): void;
  resetProvider(value: {provider: string; baseUrl: string; clearKey?: boolean; collapseAdvanced?: boolean}): void;
  setCredential(view: Credential): void; updateUpdates(state: UpdateState): void; setUpdatePending(pending: boolean): void;
  setUpdateError(message: string, options?: {allowCheckRetry?: boolean}): void;
  clearSecrets(): void; fail(message: string): void; close(): void; isOpen(): boolean; destroy(): void;
}
interface Harness {
  session: SettingsHandle; initial: SettingsState; credential: Credential; values: Array<{action: string; value?: unknown}>;
  releases: Array<{action: string; resolve(result: Result): void}>; closed: number; control?: HTMLInputElement; button?: HTMLButtonElement;
  shared?: {setAppearance(mode: Appearance): void;destroy(): void};
}
declare global {interface Window {settingsPartsHarness: Harness}}
const ready: SettingsState = {baseUrl: 'https://provider.example/v1', hasApiKey: true, ready: true,
  appearance: {mode: 'system'}, testResult: {message: 'Streaming and tool calling are available.', ok: true}};
const providers: Provider[] = [{id: 'first',name: 'First provider',configured: true},{id: 'second',name: 'Account provider',signedIn: true}];
const credential: Credential = {status: 'Configured',hidden: false,required: false,placeholder: 'Leave blank to keep this provider’s key',removeVisible: true,
  providerActions: {id: 'first',oauth: true,signedIn: false,custom: true}};
const update: UpdateState = {version: '0.1.0-rc.27',enabled: true,phase: 'available',availableVersion: '0.1.0-rc.28',progress: 0,message: 'An update is available.'};
interface OpenOptions {appearance?: 'light' | 'dark'; state?: SettingsState; credential?: Credential; providers?: Provider[]; updates?: UpdateState; cold?: boolean; pending?: string[];applicationContext?: boolean}

async function openSettings(page: Page, old: boolean, options: OpenOptions = {}): Promise<void> {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async ({old, options, ready, providers, credential, update}) => {
    const appearance = options.appearance ?? 'light';
    document.documentElement.classList.add('pui'); document.documentElement.dataset.appearance = appearance; document.body.dataset.appearance = appearance;
    const opener = document.createElement('button'); opener.textContent = 'Settings opener'; opener.id = 'settings-opener'; document.body.append(opener); opener.focus();
    const mount = document.body.appendChild(document.createElement('div'));
    // Actual Desk dialogs are flex children of the application shell. Match
    // that native parent context in both oracles, including WebKit's computed
    // automatic minimum serialization; the recipe has no presentation override.
    if (!old && options.applicationContext) mount.classList.add('pui-app');
    const h = {initial: options.state ?? ready,credential: options.credential ?? credential,values: [],releases: [],closed: 0} as unknown as Harness;
    const action = (name: string, value?: unknown): Result | Promise<Result> => {
      h.values.push({action: name,...(value === undefined ? {} : {value})});
      return options.pending?.includes(name) ? new Promise(resolve => h.releases.push({action: name,resolve})) : {ok: true};
    };
    const callbacks = {
      onSubmit: (draft: Draft) => action('save',draft),onRemoveKey: (draft: Draft) => action('remove',draft),
      onTest: (draft: Draft) => {h.session.update({...h.initial,testing: true}); return action('test',draft);},
      onCancelTest: () => {h.session.update(h.initial); return action('cancel-test');},
      onAppearanceChange: (mode: string) => action('appearance',mode),onProviderChange: (id: string) => action('provider',id),
      onDraftChange: (draft: Draft) => {h.values.push({action: 'draft',value: draft});},
      onProviderAction: (name: string,target: {id: string}) => action(`provider-${name}`,target),
      onUpdateAction: (name: string) => action(`update-${name}`),onCreateConnection: () => action('create'),onDiagnostics: () => action('diagnostics'),
      onClose() {h.closed++;},
    };
    if (old) {
      const path = '/src/app/index.ts'; const {createApplication} = await import(path);
      const app = createApplication(mount,{appearance,brand: {name: 'Pith Desk'}}); h.session = app.settings.openSettings(h.initial,callbacks);
    } else {
      const path = '/examples/assemblies/settings.ts'; const {mountSettings} = await import(path);
      h.session = mountSettings(mount,h.initial,callbacks,{appearance},'Pith Desk');
    }
    if (!options.cold) {
      h.session.setProviders(options.providers ?? providers,'first'); h.session.setCredential(h.credential); h.session.updateUpdates(options.updates ?? update);
    }
    window.settingsPartsHarness = h;
  },{old,options,ready,providers,credential,update});
  await expect(page.getByRole('dialog',{name: 'Settings',exact: true})).toBeVisible();
}

async function presentation(page: Page): Promise<unknown> {
  return page.evaluate(async () => {
    await document.fonts.ready;
    for (const animation of document.getAnimations()) if (animation.effect?.getTiming().iterations !== Infinity) animation.finish();
    const dialog = document.querySelector('dialog[open]')!,origin = dialog.getBoundingClientRect();
    const inspect = (node: Element) => {
      const rect = node.getBoundingClientRect(),style = getComputedStyle(node);
      return {tag: node.localName,text: [...node.childNodes].filter(child => child.nodeType === Node.TEXT_NODE).map(child => child.textContent).join('').trim(),
        box: [rect.x-origin.x,rect.y-origin.y,rect.width,rect.height].map(value => Math.round(value*100)/100),
        styles: ['display','font-family','font-size','font-weight','line-height','color','background-color','margin-top','margin-bottom','padding-top','padding-right','padding-bottom','padding-left','border-top-width','border-top-color','border-radius','gap','overflow-x','overflow-y','min-height','height'].map(key => style.getPropertyValue(key)),
        ...(node instanceof HTMLInputElement ? {value: node.value,disabled: node.disabled,required: node.required,type: node.type,placeholder: node.placeholder,autocomplete: node.autocomplete} : {}),
        ...(node instanceof HTMLSelectElement ? {value: node.value,disabled: node.disabled,required: node.required,options: [...node.options].map(option => [option.value,option.textContent,option.disabled])} : {}),
        ...(node instanceof HTMLButtonElement ? {label: node.getAttribute('aria-label'),disabled: node.disabled,type: node.type} : {}),
        ...(node instanceof HTMLProgressElement ? {value: node.value,max: node.max} : {})};
    };
    const meaningful = [...dialog.querySelectorAll('h2,h3,label,input,select,p,progress,summary,button,.pui-configured-badge,[role=status],[role=alert],.pui-modal-footer')]
      .filter(node => !node.closest('[hidden]'));
    const form = dialog.querySelector('form')!;
    return {dialog: inspect(dialog),meaningful: meaningful.map(inspect),svg: [...dialog.querySelectorAll('svg')].map(svg => svg.innerHTML),
      nativeBoundary: {formCount: dialog.querySelectorAll('form').length,appearanceInForm: !!form.querySelector('select[aria-label=Appearance]'),
        progressInForm: !!form.querySelector('progress'),inputNames: [...form.querySelectorAll('input')].map(input => input.name)},
      overflow: [dialog.clientWidth,dialog.scrollWidth,dialog.clientHeight,dialog.scrollHeight],
      background: getComputedStyle(dialog).backgroundColor};
  });
}

test('small form layout, section, field stack, progress, label suffix and invalid callback preserve native boundaries without DOM ports',async ({page}) => {
  await page.goto('/tests/fixture.html');
  const value = await page.evaluate(async () => {
    const path = '/src/parts/index.ts'; const p = await import(path); let invalid = 0;
    const input = p.createInputPart({kind: 'url',name: 'baseUrl',value: 'invalid',required: true,onInvalid() {invalid++;}});
    const badge = p.createBadgePart({text: 'Configured'}),label = p.createFieldLabelPart({label: 'API base URL',control: input,suffix: badge});
    const stack = p.createFieldStackPart({children: [label,input]});
    const section = p.createSectionPart({title: 'Connection',children: [stack]});
    const progress = p.createProgressPart({label: 'Update progress',value: 42,hidden: false});
    const status = p.createStatusPart({message: 'Ready',tone: 'success'});
    const toolbar = p.createToolbarPart({purpose: 'feature',label: 'Provider actions',children: []});
    const form = p.createFormPart({children: [section]});
    const layout = p.createFormLayoutPart({children: [progress,status,toolbar,form]});
    const mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,layout);
    mount.querySelector('input')!.reportValidity(); label.update({label: 'Endpoint'}); badge.update({text: 'Saved'});
    const node = mount.querySelector('progress')!; const result = {invalid,progress: {max: node.max,value: node.value},
      boundary: !mount.querySelector('form')!.contains(node),label: mount.querySelector('label')!.textContent,
      status: {tag: mount.querySelector('[role=status]')!.localName,live: mount.querySelector('[role=status]')!.getAttribute('aria-live'),color: getComputedStyle(mount.querySelector('[role=status]')!).color},
      toolbar: mount.querySelector('.pui-feature-toolbar')?.localName,
      children: [...mount.querySelector('section')!.children].map(node => node.localName),association: mount.querySelector('label')!.control === mount.querySelector('input'),
      leaks: [input,label,stack,section,progress,form,layout].some(part => Object.values(part).some(value => value instanceof Node))};
    tree.destroy(); return result;
  });
  expect(value).toMatchObject({invalid: 1,progress: {max: 100,value: 42},boundary: true,label: 'Endpoint Saved',children: ['h3','div'],association: true,leaks: false,
    status: {tag: 'div',live: 'polite'},toolbar: 'div'});
});

test('form and button invalidation retire pending outcomes without resetting a live field or replacing its button',async ({page}) => {
  await page.goto('/tests/fixture.html');
  const value = await page.evaluate(async () => {
    const path = '/src/parts/index.ts'; const p = await import(path);
    let releaseForm: ((value: Result) => void) | undefined,releaseButton: ((value: Result) => void) | undefined,errors = 0;
    const input = p.createInputPart({value: 'Initial'}),button = p.createButtonPart({label: 'Auxiliary',onAction: () => new Promise<Result>(resolve => {releaseButton = resolve;}),onError() {errors++;}});
    const form = p.createFormPart({children: [input,button],onSubmit: () => new Promise<Result>(resolve => {releaseForm = resolve;}),onError() {errors++;}});
    const mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,form);
    input.reset('Live draft'); const native = mount.querySelector('input')!; native.focus(); native.setSelectionRange(2,6); const action = mount.querySelector('button')!;
    form.submit(); action.click(); form.invalidate(); button.invalidate();
    const immediate = {pending: form.isPending(),buttonDisabled: action.disabled,value: input.read(),same: action === mount.querySelector('button'),focus: native === document.activeElement,selection: [native.selectionStart,native.selectionEnd]};
    releaseForm!({ok: false,error: 'Retired form failure'}); releaseButton!({ok: false,error: 'Retired button failure'}); await new Promise(resolve => setTimeout(resolve,0));
    tree.destroy(); return {immediate,errors};
  });
  expect(value).toEqual({immediate: {pending: false,buttonDisabled: false,value: 'Live draft',same: true,focus: true,selection: [2,6]},errors: 0});
});

test('an auxiliary form validation action focuses invalid fields without invoking save',async ({page}) => {
  await page.goto('/tests/fixture.html');
  const value = await page.evaluate(async () => {
    const path = '/src/parts/index.ts'; const p = await import(path); let saves = 0,invalid = 0;
    const input = p.createInputPart({label: 'Endpoint',kind: 'url',value: 'invalid',required: true,onInvalid() {invalid++;}});
    const form = p.createFormPart({children: [input],onSubmit() {saves++;}});
    const mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,form);
    const rejected = form.reportValidity(); input.reset('https://valid.example/v1'); const accepted = form.reportValidity();
    const result = {rejected,accepted,saves,invalid,focus: document.activeElement === mount.querySelector('input')}; tree.destroy(); return result;
  });
  expect(value).toEqual({rejected: false,accepted: true,saves: 0,invalid: 1,focus: true});
});

test('paragraph feedback can announce an update status without changing its native content node',async ({page}) => {
  await page.goto('/tests/fixture.html');
  const value = await page.evaluate(async () => {
    const path = '/src/parts/index.ts'; const p = await import(path);
    const status = p.createFeedbackPart({presentation: 'paragraph',tone: 'info',message: 'Checking…',announce: 'polite'});
    const mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,status),node = mount.querySelector('p')!;
    const first = {role: node.getAttribute('role'),live: node.getAttribute('aria-live')};
    status.update({tone: 'info',message: 'Ready',announce: 'none'});
    const result = {first,same: node === mount.querySelector('p'),live: node.getAttribute('aria-live'),text: node.textContent}; tree.destroy(); return result;
  });
  expect(value).toEqual({first: {role: 'status',live: 'polite'},same: true,live: null,text: 'Ready'});
});

test('a rejected field-stack state leaves the supplied control available for its original owner',async ({page}) => {
  await page.goto('/tests/fixture.html');
  const value = await page.evaluate(async () => {
    const path = '/src/parts/index.ts'; const p = await import(path); const input = p.createInputPart({value: 'Keep this draft'});
    let rejected = false; try {p.createFieldStackPart({hidden: 'invalid',children: [input]});} catch {rejected = true;}
    const form = p.createFormPart({children: [input]}),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,form);
    const result = {rejected,value: input.read(),count: mount.querySelectorAll('input').length}; tree.destroy(); return result;
  });
  expect(value).toEqual({rejected: true,value: 'Keep this draft',count: 1});
});

const scenarios: Record<string,OpenOptions> = {
  ready: {},loading: {cold: true,state: {baseUrl: '',hasApiKey: false,ready: false}},
  disabled: {state: {...ready,disabled: true,appearance: {mode: 'dark',disabled: true}}},
  testing: {state: {...ready,testing: true,testResult: {message: 'Testing streaming and tool calling…'}}},
  errors: {state: {...ready,error: 'Provider rejected the saved key.',appearance: {mode: 'light',error: 'Appearance preference could not be saved.'},testResult: {message: 'Tool calling is unavailable.',ok: false}}},
  oauth: {credential: {...credential,status: 'Signed in',hidden: true,required: false,removeVisible: false,hint: 'Requests use your provider account.',providerActions: {id: 'first',oauth: true,signedIn: true,custom: false}}},
  empty: {providers: [],credential: {...credential,status: '',required: true,removeVisible: false,providerActions: undefined}},
  installing: {updates: {...update,phase: 'installing',progress: 37,message: 'Installing update…'}},
  checking: {updates: {...update,phase: 'checking',availableVersion: '',message: 'Checking for updates…'}},
};
for (const appearance of ['light','dark'] as const) for (const [name,options] of Object.entries(scenarios)) test(`${appearance} settings ${name} assembly preserves the actual application scene`,async ({page}) => {
  await page.emulateMedia({colorScheme: appearance === 'dark' ? 'light' : 'dark'});
  await openSettings(page,true,{...options,appearance,applicationContext: true}); const old = await presentation(page);
  await openSettings(page,false,{...options,appearance,applicationContext: true}); expect(await presentation(page)).toEqual(old);
  expect((await presentation(page) as {background: string}).background).toBe(appearance === 'dark' ? 'rgb(34, 37, 42)' : 'rgb(255, 255, 255)');
  if (!options.cold && !options.credential?.hidden) await expect(page.locator('dialog[open] input[type=password]')).toHaveAccessibleName(`API key ${options.credential?.status ?? credential.status}`.trim());
});

for (const viewport of [{width: 900,height: 568},{width: 390,height: 844}]) test(`settings ${viewport.width} preserves responsive scrolling and expanded advanced fields`,async ({page}) => {
  await page.setViewportSize(viewport); await openSettings(page,true,{applicationContext: true}); await page.getByText('Advanced connection settings',{exact: true}).click(); const old = await presentation(page);
  await openSettings(page,false,{applicationContext: true}); await page.getByText('Advanced connection settings',{exact: true}).click(); expect(await presentation(page)).toEqual(old);
  await page.getByRole('button',{name: 'Save settings',exact: true}).scrollIntoViewIfNeeded();
  const box = await page.getByRole('button',{name: 'Save settings',exact: true}).boundingBox(); expect(box!.y+box!.height).toBeLessThanOrEqual(viewport.height);
});

test('settings snapshots retain URL and key drafts, caret and provider choice; hiding a credential excludes it without erasing it',async ({page}) => {
  await openSettings(page,false); await page.getByText('Advanced connection settings',{exact: true}).click();
  const url = page.getByRole('textbox',{name: 'API base URL',exact: true}),key = page.getByLabel('API key',{exact: false});
  await url.fill('https://draft.example/v2'); await key.fill('Unsaved private key');
  await key.evaluate(node => {const control = node as HTMLInputElement; window.settingsPartsHarness.control = control; control.focus(); control.setSelectionRange(3,10);});
  await page.evaluate(() => {const h = window.settingsPartsHarness; h.session.update({...h.initial,baseUrl: 'https://late.example/v1',error: 'Metadata notice'}); h.session.setProviders([{id: 'first',name: 'Renamed provider'},{id: 'second',name: 'Second'}]);});
  await expect(url).toHaveValue('https://draft.example/v2'); await expect(key).toHaveValue('Unsaved private key');
  expect(await key.evaluate(node => ({same: node === window.settingsPartsHarness.control,focus: node === document.activeElement,selection: [(node as HTMLInputElement).selectionStart,(node as HTMLInputElement).selectionEnd]}))).toEqual({same: true,focus: true,selection: [3,10]});
  await page.evaluate(() => {const h = window.settingsPartsHarness; h.session.setCredential({...h.credential,hidden: true});});
  expect(await page.evaluate(() => window.settingsPartsHarness.session.read())).toEqual({provider: 'first',baseUrl: 'https://draft.example/v2',apiKey: ''});
  await page.evaluate(() => {const h = window.settingsPartsHarness; h.session.setCredential(h.credential);}); await expect(key).toHaveValue('Unsaved private key');
});

test('native URL validation expands advanced fields, required credentials block save, and all auxiliary buttons remain non-submit',async ({page}) => {
  const validate = async (old: boolean) => {
    await openSettings(page,old,{credential: {...credential,required: true}});
    const save = page.getByRole('button',{name: 'Save settings',exact: true}); await save.click();
    expect(await page.evaluate(() => window.settingsPartsHarness.values.filter(value => value.action === 'save'))).toEqual([]);
    await page.getByLabel('API key',{exact: false}).fill('Draft key');
    await page.evaluate(() => {const h = window.settingsPartsHarness; h.session.resetProvider({provider: 'first',baseUrl: 'invalid endpoint',collapseAdvanced: true});});
    await save.click(); await expect(page.locator('dialog[open] details')).toHaveAttribute('open','');
    return page.evaluate(() => ({tag: document.activeElement?.localName,urlFocused: document.activeElement === document.querySelector('dialog[open] input[type=url]')}));
  };
  const originalNativeFocus = await validate(true);
  expect(await validate(false)).toEqual(originalNativeFocus);
  expect(await page.locator('dialog[open] button:not([type=submit])').evaluateAll(nodes => nodes.every(node => (node as HTMLButtonElement).type === 'button'))).toBe(true);
  await page.getByRole('button',{name: 'Add independent model connection',exact: true}).click();
  expect(await page.evaluate(() => window.settingsPartsHarness.values.filter(value => value.action !== 'draft'))).toEqual([{action: 'create'}]);
});

test('the host can expose Cancel test while the original test callback is still pending',async ({page}) => {
  await openSettings(page,false,{pending: ['test']}); await page.getByRole('button',{name: 'Test connection',exact: true}).click();
  const cancel = page.getByRole('button',{name: 'Cancel test',exact: true}); await expect(cancel).toBeEnabled(); await cancel.click();
  await expect(page.getByRole('button',{name: 'Test connection',exact: true})).toBeEnabled();
  expect(await page.evaluate(() => window.settingsPartsHarness.values.filter(value => value.action !== 'draft'))).toEqual([
    {action: 'test',value: {provider: 'first',baseUrl: ready.baseUrl,apiKey: ''}},{action: 'cancel-test'},
  ]);
});

for (const action of ['save','remove'] as const) test(`resetProvider retires an earlier ${action} without replacing or erasing the next provider draft`,async ({page}) => {
  await openSettings(page,false,{pending: [action]}); await page.getByLabel('API key',{exact: false}).fill('First private draft');
  await page.getByRole('button',{name: action === 'save' ? 'Save settings' : 'Remove saved API key',exact: true}).click();
  await expect(page.getByRole('button',{name: 'Save settings',exact: true})).toBeDisabled();
  await page.evaluate(() => window.settingsPartsHarness.session.resetProvider({provider: 'second',baseUrl: 'https://second.example/v1',clearKey: true,collapseAdvanced: true}));
  const key = page.getByLabel('API key',{exact: false}); await key.fill('Next provider draft'); await key.focus(); await key.evaluate(node => (node as HTMLInputElement).setSelectionRange(2,9));
  await page.evaluate(() => window.settingsPartsHarness.releases[0]!.resolve({ok: true}));
  await expect(page.getByRole('dialog',{name: 'Settings',exact: true})).toBeVisible(); await expect(page.getByRole('button',{name: 'Save settings',exact: true})).toBeEnabled();
  await expect(key).toHaveValue('Next provider draft'); await expect(key).toBeFocused();
  expect(await key.evaluate(node => [(node as HTMLInputElement).selectionStart,(node as HTMLInputElement).selectionEnd])).toEqual([2,9]);
});

test('remove and save share one operation and a failed removal keeps the private draft',async ({page}) => {
  await openSettings(page,false,{pending: ['remove']}); await page.getByLabel('API key',{exact: false}).fill('Keep this key');
  await page.getByRole('button',{name: 'Remove saved API key',exact: true}).click();
  await expect(page.getByRole('button',{name: 'Save settings',exact: true})).toBeDisabled(); await expect(page.getByRole('button',{name: 'Test connection',exact: true})).toBeDisabled();
  await page.evaluate(() => {document.querySelector('dialog[open] form')!.dispatchEvent(new SubmitEvent('submit',{bubbles: true,cancelable: true}));});
  expect(await page.evaluate(() => window.settingsPartsHarness.values.filter(value => value.action === 'save'))).toEqual([]);
  await page.evaluate(() => window.settingsPartsHarness.releases[0]!.resolve({ok: false,error: 'Removal rejected'}));
  await expect(page.locator('dialog[open] form [role=alert]')).toHaveText('Removal rejected'); await expect(page.getByLabel('API key',{exact: false})).toHaveValue('Keep this key');
});

test('provider action buttons retain keyed pending, callback identity and focus across credential snapshots',async ({page}) => {
  await openSettings(page,false,{pending: ['provider-login']}); const login = page.getByRole('button',{name: 'Sign in with provider',exact: true});
  await login.evaluate(node => {window.settingsPartsHarness.button = node as HTMLButtonElement;}); await login.click(); await expect(login).toBeDisabled();
  await page.evaluate(() => {const h = window.settingsPartsHarness; h.session.setCredential({...h.credential,providerActions: {...h.credential.providerActions!,disabled: true}}); h.session.setCredential(h.credential);});
  await expect(login).toBeDisabled(); expect(await login.evaluate(node => node === window.settingsPartsHarness.button)).toBe(true);
  expect(await page.evaluate(() => window.settingsPartsHarness.values.filter(value => value.action.startsWith('provider-')))).toEqual([{action: 'provider-login',value: {id: 'first'}}]);
  await page.evaluate(() => {const h = window.settingsPartsHarness; h.releases[0]!.resolve({ok: false,error: 'Login failed'});});
  await expect(page.locator('dialog[open] [role=alert]').last()).toHaveText('Login failed'); await expect(login).toBeEnabled();
});

test('update pending merges local and host state; check failure enables retry while an install failure remains busy',async ({page}) => {
  await openSettings(page,false,{pending: ['update-check']}); const check = page.getByRole('button',{name: 'Check for updates',exact: true}); await check.click();
  await page.evaluate(() => {const h = window.settingsPartsHarness; h.session.setUpdatePending(true); h.session.setUpdatePending(false);}); await expect(check).toBeDisabled();
  await page.evaluate(update => {const h = window.settingsPartsHarness; h.session.updateUpdates({...update,phase: 'checking'}); h.releases[0]!.resolve({ok: false,error: 'Download status unavailable'});},update);
  await expect(check).toBeEnabled(); await expect(page.getByText('Download status unavailable',{exact: true})).toBeVisible();
  await page.evaluate(update => {const h = window.settingsPartsHarness; h.session.updateUpdates({...update,phase: 'installing',progress: 61}); h.session.setUpdateError('Install failed');},update);
  await expect(check).toBeDisabled(); await expect(page.getByRole('button',{name: 'Update and restart',exact: true})).toBeDisabled(); await expect(page.getByRole('progressbar',{name: 'Update progress'})).toHaveAttribute('value','61');
});

test('closing clears secrets and all late outcomes, preserves host focus and only notifies once',async ({page}) => {
  await openSettings(page,false,{pending: ['save']}); await page.getByLabel('API key',{exact: false}).fill('Private draft'); await page.getByRole('button',{name: 'Save settings',exact: true}).click();
  await page.evaluate(() => window.settingsPartsHarness.session.close()); await expect(page.getByRole('dialog')).toHaveCount(0); await expect(page.locator('#settings-opener')).toBeFocused();
  await page.evaluate(() => {const h = window.settingsPartsHarness; h.releases[0]!.resolve({ok: false,error: 'Late failure'}); h.session.update({...h.initial,error: 'Late snapshot'}); h.session.fail('Late frame failure'); h.session.clearSecrets(); h.session.destroy(); h.session.destroy();});
  expect(await page.evaluate(() => ({read: window.settingsPartsHarness.session.read(),closed: window.settingsPartsHarness.closed,open: window.settingsPartsHarness.session.isOpen()}))).toEqual({read: {provider: 'first',baseUrl: ready.baseUrl,apiKey: ''},closed: 1,open: false});
  await expect(page.locator('dialog,input[type=password]')).toHaveCount(0);
});

async function openSharedSettings(page: Page): Promise<void> {
  await page.goto('/tests/fixture.html');
  const initial = await page.evaluate(async ({ready,providers,credential}) => {
    const recipePath = '/examples/assemblies/settings.ts',partsPath = '/src/parts/index.ts';
    const {composeSettings} = await import(recipePath),p = await import(partsPath);
    const h = {initial: ready,credential,values: [],releases: [],closed: 0} as unknown as Harness;
    const settings = composeSettings(ready,{onSubmit(draft: Draft) {h.values.push({action: 'save',value: draft});return new Promise<Result>(resolve => h.releases.push({action: 'save',resolve}));},onClose() {h.closed++;}});
    h.session = settings;
    settings.open();const beforeMount = settings.isOpen();
    const sibling = p.createButtonPart({label: 'Sibling action',variant: 'secondary'});
    const mount = document.body.appendChild(document.createElement('div'));mount.id = 'shared-settings-mount';
    h.shared = p.mountParts(mount,p.createStackPart({children: [sibling,settings.part]}),{appearance: 'light'});
    settings.setProviders(providers,'first');settings.setCredential(credential);settings.open();
    window.settingsPartsHarness = h;
    return {beforeMount,leaks: Object.values(settings.part).some(value => value instanceof Node)};
  },{ready,providers,credential});
  expect(initial).toEqual({beforeMount: false,leaks: false});
  await expect(page.getByRole('dialog',{name: 'Settings',exact: true})).toBeVisible();
}

test('a local settings part shares one mount theme and retains its credential draft, native field, focus and caret through live appearance changes',async ({page}) => {
  await page.emulateMedia({colorScheme: 'light'});await openSharedSettings(page);
  const siblingColor = await page.getByRole('button',{name: 'Sibling action',exact: true}).evaluate(node => getComputedStyle(node).backgroundColor);
  const key = page.getByLabel('API key',{exact: false});await key.fill('Shared-tree private draft');
  await key.evaluate(node => {const input = node as HTMLInputElement;input.focus();input.setSelectionRange(3,12);window.settingsPartsHarness.control = input;});
  await page.evaluate(() => window.settingsPartsHarness.shared!.setAppearance('dark'));
  await expect(page.getByRole('dialog')).toHaveCSS('background-color','rgb(34, 37, 42)');
  await expect.poll(() => page.getByRole('button',{name: 'Sibling action',exact: true}).evaluate(node => getComputedStyle(node).backgroundColor)).not.toBe(siblingColor);
  await page.evaluate(() => window.settingsPartsHarness.shared!.setAppearance('light'));
  await expect(page.getByRole('dialog')).toHaveCSS('background-color','rgb(255, 255, 255)');await expect(page.getByRole('button',{name: 'Sibling action',exact: true})).toHaveCSS('background-color',siblingColor);await expect(key).toHaveValue('Shared-tree private draft');
  expect(await key.evaluate(node => ({same: node === window.settingsPartsHarness.control,focus: node === document.activeElement,selection: [(node as HTMLInputElement).selectionStart,(node as HTMLInputElement).selectionEnd]}))).toEqual({same: true,focus: true,selection: [3,12]});
  await page.evaluate(() => window.settingsPartsHarness.session.close());await expect(page.getByRole('dialog')).toHaveCount(0);await expect(page.getByRole('button',{name: 'Sibling action',exact: true})).toBeVisible();
  await expect(page.locator('#shared-settings-mount')).toHaveClass('pui');
  await page.evaluate(() => window.settingsPartsHarness.shared!.destroy());expect(await page.evaluate(() => window.settingsPartsHarness.closed)).toBe(1);
});

test('destroying the shared owner retires a settings composition before late callbacks or snapshots can touch disposed children',async ({page}) => {
  await openSharedSettings(page);await page.getByLabel('API key',{exact: false}).fill('Private draft');await page.getByRole('button',{name: 'Save settings',exact: true}).click();
  await page.evaluate(() => window.settingsPartsHarness.shared!.destroy());await expect(page.locator('dialog,input')).toHaveCount(0);
  const state = await page.evaluate(async () => {
    const h = window.settingsPartsHarness;h.releases[0]!.resolve({ok: false,error: 'Retired failure'});await new Promise(resolve => setTimeout(resolve,0));
    h.session.update({...h.initial,error: 'Retired snapshot'});h.session.setCredential(h.credential);h.session.setProviders([]);h.session.resetProvider({provider: 'late',baseUrl: 'https://late.example/v1'});h.session.fail('Retired frame');h.session.destroy();
    return {open: h.session.isOpen(),closed: h.closed,read: h.session.read()};
  });
  expect(state).toEqual({open: false,closed: 1,read: {provider: 'first',baseUrl: ready.baseUrl,apiKey: ''}});await expect(page.locator('#shared-settings-mount')).not.toHaveClass('pui');
});
