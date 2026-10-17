import {test,expect,type Page} from '@playwright/test';

type Result = {ok: true} | {ok: false;error: string};
interface State {error?: string;formError?: string;disabled?: boolean}
interface Editor {name: string;type: string;url?: string;oauth?: boolean;oauthClientId?: string;oauthScope?: string;command?: string;args?: readonly string[];enabled?: boolean;hasBearerToken?: boolean;envKeys?: readonly string[]}
interface Draft {name: string;type: 'http' | 'stdio';url: string;oauth: boolean;oauthClientId: string;oauthScope: string;command: string;args: string;enabled: boolean;bearerToken: string;clearBearerToken: boolean;env: string;clearEnv: boolean}
interface Item extends Editor {enabled: boolean;status?: string;statusLabel: string;error?: string;signedIn?: boolean}
interface Session {
  read(): Draft;update(state: State): void;edit(value?: Editor): void;setConnections(entries: readonly Item[]): void;
  clearBearerToken(): void;clearSecrets(): void;fail(message: string): void;close(): void;isOpen(): boolean;destroy(): void;
}
interface Harness {session: Session;initial: State;entries: Item[];values: Array<{action: string;value?: unknown}>;releases: Array<{action: string;resolve(result: Result): void}>;closed: number;control?: HTMLTextAreaElement;button?: HTMLButtonElement;shared?: {setAppearance(mode: 'light' | 'dark'): void;destroy(): void}}
declare global {interface Window {mcpPartsHarness: Harness}}
const entries: Item[] = [
  {name: 'workspace-tools',type: 'http',url: 'https://tools.example/mcp',enabled: true,oauth: true,signedIn: true,hasBearerToken: true,envKeys: ['PRIVATE_KEY'],status: 'connected',statusLabel: 'Connected'},
  {name: 'local-tools',type: 'stdio',command: '/usr/local/bin/tool-server',args: ['--transport','stdio'],enabled: false,envKeys: ['LANG','TOKEN'],status: 'error',statusLabel: 'Disabled',error: 'The executable was not found.'},
];
const httpEditor: Editor = {name: 'workspace-tools',type: 'http',url: 'https://tools.example/mcp',oauth: true,oauthClientId: 'registered-client',oauthScope: 'read write',enabled: true,hasBearerToken: true};
const stdioEditor: Editor = {name: 'local-tools',type: 'stdio',command: '/usr/local/bin/tool-server',args: ['--transport','stdio','中文'],enabled: false,envKeys: ['LANG','TOKEN']};
interface Options {appearance?: 'light' | 'dark';state?: State;entries?: Item[];editor?: Editor;cold?: boolean;pending?: string[];applicationContext?: boolean}

async function openMCP(page: Page,old: boolean,options: Options = {}): Promise<void> {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async ({old,options,entries}) => {
    const appearance = options.appearance ?? 'light';document.documentElement.classList.add('pui');document.documentElement.dataset.appearance = appearance;document.body.dataset.appearance = appearance;
    const opener = document.createElement('button');opener.id = 'mcp-opener';opener.textContent = 'Connections opener';document.body.append(opener);opener.focus();
    const mount = document.body.appendChild(document.createElement('div'));
    // Geometry oracles use the actual application's native flex-parent context.
    // Standalone behavior tests continue to use an ordinary checked mount.
    if (!old && options.applicationContext) mount.classList.add('pui-app');
    const h = {initial: options.state ?? {},entries: options.entries ?? entries,values: [],releases: [],closed: 0} as unknown as Harness;
    const action = (name: string,value?: unknown): Result | Promise<Result> => {
      h.values.push({action: name,...(value === undefined ? {} : {value})});
      return options.pending?.includes(name) ? new Promise(resolve => h.releases.push({action: name,resolve})) : {ok: true};
    };
    const callbacks = {onSubmit: (draft: Draft) => action('save',draft),onConnectionAction: (name: string,target: {name: string}) => action(name,target),
      onRefresh: () => action('refresh'),onNew: () => action('new'),onClose() {h.closed++;}};
    if (old) {const path = '/src/app/index.ts';const {createApplication} = await import(path);h.session = createApplication(mount,{appearance}).settings.openConnections(h.initial,callbacks);}
    else {const path = '/examples/assemblies/mcp.ts';const {mountMCPConnections} = await import(path);h.session = mountMCPConnections(mount,h.initial,callbacks,{appearance});}
    if (!options.cold) h.session.setConnections(h.entries);
    if (options.editor) h.session.edit(options.editor);
    window.mcpPartsHarness = h;
  },{old,options,entries});
  await expect(page.getByRole('dialog',{name: 'Connections',exact: true})).toBeVisible();
}

async function presentation(page: Page): Promise<unknown> {
  return page.evaluate(async () => {
    await document.fonts.ready;for (const animation of document.getAnimations()) if (animation.effect?.getTiming().iterations !== Infinity) animation.finish();
    const modal = document.querySelector('dialog[open]')!,origin = modal.getBoundingClientRect();
    const inspect = (node: Element) => {
      const box = node.getBoundingClientRect(),style = getComputedStyle(node);
      return {tag: node.localName,text: [...node.childNodes].filter(child => child.nodeType === Node.TEXT_NODE).map(child => child.textContent).join('').trim(),
        box: [box.x-origin.x,box.y-origin.y,box.width,box.height].map(value => Math.round(value*100)/100),
        style: ['display','font-family','font-size','font-weight','line-height','color','background-color','margin-top','margin-bottom','padding-top','padding-right','padding-bottom','padding-left','border-top-width','border-top-color','border-radius','gap','overflow-x','overflow-y','min-height','height','-webkit-text-security'].map(key => style.getPropertyValue(key)),
        role: node.getAttribute('role'),
        ...(node instanceof HTMLInputElement ? {name: node.name,type: node.type,value: node.value,checked: node.checked,disabled: node.disabled,readOnly: node.readOnly,required: node.required,placeholder: node.placeholder,autocomplete: node.autocomplete} : {}),
        ...(node instanceof HTMLTextAreaElement ? {name: node.name,value: node.value,rows: node.rows,spellcheck: node.spellcheck,disabled: node.disabled,required: node.required,placeholder: node.placeholder,autocomplete: node.autocomplete} : {}),
        ...(node instanceof HTMLSelectElement ? {value: node.value,disabled: node.disabled,options: [...node.options].map(option => [option.value,option.textContent])} : {}),
        ...(node instanceof HTMLButtonElement ? {type: node.type,label: node.getAttribute('aria-label'),disabled: node.disabled,pressed: node.getAttribute('aria-pressed'),controls: node.hasAttribute('aria-controls') ? modal.querySelector(`#${node.getAttribute('aria-controls')}`)?.localName : null} : {})};
    };
    const meaningful = [...modal.querySelectorAll('h2,article,strong,label,input,textarea,select,summary,p,button,[role=status],[role=alert],.pui-section-heading,.pui-modal-footer')].filter(node => !node.closest('[hidden]'));
    return {modal: inspect(modal),meaningful: meaningful.map(inspect),svg: [...modal.querySelectorAll('svg')].map(svg => svg.innerHTML),
      form: {count: modal.querySelectorAll('form').length,fieldNames: [...modal.querySelectorAll('form input,form select,form textarea')].map(node => (node as HTMLInputElement).name)},overflow: [modal.clientWidth,modal.scrollWidth,modal.clientHeight,modal.scrollHeight]};
  });
}

test('bounded flow, stacked card, paragraph status and secret label compose original native nodes without DOM or sizing ports',async ({page}) => {
  await page.goto('/tests/fixture.html');
  const value = await page.evaluate(async () => {
    const path = '/src/parts/index.ts';const p = await import(path);const toggles: boolean[] = [];
    const json = p.createTextareaPart({purpose: 'json',label: 'Arguments',value: '[]'}),secret = p.createTextareaPart({purpose: 'secret',name: 'env',value: '{"TOKEN":"private"}'});
    const label = p.createSecretLabelPart({label: 'Environment',control: secret,onToggle(value: boolean) {toggles.push(value);}});
    const check = p.createCheckboxPart({label: 'Clear saved values',hidden: true});check.update({label: 'Clear saved values',hidden: false});
    const flow = p.createStackPart({hidden: true,children: [label,secret,json,check]});flow.update({hidden: false});
    const heading = p.createCardHeadingPart({children: [p.createTextPart({role: 'strong',text: 'Tools'})]});
    const status = p.createStatusPart({presentation: 'paragraph',message: 'Unavailable',tone: 'error'});
    const card = p.createCardPart({purpose: 'stacked',children: [heading,status]});
    const sectionHeading = p.createSectionHeadingPart({children: [p.createTextPart({text: 'Add connection'})]});
    const section = p.createSeparatedSectionPart({children: [sectionHeading,p.createFormPart({children: [flow]})]});
    const root = p.createStackPart({children: [card,section]}),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,root);
    const button = mount.querySelector('button')!,textarea = mount.querySelector('textarea')!;button.click();const revealed = {pressed: button.getAttribute('aria-pressed'),controls: button.getAttribute('aria-controls') === textarea.id,label: button.textContent};
    label.update({label: 'Environment',revealed: false});
    const result = {revealed,toggles,hidden: mount.querySelector('form > div')!.hasAttribute('hidden'),rows: [...mount.querySelectorAll('textarea')].map(node => [node.rows,node.spellcheck]),
      status: {tag: mount.querySelector('[role=status]')!.localName,color: getComputedStyle(mount.querySelector('[role=status]')!).color},
      card: mount.querySelector('article')!.className,heading: mount.querySelector('article > div')!.className,button: {label: button.textContent,pressed: button.getAttribute('aria-pressed')},
      leaks: [label,flow,card,status].some(part => Object.values(part).some(value => value instanceof Node))};tree.destroy();return result;
  });
  expect(value).toMatchObject({revealed: {pressed: 'true',controls: true,label: 'Hide'},toggles: [true],hidden: false,rows: [[3,false],[3,false]],status: {tag: 'p'},
    card: 'pui-connection-card',heading: 'pui-connection-card-heading',button: {label: 'Show',pressed: 'false'},leaks: false});
});

const scenarios: Record<string,Options> = {loading: {cold: true},empty: {entries: []},http: {},editingHTTP: {editor: httpEditor},editingStdio: {editor: stdioEditor},
  disabled: {state: {disabled: true},editor: httpEditor},errors: {state: {error: 'Inventory unavailable',formError: 'Invalid connection'}},
  connectionError: {entries: [{...entries[0],enabled: true,status: 'error',statusLabel: 'Authentication failed',error: 'Sign in again.'}]}};
for (const appearance of ['light','dark'] as const) for (const [name,options] of Object.entries(scenarios)) test(`${appearance} MCP ${name} composition preserves the actual Connections opening`,async ({page}) => {
  await page.emulateMedia({colorScheme: appearance === 'dark' ? 'light' : 'dark'});
  await openMCP(page,true,{...options,appearance,applicationContext: true});const old = await presentation(page);
  await openMCP(page,false,{...options,appearance,applicationContext: true});expect(await presentation(page)).toEqual(old);
  await expect(page.getByRole('dialog')).toHaveCSS('background-color',appearance === 'dark' ? 'rgb(34, 37, 42)' : 'rgb(255, 255, 255)');
});

for (const viewport of [{width: 900,height: 568},{width: 390,height: 844}]) test(`MCP ${viewport.width} preserves responsive editor and expanded OAuth disclosure geometry`,async ({page}) => {
  await page.setViewportSize(viewport);await openMCP(page,true,{editor: httpEditor,applicationContext: true});await page.getByText('OAuth settings (optional)',{exact: true}).click();const old = await presentation(page);
  await openMCP(page,false,{editor: httpEditor,applicationContext: true});await page.getByText('OAuth settings (optional)',{exact: true}).click();expect(await presentation(page)).toEqual(old);
});

test('switching transport preserves both drafts while only native active controls validate and submit raw JSON',async ({page}) => {
  await openMCP(page,false,{pending: ['save']});await page.getByRole('textbox',{name: 'Name',exact: true}).fill('draft-tools');await page.getByRole('textbox',{name: 'Server URL',exact: true}).fill('https://draft.example/mcp');
  await page.getByLabel('Bearer token (optional)',{exact: true}).fill(' HTTP secret ');await page.getByRole('checkbox',{name: 'Sign in with OAuth',exact: true}).check();
  await page.getByRole('combobox',{name: 'Connection type',exact: true}).click();await page.getByRole('option',{name: 'Local command (stdio)',exact: true}).click();
  await expect(page.getByRole('textbox',{name: 'Installed executable',exact: true})).toHaveAttribute('required','');
  expect(await page.locator('input[name=url]').isDisabled()).toBe(true);
  await page.getByRole('textbox',{name: 'Installed executable',exact: true}).fill(' /opt/bin/mcp ');
  const args = '["--token", "中文"]',env = '{"TOKEN":"private",\n"LANG":"zh_CN"}';
  await page.getByRole('textbox',{name: 'Arguments (JSON array)',exact: true}).fill(args);await page.getByRole('textbox',{name: 'Environment overrides (JSON object, optional)',exact: true}).fill(env);
  await page.getByRole('button',{name: 'Save connection',exact: true}).click();
  expect(await page.evaluate(() => window.mcpPartsHarness.values)).toEqual([{action: 'save',value: {name: 'draft-tools',type: 'stdio',url: 'https://draft.example/mcp',oauth: true,oauthClientId: '',oauthScope: '',command: '/opt/bin/mcp',args,enabled: true,bearerToken: 'HTTP secret',clearBearerToken: false,env,clearEnv: false}}]);
});

test('environment reveal and ordinary snapshots preserve native field, private draft, caret and focus',async ({page}) => {
  await openMCP(page,false,{editor: stdioEditor});const env = page.getByRole('textbox',{name: 'Environment overrides (JSON object, optional)',exact: true});await env.fill('{"TOKEN":"Unsaved 中文"}');
  await page.getByRole('button',{name: 'Show',exact: true}).click();await expect(page.getByRole('button',{name: 'Hide',exact: true})).toHaveAttribute('aria-pressed','true');
  await env.evaluate(node => {const control = node as HTMLTextAreaElement;control.focus();control.setSelectionRange(3,12);window.mcpPartsHarness.control = control;});
  await page.evaluate(() => {const h = window.mcpPartsHarness;h.session.update({formError: 'Keep this draft'});h.session.setConnections([...h.entries].reverse());});
  await expect(env).toHaveValue('{"TOKEN":"Unsaved 中文"}');expect(await env.evaluate(node => ({same: node === window.mcpPartsHarness.control,focus: node === document.activeElement,selection: [(node as HTMLTextAreaElement).selectionStart,(node as HTMLTextAreaElement).selectionEnd]}))).toEqual({same: true,focus: true,selection: [3,12]});
  await expect(page.getByRole('button',{name: 'Hide',exact: true})).toHaveAttribute('aria-pressed','true');
});

test('explicit edit resets secrets, clear flags, reveal, pending and the immutable editing name; obsolete save errors stay retired',async ({page}) => {
  await openMCP(page,false,{editor: stdioEditor,pending: ['save']});const env = page.getByRole('textbox',{name: 'Environment overrides (JSON object, optional)',exact: true});
  await env.fill('{"TOKEN":"first secret"}');await page.getByRole('button',{name: 'Show',exact: true}).click();await page.getByRole('checkbox',{name: 'Clear saved environment overrides',exact: true}).check();await page.getByRole('button',{name: 'Save connection',exact: true}).click();
  await page.evaluate(editor => window.mcpPartsHarness.session.edit(editor),httpEditor);
  await expect(page.getByRole('textbox',{name: 'Name',exact: true})).toHaveAttribute('readonly','');await expect(page.getByRole('textbox',{name: 'Server URL',exact: true})).toBeFocused();await expect(page.getByRole('button',{name: 'Save connection',exact: true})).toBeEnabled();
  await page.evaluate(() => window.mcpPartsHarness.releases[0]!.resolve({ok: false,error: 'Retired failure'}));
  expect(await page.evaluate(() => window.mcpPartsHarness.session.read())).toEqual({name: httpEditor.name,type: 'http',url: httpEditor.url,oauth: true,oauthClientId: 'registered-client',oauthScope: 'read write',command: '',args: '[]',enabled: true,bearerToken: '',clearBearerToken: false,env: '',clearEnv: false});
  await expect(page.locator('dialog[open] form [role=alert]')).toHaveText('');
  await page.getByRole('button',{name: 'New connection',exact: true}).click();await expect(page.getByRole('textbox',{name: 'Name',exact: true})).not.toHaveAttribute('readonly');await expect(page.getByRole('textbox',{name: 'Name',exact: true})).toBeFocused();
});

test('one pending save survives availability updates, reports form errors without closing and keeps its drafts after success',async ({page}) => {
  await openMCP(page,false,{editor: httpEditor,pending: ['save']});await page.getByRole('button',{name: 'Save connection',exact: true}).click();
  await page.evaluate(() => {const h = window.mcpPartsHarness;h.session.update({disabled: true});h.session.update({disabled: false});document.querySelector('dialog[open] form')!.dispatchEvent(new SubmitEvent('submit',{bubbles: true,cancelable: true}));});
  await expect(page.getByRole('button',{name: 'Save connection',exact: true})).toBeDisabled();expect(await page.evaluate(() => window.mcpPartsHarness.values.filter(value => value.action === 'save').length)).toBe(1);
  await page.evaluate(() => window.mcpPartsHarness.releases[0]!.resolve({ok: false,error: 'JSON rejected by controller'}));await expect(page.locator('dialog[open] form [role=alert]')).toHaveText('JSON rejected by controller');
  await page.getByRole('button',{name: 'Save connection',exact: true}).click();await page.evaluate(() => window.mcpPartsHarness.releases[1]!.resolve({ok: true}));await expect(page.getByRole('dialog',{name: 'Connections',exact: true})).toBeVisible();await expect(page.getByRole('textbox',{name: 'Name',exact: true})).toHaveValue(httpEditor.name);
});

test('keyed connection actions retain pending and immutable original targets across reorder and metadata snapshots',async ({page}) => {
  await openMCP(page,false,{pending: ['mcp-toggle']});const card = page.locator('article').filter({has: page.getByText('workspace-tools',{exact: true})}),toggle = card.getByRole('button',{name: 'Disable',exact: true});
  await toggle.evaluate(node => {window.mcpPartsHarness.button = node as HTMLButtonElement;});await toggle.click();await expect(toggle).toBeDisabled();
  await page.evaluate(() => {const h = window.mcpPartsHarness;h.session.setConnections([...h.entries].reverse().map(entry => ({...entry,statusLabel: 'New metadata'})));});
  expect(await toggle.evaluate(node => node === window.mcpPartsHarness.button)).toBe(true);await expect(toggle).toBeDisabled();
  expect(await page.evaluate(() => window.mcpPartsHarness.values)).toEqual([{action: 'mcp-toggle',value: {name: 'workspace-tools'}}]);
  await page.evaluate(() => window.mcpPartsHarness.releases[0]!.resolve({ok: false,error: 'Enable state rejected'}));await expect(card.locator('[role=alert]')).toHaveText('Enable state rejected');await expect(toggle).toBeEnabled();
  await page.evaluate(() => window.mcpPartsHarness.session.setConnections([]));await expect(page.locator('article')).toHaveCount(0);
});

test('refresh and New share the existing auxiliary guard, but New still explicitly resets the editor',async ({page}) => {
  await openMCP(page,false,{editor: httpEditor,pending: ['refresh']});await page.getByRole('button',{name: 'Refresh',exact: true}).click();await page.getByRole('button',{name: 'Refresh',exact: true}).click();
  await page.getByRole('button',{name: 'New connection',exact: true}).click();await expect(page.getByRole('textbox',{name: 'Name',exact: true})).toHaveValue('');
  expect(await page.evaluate(() => window.mcpPartsHarness.values)).toEqual([{action: 'refresh'}]);
  await page.evaluate(() => window.mcpPartsHarness.releases[0]!.resolve({ok: false,error: 'Refresh rejected'}));await expect(page.locator('dialog[open] > div > div > [role=alert]')).toHaveText('Refresh rejected');
});

test('clear-token and clear-secrets ports are explicit, and closing wipes retained private native values and late outcomes',async ({page}) => {
  await openMCP(page,false,{editor: httpEditor,pending: ['save']});await page.getByLabel('Bearer token (optional)',{exact: true}).fill('Private token');await page.evaluate(() => window.mcpPartsHarness.session.clearBearerToken());await expect(page.getByLabel('Bearer token (optional)',{exact: true})).toHaveValue('');
  await page.getByLabel('Bearer token (optional)',{exact: true}).fill('Private token');await page.getByRole('button',{name: 'Save connection',exact: true}).click();await page.evaluate(() => window.mcpPartsHarness.session.close());
  await expect(page.locator('dialog')).toHaveCount(0);await expect(page.locator('#mcp-opener')).toBeFocused();
  await page.evaluate(() => {const h = window.mcpPartsHarness;h.releases[0]!.resolve({ok: false,error: 'Late failure'});h.session.update({error: 'Late snapshot'});h.session.edit();h.session.setConnections([]);h.session.clearSecrets();h.session.destroy();});
  expect(await page.evaluate(() => ({read: window.mcpPartsHarness.session.read(),closed: window.mcpPartsHarness.closed,open: window.mcpPartsHarness.session.isOpen()}))).toMatchObject({read: {bearerToken: '',env: ''},closed: 1,open: false});
});
