import {test, expect, type Page} from '@playwright/test';

interface NavigationItem {id: string;title?: string;active: boolean;status?: {kind: 'approval'|'running'|'unread'|'idle'};actions?: {rename?: boolean;history?: boolean;export?: boolean;delete?: boolean}}
interface NavigationGroup {id: string;name: string;path: string;selected: boolean;children: NavigationItem[];canRemove?: boolean}
interface FrameState {workspace?: string;conversation?: string;reconnecting?: boolean;navigation: {groups: NavigationGroup[];empty: 'workspaces'|'search'|null;disabled?: boolean};compactDisabled?: boolean}
interface FrameHarness {update(state: FrameState): void;search(value: string): void;setSidebarOpen(open: boolean): void;closeNavigationMenu(): void;setAppearance(mode: 'light'|'dark'|'system'): void;destroy(): void}
declare global {interface Window {framePartsHarness: {frame: FrameHarness;state: FrameState;events: string[];retained?: {group: Element;row: Element;button: Element;status: Element;scroll: number}}}}
const populated: FrameState = {workspace: 'Project 中文',conversation: 'Original conversation',reconnecting: true,navigation: {empty: null,groups: [
  {id: 'work',name: 'Project 中文',path: '/original/project',selected: true,children: [
    {id: 'active',title: 'Original conversation',active: true,status: {kind: 'approval'}},
    {id: 'running',title: 'Running task',active: false,status: {kind: 'running'}},
    {id: 'unread',title: 'Completed notes',active: false,status: {kind: 'unread'}},
    {id: 'idle',title: 'Idle task',active: false,status: {kind: 'idle'}},
  ]},
  {id: 'other',name: 'Other workspace',path: '/other/project',selected: false,children: [{id: 'other-chat',title: 'Other conversation',active: false}]},
]}};

async function openFrame(page: Page, old: boolean, state: FrameState = populated, appearance: 'light'|'dark' = 'light'): Promise<void> {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async ({old,state,appearance}) => {
    // This is Desk's actual host: only its ordinary DIV mount, no host theme
    // classes, body reset, copied layout rules, or local consumer stylesheet.
    document.body.className = '';document.documentElement.className = '';document.documentElement.removeAttribute('data-appearance');
    const mount = document.body.appendChild(document.createElement('div'));mount.id = 'app';const events: string[] = [];
    const callbacks = {onAction(action: string) {events.push('action:'+action);},onSelectConversation(id: string) {events.push('select:'+id);},onNewConversation(id: string) {events.push('new:'+id);},
      onWorkspaceAction(action: string,id: string) {events.push('workspace:'+action+':'+id);},onConversationAction(action: string,id: string) {events.push('conversation:'+action+':'+id);},onSearch(value: string) {events.push('search:'+value);}};
    let frame: FrameHarness;
    if (old) {
      const path = '/src/app/index.ts';const {createApplication} = await import(path);const app = createApplication(mount,{appearance,brand: {name: 'Pith',qualifier: 'Desk',mark: {symbol: 'pith',alt: ''}},workspace: callbacks});
      app.workspace.updateShell(state);app.workspace.updateNavigation(state.navigation);
      frame = {...app.workspace,update(next: FrameState) {app.workspace.updateShell(next);app.workspace.updateNavigation(next.navigation);},setAppearance: app.setAppearance,destroy: app.destroy};
    } else {const path = '/examples/assemblies/frame.ts';const {mountFrame} = await import(path);frame = mountFrame(mount,state,callbacks,{appearance});}
    window.framePartsHarness = {frame,state,events};
  },{old,state,appearance});
}
async function framePresentation(page: Page): Promise<unknown> {
  return page.evaluate(async () => {
    await document.fonts.ready;for (const animation of document.getAnimations()) if (animation.effect?.getTiming().iterations !== Infinity) animation.finish();
    const root = document.querySelector('.pui-app')!,origin = root.getBoundingClientRect();
    const inspect = (node: Element) => {const box = node.getBoundingClientRect(),style = getComputedStyle(node);return {tag: node.localName,text: [...node.childNodes].filter(child => child.nodeType === Node.TEXT_NODE).map(child => child.textContent).join('').trim(),
      box: [box.x-origin.x,box.y-origin.y,box.width,box.height].map(value => Math.round(value*100)/100),
      styles: ['display','font-family','font-size','font-weight','line-height','color','background-color','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-bottom','border-top-width','border-right-width','border-radius','gap','overflow-x','overflow-y','min-height','align-items','flex-wrap','opacity','transform'].map(key => style.getPropertyValue(key)),
      ...(node instanceof HTMLButtonElement ? {disabled: node.disabled,label: node.getAttribute('aria-label'),title: node.getAttribute('title'),expanded: node.getAttribute('aria-expanded'),current: node.getAttribute('aria-current')} : {}),
      ...(node instanceof HTMLInputElement ? {type: node.type,value: node.value,placeholder: node.placeholder,autocomplete: node.autocomplete} : {})};};
    const regions = [root,root.querySelector('aside')!,root.querySelector('main')!,root.querySelector('header')!];
    const nodes = [...root.querySelectorAll('aside .pui-brand,aside .pui-logo-mark,aside .pui-logo-mark i,aside .pui-sidebar-section-label,aside label,aside input,aside nav,aside section,aside button,aside p,aside .pui-sidebar-bottom,aside [role=status],aside .pui-history-status,header button,header .pui-breadcrumb,header .pui-breadcrumb span')].filter(node => !node.closest('[hidden]'));
    return {regions: regions.map(inspect),nodes: nodes.map(inspect),svg: [...root.querySelectorAll('aside svg,header svg')].filter(svg => !svg.closest('[hidden]')).map(svg => svg.innerHTML),
      viewport: {x: origin.x,y: origin.y,width: origin.width,height: origin.height,scrollWidth: document.documentElement.scrollWidth,scrollHeight: document.documentElement.scrollHeight}};
  });
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

for (const appearance of ['light','dark'] as const) for (const viewport of [{width: 1280,height: 800},{width: 900,height: 568},{width: 390,height: 844},{width: 900,height: 320}]) {
  test(`${appearance} frame navigation ${viewport.width}x${viewport.height} preserves actual host geometry and state`,async ({page}) => {
    await page.setViewportSize(viewport);await page.emulateMedia({colorScheme: appearance === 'light' ? 'dark' : 'light'});
    await openFrame(page,true,populated,appearance);const old = await framePresentation(page);
    await openFrame(page,false,populated,appearance);expect(await framePresentation(page)).toEqual(old);
    expect(await page.locator('html').getAttribute('class')).toBe('');expect(await page.locator('body').getAttribute('class')).toBe('');
  });
}

test('navigation search, expansion and distinct business callbacks match the old application',async ({page}) => {
  for (const old of [true,false]) {
    await openFrame(page,old);
    const other = page.getByRole('button',{name: 'Other workspace',exact: true});await other.click();await expect(other).toHaveAttribute('aria-expanded','true');
    expect(await page.evaluate(() => window.framePartsHarness.events)).toEqual([]);
    await page.getByRole('button',{name: 'Other conversation',exact: true}).click();await page.getByRole('button',{name: 'New conversation in Other workspace',exact: true}).click();
    await page.getByRole('button',{name: 'Manage workspaces',exact: true}).click();
    expect(await page.evaluate(() => window.framePartsHarness.events)).toEqual(['select:other-chat','new:other','action:workspace']);
    await page.getByRole('searchbox',{name: 'Search conversation titles',exact: true}).fill('RUNNING');await expect(page.getByRole('button',{name: /^Running task/})).toBeVisible();await expect(page.getByRole('button',{name: /^Original conversation/})).toHaveCount(0);
    await page.getByRole('searchbox',{name: 'Search conversation titles',exact: true}).fill('missing title');await expect(page.getByText('No matching conversations.',{exact: true})).toBeVisible();
    await page.getByRole('searchbox',{name: 'Search conversation titles',exact: true}).fill('');await expect(page.getByRole('button',{name: 'Other conversation',exact: true})).toBeVisible();
  }
});

test('retained navigation rows keep focus, status identity, scroll and menu state through metadata and reorder',async ({page}) => {
  await openFrame(page,false);
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
  for (const old of [true,false]) {
    await openFrame(page,old);await page.getByRole('button',{name: 'Actions for Original conversation',exact: true}).click();
    await expect(page.getByRole('menuitem',{name: 'Conversation branches',exact: true})).toBeVisible();await page.getByRole('menuitem',{name: 'Rename',exact: true}).click();
    expect(await page.evaluate(() => window.framePartsHarness.events)).toEqual(['conversation:rename:active']);
    await page.getByRole('button',{name: 'Actions for workspace Project 中文',exact: true}).click();await page.getByRole('menuitem',{name: 'Remove workspace',exact: true}).click();
    expect(await page.evaluate(() => window.framePartsHarness.events)).toEqual(['conversation:rename:active','workspace:remove:work']);
    await page.evaluate(() => {const h = window.framePartsHarness;h.frame.update({...h.state,navigation: {...h.state.navigation,disabled: true}});});
    await expect(page.getByRole('button',{name: 'Actions for Original conversation',exact: true})).toBeDisabled();await expect(page.getByRole('button',{name: /^Original conversation/})).toBeDisabled();
    const toggle = page.getByRole('button',{name: 'Other workspace',exact: true});await expect(toggle).toBeEnabled();await toggle.click();await expect(toggle).toHaveAttribute('aria-expanded','true');
  }
});
