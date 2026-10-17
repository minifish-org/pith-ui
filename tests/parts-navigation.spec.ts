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

async function openFrame(page: Page, old: boolean, state: FrameState = populated, appearance: 'light'|'dark' = 'light'): Promise<void> {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async ({old,state,appearance}) => {
    // This is Desk's actual host: only its ordinary DIV mount, no host theme
    // classes, body reset, copied layout rules, or local consumer stylesheet.
    document.body.className = '';document.documentElement.className = '';document.documentElement.removeAttribute('data-appearance');
    const mount = document.body.appendChild(document.createElement('div'));mount.id = 'app';const events: string[] = [];
    const callbacks = {onAction(action: string) {events.push('action:'+action);},onSelectConversation(id: string) {events.push('select:'+id);},onNewConversation(id: string) {events.push('new:'+id);},
      onWorkspaceAction(action: string,id: string) {events.push('workspace:'+action+':'+id);},onConversationAction(action: string,id: string) {events.push('conversation:'+action+':'+id);},onSearch(value: string) {events.push('search:'+value);}};
    let frame: FrameHarness,openModal: () => void;
    if (old) {
      const path = '/src/app/index.ts';const {createApplication} = await import(path);const app = createApplication(mount,{appearance,brand: {name: 'Pith',qualifier: 'Desk',mark: {symbol: 'pith',alt: ''}},workspace: callbacks});
      app.workspace.updateShell(state);app.workspace.updateNavigation(state.navigation);
      frame = {...app.workspace,update(next: FrameState) {app.workspace.updateShell(next);app.workspace.updateNavigation(next.navigation);},setAppearance: app.setAppearance,destroy: app.destroy};
      openModal = () => {app.settings.openSettings({baseUrl: 'https://example.test',hasApiKey: false,ready: true},{});};
    } else {
      const path = '/examples/assemblies/frame.ts',settingsPath = '/examples/assemblies/settings.ts';const {mountFrame} = await import(path),{composeSettings} = await import(settingsPath);
      const settings = composeSettings({baseUrl: 'https://example.test',hasApiKey: false,ready: true},{},'Pith Desk');
      frame = mountFrame(mount,state,callbacks,{appearance},{dialogs: [settings.part]});openModal = settings.open;
    }
    window.framePartsHarness = {frame,state,events,openModal};
  },{old,state,appearance});
}
async function framePresentation(page: Page): Promise<unknown> {
  return page.evaluate(async () => {
    await document.fonts.ready;for (const animation of document.getAnimations()) if (animation.effect?.getTiming().iterations !== Infinity) animation.finish();
    const root = document.querySelector('.pui-app')!,origin = root.getBoundingClientRect();
    const inspect = (node: Element,textlessContainer = false) => {const box = node.getBoundingClientRect(),style = getComputedStyle(node);
      const effectiveBackground = () => {let current: Element|null = node;while (current) {const value = getComputedStyle(current).backgroundColor;if (value !== 'rgba(0, 0, 0, 0)' && value !== 'transparent') return value;current = current.parentElement;}return 'transparent';};
      // WebKit's old application themes HTML only after inserting the subtree.
      // CSSOM then reports UA inherited fonts on these two textless containers,
      // although visible descendants and their painted pixels match exactly.
      // Compare their layout and effective paint; retain every text/style
      // assertion for the rail, header and all visible content below.
      const properties = ['display','font-family','font-size','font-weight','line-height','color','background-color','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-bottom','border-top-width','border-right-width','border-radius','gap','overflow-x','overflow-y','min-height','align-items','flex-wrap','opacity','transform'].filter(key => !textlessContainer || !['font-family','font-size','font-weight','line-height','color'].includes(key));
      return {tag: node.localName,text: [...node.childNodes].filter(child => child.nodeType === Node.TEXT_NODE).map(child => child.textContent).join('').trim(),
      box: [box.x-origin.x,box.y-origin.y,box.width,box.height].map(value => Math.round(value*100)/100),
      styles: properties.map(key => key === 'background-color' && textlessContainer ? effectiveBackground() : style.getPropertyValue(key)),
      ...(node instanceof HTMLButtonElement ? {disabled: node.disabled,label: node.getAttribute('aria-label'),title: node.getAttribute('title'),expanded: node.getAttribute('aria-expanded'),current: node.getAttribute('aria-current')} : {}),
      ...(node instanceof HTMLInputElement ? {type: node.type,value: node.value,placeholder: node.placeholder,autocomplete: node.autocomplete} : {})};};
    const regions = [root,root.querySelector('aside')!,root.querySelector('main')!,root.querySelector('header')!];
    const nodes = [...root.querySelectorAll('aside .pui-brand,aside .pui-logo-mark,aside .pui-logo-mark i,aside .pui-sidebar-section-label,aside label,aside input,aside nav,aside section,aside button,aside p,aside .pui-sidebar-bottom,aside [role=status],aside .pui-history-status,header button,header .pui-breadcrumb,header .pui-breadcrumb span')].filter(node => !node.closest('[hidden]'));
    return {regions: regions.map(node => inspect(node,node === root || node.localName === 'main')),nodes: nodes.map(node => inspect(node)),svg: [...root.querySelectorAll('aside svg,header svg')].filter(svg => !svg.closest('[hidden]')).map(svg => svg.innerHTML),
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

for (const appearance of ['light','dark'] as const) for (const width of [1280,390]) test(`${appearance} ${width} frame background, rail and header preserve exact painted pixels`,async ({page},testInfo) => {
  await page.setViewportSize({width,height: 844});
  const capture = async (old: boolean) => {
    await openFrame(page,old,populated,appearance);
    if (width < 720) await page.evaluate(() => window.framePartsHarness.frame.setSidebarOpen(true));
    await page.evaluate(async () => {
      await document.fonts.ready;
      // Opening the drawer changes a finite transform transition. Settle it
      // before the two separate region captures, so both depict its open state.
      for (const animation of document.getAnimations()) if (animation.effect?.getTiming().iterations !== Infinity) animation.finish();
    });
    await page.mouse.move(width-1,843);
    const main = (await page.locator('main').boundingBox())!,header = (await page.locator('header').boundingBox())!;
    // Conversation and composer are separate proof units. This empty strip
    // below the header checks the frame's effective background without claiming
    // their still-unassembled body content is covered by this recipe.
    return {background: await page.screenshot({clip: {x: main.x+main.width/2,y: header.y+header.height+2,width: 8,height: 8},animations: 'disabled',caret: 'hide'}),rail: await page.locator('aside').screenshot({animations: 'disabled',caret: 'hide'}),header: await page.locator('header').screenshot({animations: 'disabled',caret: 'hide'})};
  };
  const before = await capture(true),after = await capture(false);
  for (const region of ['background','rail','header'] as const) {
    if (!before[region].equals(after[region])) {await testInfo.attach('old-'+region,{body: before[region],contentType: 'image/png'});await testInfo.attach('parts-'+region,{body: after[region],contentType: 'image/png'});}
    expect(before[region].equals(after[region]),region+' painted pixels').toBe(true);
  }
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

test('compact action keeps its own async pending across ordinary shell snapshots',async ({page}) => {
  for (const old of [true,false]) {
    await page.goto('/tests/fixture.html');
    await page.evaluate(async ({old,state}) => {
      const mount = document.body.appendChild(document.createElement('div')),errors: string[] = [];
      let resolve!: (result: {ok: false;error: string}) => void;
      const callbacks = {onAction() {return new Promise<{ok: false;error: string}>(done => {resolve = done;});},onError(message: string) {errors.push(message);}};
      let snapshot: () => void;
      if (old) {
        const path = '/src/app/index.ts', {createApplication} = await import(path),app = createApplication(mount,{workspace: callbacks});
        app.workspace.updateConversation({id: 'active',working: false,messages: [{id: 'message',role: 'assistant',text: 'Ready'}]});
        snapshot = () => app.workspace.updateAvailability({});
      } else {
        const path = '/examples/assemblies/frame.ts', {mountFrame} = await import(path),frame = mountFrame(mount,{...state,compactDisabled: false},callbacks);
        snapshot = () => frame.update({...state,compactDisabled: false});
      }
      (window as unknown as {compactPending: {snapshot(): void;finish(): void;errors: string[]}}).compactPending = {snapshot,finish() {resolve({ok: false,error: 'Compaction failed'});},errors};
    },{old,state: populated});
    const compact = page.getByRole('button',{name: 'Compress context',exact: true});await expect(compact).toBeEnabled();await compact.click();await expect(compact,old ? 'baseline compact owns local pending' : 'assembled compact owns local pending').toBeDisabled();
    await page.evaluate(() => (window as unknown as {compactPending: {snapshot(): void}}).compactPending.snapshot());await expect(compact).toBeDisabled();
    await page.evaluate(() => (window as unknown as {compactPending: {finish(): void}}).compactPending.finish());await expect(compact).toBeEnabled();
    expect(await page.evaluate(() => (window as unknown as {compactPending: {errors: string[]}}).compactPending.errors)).toEqual(['Compaction failed']);
  }
});

for (const appearance of ['light','dark'] as const) for (const width of [1280,390]) test(`${appearance} ${width} open navigation menu matches old layout, position and paint`,async ({page},testInfo) => {
  await page.setViewportSize({width,height: 844});
  const capture = async (old: boolean) => {
    await openFrame(page,old,populated,appearance);
    if (width < 720) await page.evaluate(() => window.framePartsHarness.frame.setSidebarOpen(true));
    await page.evaluate(() => {for (const animation of document.getAnimations()) if (animation.effect?.getTiming().iterations !== Infinity) animation.finish();});
    await page.getByRole('button',{name: 'Actions for Original conversation',exact: true}).click();
    const menu = page.getByRole('menu',{name: 'Conversation actions'});await expect(page.getByRole('menuitem',{name: 'Rename',exact: true})).toBeFocused();
    await page.mouse.move(width-1,843);
    const presentation = await menu.evaluate(node => {
      // The old application supplies its existing slot without the unstyled
      // standalone context-menu marker. The formal generic marker remains
      // covered separately; every presentation class and pixel is compared.
      const inspect = (item: Element) => {const box = item.getBoundingClientRect(),style = getComputedStyle(item);return {tag: item.localName,classes: [...item.classList].filter(name => name !== 'pui-context-menu').sort(),text: item === node ? '' : item.textContent,
        box: [box.x,box.y,box.width,box.height].map(value => Math.round(value*100)/100),role: item.getAttribute('role'),label: item.getAttribute('aria-label'),
        styles: ['position','display','z-index','font-family','font-size','font-weight','line-height','color','background-color','padding-top','padding-right','padding-bottom','padding-left','border-top-width','border-top-color','border-radius','min-width','max-height','overflow-y','box-shadow'].map(key => style.getPropertyValue(key)),
        ...(item instanceof HTMLButtonElement ? {disabled: item.disabled,title: item.getAttribute('title')} : {})};};
      return {panel: inspect(node),items: [...node.children].map(inspect),focused: document.activeElement?.textContent};
    });
    return {presentation,pixels: await menu.screenshot({animations: 'disabled',caret: 'hide'})};
  };
  const old = await capture(true),parts = await capture(false);expect(parts.presentation).toEqual(old.presentation);
  if (!old.pixels.equals(parts.pixels)) {await testInfo.attach('old-menu',{body: old.pixels,contentType: 'image/png'});await testInfo.attach('parts-menu',{body: parts.pixels,contentType: 'image/png'});}
  expect(parts.pixels.equals(old.pixels),'menu painted pixels').toBe(true);
});

test('navigation menu keyboard, disabled rows, outside focus and modal exclusion match the old application',async ({page}) => {
  const state: FrameState = {...populated,navigation: {...populated.navigation,groups: populated.navigation.groups.map(group => ({...group,children: group.children.map(entry => entry.id === 'active' ? {...entry,actions: {history: false}} : entry)}))}};
  for (const old of [true,false]) {
    await openFrame(page,old,state);const source = page.getByRole('button',{name: 'Actions for Original conversation',exact: true}),menu = page.getByRole('menu',{name: 'Conversation actions'});
    await source.click();await expect(page.getByRole('menuitem',{name: 'Rename',exact: true})).toBeFocused();await page.keyboard.press('ArrowDown');await expect(page.getByRole('menuitem',{name: 'Export Markdown',exact: true})).toBeFocused();
    await page.keyboard.press('End');await expect(page.getByRole('menuitem',{name: 'Delete conversation',exact: true})).toBeFocused();await page.keyboard.press('Home');await expect(page.getByRole('menuitem',{name: 'Rename',exact: true})).toBeFocused();
    await page.keyboard.press('ArrowUp');await expect(page.getByRole('menuitem',{name: 'Delete conversation',exact: true})).toBeFocused();await page.keyboard.press('Escape');await expect(menu).toBeHidden();await expect(source).toBeFocused();
    await source.click();await page.getByRole('searchbox',{name: 'Search conversation titles'}).focus();await expect(menu).toBeHidden();
    await source.click();await page.keyboard.press('Tab');await expect(menu).toBeHidden();
    await source.click();await page.evaluate(() => window.framePartsHarness.openModal());await expect(page.getByRole('dialog',{name: 'Settings',exact: true})).toBeVisible();await expect(menu).toBeHidden();
    await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name: 'Settings',exact: true})).not.toBeVisible();await expect(menu).toBeHidden();
  }
});

for (const movement of ['resize','scroll'] as const) test(`navigation menu dismisses on ${movement} like the actual old application`,async ({page}) => {
  for (const old of [true,false]) {
    await page.setViewportSize({width: 1280,height: 800});await openFrame(page,old);await page.getByRole('button',{name: 'Actions for Original conversation',exact: true}).click();
    const menu = page.getByRole('menu',{name: 'Conversation actions'});await expect(menu).toBeVisible();
    if (movement === 'resize') await page.setViewportSize({width: 1200,height: 800});
    else await page.locator('nav').evaluate(node => node.dispatchEvent(new Event('scroll',{bubbles: true})));
    await expect(menu,old ? 'baseline dismisses moved anchor' : 'assembled menu dismisses moved anchor').toBeHidden();
  }
});
