import {test,expect,type Page} from '@playwright/test';

type Result = {ok: true}|{ok: false;error: string};
interface State {visible: boolean;message: string;advice: string;canContinue: boolean;workspaceId?: string}
interface Harness {session: {update(state: State): void;destroy(): void};initial: State;actions: string[];targets: Array<string|undefined>;errors: string[];releases: Array<(result: Result) => void>;diagnostics?: HTMLButtonElement;tree?: {setAppearance(mode: 'light'|'dark'): void;destroy(): void}}
declare global {interface Window {taskFailurePartsHarness: Harness}}
const initial: State = {visible: true,message: 'Task needs attention',advice: 'Review the checkpoint before continuing.',canContinue: true,workspaceId: 'workspace-a'};

async function openFailure(page: Page,old: boolean,state: State = initial,appearance: 'light'|'dark' = 'light',pending = false): Promise<void> {
  await page.goto('/tests/fixture.html');await page.evaluate(async ({old,state,appearance,pending}) => {
    document.body.dataset.appearance = appearance;const mount = document.body.appendChild(document.createElement('div')),h = {initial: state,actions: [],targets: [],errors: [],releases: []} as unknown as Harness;
    const act = (action: string,target?: string): Result|Promise<Result> => {h.actions.push(action);h.targets.push(target);return pending ? new Promise(resolve => h.releases.push(resolve)) : {ok: true};};
    const path = '/src/app/index.ts', {createApplication} = await import(path),app = createApplication(mount,{appearance,workspace: {onAction: act,onError(error: string) {h.errors.push(error);}}});app.workspace.updateFailure(state);
    if (old) h.session = {update: app.workspace.updateFailure,destroy: app.destroy};
    else {
      const clone = mount.firstElementChild!.cloneNode(true);app.destroy();mount.replaceChildren(clone);
      const recipePath = '/examples/assemblies/task-failure.ts',partsPath = '/src/parts/index.ts', {composeTaskFailure} = await import(recipePath),p = await import(partsPath);
      const before = mount.querySelector('.pui-task-failure')!,parent = before.parentElement!,siblings = [...parent.childNodes],position = siblings.indexOf(before);
      const session = composeTaskFailure(state,{onAction: act,onError(message: string) {h.errors.push(message);}});h.session = session;h.tree = p.mountParts(parent,session.part,{appearance});parent.prepend(...siblings.slice(0,position));parent.append(...siblings.slice(position+1));
    }
    window.taskFailurePartsHarness = h;
  },{old,state,appearance,pending});
}

async function presentation(page: Page): Promise<unknown> {
  return page.evaluate(async () => {
    await document.fonts.ready;for (const animation of document.getAnimations()) if (animation.effect?.getTiming().iterations !== Infinity) animation.finish();
    const section = document.querySelector('.pui-task-failure')!,origin = section.getBoundingClientRect();
    const inspect = (node: Element) => {const style = getComputedStyle(node),box = node.getBoundingClientRect();return {tag: node.localName,text: [...node.childNodes].filter(child => child.nodeType === Node.TEXT_NODE).map(child => child.textContent).join('').trim(),role: node.getAttribute('role'),hidden: node.hasAttribute('hidden'),box: [box.x-origin.x,box.y-origin.y,box.width,box.height].map(value => Math.round(value*100)/100),
      styles: ['display','font-size','font-weight','line-height','color','background-color','border-top-width','border-top-color','border-radius','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left','gap','align-items','justify-content','flex-wrap','opacity'].map(key => style.getPropertyValue(key)),...(node instanceof HTMLButtonElement ? {disabled: node.disabled,type: node.type} : {})};};
    return {section: inspect(section),children: section.hasAttribute('hidden') ? [] : [...section.querySelectorAll('strong,p,div,button')].map(inspect)};
  });
}

test('a bounded callout is a single native section, validates before transferring children and adds no application content',async ({page}) => {
  await page.goto('/tests/fixture.html');const value = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path),rejects = (action: () => unknown) => {try {action();return false;} catch {return true;}};
    const field = p.createInputPart({label: 'Reusable field',kind: 'password',value: 'Reusable secret'}),rejected = [rejects(() => p.createCalloutPart({tone: 'neutral',hidden: 'invalid',children: [field]})),rejects(() => p.createCalloutPart({tone: 'purple',children: []})),rejects(() => p.createCalloutPart({children: [],style: {padding: 10}})),rejects(() => p.createCalloutPart({children: [field],onDispose: 'invalid'}))];
    let disposed = 0,inside = '';const callout = p.createCalloutPart({tone: 'neutral',announce: 'polite',label: 'Review state',children: [field],onDispose() {disposed++;inside = field.read();}}),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,callout),section = mount.firstElementChild!,markup = section.innerHTML;
    const updates = [rejects(() => callout.update({hidden: 'invalid'})),rejects(() => callout.update({tone: 'arbitrary'})),rejects(() => callout.update({label: 42}))];
    const result = {rejected,updates,unchanged: section.innerHTML === markup,tag: section.localName,children: [...section.children].map(node => node.localName),role: section.getAttribute('role'),label: section.getAttribute('aria-label'),leaks: Object.values(callout).some(value => value instanceof Node)};tree.destroy();callout.destroy();return {...result,disposed,inside,after: field.read()};
  });expect(value).toEqual({rejected: [true,true,true,true],updates: [true,true,true],unchanged: true,tag: 'section',children: ['input'],role: 'status',label: 'Review state',leaks: false,disposed: 1,inside: 'Reusable secret',after: ''});
});

const states: Record<string,State> = {continue: initial,settings: {...initial,canContinue: false},emptyAdvice: {...initial,advice: ''},literal: {...initial,message: '<img src=x onerror=alert(1)>',advice: 'Literal <script> must remain text.'},long: {...initial,message: 'A provider task could not continue. '.repeat(4),advice: 'Review the recorded state and inspect settings before trying again. '.repeat(12)},hidden: {...initial,visible: false}};
for (const appearance of ['light','dark'] as const) for (const [name,state] of Object.entries(states)) test(`${appearance} task failure ${name} matches the actual workspace region`,async ({page}) => {
  await page.emulateMedia({colorScheme: appearance === 'dark' ? 'light' : 'dark'});await openFailure(page,true,state,appearance);const old = await presentation(page);await openFailure(page,false,state,appearance);expect(await presentation(page)).toEqual(old);
});
for (const width of [390,720]) test(`task failure at ${width} preserves long advice and its action row`,async ({page}) => {
  await page.setViewportSize({width,height: 720});await openFailure(page,true,states.long);const old = await presentation(page);await openFailure(page,false,states.long);expect(await presentation(page)).toEqual(old);
});

test('failure updates keep the diagnostics action and focus while replacing only continue versus settings',async ({page}) => {
  await openFailure(page,false);const diagnostics = page.getByRole('button',{name: 'Save diagnostics',exact: true});await diagnostics.focus();await diagnostics.evaluate(node => {window.taskFailurePartsHarness.diagnostics = node as HTMLButtonElement;});
  await page.evaluate(() => {const h = window.taskFailurePartsHarness;h.session.update({...h.initial,message: 'Updated failure',advice: 'Updated advice',canContinue: false});});await expect(diagnostics).toBeFocused();expect(await diagnostics.evaluate(node => node === window.taskFailurePartsHarness.diagnostics)).toBe(true);await expect(page.getByRole('button',{name: 'Review and continue',exact: true})).toHaveCount(0);
  await page.getByRole('button',{name: 'Check model settings',exact: true}).click();await diagnostics.click();expect(await page.evaluate(() => window.taskFailurePartsHarness.actions)).toEqual(['settings','diagnostics']);
  await page.evaluate(() => {const h = window.taskFailurePartsHarness;h.session.update({...h.initial,workspaceId: 'workspace-b'});});await page.getByRole('button',{name: 'Review and continue',exact: true}).click();expect(await page.evaluate(() => window.taskFailurePartsHarness.targets)).toEqual([undefined,undefined,'workspace-b']);
});

test('hidden failure retains its prior action nodes and a later show updates the live workspace target',async ({page}) => {
  await openFailure(page,false);await page.getByRole('button',{name: 'Save diagnostics',exact: true}).evaluate(node => {window.taskFailurePartsHarness.diagnostics = node as HTMLButtonElement;});
  await page.evaluate(() => {const h = window.taskFailurePartsHarness;h.session.update({...h.initial,visible: false,workspaceId: 'hidden-workspace'});});await expect(page.locator('.pui-task-failure')).toBeHidden();await page.evaluate(() => {const h = window.taskFailurePartsHarness;h.session.update({...h.initial,workspaceId: 'workspace-next'});});expect(await page.getByRole('button',{name: 'Save diagnostics',exact: true}).evaluate(node => node === window.taskFailurePartsHarness.diagnostics)).toBe(true);
  await page.getByRole('button',{name: 'Review and continue',exact: true}).click();expect(await page.evaluate(() => window.taskFailurePartsHarness.targets)).toEqual(['workspace-next']);
});

for (const old of [true,false]) test(`${old ? 'actual old' : 'parts'} failure actions remain controller-owned while pending and report host errors once`,async ({page}) => {
  await openFailure(page,old,initial,'light',true);const diagnostics = page.getByRole('button',{name: 'Save diagnostics',exact: true});await diagnostics.click();await expect(diagnostics).toBeEnabled();await diagnostics.click();expect(await page.evaluate(() => window.taskFailurePartsHarness.actions)).toEqual(['diagnostics','diagnostics']);
  await page.evaluate(() => window.taskFailurePartsHarness.releases[0]!({ok: false,error: 'Diagnostics could not be saved'}));await expect.poll(() => page.evaluate(() => window.taskFailurePartsHarness.errors)).toEqual(['Diagnostics could not be saved']);await page.evaluate(() => window.taskFailurePartsHarness.session.destroy());await page.evaluate(() => window.taskFailurePartsHarness.releases[1]!({ok: false,error: 'Retired diagnostics failure'}));expect(await page.evaluate(() => window.taskFailurePartsHarness.errors)).toEqual(['Diagnostics could not be saved']);
});

test('shared owner disposal removes only the failure subtree and retires late results and updates',async ({page}) => {
  await page.goto('/tests/fixture.html');await page.evaluate(async initial => {
    const recipePath = '/examples/assemblies/task-failure.ts',partsPath = '/src/parts/index.ts', {composeTaskFailure} = await import(recipePath),p = await import(partsPath),h = {initial,actions: [],targets: [],errors: [],releases: []} as unknown as Harness;
    const session = composeTaskFailure(initial,{onAction(action: string) {h.actions.push(action);return new Promise<Result>(resolve => h.releases.push(resolve));},onError(message: string) {h.errors.push(message);}}),mount = document.body.appendChild(document.createElement('div'));h.session = session;h.tree = p.mountParts(mount,p.createStackPart({children: [p.createTextPart({text: 'Sibling content'}),session.part]}),{appearance: 'light'});window.taskFailurePartsHarness = h;
  },initial);await page.getByRole('button',{name: 'Save diagnostics',exact: true}).click();await page.evaluate(() => {const h = window.taskFailurePartsHarness;h.tree!.setAppearance('dark');h.session.destroy();h.releases[0]!({ok: false,error: 'Retired failure'});h.session.update({...h.initial,message: 'Late snapshot'});});await expect(page.getByText('Sibling content',{exact: true})).toBeVisible();await expect(page.locator('.pui-task-failure')).toHaveCount(0);expect(await page.evaluate(() => window.taskFailurePartsHarness.errors)).toEqual([]);
});

test('destroying the shared parent retires a failure action before descendants are released',async ({page}) => {
  await page.goto('/tests/fixture.html');await page.evaluate(async initial => {
    const recipePath = '/examples/assemblies/task-failure.ts',partsPath = '/src/parts/index.ts', {composeTaskFailure} = await import(recipePath),p = await import(partsPath),h = {initial,actions: [],targets: [],errors: [],releases: []} as unknown as Harness;
    const session = composeTaskFailure(initial,{onAction(action: string) {h.actions.push(action);return new Promise<Result>(resolve => h.releases.push(resolve));},onError(message: string) {h.errors.push(message);}}),mount = document.body.appendChild(document.createElement('div'));h.session = session;h.tree = p.mountParts(mount,p.createStackPart({children: [session.part]}));window.taskFailurePartsHarness = h;
  },initial);await page.getByRole('button',{name: 'Save diagnostics',exact: true}).click();await page.evaluate(async () => {const h = window.taskFailurePartsHarness;h.tree!.destroy();h.releases[0]!({ok: false,error: 'Parent-retired failure'});await new Promise(resolve => setTimeout(resolve,0));h.session.update({...h.initial,message: 'Late snapshot'});h.session.destroy();});await expect(page.locator('.pui-task-failure,button')).toHaveCount(0);expect(await page.evaluate(() => window.taskFailurePartsHarness.errors)).toEqual([]);
});
