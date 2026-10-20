import {test, expect, type Page} from '@playwright/test';

interface NavigationItem {id: string;title?: string;active: boolean;status?: {kind: 'approval'|'running'|'unread'|'idle'};actions?: {rename?: boolean;history?: boolean;export?: boolean;delete?: boolean}}
interface NavigationGroup {id: string;name: string;path: string;selected: boolean;children: NavigationItem[];canRemove?: boolean}
interface FrameState {workspace?: string;conversation?: string;reconnecting?: boolean;navigation: {groups: NavigationGroup[];empty: 'workspaces'|'search'|null;disabled?: boolean};compactDisabled?: boolean}
interface FrameHarness {update(state: FrameState): void;search(value: string): void;setSidebarOpen(open: boolean): void;closeNavigationMenu(): void;setAppearance(mode: 'light'|'dark'|'system'): void;destroy(): void}
declare global {interface Window {framePartsHarness: {frame: FrameHarness;state: FrameState;events: string[];openModal(): void;retained?: {group: Element;row: Element;button: Element;status: Element;scroll: number}}}}
const populated: FrameState = {workspace: 'Project 中文',conversation: 'Original conversation',reconnecting: true,navigation: {empty: null,groups: [
  {id: 'work',name: 'Project 中文',path: '/original/project',selected: true,children: [
    {id: 'active',title: 'Original conversation',active: true,status: {kind: 'approval'}},
    {id: 'running',title: 'Running task',active: false,status: {kind: 'running'}},
    {id: 'unread',title: 'Completed notes',active: false,status: {kind: 'unread'}},
    {id: 'idle',title: 'Idle task',active: false,status: {kind: 'idle'}},
  ]},
  {id: 'other',name: 'Other workspace',path: '/other/project',selected: false,children: [{id: 'other-chat',title: 'Other conversation',active: false}]},
]}};

async function openFrame(page: Page, state: FrameState = populated, appearance: 'light'|'dark' = 'light'): Promise<void> {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async ({state,appearance}) => {
    // This is Desk's actual host: only its ordinary DIV mount, no host theme
    // classes, body reset, copied layout rules, or local consumer stylesheet.
    document.body.className = '';document.documentElement.className = '';document.documentElement.removeAttribute('data-appearance');
    const mount = document.body.appendChild(document.createElement('div'));mount.id = 'app';const events: string[] = [];
    const callbacks = {onAction(action: string) {events.push('action:'+action);},onSelectConversation(id: string) {events.push('select:'+id);},onNewConversation(id: string) {events.push('new:'+id);},
      onWorkspaceAction(action: string,id: string) {events.push('workspace:'+action+':'+id);},onConversationAction(action: string,id: string) {events.push('conversation:'+action+':'+id);},onSearch(value: string) {events.push('search:'+value);}};
    let frame: FrameHarness,openModal: () => void;

      const path = '/examples/assemblies/frame.ts',settingsPath = '/examples/assemblies/settings.ts';const {mountFrame} = await import(path),{composeSettings} = await import(settingsPath);
      const settings = composeSettings({baseUrl: 'https://example.test',hasApiKey: false,ready: true},{},'Pith Desk');
      frame = mountFrame(mount,state,callbacks,{appearance},{dialogs: [settings.part]});openModal = settings.open;
    window.framePartsHarness = {frame,state,events,openModal};
  },{state,appearance});
}

test('tree parts retain small native branches, leaves, status and direct action ownership',async ({page}) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async () => {
    const path = '/src/parts/index.ts';const p = await import(path);let toggled = false,selected = 0;
    const status = p.createActivityPart({kind: 'approval'}),more = p.createButtonPart({variant: 'quiet-icon',icon: 'more',label: 'Actions for Leaf',menuExpanded: false});
    const leaf = p.createTreeItemPart({label: 'Leaf',current: true,status,actions: [more],onSelect() {selected++;}});
    const branch = p.createTreeBranchPart({label: 'Branch',path: '/branch',selected: true,expanded: true,actions: [],children: [leaf],onToggle(open: boolean) {toggled = open;}});
    const nav = p.createTreePart({label: 'Tree',children: [branch]}),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,nav);
    const node = mount.querySelector('section')!,row = mount.querySelector('.pui-history-row')!,button = row.querySelector('button')!;
    button.click();node.querySelector('button')!.click();
    const result = {root: mount.firstElementChild!.localName,branch: [...node.children].map(node => node.localName),row: [...row.children].map(node => node.localName),selection: button.getAttribute('aria-current'),
      captionAndStatus: [...button.children].map(node => node.localName),selected,toggled,closed: node.lastElementChild!.hasAttribute('hidden'),leaks: [nav,branch,leaf,status,more].some(part => Object.values(part).some(value => value instanceof Node))};tree.destroy();return result;
  });
  expect(result).toEqual({root: 'nav',branch: ['div','div'],row: ['button','button'],selection: 'page',captionAndStatus: ['span','span'],selected: 1,toggled: false,closed: true,leaks: false});
});

for (const {} of ['light','dark'] as const) for (const {} of [{width: 1280,height: 800},{width: 900,height: 568},{width: 390,height: 844},{width: 900,height: 320}]) {
}

test('navigation search, expansion and distinct business callbacks match the old application',async ({page}) => {

    await openFrame(page);
    const other = page.getByRole('button',{name: 'Other workspace',exact: true});await other.click();await expect(other).toHaveAttribute('aria-expanded','true');
    expect(await page.evaluate(() => window.framePartsHarness.events)).toEqual([]);
    await page.getByRole('button',{name: 'Other conversation',exact: true}).click();await page.getByRole('button',{name: 'New conversation in Other workspace',exact: true}).click();
    await page.getByRole('button',{name: 'Manage workspaces',exact: true}).click();
    expect(await page.evaluate(() => window.framePartsHarness.events)).toEqual(['select:other-chat','new:other','action:workspace']);
    await page.getByRole('searchbox',{name: 'Search conversation titles',exact: true}).fill('RUNNING');await expect(page.getByRole('button',{name: /^Running task/})).toBeVisible();await expect(page.getByRole('button',{name: /^Original conversation/})).toHaveCount(0);
    await page.getByRole('searchbox',{name: 'Search conversation titles',exact: true}).fill('missing title');await expect(page.getByText('No matching conversations.',{exact: true})).toBeVisible();
    await page.getByRole('searchbox',{name: 'Search conversation titles',exact: true}).fill('');await expect(page.getByRole('button',{name: 'Other conversation',exact: true})).toBeVisible();
});

test('retained navigation rows keep focus, status identity, scroll and menu state through metadata and reorder',async ({page}) => {
  await openFrame(page);
  await page.getByRole('button',{name: /^Running task/}).focus();
  await page.evaluate(() => {
    const nav = document.querySelector('nav')!,row = [...nav.querySelectorAll('.pui-history-row')].find(row => row.textContent?.includes('Running task'))!,button = row.querySelector('button')!,status = row.querySelector('.pui-history-status')!,group = row.closest('section')!;nav.scrollTop = 15;
    const h = window.framePartsHarness;h.retained = {group,row,button,status,scroll: nav.scrollTop};const first = h.state.navigation.groups[0]!;
    h.frame.update({...h.state,navigation: {...h.state.navigation,groups: [{...first,name: 'Renamed workspace',children: [...first.children].reverse().map(item => item.id === 'running' ? {...item,title: 'Renamed running task'} : item)},h.state.navigation.groups[1]!]}});
  });
  expect(await page.evaluate(() => {const r = window.framePartsHarness.retained!,nav = document.querySelector('nav')!;return {group: nav.contains(r.group),row: nav.contains(r.row),button: document.activeElement === r.button,status: r.row.querySelector('.pui-history-status') === r.status,text: r.button.textContent,scroll: nav.scrollTop === r.scroll};})).toEqual({group: true,row: true,button: true,status: true,text: 'Renamed running task',scroll: true});
  await page.getByRole('button',{name: 'Actions for Renamed running task',exact: true}).click();await expect(page.getByRole('menu',{name: 'Conversation actions'})).toBeVisible();
  await expect(page.getByRole('menuitem',{name: 'Conversation branches',exact: true})).toHaveCount(0);
  await page.keyboard.press('Escape');await expect(page.getByRole('button',{name: 'Actions for Renamed running task',exact: true})).toBeFocused();
});

test('navigation menu targets, active-only branches and disabled restrictions remain separate from expansion',async ({page}) => {

    await openFrame(page);await page.getByRole('button',{name: 'Actions for Original conversation',exact: true}).click();
    await expect(page.getByRole('menuitem',{name: 'Conversation branches',exact: true})).toBeVisible();await page.getByRole('menuitem',{name: 'Rename',exact: true}).click();
    expect(await page.evaluate(() => window.framePartsHarness.events)).toEqual(['conversation:rename:active']);
    await page.getByRole('button',{name: 'Actions for workspace Project 中文',exact: true}).click();await page.getByRole('menuitem',{name: 'Remove workspace',exact: true}).click();
    expect(await page.evaluate(() => window.framePartsHarness.events)).toEqual(['conversation:rename:active','workspace:remove:work']);
    await page.evaluate(() => {const h = window.framePartsHarness;h.frame.update({...h.state,navigation: {...h.state.navigation,disabled: true}});});
    await expect(page.getByRole('button',{name: 'Actions for Original conversation',exact: true})).toBeDisabled();await expect(page.getByRole('button',{name: /^Original conversation/})).toBeDisabled();
    const toggle = page.getByRole('button',{name: 'Other workspace',exact: true});await expect(toggle).toBeEnabled();await toggle.click();await expect(toggle).toHaveAttribute('aria-expanded','true');
});

test('compact action keeps its own async pending across ordinary shell snapshots',async ({page}) => {

    await page.goto('/tests/fixture.html');
    await page.evaluate(async ({state}) => {
      const mount = document.body.appendChild(document.createElement('div')),errors: string[] = [];
      let resolve!: (result: {ok: false;error: string}) => void;
      const callbacks = {onAction() {return new Promise<{ok: false;error: string}>(done => {resolve = done;});},onError(message: string) {errors.push(message);}};
      let snapshot: () => void;

        const path = '/examples/assemblies/frame.ts', {mountFrame} = await import(path),frame = mountFrame(mount,{...state,compactDisabled: false},callbacks);
        snapshot = () => frame.update({...state,compactDisabled: false});
      (window as unknown as {compactPending: {snapshot(): void;finish(): void;errors: string[]}}).compactPending = {snapshot,finish() {resolve({ok: false,error: 'Compaction failed'});},errors};
    },{state: populated});
    const compact = page.getByRole('button',{name: 'Compress context',exact: true});await expect(compact).toBeEnabled();
    await expect(compact).toHaveText('');await expect(compact.locator('svg')).toBeVisible();await expect(compact).toHaveAttribute('title','Compress context by summarizing older messages');
    await compact.click();await expect(compact,'assembled compact owns local pending').toBeDisabled();
    await page.evaluate(() => (window as unknown as {compactPending: {snapshot(): void}}).compactPending.snapshot());await expect(compact).toBeDisabled();await expect(compact).toHaveText('');
    await page.evaluate(() => (window as unknown as {compactPending: {finish(): void}}).compactPending.finish());await expect(compact).toBeEnabled();
    expect(await page.evaluate(() => (window as unknown as {compactPending: {errors: string[]}}).compactPending.errors)).toEqual(['Compaction failed']);
});

test('navigation menu keyboard, disabled rows, outside focus and modal exclusion match the old application',async ({page}) => {
  const state: FrameState = {...populated,navigation: {...populated.navigation,groups: populated.navigation.groups.map(group => ({...group,children: group.children.map(entry => entry.id === 'active' ? {...entry,actions: {history: false}} : entry)}))}};

    await openFrame(page,state);const source = page.getByRole('button',{name: 'Actions for Original conversation',exact: true}),menu = page.getByRole('menu',{name: 'Conversation actions'});
    await source.click();await expect(page.getByRole('menuitem',{name: 'Rename',exact: true})).toBeFocused();await page.keyboard.press('ArrowDown');await expect(page.getByRole('menuitem',{name: 'Export Markdown',exact: true})).toBeFocused();
    await page.keyboard.press('End');await expect(page.getByRole('menuitem',{name: 'Delete conversation',exact: true})).toBeFocused();await page.keyboard.press('Home');await expect(page.getByRole('menuitem',{name: 'Rename',exact: true})).toBeFocused();
    await page.keyboard.press('ArrowUp');await expect(page.getByRole('menuitem',{name: 'Delete conversation',exact: true})).toBeFocused();await page.keyboard.press('Escape');await expect(menu).toBeHidden();await expect(source).toBeFocused();
    await source.click();await page.getByRole('searchbox',{name: 'Search conversation titles'}).focus();await expect(menu).toBeHidden();
    await source.click();await page.keyboard.press('Tab');await expect(menu).toBeHidden();
    await source.click();await page.evaluate(() => window.framePartsHarness.openModal());await expect(page.getByRole('dialog',{name: 'Settings',exact: true})).toBeVisible();await expect(menu).toBeHidden();
    await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name: 'Settings',exact: true})).not.toBeVisible();await expect(menu).toBeHidden();
});

for (const movement of ['resize','scroll'] as const) test(`navigation menu dismisses on ${movement} like the actual old application`,async ({page}) => {

    await page.setViewportSize({width: 1280,height: 800});await openFrame(page);await page.getByRole('button',{name: 'Actions for Original conversation',exact: true}).click();
    const menu = page.getByRole('menu',{name: 'Conversation actions'});await expect(menu).toBeVisible();
    if (movement === 'resize') await page.setViewportSize({width: 1200,height: 800});
    else await page.locator('nav').evaluate(node => node.dispatchEvent(new Event('scroll',{bubbles: true})));
    await expect(menu,'assembled menu dismisses moved anchor').toBeHidden();
});
