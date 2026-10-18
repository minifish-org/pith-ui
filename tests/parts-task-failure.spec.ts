import {test,expect,type Page} from '@playwright/test';

type Result = {ok: true}|{ok: false;error: string};
interface State {visible: boolean;message: string;advice: string;canContinue: boolean;workspaceId?: string}
interface Harness {session: {update(state: State): void;destroy(): void};initial: State;actions: string[];targets: Array<string|undefined>;errors: string[];releases: Array<(result: Result) => void>;diagnostics?: HTMLButtonElement;tree?: {setAppearance(mode: 'light'|'dark'): void;destroy(): void}}
declare global {interface Window {taskFailurePartsHarness: Harness}}
const initial: State = {visible: true,message: 'Task needs attention',advice: 'Review the checkpoint before continuing.',canContinue: true,workspaceId: 'workspace-a'};

async function openFailure(page: Page,state: State = initial,appearance: 'light'|'dark' = 'light',pending = false): Promise<void> {
  await page.goto('/tests/fixture.html');await page.evaluate(async ({state,appearance,pending}) => {
    document.body.dataset.appearance = appearance;const mount = document.body.appendChild(document.createElement('div')),h = {initial: state,actions: [],targets: [],errors: [],releases: []} as unknown as Harness;
    const act = (action: string,target?: string): Result|Promise<Result> => {h.actions.push(action);h.targets.push(target);return pending ? new Promise(resolve => h.releases.push(resolve)) : {ok: true};};
const contextPath = '/tests/region-context.ts', {mountRegion} = await import(contextPath);
    const recipePath = '/examples/assemblies/task-failure.ts',{composeTaskFailure} = await import(recipePath),session = composeTaskFailure(state,{onAction: act,onError(message: string) {h.errors.push(message);}});
    h.session = session;h.tree = mountRegion(mount,session.part,'panels',appearance);
        window.taskFailurePartsHarness = h;
  },{state,appearance,pending});
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


test('failure updates keep the diagnostics action and focus while replacing only continue versus settings',async ({page}) => {
  await openFailure(page);const diagnostics = page.getByRole('button',{name: 'Save diagnostics',exact: true});await diagnostics.focus();await diagnostics.evaluate(node => {window.taskFailurePartsHarness.diagnostics = node as HTMLButtonElement;});
  await page.evaluate(() => {const h = window.taskFailurePartsHarness;h.session.update({...h.initial,message: 'Updated failure',advice: 'Updated advice',canContinue: false});});await expect(diagnostics).toBeFocused();expect(await diagnostics.evaluate(node => node === window.taskFailurePartsHarness.diagnostics)).toBe(true);await expect(page.getByRole('button',{name: 'Review and continue',exact: true})).toHaveCount(0);
  await page.getByRole('button',{name: 'Check model settings',exact: true}).click();await diagnostics.click();expect(await page.evaluate(() => window.taskFailurePartsHarness.actions)).toEqual(['settings','diagnostics']);
  await page.evaluate(() => {const h = window.taskFailurePartsHarness;h.session.update({...h.initial,workspaceId: 'workspace-b'});});await page.getByRole('button',{name: 'Review and continue',exact: true}).click();expect(await page.evaluate(() => window.taskFailurePartsHarness.targets)).toEqual([undefined,undefined,'workspace-b']);
});

test('hidden failure retains its prior action nodes and a later show updates the live workspace target',async ({page}) => {
  await openFailure(page);await page.getByRole('button',{name: 'Save diagnostics',exact: true}).evaluate(node => {window.taskFailurePartsHarness.diagnostics = node as HTMLButtonElement;});
  await page.evaluate(() => {const h = window.taskFailurePartsHarness;h.session.update({...h.initial,visible: false,workspaceId: 'hidden-workspace'});});await expect(page.locator('.pui-task-failure')).toBeHidden();await page.evaluate(() => {const h = window.taskFailurePartsHarness;h.session.update({...h.initial,workspaceId: 'workspace-next'});});expect(await page.getByRole('button',{name: 'Save diagnostics',exact: true}).evaluate(node => node === window.taskFailurePartsHarness.diagnostics)).toBe(true);
  await page.getByRole('button',{name: 'Review and continue',exact: true}).click();expect(await page.evaluate(() => window.taskFailurePartsHarness.targets)).toEqual(['workspace-next']);
});

test(`${'parts'} failure actions remain controller-owned while pending and report host errors once`,async ({page}) => {
  await openFailure(page,initial,'light',true);const diagnostics = page.getByRole('button',{name: 'Save diagnostics',exact: true});await diagnostics.click();await expect(diagnostics).toBeEnabled();await diagnostics.click();expect(await page.evaluate(() => window.taskFailurePartsHarness.actions)).toEqual(['diagnostics','diagnostics']);
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
