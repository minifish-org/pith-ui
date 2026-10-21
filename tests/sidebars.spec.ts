import {test,expect} from '@playwright/test';

test('wide sidebars expand independently and preserve the composer and native controls',async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const partsPath = '/src/parts/index.ts',recipesPath = '/src/recipes/index.ts',p = await import(partsPath),r = await import(recipesPath);
    const draft = p.createTextareaPart({label: 'Draft',value: 'Keep 中文 text'});
    const frame = r.composeFrame({navigation: {groups: [],empty: 'workspaces'}},{},{titlebar: 'overlay',main: [draft],tools: {label: 'Workspace files',children: [p.createButtonPart({label: 'File'})]}});
    p.mountParts(document.body.appendChild(document.createElement('div')),frame.part);
    const dialogs = r.createDialogHost(frame);
    Object.assign(window,{openSidebarDialog() {dialogs.open('example',(onClose: () => void) => {const part = p.createDialogPart({title: 'Example',children: [],onClose});return {part,isOpen: part.isOpen,close: part.close,destroy: part.destroy};},(local: {part: {open(): void}}) => local.part.open());}});
    document.documentElement.style.setProperty('--mygo-titlebar-inset-left','92px');
  });
  const left = page.getByRole('button',{name: 'Toggle navigation',exact: true}),right = page.getByRole('button',{name: 'Toggle tools',exact: true});
  await expect(left).toHaveAttribute('aria-expanded','true');await expect(right).toHaveAttribute('aria-expanded','false');
  const main = page.locator('main'),wide = (await main.boundingBox())!.width;
  await right.click();await expect(right).toHaveAttribute('aria-expanded','true');await expect(left).toHaveAttribute('aria-expanded','true');
  await page.evaluate(() => (window as any).openSidebarDialog());await page.keyboard.press('Escape');
  await expect(left).toHaveAttribute('aria-expanded','true');await expect(right).toHaveAttribute('aria-expanded','true');
  expect((await main.boundingBox())!.width).toBeLessThan(wide);
  await left.click();await expect(left).toHaveAttribute('aria-expanded','false');await expect(right).toHaveAttribute('aria-expanded','true');
  expect((await left.boundingBox())!.x).toBeGreaterThanOrEqual(92);
  expect(await left.evaluate(node => getComputedStyle(node).getPropertyValue('--app-region').trim())).toBe('no-drag');
  await right.click();expect((await main.boundingBox())!.width).toBeGreaterThan(wide);
  await expect(page.getByRole('textbox',{name: 'Draft',exact: true})).toHaveValue('Keep 中文 text');
  await expect(left).toHaveText('');await expect(right).toHaveText('');
  await expect(left).toHaveAttribute('title','Toggle navigation');await expect(right).toHaveAttribute('title','Toggle tools');
});

test('phone sidebars exclude each other, dismiss with scrim and close, and restore focus after keyboard resize',async ({page}) => {
  await page.setViewportSize({width: 390,height: 844});
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const partsPath = '/src/parts/index.ts',recipesPath = '/src/recipes/index.ts',p = await import(partsPath),r = await import(recipesPath);
    const frame = r.composeFrame({navigation: {groups: [],empty: 'workspaces'}},{},{main: [p.createTextareaPart({label: 'Draft',value: 'Retained'})],tools: {label: 'Workspace files',children: [p.createButtonPart({label: 'File'})]}});
    const tree = p.mountParts(document.body.appendChild(document.createElement('div')),frame.part);
    Object.assign(window,{sidebars: {frame,tree}});
  });
  const left = page.getByRole('button',{name: 'Toggle navigation',exact: true}),right = page.getByRole('button',{name: 'Toggle tools',exact: true});
  await right.click();await expect(page.getByRole('button',{name: 'Close tools',exact: true})).toBeFocused();
  await page.evaluate(() => (window as any).sidebars.frame.setSidebarOpen(true));
  await expect(page.locator('.pui-sidebar.pui-open')).toHaveCount(1);
  await expect(page.getByRole('button',{name: 'File',exact: true})).not.toBeVisible();
  await page.getByRole('button',{name: 'Close navigation',exact: true}).click();await expect(left).toBeFocused();
  await right.click();await page.setViewportSize({width: 390,height: 390});
  await expect.poll(async () => (await page.locator('.pui-tools').boundingBox())!.height).toBeLessThanOrEqual(390);
  await page.locator('.pui-sidebar-scrim.pui-visible').click({position: {x: 5,y: 300}});await expect(right).toBeFocused();
  await expect(page.getByRole('textbox',{name: 'Draft',exact: true})).toHaveValue('Retained');
  await page.evaluate(() => (window as any).sidebars.tree.destroy());await expect(page.locator('.pui-app')).toHaveCount(0);
});
