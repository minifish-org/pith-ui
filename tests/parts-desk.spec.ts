import {test,expect,type Page} from '@playwright/test';
import type {Application} from '../src/app/index.js';

interface DeskHarness {app: Application;events: boolean[];calls: string[];old?: {isOpen(): boolean;close(): void;destroy(): void};nested?: {isOpen(): boolean;close(): void;destroy(): void}}
declare global {interface Window {deskPartsHarness: DeskHarness}}
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';

async function setup(page: Page,old: boolean,appearance: 'light'|'dark' = 'light'): Promise<void> {
  await page.goto('/tests/fixture.html');
  await page.emulateMedia({colorScheme: appearance === 'dark' ? 'light' : 'dark'});
  await page.evaluate(async ({old,appearance}) => {
    // The fixture's preview scope would shadow the old application's HTML
    // appearance owner; Desk itself has one application theme owner.
    document.body.classList.remove('pui');
    const mount = document.body.appendChild(document.createElement('div')),events: boolean[] = [],calls: string[] = [];
    const options = {appearance,brand: {name: 'Pith',qualifier: 'Desk',mark: {symbol: 'pith',alt: ''}},onUIStateChange(state: {hasModal: boolean}) {events.push(state.hasModal);},workspace: {onBusyAction(key: string) {calls.push(key);},onMessageAction(target: {action: string}) {calls.push(target.action);},onCopyCode() {calls.push('code');}}};
    const path = old ? '/src/app/index.ts' : '/examples/assemblies/desk.ts',module = await import(path);
    const app = old ? module.createApplication(mount,options) : module.mountDesk(mount,options);
    window.deskPartsHarness = {app,events,calls};
  },{old,appearance});
}

async function banners(page: Page): Promise<unknown> {
  return page.evaluate(() => {
    const measure = (node: Element) => {const style = getComputedStyle(node);return {tag: node.localName,classes: [...node.classList].sort(),text: node.textContent?.trim(),hidden: (node as HTMLElement).hidden,role: node.getAttribute('role'),children: [...node.children].map(child => ({tag: child.localName,classes: [...child.classList].sort(),text: child.textContent})),
      style: ['display','font-size','font-weight','line-height','color','background-color','border-top-width','border-top-style','border-top-color','border-radius','padding-top','padding-right','padding-bottom','padding-left','margin-bottom','gap','align-items','justify-content','white-space','overflow-wrap'].map(property => style.getPropertyValue(property))};};
    return ['.pui-workspace-busy','.pui-workspace-busy > span','.pui-workspace-busy > button','.pui-inline-error'].map(selector => measure(document.querySelector(selector)!));
  });
}

test('small status/action and banner parts preserve the native old row without content generation or style escapes',async ({page}) => {
  await setup(page,true);await page.evaluate(() => window.deskPartsHarness.app.workspace.updateShell({busy: {key: 'running',message: 'A task is running 中文',actionLabel: 'Open running conversation'},error: {message: 'Failure\nDetails'}}));const before = await banners(page);
  const value = await page.evaluate(async () => {
    window.deskPartsHarness.app.destroy();const path = '/src/parts/index.ts',p = await import(path);
    const label = p.createTextPart({text: 'A task is running 中文'}),action = p.createButtonPart({variant: 'text-action',label: 'Open running conversation'});
    const row = p.createStatusActionsPart({children: [label,action]}),error = p.createFeedbackPart({presentation: 'banner',tone: 'error',message: 'Failure\nDetails'});
    const mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,p.createStackPart({children: [row,error]}),{appearance: 'light'});
    let invalid = false;try {row.update({hidden: 'false'});} catch {invalid = true;}
    const valid = p.createTextPart({text: 'Reusable'});let foreign = false;try {p.createStatusActionsPart({children: [valid,document.createElement('div')]});} catch {foreign = true;}
    const reusable = document.body.appendChild(document.createElement('div')),childTree = p.mountParts(reusable,valid);const retained = reusable.textContent === 'Reusable';childTree.destroy();
    return {invalid,foreign,retained,leaks: [row,error,action].some(part => Object.values(part).some(value => value instanceof Node)),tree: !!tree};
  });expect(await banners(page)).toEqual(before);expect(value).toEqual({invalid: true,foreign: true,retained: true,leaks: false,tree: true});
});

test('a frame reports only changes to its own modal descendants and retires the final true state',async ({page}) => {
  await page.goto('/tests/fixture.html');const result = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path),states: boolean[] = [];
    const dialog = p.createDialogPart({title: 'Owned',children: []}),frame = p.createFramePart({children: [dialog],onModalChange(open: boolean) {states.push(open);}});
    const mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,frame);
    const other = document.body.appendChild(document.createElement('dialog'));other.showModal();await Promise.resolve();const unrelated = frame.hasModal();other.close();other.remove();
    dialog.open();const immediate = frame.hasModal();await Promise.resolve();dialog.update({title: 'Metadata'});await Promise.resolve();dialog.close();await Promise.resolve();dialog.open();await Promise.resolve();tree.destroy();tree.destroy();await Promise.resolve();
    return {unrelated,immediate,states,closed: frame.hasModal(),remaining: mount.childElementCount};
  });expect(result).toEqual({unrelated: false,immediate: true,states: [true,false,true,false],closed: false,remaining: 0});
});

test('topbar action layout retains its direct native children and the old fixed trailing alignment',async ({page}) => {
  await setup(page,true);const before = await page.locator('.pui-conversation-actions').evaluate(node => {const style = getComputedStyle(node);return ['display','align-items','gap','margin-left','flex-shrink','flex-wrap','justify-content'].map(property => style.getPropertyValue(property));});
  const after = await page.evaluate(async () => {
    window.deskPartsHarness.app.destroy();const path = '/src/parts/index.ts',p = await import(path);
    const action = p.createButtonPart({variant: 'toolbar-action',icon: 'compress',label: 'Compact'}),group = p.createTopbarActionsPart({children: [action]});
    // Auto margins resolve from the actual flex header width and preceding
    // breadcrumb. Keep that native frame context on both sides.
    const trigger = p.createButtonPart({variant: 'drawer-trigger',icon: 'menu',label: 'Open sidebar'}),breadcrumb = p.createBreadcrumbPart({ancestor: 'No workspace',current: 'New conversation'});
    const header = p.createTopbarPart({children: [trigger,breadcrumb,group]});
    const mount = document.body.appendChild(document.createElement('div'));p.mountParts(mount,p.createFramePart({children: [p.createSideRailPart({children: []}),p.createMainPart({children: [header]})]}));
    const node = mount.querySelector('.pui-conversation-actions')!,style = getComputedStyle(node);return {styles: ['display','align-items','gap','margin-left','flex-shrink','flex-wrap','justify-content'].map(property => style.getPropertyValue(property)),children: [...node.children].map(child => child.localName)};
  });expect(after).toEqual({styles: before,children: ['button']});
});

for (const appearance of ['light','dark'] as const) test(`${appearance} desk wiring preserves busy/current target and inline error visibility`,async ({page}) => {
  await setup(page,true,appearance);await page.evaluate(() => window.deskPartsHarness.app.workspace.updateShell({busy: {key: 'running',message: 'A task is running 中文',actionLabel: 'Open running conversation'},error: {message: 'Visible error 中文'}}));const before = await banners(page);
  await setup(page,false,appearance);await page.evaluate(() => window.deskPartsHarness.app.workspace.updateShell({busy: {key: 'running',message: 'A task is running 中文',actionLabel: 'Open running conversation'},error: {message: 'Visible error 中文'}}));expect(await banners(page)).toEqual(before);
  await page.getByRole('button',{name: 'Open running conversation',exact: true}).click();expect(await page.evaluate(() => window.deskPartsHarness.calls)).toEqual(['running']);
  await page.evaluate(() => window.deskPartsHarness.app.workspace.updateShell({busy: {key: 'next',message: 'Next task',actionLabel: 'Open next'},error: {message: 'Suppressed duplicate',hidden: true}}));await page.getByRole('button',{name: 'Open next',exact: true}).click();expect(await page.evaluate(() => window.deskPartsHarness.calls)).toEqual(['running','next']);
  await expect(page.locator('.pui-inline-error')).toBeHidden();await page.evaluate(() => window.deskPartsHarness.app.workspace.updateShell({busy: null,error: {message: ''}}));await expect(page.locator('.pui-workspace-busy')).toBeHidden();await expect(page.locator('.pui-workspace-busy > button')).toHaveText('Open next');
});

for (const kind of ['fixed','feature'] as const) test(`nested ${kind} openings win over the superseded outer replacement in the assembled tree`,async ({page}) => {
  for (const old of [true,false]) {
    await setup(page,old);const result = await page.evaluate(kind => {
      const {app} = window.deskPartsHarness,events: string[] = [];
      const open = (label: string,onClose: () => void) => kind === 'fixed' ? app.settings.openSettings({baseUrl: `https://${label}.example/v1`,hasApiKey: true},{onClose}) : app.workspace.openHistory({nodes: [{id: label,role: 'assistant',text: `${label} branch`,active: true}]},{onClose});
      let nested: ReturnType<typeof open>|undefined;
      const previous = open('old',() => {events.push('old');nested = open('nested',() => events.push('nested'));});
      const outer = open('outer',() => events.push('outer'));previous.fail('Stale error');previous.close();previous.destroy();
      const before = {oldOpen: previous.isOpen(),outerOpen: outer.isOpen(),nestedOpen: nested!.isOpen(),events: [...events],openDialogs: document.querySelectorAll('dialog[open]').length,
        current: kind === 'fixed' ? (nested as ReturnType<typeof app.settings.openSettings>).read().baseUrl : document.querySelector('.pui-branch-node p')?.textContent,staleError: document.body.textContent!.includes('Stale error')};
      nested!.close();nested!.destroy();app.destroy();return {before,after: {events,openDialogs: document.querySelectorAll('dialog[open]').length}};
    },kind);
    expect(result).toEqual({before: {oldOpen: false,outerOpen: false,nestedOpen: true,events: ['old','outer'],openDialogs: 1,current: kind === 'fixed' ? 'https://nested.example/v1' : 'nested branch',staleError: false},after: {events: ['old','outer','nested'],openDialogs: 0}});
  }
});

test('native dismissal retires the old feature before its close callback opens a replacement',async ({page}) => {
  for (const old of [true,false]) {
    await setup(page,old);await page.evaluate(() => {
      const h = window.deskPartsHarness;h.old = h.app.workspace.openHistory({nodes: []},{onClose() {h.calls.push('closed');h.nested = h.app.workspace.openHistory({nodes: [{id: 'nested',role: 'assistant',text: 'After dismissal',active: true}]});}});
    });await page.keyboard.press('Escape');await expect(page.locator('dialog[open]')).toHaveCount(1);await expect(page.locator('.pui-branch-node p')).toHaveText('After dismissal');
    expect(await page.evaluate(() => ({old: window.deskPartsHarness.old!.isOpen(),nested: window.deskPartsHarness.nested!.isOpen(),calls: window.deskPartsHarness.calls}))).toEqual({old: false,nested: true,calls: ['closed']});
  }
});

test('the feature loading slot is replaced across resources/history/custom while OAuth retains its own opening',async ({page}) => {
  for (const old of [true,false]) {
    await setup(page,old);const value = await page.evaluate(() => {
      const {app} = window.deskPartsHarness;
      const loading = app.resources.openEditorLoading({kind: 'skill'}),oauth = app.settings.openProviderLogin({phase: 'waiting',message: 'Waiting for sign-in'});
      const history = app.workspace.openHistory({nodes: []}),custom = app.settings.openConnectionLoading({editing: false});loading.fail('Retired loading');history.fail('Retired history');
      return {loading: loading.isOpen(),history: history.isOpen(),custom: custom.isOpen(),oauth: oauth.isOpen(),dialogs: document.querySelectorAll('dialog[open]').length,stale: document.body.textContent!.includes('Retired')};
    });expect(value).toEqual({loading: false,history: false,custom: true,oauth: true,dialogs: 2,stale: false});
  }
});

test('image modal state participates in the same frame and conversation changes close the viewer',async ({page}) => {
  for (const old of [true,false]) {
    await setup(page,old);await page.evaluate(png => {const {app} = window.deskPartsHarness;app.workspace.updateConversation({id: 'a',messages: [],working: false});app.files.openPreview({owner: {kind: 'artifact',id: 'a'},name: 'Diagram',path: '/diagram.png',capabilities: {},content: {kind: 'image',imageSrc: png,imageAlt: 'Diagram'}});},png);
    await page.locator('.pui-file-preview-body img').click();await expect(page.locator('.pui-image-viewer[open]')).toHaveCount(1);expect(await page.evaluate(() => window.deskPartsHarness.app.read().hasModal)).toBe(true);
    await page.evaluate(() => window.deskPartsHarness.app.workspace.updateConversation({id: 'b',messages: [],working: false}));await expect(page.locator('.pui-image-viewer[open]')).toHaveCount(0);
    await page.keyboard.press('Escape');await expect.poll(() => page.evaluate(() => window.deskPartsHarness.app.read().hasModal)).toBe(false);expect(await page.evaluate(() => window.deskPartsHarness.events)).toContain(true);
  }
});

test('root teardown wins over close callback reopening and exceptions without retaining owned dialogs',async ({page}) => {
  for (const old of [true,false]) {
    await setup(page,old);const value = await page.evaluate(() => {
      const {app} = window.deskPartsHarness;let reopened: ReturnType<typeof app.workspace.openHistory>|undefined;
      app.workspace.openHistory({nodes: []},{onClose() {reopened = app.workspace.openHistory({nodes: []});throw new Error('Cleanup failed');}});
      app.settings.openSettings({baseUrl: '',hasApiKey: false},{onClose() {throw new Error('Settings cleanup failed');}});app.destroy();app.destroy();
      return {open: app.read().hasModal,reopened: reopened?.isOpen(),dialogs: document.querySelectorAll('dialog[open]').length,frames: document.querySelectorAll('.pui-app').length};
    });expect(value).toEqual({open: false,reopened: false,dialogs: 0,frames: 0});
  }
});

test('opening the assembled file preview retains its related artifact inspector through focus and native dismissal',async ({page}) => {
  for (const old of [true,false]) {
    await setup(page,old);await page.evaluate(() => {
      const {app} = window.deskPartsHarness;
      app.files.updateArtifacts({ownerId: 'active',files: [{name: 'Report.md',path: '/workspace/Report.md'}],loading: false,error: '',copyMode: 'path'},{onPreview(target) {app.files.openPreview({...target,capabilities: {open: true},content: {kind: 'text',text: 'A retained preview'}},{onFileAction() {}});},onFileAction() {}});
    });await page.getByRole('button',{name: /^Conversation files/}).click();await page.getByRole('button',{name: 'Preview',exact: true}).click();
    await expect(page.locator('dialog[open]')).toHaveCount(1);await expect.poll(() => page.evaluate(() => window.deskPartsHarness.app.files.areArtifactsOpen())).toBe(true);
    await page.locator('dialog[open]').getByRole('button',{name: 'Open',exact: true}).click();expect(await page.evaluate(() => window.deskPartsHarness.app.files.areArtifactsOpen())).toBe(true);
    await page.keyboard.press('Escape');await expect(page.locator('dialog[open]')).toHaveCount(0);expect(await page.evaluate(() => window.deskPartsHarness.app.files.areArtifactsOpen())).toBe(true);
  }
});

test('related dialog updates preflight every borrowed handle without retiring the previous valid relationship',async ({page}) => {
  await page.goto('/tests/fixture.html');const value = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path),dialog = p.createDialogPart({title: 'Related preview',children: []}),trigger = p.createButtonPart({variant: 'counter',icon: 'file',label: 'Files',count: '1'});
    const heading = p.createInspectorHeadingPart({title: 'Files',count: '1',action: p.createButtonPart({variant: 'quiet-icon',icon: 'close',label: 'Close files'})});
    const inspector = p.createInspectorPart({heading,children: []}),group = p.createAnchoredGroupPart({trigger,surface: inspector}),free = p.createTextPart({text: 'Unchanged'});
    inspector.setRelatedDialogs([dialog]);let rejected = false;try {inspector.setRelatedDialogs([dialog,free]);} catch {rejected = true;}
    const mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,p.createFramePart({children: [group,dialog]}));inspector.open(trigger);dialog.open();await Promise.resolve();
    const retained = inspector.isOpen(),independent = document.body.appendChild(document.createElement('div')),freeTree = p.mountParts(independent,free),unowned = independent.textContent === 'Unchanged';
    tree.destroy();freeTree.destroy();inspector.setRelatedDialogs([]);return {rejected,retained,unowned,closed: !inspector.isOpen()};
  });expect(value).toEqual({rejected: true,retained: true,unowned: true,closed: true});
});

test('assembled scoped availability preserves unrelated navigation and allowed historical copies',async ({page}) => {
  for (const old of [true,false]) {
    await setup(page,old);await page.evaluate(() => {
      const {app,calls} = window.deskPartsHarness;
      app.workspace.updateNavigation({groups: [{id: 'running-work',name: 'Running work',path: '/running',selected: true,children: [{id: 'running',title: 'Running chat',active: true}]},{id: 'idle-work',name: 'Idle work',path: '/idle',selected: true,children: [{id: 'idle',title: 'Idle chat',active: false}]}],empty: null});
      app.workspace.updateConversation({id: 'running',working: true,messages: [{id: 'message',role: 'assistant',text: 'Saved response\n\n```ts\nconst ready = true;\n```',actions: {copy: 'Copy response'}}]});
      app.workspace.updateMessageAvailability({copy: false,edit: true,branch: true});
      app.workspace.updateAvailability({global: true,active: true,conversations: ['running'],workspaces: ['running-work']});
      calls.push('projected');
    });await expect(page.getByRole('button',{name: 'Choose model',exact: true})).toBeDisabled();
    await page.getByRole('button',{name: 'Actions for Idle chat',exact: true}).click();await expect(page.getByRole('menuitem',{name: 'Rename',exact: true})).toBeEnabled();await page.keyboard.press('Escape');
    await page.getByRole('button',{name: 'Actions for Running chat',exact: true}).click();await expect(page.getByRole('menuitem',{name: 'Rename',exact: true})).toBeDisabled();await page.keyboard.press('Escape');
    await expect(page.getByRole('button',{name: 'Copy response',exact: true})).toBeEnabled();await expect(page.getByRole('button',{name: 'Copy code',exact: true})).toBeEnabled();
    // Source-backed baseline: copy's isDisabled option controls pending and
    // restoration; it does not gate the supplied action. Keep that behavior.
    await page.evaluate(() => window.deskPartsHarness.app.workspace.updateAvailability({busy: true}));await page.getByRole('button',{name: 'Copy response',exact: true}).click();await page.getByRole('button',{name: 'Copy code',exact: true}).click();expect(await page.evaluate(() => window.deskPartsHarness.calls)).toEqual(['projected','copy','code']);
  }
});

test('native downloads retain exact names, delivery results and delayed or terminal URL cleanup',async ({page}) => {
  for (const old of [true,false]) {
    await setup(page,old);await page.clock.install();await page.clock.pauseAt(new Date());
    await page.evaluate(async () => {
      const h = window.deskPartsHarness,deliveries: Array<{name: string;href: string}> = [],revoked: string[] = [];
      const original = URL.revokeObjectURL.bind(URL);URL.revokeObjectURL = value => {revoked.push(value);original(value);};
      HTMLAnchorElement.prototype.click = function() {deliveries.push({name: this.download,href: this.href});};
      Object.assign(h,{deliveries,revoked,first: await h.app.downloadFile({blob: new Blob(['中文 result']),name: 'Report 中文.md'})});
    });await page.clock.runFor(29_999);expect(await page.evaluate(() => (window.deskPartsHarness as unknown as {revoked: string[]}).revoked)).toEqual([]);await page.clock.runFor(1);
    const value = await page.evaluate(async () => {
      const h = window.deskPartsHarness as DeskHarness & {deliveries: Array<{name: string;href: string}>;revoked: string[];first: unknown};
      const second = await h.app.downloadFile({blob: new Blob(['diagnostics']),name: 'diagnostics.json'});h.app.destroy();const late = await h.app.downloadFile({blob: new Blob(['late']),name: 'late.txt'});
      return {first: h.first,second,names: h.deliveries.map(value => value.name),urls: h.deliveries.every(value => value.href.startsWith('blob:')),revoked: h.revoked.length,unique: new Set(h.revoked).size,late};
    });expect(value).toEqual({first: {ok: true},second: {ok: true},names: ['Report 中文.md','diagnostics.json'],urls: true,revoked: 2,unique: 2,late: {ok: false,error: 'Application has been destroyed.'}});
  }
});

for (const appearance of ['light','dark'] as const) for (const width of [1280,390]) for (const mode of ['conversation','welcome'] as const) test(`${appearance} ${width} complete ${mode} frame retains the actual region layout`,async ({page}) => {
  await page.setViewportSize({width,height: 800});
  const project = async () => {await page.evaluate(({mode,png}) => {
    const {app} = window.deskPartsHarness;
    app.workspace.updateNavigation({groups: [{id: 'workspace',name: 'Workspace 中文',path: '/workspace',selected: true,children: [{id: 'active',title: 'Review project',active: true}]}],empty: null});
    app.workspace.updateShell({workspace: 'Workspace 中文',conversation: 'Review project',reconnecting: true,busy: mode === 'conversation' ? {key: 'running',message: 'A task is running in an overlapping folder.',actionLabel: 'Open running conversation'} : null,error: {message: mode === 'conversation' ? 'An inline failure\nwith retained details.' : ''}});
    app.workspace.updateWelcome({workspace: {name: 'Workspace 中文',path: '/workspace'},hasApiKey: true,hasConnections: true,modelName: 'Model A'});
    app.workspace.updateConversation({id: 'active',messages: mode === 'conversation' ? [{id: 'user',role: 'user',text: 'Review this project 中文',actions: {copy: true,edit: true}},{id: 'assistant',role: 'assistant',text: 'A **verified** response.\n\n```ts\nconst ready = true;\n```',actions: {copy: 'Copy response'}}] : [],working: false});
    app.workspace.updateComposer({action: 'send',actionDisabled: false,model: {label: 'Model A',description: 'provider / model-a'},thinking: {options: [{value: 'off',label: 'Thinking off'},{value: 'high',label: 'Thinking: high'}],value: 'high'}});
    app.workspace.resetDraft('Review project\nPreserve the current behavior.');
    app.workspace.updatePermission({mode: 'workspace',description: 'Workspace changes require approval.'});
    app.workspace.updateAttachments({items: mode === 'conversation' ? [{id: 'draft-image',name: 'Diagram.png',url: png}] : []});
    app.workspace.updateImageGuidance(mode === 'conversation' ? 'The selected model supports image attachments.' : '');
    app.workspace.updatePending({items: mode === 'conversation' ? [{id: 'pending',text: 'Queued follow-up 中文',mode: 'followUp',imageCount: 1}] : [],running: false,busy: false});
    app.workspace.updateApproval({approval: mode === 'conversation' ? {id: 'approval',toolName: 'run_command',warning: 'Review this command.',canAlwaysAllow: false,argsText: '{"command":"inspect"}'} : null});
    app.workspace.updateFailure({visible: mode === 'conversation',message: 'A task failed.',advice: 'Review settings or continue this conversation.',canContinue: true});
    app.workspace.updateRuntime({visible: mode === 'conversation',summary: 'Completed · Model A · 1,200 tokens',duration: '1m 12s',speed: '18.5',inputTokens: '900',outputTokens: '300',cacheRead: '100',cacheWrite: '20',contextTokens: '1,100',contextWindow: '128,000',compactions: '2',toolFailures: '1',recordedCost: '~$0.001234',latestCost: 'Unknown'});
    app.workspace.updateCosts({visible: mode === 'conversation',report: {unknownRequests: 0,requests: []}});
    app.workspace.updateNotices(mode === 'conversation' ? [{id: 'completed',runID: 'run-completed',title: 'Completed task',workspace: 'Workspace 中文'}] : []);
    app.files.updateArtifacts({ownerId: 'active',files: [{name: 'Report.md',path: '/workspace/Report.md'}],loading: false,error: '',copyMode: 'path'},{});
    app.workspace.updateAvailability({busy: false,global: false,active: false,conversations: [],workspaces: []});
  },{mode,png});await page.waitForTimeout(40);};
  const measure = () => page.evaluate(async () => {
    await document.fonts.ready;for (const animation of document.getAnimations()) if (animation.effect?.getTiming().iterations !== Infinity) animation.finish();
    const inspect = (node: Element) => {const box = node.getBoundingClientRect(),style = getComputedStyle(node);return {tag: node.localName,box: [box.x,box.y,box.width,box.height].map(value => Math.round(value*100)/100),
      styles: ['display',...(node.classList.contains('pui-app') ? [] : ['position']),'font-family','font-size','font-weight','line-height','color','background-color','border-top-width','border-top-color','border-radius','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left','gap','min-width','max-width','min-height','max-height','overflow-x','overflow-y','flex-grow','flex-shrink','flex-basis','align-items','justify-content'].map(property => style.getPropertyValue(property))};};
    return ['.pui-app','.pui-sidebar','.pui-brand','.pui-topbar','.pui-breadcrumb','.pui-conversation-actions','.pui-artifacts-control','.pui-chat-scroll','.pui-conversation-region','.pui-welcome','.pui-messages','.pui-composer-region','.pui-composer-panels','.pui-workspace-busy','.pui-inline-error','.pui-task-failure','.pui-run-status','.pui-queued-messages','.pui-composer','.pui-composer-input','.pui-composer-toolbar','.pui-composer-note','.pui-completion-notices'].map(selector => ({selector,nodes: [...document.querySelectorAll(selector)].map(inspect)}));
  });
  // The formal viewport boundary deliberately anchors itself independently of
  // host body margins. Assert that mechanism separately while retaining exact
  // old/new root bounds and every region's remaining computed properties.
  await setup(page,true,appearance);await project();expect(await page.locator('.pui-app').evaluate(node => getComputedStyle(node).position)).toBe('static');const before = await measure();
  await setup(page,false,appearance);await project();expect(await page.locator('.pui-app').evaluate(node => getComputedStyle(node).position)).toBe('absolute');expect(await measure()).toEqual(before);
});
