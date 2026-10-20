import {test,expect,type Page} from '@playwright/test';

type Result = {ok: true} | {ok: false;error: string};
interface State {error?: string;formError?: string;disabled?: boolean;connectionHint?: string;oauthAvailable?: boolean}
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

async function openMCP(page: Page,options: Options = {}): Promise<void> {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async ({options,entries}) => {
    const appearance = options.appearance ?? 'light';document.documentElement.classList.add('pui');document.documentElement.dataset.appearance = appearance;document.body.dataset.appearance = appearance;
    const opener = document.createElement('button');opener.id = 'mcp-opener';opener.textContent = 'Connections opener';document.body.append(opener);opener.focus();
    const mount = document.body.appendChild(document.createElement('div'));
    // Geometry oracles use the actual application's native flex-parent context.
    // Standalone behavior tests continue to use an ordinary checked mount.
    if (options.applicationContext) mount.classList.add('pui-app');
    const h = {initial: options.state ?? {},entries: options.entries ?? entries,values: [],releases: [],closed: 0} as unknown as Harness;
    const action = (name: string,value?: unknown): Result | Promise<Result> => {
      h.values.push({action: name,...(value === undefined ? {} : {value})});
      return options.pending?.includes(name) ? new Promise(resolve => h.releases.push({action: name,resolve})) : {ok: true};
    };
    const callbacks = {onSubmit: (draft: Draft) => action('save',draft),onConnectionAction: (name: string,target: {name: string}) => action(name,target),
      onRefresh: () => action('refresh'),onNew: () => action('new'),onClose() {h.closed++;}};
    const path = '/examples/assemblies/mcp.ts';const {mountMCPConnections} = await import(path);h.session = mountMCPConnections(mount,h.initial,callbacks,{appearance});
    if (!options.cold) h.session.setConnections(h.entries);
    if (options.editor) {
      // Native focus scrolling must use the painted inventory, as it does when
      // Desk's loaded connection list is edited by its user.
      await document.fonts.ready;
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      h.session.edit(options.editor);
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    }
    window.mcpPartsHarness = h;
  },{options,entries});
  await expect(page.getByRole('dialog',{name: 'Connections',exact: true})).toBeVisible();
}

test('unavailable OAuth hides new login without stripping existing credentials from edited connections',async ({page}) => {
  await openMCP(page,{state: {oauthAvailable: false,connectionHint: 'Commands and environment variables run on the server.'},editor: httpEditor});
  await expect(page.getByRole('dialog')).toContainText('environment variables run on the server');
  await expect(page.getByRole('button',{name: 'Sign in again',exact: true})).toHaveCount(0);
  await expect(page.getByRole('button',{name: 'Sign out',exact: true})).toBeVisible();
  await expect(page.getByRole('checkbox',{name: 'Sign in with OAuth',exact: true})).toBeChecked();
  await expect(page.getByRole('checkbox',{name: 'Sign in with OAuth',exact: true})).toBeEnabled();
  await page.getByRole('button',{name: 'Save connection',exact: true}).click();
  const values = await page.evaluate(() => window.mcpPartsHarness.values);
  expect(values.find(value => value.action === 'save')?.value).toMatchObject({oauth: true,bearerToken: '',oauthClientId: 'registered-client'});
});

test('an existing OAuth connection can explicitly switch to a bearer token when new sign-in is unavailable',async ({page}) => {
  await openMCP(page,{state: {oauthAvailable: false},editor: httpEditor});
  await page.getByRole('checkbox',{name: 'Sign in with OAuth',exact: true}).uncheck();
  await page.getByRole('textbox',{name: 'Bearer token (optional)',exact: true}).fill('replacement-token');
  await page.getByRole('button',{name: 'Save connection',exact: true}).click();
  expect(await page.evaluate(() => window.mcpPartsHarness.values.find(value => value.action === 'save')?.value)).toMatchObject({oauth: false,bearerToken: 'replacement-token'});
});


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



test('switching transport preserves both drafts while only native active controls validate and submit raw JSON',async ({page}) => {
  await openMCP(page,{pending: ['save']});await page.getByRole('textbox',{name: 'Name',exact: true}).fill('draft-tools');await page.getByRole('textbox',{name: 'Server URL',exact: true}).fill('https://draft.example/mcp');
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
  await openMCP(page,{editor: stdioEditor});const env = page.getByRole('textbox',{name: 'Environment overrides (JSON object, optional)',exact: true});await env.fill('{"TOKEN":"Unsaved 中文"}');
  await page.getByRole('button',{name: 'Show',exact: true}).click();await expect(page.getByRole('button',{name: 'Hide',exact: true})).toHaveAttribute('aria-pressed','true');
  await expect(env).toHaveCSS('-webkit-text-security','none');
  await env.evaluate(node => {const control = node as HTMLTextAreaElement;control.focus();control.setSelectionRange(3,12);window.mcpPartsHarness.control = control;});
  await page.evaluate(() => {const h = window.mcpPartsHarness;h.session.update({formError: 'Keep this draft'});h.session.setConnections([...h.entries].reverse());});
  await expect(env).toHaveValue('{"TOKEN":"Unsaved 中文"}');expect(await env.evaluate(node => ({same: node === window.mcpPartsHarness.control,focus: node === document.activeElement,selection: [(node as HTMLTextAreaElement).selectionStart,(node as HTMLTextAreaElement).selectionEnd]}))).toEqual({same: true,focus: true,selection: [3,12]});
  await expect(page.getByRole('button',{name: 'Hide',exact: true})).toHaveAttribute('aria-pressed','true');
  await expect(env).toHaveCSS('-webkit-text-security','none');
});

test('explicit edit resets secrets, clear flags, reveal, pending and the immutable editing name; obsolete save errors stay retired',async ({page}) => {
  await openMCP(page,{editor: stdioEditor,pending: ['save']});const env = page.getByRole('textbox',{name: 'Environment overrides (JSON object, optional)',exact: true});
  await env.fill('{"TOKEN":"first secret"}');await page.getByRole('button',{name: 'Show',exact: true}).click();await page.getByRole('checkbox',{name: 'Clear saved environment overrides',exact: true}).check();await page.getByRole('button',{name: 'Save connection',exact: true}).click();
  await page.evaluate(editor => window.mcpPartsHarness.session.edit(editor),httpEditor);
  await expect(page.locator('textarea[name=env]')).toHaveCSS('-webkit-text-security','disc');
  await expect(page.getByRole('textbox',{name: 'Name',exact: true})).toHaveAttribute('readonly','');await expect(page.getByRole('textbox',{name: 'Server URL',exact: true})).toBeFocused();await expect(page.getByRole('button',{name: 'Save connection',exact: true})).toBeEnabled();
  await page.evaluate(() => window.mcpPartsHarness.releases[0]!.resolve({ok: false,error: 'Retired failure'}));
  expect(await page.evaluate(() => window.mcpPartsHarness.session.read())).toEqual({name: httpEditor.name,type: 'http',url: httpEditor.url,oauth: true,oauthClientId: 'registered-client',oauthScope: 'read write',command: '',args: '[]',enabled: true,bearerToken: '',clearBearerToken: false,env: '',clearEnv: false});
  await expect(page.locator('dialog[open] form [role=alert]')).toHaveText('');
  await page.getByRole('button',{name: 'New connection',exact: true}).click();await expect(page.getByRole('textbox',{name: 'Name',exact: true})).not.toHaveAttribute('readonly');await expect(page.getByRole('textbox',{name: 'Name',exact: true})).toBeFocused();
});

test('one pending save survives availability updates, reports form errors without closing and keeps its drafts after success',async ({page}) => {
  await openMCP(page,{editor: httpEditor,pending: ['save']});await page.getByRole('button',{name: 'Save connection',exact: true}).click();
  await page.evaluate(() => {const h = window.mcpPartsHarness;h.session.update({disabled: true});h.session.update({disabled: false});document.querySelector('dialog[open] form')!.dispatchEvent(new SubmitEvent('submit',{bubbles: true,cancelable: true}));});
  await expect(page.getByRole('button',{name: 'Save connection',exact: true})).toBeDisabled();expect(await page.evaluate(() => window.mcpPartsHarness.values.filter(value => value.action === 'save').length)).toBe(1);
  await page.evaluate(() => window.mcpPartsHarness.releases[0]!.resolve({ok: false,error: 'JSON rejected by controller'}));await expect(page.locator('dialog[open] form [role=alert]')).toHaveText('JSON rejected by controller');
  await page.getByRole('button',{name: 'Save connection',exact: true}).click();await page.evaluate(() => window.mcpPartsHarness.releases[1]!.resolve({ok: true}));await expect(page.getByRole('dialog',{name: 'Connections',exact: true})).toBeVisible();await expect(page.getByRole('textbox',{name: 'Name',exact: true})).toHaveValue(httpEditor.name);
});

test('keyed connection actions retain pending and immutable original targets across reorder and metadata snapshots',async ({page}) => {
  await openMCP(page,{pending: ['mcp-toggle']});const card = page.locator('article').filter({has: page.getByText('workspace-tools',{exact: true})}),toggle = card.getByRole('button',{name: 'Disable',exact: true});
  await toggle.evaluate(node => {window.mcpPartsHarness.button = node as HTMLButtonElement;});await toggle.click();await expect(toggle).toBeDisabled();
  await page.evaluate(() => {const h = window.mcpPartsHarness;h.session.setConnections([...h.entries].reverse().map(entry => ({...entry,statusLabel: 'New metadata'})));});
  expect(await toggle.evaluate(node => node === window.mcpPartsHarness.button)).toBe(true);await expect(toggle).toBeDisabled();
  expect(await page.evaluate(() => window.mcpPartsHarness.values)).toEqual([{action: 'mcp-toggle',value: {name: 'workspace-tools'}}]);
  await page.evaluate(() => window.mcpPartsHarness.releases[0]!.resolve({ok: false,error: 'Enable state rejected'}));await expect(card.locator('[role=alert]')).toHaveText('Enable state rejected');await expect(toggle).toBeEnabled();
  await page.evaluate(() => window.mcpPartsHarness.session.setConnections([]));await expect(page.locator('article')).toHaveCount(0);
});

test('refresh and New share the existing auxiliary guard, but New still explicitly resets the editor',async ({page}) => {
  await openMCP(page,{editor: httpEditor,pending: ['refresh']});await page.getByRole('button',{name: 'Refresh',exact: true}).click();await page.getByRole('button',{name: 'Refresh',exact: true}).click();
  await page.getByRole('button',{name: 'New connection',exact: true}).click();await expect(page.getByRole('textbox',{name: 'Name',exact: true})).toHaveValue('');
  expect(await page.evaluate(() => window.mcpPartsHarness.values)).toEqual([{action: 'refresh'}]);
  await page.evaluate(() => window.mcpPartsHarness.releases[0]!.resolve({ok: false,error: 'Refresh rejected'}));await expect(page.locator('dialog[open] > div > div > [role=alert]')).toHaveText('Refresh rejected');
});

test('clear-token and clear-secrets ports are explicit, and closing wipes retained private native values and late outcomes',async ({page}) => {
  await openMCP(page,{editor: httpEditor,pending: ['save']});await page.getByLabel('Bearer token (optional)',{exact: true}).fill('Private token');await page.evaluate(() => window.mcpPartsHarness.session.clearBearerToken());await expect(page.getByLabel('Bearer token (optional)',{exact: true})).toHaveValue('');
  await page.getByLabel('Bearer token (optional)',{exact: true}).fill('Private token');await page.getByRole('button',{name: 'Save connection',exact: true}).click();await page.evaluate(() => window.mcpPartsHarness.session.close());
  await expect(page.locator('dialog')).toHaveCount(0);await expect(page.locator('#mcp-opener')).toBeFocused();
  await page.evaluate(() => {const h = window.mcpPartsHarness;h.releases[0]!.resolve({ok: false,error: 'Late failure'});h.session.update({error: 'Late snapshot'});h.session.edit();h.session.setConnections([]);h.session.clearSecrets();h.session.destroy();});
  expect(await page.evaluate(() => ({read: window.mcpPartsHarness.session.read(),closed: window.mcpPartsHarness.closed,open: window.mcpPartsHarness.session.isOpen()}))).toMatchObject({read: {bearerToken: '',env: ''},closed: 1,open: false});
});

test('a composed MCP dialog shares the application theme and retires secrets and pending operations when its parent is destroyed',async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async ({entries,stdioEditor}) => {
    const recipePath = '/examples/assemblies/mcp.ts',partsPath = '/src/parts/index.ts';const {composeMCPConnections} = await import(recipePath),p = await import(partsPath);
    const h = {initial: {},entries,values: [],releases: [],closed: 0} as unknown as Harness;
    const session = composeMCPConnections({}, {onSubmit(draft: Draft) {h.values.push({action: 'save',value: draft});return new Promise<Result>(resolve => h.releases.push({action: 'save',resolve}));},onClose() {h.closed++;}});
    h.session = session;const mount = document.body.appendChild(document.createElement('div'));
    h.shared = p.mountParts(mount,p.createStackPart({children: [p.createTextPart({text: 'Application body'}),session.part]}),{appearance: 'light'});
    session.open();session.setConnections(entries);session.edit(stdioEditor);window.mcpPartsHarness = h;
  },{entries,stdioEditor});
  const env = page.getByRole('textbox',{name: 'Environment overrides (JSON object, optional)',exact: true});await env.fill('{"TOKEN":"private shared draft"}');
  await env.evaluate(node => {const control = node as HTMLTextAreaElement;window.mcpPartsHarness.control = control;control.focus();control.setSelectionRange(2,9);});
  await page.evaluate(() => window.mcpPartsHarness.shared!.setAppearance('dark'));await expect(page.getByRole('dialog')).toHaveCSS('background-color','rgb(34, 37, 42)');await expect(env).toBeFocused();
  expect(await env.evaluate(node => ({same: node === window.mcpPartsHarness.control,selection: [(node as HTMLTextAreaElement).selectionStart,(node as HTMLTextAreaElement).selectionEnd]}))).toEqual({same: true,selection: [2,9]});
  await page.getByRole('button',{name: 'Save connection',exact: true}).click();await page.evaluate(() => window.mcpPartsHarness.shared!.destroy());
  const value = await page.evaluate(async () => {
    const h = window.mcpPartsHarness;h.releases[0]!.resolve({ok: false,error: 'Retired write failure'});await new Promise(resolve => setTimeout(resolve,0));h.session.update({error: 'Late snapshot'});h.session.setConnections([]);h.session.edit();h.session.fail('Late failure');h.session.destroy();
    return {closed: h.closed,open: h.session.isOpen(),secret: h.control!.value,draft: h.session.read()};
  });
  expect(value).toMatchObject({closed: 1,open: false,secret: '',draft: {bearerToken: '',env: ''}});await expect(page.locator('dialog,input,textarea')).toHaveCount(0);
});
