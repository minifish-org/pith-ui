import {test, expect} from '@playwright/test';

test.beforeEach(async ({page}) => {await page.goto('/tests/fixture.html');});

test('frame parts keep direct native ownership without shell content or presentation parameters', async ({page}) => {
  const result = await page.evaluate(async () => {
    const path = '/src/parts/index.ts'; const p = await import(path);
    const mark = p.createBrandMarkPart({symbol: 'pith',alt: ''}),brand = p.createBrandPart({name: 'Pith',qualifier: 'Desk',mark});
    const manage = p.createButtonPart({variant: 'quiet-icon',icon: 'plus',label: 'Manage workspaces'});
    const heading = p.createRailHeadingPart({label: 'WORKSPACES',actions: [manage]});
    const search = p.createSearchFieldPart({label: 'Search conversation titles',placeholder: 'Search conversations'});
    const nav = p.createTreePart({label: 'Workspaces and conversations',children: []});
    const footer = p.createRailFooterPart({children: [p.createButtonPart({variant: 'navigation',icon: 'settings',label: 'Settings'})]});
    const rail = p.createSideRailPart({children: [brand,heading,search,nav,footer]});
    const trigger = p.createButtonPart({variant: 'drawer-trigger',icon: 'menu',label: 'Open sidebar'});
    const breadcrumb = p.createBreadcrumbPart({ancestor: 'No workspace',current: 'New conversation'});
    const topbar = p.createTopbarPart({children: [trigger,breadcrumb]}),main = p.createMainPart({children: [topbar]});
    const frame = p.createFramePart({children: []});
    const drawer = p.createDrawerPart({scope: frame,panel: rail,content: main,trigger}); frame.replace([rail,drawer,main]);
    const mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,frame);
    const root = mount.firstElementChild!,rootElement = root as HTMLElement;
    const result = {children: [...root.children].map(child => child.localName),rail: [...root.querySelector('aside')!.children].map(child => child.localName),
      main: [...root.querySelector('main')!.children].map(child => child.localName),brand: root.querySelector('.pui-brand')!.innerHTML,
      search: [...root.querySelector('label')!.children].map(child => child.localName),leaks: [frame,rail,main,topbar,drawer,mark,brand,heading,search,nav,footer,breadcrumb].some(part => Object.values(part).some(value => value instanceof Node)),
      overflow: getComputedStyle(rootElement).overflow};
    tree.destroy(); return {...result,empty: !mount.firstChild};
  });
  expect(result).toMatchObject({children: ['aside','div','main'],rail: ['div','div','label','nav','div'],main: ['header'],search: ['svg','span','input'],leaks: false,overflow: 'hidden',empty: true});
  expect(result.brand).toContain('pui-app-brand');expect(result.brand).toContain('pui-brand-light');expect(result.brand).not.toContain('<svg');
});

test('navigation action variants preserve actual old markup and computed presentation', async ({page}) => {
  await page.setViewportSize({width: 600,height: 800});
  const result = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',oldPath = '/src/app/index.ts'; const p = await import(path),{createApplication} = await import(oldPath);
    const oldMount = document.body.appendChild(document.createElement('div')),old = createApplication(oldMount);
    const source = [oldMount.querySelector('.pui-settings-button[data-action=settings]')!,oldMount.querySelector('.pui-empty-workspace')!,oldMount.querySelector('.pui-compact-action')!,oldMount.querySelector('.pui-mobile-menu')!];
    const inspect = (node: Element) => {const style = getComputedStyle(node);return {tag: node.localName,classes: [...node.classList].sort(),aria: node.getAttribute('aria-label'),title: node.getAttribute('title'),
      children: [...node.childNodes].map(child => child.nodeType === Node.TEXT_NODE ? {tag: '#text',text: child.textContent} : {tag: (child as Element).localName,text: child.textContent,classes: [...(child as Element).classList]}),svg: node.querySelector('svg')!.innerHTML,
      styles: ['display','font-size','font-weight','line-height','color','background-color','padding-top','padding-right','padding-bottom','padding-left','border-radius','gap','margin-right','min-height'].map(key => style.getPropertyValue(key))};};
    const before = source.map(inspect);old.destroy();
    const actions = [p.createButtonPart({variant: 'navigation',icon: 'settings',label: 'Settings'}),p.createButtonPart({variant: 'navigation-item',icon: 'folder',label: 'Add a workspace'}),
      p.createButtonPart({variant: 'toolbar-action',icon: 'compress',label: 'Compact',accessibleLabel: 'Compress context',title: 'Compress context by summarizing older messages'}),p.createButtonPart({variant: 'drawer-trigger',icon: 'menu',label: 'Open sidebar'})];
    const mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,p.createStackPart({children: [p.createRailFooterPart({children: [actions[0]]}),...actions.slice(1)]}));
    const after = [...mount.querySelectorAll('button')].map(inspect);tree.destroy();return {before,after};
  });
  expect(result.after).toEqual(result.before);
});

test('finite action combinations and rejected frame constructors leave supplied parts reusable', async ({page}) => {
  const result = await page.evaluate(async () => {
    const path = '/src/parts/index.ts'; const p = await import(path);const rejects = (action: () => unknown) => {try {action();return false;} catch {return true;}};
    const rejected = [rejects(() => p.createButtonPart({variant: 'navigation',label: 'Missing icon'})),rejects(() => p.createButtonPart({purpose: 'prompt',variant: 'navigation',label: 'Invalid',icon: 'file'})),
      rejects(() => p.createButtonPart({variant: 'toolbar-action',label: 'Invalid',icon: 'file',menuExpanded: true})),rejects(() => p.createButtonPart({label: 'Invalid',menuExpanded: true})),
      rejects(() => p.createButtonPart({variant: 'drawer-trigger',label: 'Invalid',icon: 'file',style: {width: 20}}))];
    const action = p.createButtonPart({variant: 'navigation',label: 'Kept',icon: 'file'}),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,action),node = mount.querySelector('button')!,markup = node.innerHTML;
    const updates = [rejects(() => action.update({variant: 'navigation',label: 'Changed'})),rejects(() => action.update({variant: 'toolbar-action',label: 'Changed',icon: 'file',accessibleLabel: 42})),rejects(() => action.update({variant: 'quiet-icon',label: 'Changed',icon: 'file',menuExpanded: 'yes'}))];
    const retained = node.innerHTML === markup;tree.destroy();
    const child = p.createTextPart({text: 'Reusable'}),constructorRejected = rejects(() => p.createFramePart({children: [child],width: 900}));
    const other = document.body.appendChild(document.createElement('div')),owned = p.mountParts(other,child);const reusable = other.textContent === 'Reusable';owned.destroy();
    return {rejected,updates,retained,constructorRejected,reusable};
  });
  expect(result).toEqual({rejected: [true,true,true,true,true],updates: [true,true,true],retained: true,constructorRejected: true,reusable: true});
});

test('brand assets follow the one local mount appearance and retain image and tile identity', async ({page}) => {
  await page.emulateMedia({colorScheme: 'dark'});
  await page.evaluate(async () => {
    const path = '/src/parts/index.ts'; const p = await import(path);
    const light = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"/%3E#light',dark = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg"/%3E#dark';
    const mount = document.body.appendChild(document.createElement('div'));mount.id = 'brand-local';
    const asset = p.createBrandPart({name: 'Asset',mark: p.createBrandMarkPart({src: light,darkSrc: dark,alt: 'Asset mark'})});
    const symbol = p.createBrandPart({name: 'Pith',qualifier: 'Desk',mark: p.createBrandMarkPart({symbol: 'pith',alt: 'Pith symbol'})});
    const root = p.createStackPart({children: [asset,symbol]}),tree = p.mountParts(mount,root,{appearance: 'light'}),image = mount.querySelector('img')!,tile = mount.querySelector('.pui-logo-mark > i')!;
    (window as unknown as {frameBrand: {set(value: 'light'|'dark'|'system'): void;stable(): boolean;destroy(): void;light: string;dark: string}}).frameBrand = {set: tree.setAppearance,stable: () => image === mount.querySelector('img') && tile === mount.querySelector('.pui-logo-mark > i'),destroy: tree.destroy,light,dark};
  });
  const image = page.getByRole('img',{name: 'Asset mark',exact: true});
  await expect(image).toHaveAttribute('src',/#light$/);await expect(page.locator('#brand-local .pui-logo-mark > i').first()).toHaveCSS('background-color','rgb(74, 98, 200)');
  await page.evaluate(() => (window as unknown as {frameBrand: {set(value: string): void}}).frameBrand.set('dark'));
  await expect(image).toHaveAttribute('src',/#dark$/);await expect(page.locator('#brand-local .pui-logo-mark > i').first()).toHaveCSS('background-color','rgb(134, 182, 242)');
  await page.evaluate(() => (window as unknown as {frameBrand: {set(value: string): void}}).frameBrand.set('system'));await page.emulateMedia({colorScheme: 'light'});await expect(image).toHaveAttribute('src',/#light$/);
  expect(await page.evaluate(() => (window as unknown as {frameBrand: {stable(): boolean}}).frameBrand.stable())).toBe(true);
  expect(await page.locator('html').getAttribute('data-appearance')).toBeNull();
});

test('mobile drawer traps native focus, respects modal precedence and cleans borrowed references', async ({page}) => {
  await page.setViewportSize({width: 390,height: 844});
  await page.evaluate(async () => {
    const path = '/src/parts/index.ts';const p = await import(path);
    const first = p.createButtonPart({variant: 'navigation',icon: 'file',label: 'First rail action'}),last = p.createButtonPart({variant: 'navigation',icon: 'settings',label: 'Last rail action'});
    const rail = p.createSideRailPart({children: [first,last]}),trigger = p.createButtonPart({variant: 'drawer-trigger',icon: 'menu',label: 'Open sidebar'});
    const main = p.createMainPart({children: [p.createTopbarPart({children: [trigger,p.createTextPart({text: 'Header'})]})]}),frame = p.createFramePart({children: []});
    const drawer = p.createDrawerPart({scope: frame,panel: rail,content: main,trigger}),dialog = p.createDialogPart({title: 'Nested modal',children: [p.createButtonPart({label: 'Modal action'})]});frame.replace([rail,drawer,main,dialog]);
    const mount = document.body.appendChild(document.createElement('div'));mount.id = 'drawer-mount';const tree = p.mountParts(mount,frame);
    (window as unknown as {frameDrawer: {set(open: boolean): void;openModal(): void;destroy(): void}}).frameDrawer = {set: drawer.setOpen,openModal: dialog.open,destroy: tree.destroy};
  });
  const trigger = page.getByRole('button',{name: 'Open sidebar',exact: true}),first = page.getByRole('button',{name: 'First rail action',exact: true}),last = page.getByRole('button',{name: 'Last rail action',exact: true});
  await expect(page.locator('aside')).toHaveJSProperty('inert',true);await trigger.click();await expect(first).toBeFocused();await expect(page.locator('main')).toHaveJSProperty('inert',true);
  await last.focus();await page.keyboard.press('Tab');await expect(first).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(last).toBeFocused();
  await page.evaluate(() => (window as unknown as {frameDrawer: {openModal(): void}}).frameDrawer.openModal());await page.keyboard.press('Escape');await expect(page.getByRole('dialog',{name: 'Nested modal'})).not.toBeVisible();await expect(page.locator('aside')).toHaveClass(/pui-open/);
  await page.keyboard.press('Escape');await expect(trigger).toBeFocused();await expect(page.locator('main')).toHaveJSProperty('inert',false);
  await trigger.click();await page.mouse.click(370,300);await expect(trigger).toBeFocused();
  await page.setViewportSize({width: 1280,height: 800});await first.focus();await page.setViewportSize({width: 390,height: 844});await expect(trigger).toBeFocused();
  await page.evaluate(() => (window as unknown as {frameDrawer: {destroy(): void}}).frameDrawer.destroy());await page.setViewportSize({width: 900,height: 600});await expect(page.locator('#drawer-mount')).toBeEmpty();
});

test('one frame tree owns a composed settings dialog with one theme owner and original host styles', async ({page}) => {
  const result = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',settingsPath = '/examples/assemblies/settings.ts';const p = await import(path),{composeSettings} = await import(settingsPath);
    const settings = composeSettings({baseUrl: 'https://example.test',hasApiKey: false,ready: true});
    const frame = p.createFramePart({children: [p.createSideRailPart({children: []}),p.createMainPart({children: []}),settings.part]});
    const mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,frame,{appearance: 'dark'});settings.open();
    const dialog = mount.querySelector('dialog')!,result = {scopeCount: mount.querySelectorAll('.pui').length,dialogParent: dialog.parentElement === mount.firstElementChild,background: getComputedStyle(dialog).backgroundColor,htmlAppearance: document.documentElement.getAttribute('data-appearance')};
    tree.destroy();return {...result,empty: !mount.firstChild,closed: !settings.isOpen()};
  });
  expect(result).toEqual({scopeCount: 0,dialogParent: true,background: 'rgb(34, 37, 42)',htmlAppearance: null,empty: true,closed: true});
});
