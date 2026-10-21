import {test,expect} from '@playwright/test';

test('file browser preserves input and lazy disclosures while routing original workspace targets',async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const partsPath = '/src/parts/index.ts',recipesPath = '/src/recipes/index.ts',p = await import(partsPath),r = await import(recipesPath);
    let state = {workspaceId: 'one',location: 'Server workspace: /srv/one',query: '',directories: [{path: '',expanded: true,entries: [{path: 'docs',name: 'docs',directory: true},{path: 'README.md',name: 'README.md',directory: false}]}],capabilities: {copyPathLabel: 'Copy server path'}};
    const events: unknown[] = [];
    const browser = r.composeFileBrowser(state,{onSearch(query: string) {events.push(['search',query]);},onToggle(target: unknown,expanded: boolean) {events.push(['toggle',target,expanded]);},onAction(action: string,target: unknown) {events.push([action,target]);},onRefresh() {events.push(['refresh']);}});
    const frame = r.composeFrame({navigation: {groups: [],empty: 'workspaces'}},{},{tools: {label: 'Workspace files',children: [browser.part]}});
    const tree = p.mountParts(document.body.appendChild(document.createElement('div')),frame.part);frame.setToolsOpen(true);
    Object.assign(window,{fileBrowser: {browser,tree,events,state,update(next: any) {state = {...state,...next};browser.update(state);}}});
  });
  const directory = page.getByRole('button',{name: 'docs',exact: true}),search = page.getByRole('searchbox',{name: 'Find workspace files',exact: true});
  await directory.click();expect(await page.evaluate(() => (window as any).fileBrowser.events)).toEqual([['toggle',{workspaceId: 'one',path: 'docs'},true]]);
  await search.fill('中文');await search.evaluate((node: HTMLInputElement) => node.setSelectionRange(1,2));
  await page.evaluate(() => {const h = (window as any).fileBrowser;h.update({directories: [...h.state.directories,{path: 'docs',expanded: true,entries: [{path: 'docs/中文.md',name: '中文.md',directory: false}]}]});});
  await expect(directory).toHaveAttribute('aria-expanded','true');await expect(search).toBeFocused();await expect(search).toHaveValue('中文');
  expect(await search.evaluate((node: HTMLInputElement) => [node.selectionStart,node.selectionEnd])).toEqual([1,2]);
  await page.getByRole('button',{name: 'Actions for docs/中文.md',exact: true}).click();
  await expect(page.getByRole('menuitem',{name: 'Reveal',exact: true})).toHaveCount(0);
  await page.getByRole('menuitem',{name: 'Insert reference',exact: true}).click();
  expect(await page.evaluate(() => (window as any).fileBrowser.events.at(-1))).toEqual(['reference',{workspaceId: 'one',path: 'docs/中文.md'}]);
  await page.getByRole('button',{name: 'Actions for README.md',exact: true}).click();
  await page.evaluate(() => (window as any).fileBrowser.update({workspaceId: 'two',location: '/srv/two',query: '',directories: [{path: '',expanded: true,entries: [{path: 'other.txt',name: 'other.txt',directory: false}]}]}));
  await expect(page.getByRole('menu')).toBeHidden();await expect(search).toHaveValue('');await expect(page.getByRole('button',{name: 'other.txt',exact: true})).toBeVisible();
  await page.getByRole('button',{name: 'other.txt',exact: true}).click();
  expect(await page.evaluate(() => (window as any).fileBrowser.events.at(-1))).toEqual(['preview',{workspaceId: 'two',path: 'other.txt'}]);
  await page.evaluate(() => (window as any).fileBrowser.tree.destroy());await expect(page.locator('.pui-app')).toHaveCount(0);
});
