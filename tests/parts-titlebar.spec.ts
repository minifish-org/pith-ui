import {test,expect,type Page} from '@playwright/test';

async function mountFrame(page: Page, overlay: boolean): Promise<void> {
  await page.goto('/tests/fixture.html');
  await page.addStyleTag({content: ':root { --mygo-titlebar-height: 52px; --mygo-titlebar-inset-left: 92px; --mygo-titlebar-inset-right: 0px; }'});
  await page.evaluate(async overlay => {
    const partsPath = '/src/parts/index.ts',recipesPath = '/src/recipes/index.ts';
    const p = await import(partsPath),r = await import(recipesPath),actions: string[] = [];
    const draft = p.createTextareaPart({label: 'Retained draft',value: 'Existing 中文 draft'});
    const frame = r.composeFrame({workspace: 'Workspace',conversation: 'Conversation',compactDisabled: false,
      navigation: {groups: [{id: 'workspace',name: 'Workspace',path: '/workspace',selected: true,children: [{id: 'chat',title: 'Conversation',active: true}]}],empty: null}},
      {onAction(action: string) {actions.push(action);}}, {main: [draft],...(overlay ? {titlebar: 'overlay'} : {})});
    const mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,frame.part);
    Object.assign(window,{titlebarTest: {frame,tree,actions}});
  },overlay);
}

test('ordinary frames retain their original titlebar and sidebar without native decoration',async ({page}) => {
  await mountFrame(page,false);
  await expect(page.locator('.pui-topbar')).toHaveCSS('height','79px');
  await expect(page.locator('.pui-native-titlebar')).toHaveCount(0);
  await expect(page.locator('.pui-sidebar')).toHaveCSS('padding-top','24px');
  expect(await page.locator('.pui-topbar').evaluate(node => getComputedStyle(node).getPropertyValue('--app-region').trim())).toBe('');
});

test('overlay frames share one native titlebar without adding buttons or panels',async ({page}) => {
  await mountFrame(page,true);
  const header = page.locator('.pui-topbar'),native = page.locator('.pui-native-titlebar');
  await expect(header).toHaveCSS('height','52px');
  await expect(native).toHaveCount(1);
  const geometry = await page.evaluate(() => {
    const root = document.querySelector('.pui-app')!,sidebar = root.querySelector('.pui-sidebar')!,
      strip = root.querySelector('.pui-native-titlebar')!,header = root.querySelector('.pui-topbar')!,brand = root.querySelector('.pui-brand')!;
    const box = (node: Element) => {const {x,y,width,height} = node.getBoundingClientRect();return {x,y,width,height};};
    return {root: box(root),sidebar: box(sidebar),strip: box(strip),header: box(header),brand: box(brand),
      stripDrag: getComputedStyle(strip).getPropertyValue('--app-region').trim(),headerDrag: getComputedStyle(header).getPropertyValue('--app-region').trim(),
      actionDrag: getComputedStyle(header.querySelector('button')!).getPropertyValue('--app-region').trim(),
      brands: root.querySelectorAll('.pui-brand').length,panels: root.querySelectorAll('aside').length,stripChildren: strip.childElementCount};
  });
  expect(geometry.strip.y).toBe(geometry.root.y);
  expect(geometry.strip.height).toBe(52);
  expect(geometry.strip.width).toBe(geometry.sidebar.width);
  expect(geometry.header.y).toBe(geometry.strip.y);
  expect(geometry.brand.y).toBeGreaterThanOrEqual(geometry.strip.y + geometry.strip.height);
  expect(geometry).toMatchObject({stripDrag: 'drag',headerDrag: 'drag',actionDrag: 'no-drag',brands: 1,panels: 1,stripChildren: 0});
  await page.getByRole('button',{name: 'Compress context',exact: true}).click();
  expect(await page.evaluate(() => (window as any).titlebarTest.actions)).toEqual(['compact']);
});

test('native fullscreen metrics preserve the draft and remove only the window-control reservation',async ({page}) => {
  await mountFrame(page,true);
  const draft = page.getByRole('textbox',{name: 'Retained draft',exact: true});
  await draft.fill('Unsaved 中文 input');
  await draft.evaluate((node: HTMLTextAreaElement) => node.setSelectionRange(2,7));
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--mygo-titlebar-height','0px');
    document.documentElement.style.setProperty('--mygo-titlebar-inset-left','0px');
    (window as any).titlebarTest.frame.update({workspace: 'Workspace',conversation: 'Updated title',navigation: {groups: [],empty: 'workspaces'}});
  });
  await expect(page.locator('.pui-native-titlebar')).toHaveCSS('height','0px');
  await expect(page.locator('.pui-sidebar')).toHaveCSS('padding-top','24px');
  await expect(page.locator('.pui-topbar')).toHaveCSS('height','52px');
  await expect(draft).toBeFocused();await expect(draft).toHaveValue('Unsaved 中文 input');
  expect(await draft.evaluate((node: HTMLTextAreaElement) => [node.selectionStart,node.selectionEnd])).toEqual([2,7]);
  await page.evaluate(() => (window as any).titlebarTest.tree.destroy());
  await expect(page.locator('.pui-native-titlebar')).toHaveCount(0);
});

test('narrow overlay titlebars avoid the native controls and preserve drawer actions',async ({page}) => {
  await page.setViewportSize({width: 390,height: 844});await mountFrame(page,true);
  const trigger = page.getByRole('button',{name: 'Open sidebar',exact: true});
  const triggerBox = await trigger.boundingBox();
  expect(triggerBox!.x).toBeGreaterThanOrEqual(92);
  await trigger.click();await expect(page.locator('.pui-sidebar')).toHaveClass(/pui-open/);
  await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
  await expect(page.locator('.pui-main')).toHaveJSProperty('inert',false);
});

test('unknown titlebar modes fail before acquiring caller content',async ({page}) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path),child = p.createTextPart({text: 'Still reusable'});
    let rejected = false;
    try {p.createFramePart({children: [child],titlebar: 'custom'});} catch {rejected = true;}
    const mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,child),text = mount.textContent;
    tree.destroy();return {rejected,text};
  });
  expect(result).toEqual({rejected: true,text: 'Still reusable'});
});
