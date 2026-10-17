import {test, expect, type Page} from '@playwright/test';

type Result = {ok: true} | {ok: false; error: string};
interface Handle {part: unknown; open(): void; close(): void; isOpen(): boolean; destroy(): void; fail(message: string): void}
interface Editor extends Handle {read(): {name: string; content: string}}
interface Inventory extends Handle {read(): {workspace: {id: string}}}
interface Loading extends Handle {update(state: {error?: string}): void}
interface CompositionHarness {
  editor: Editor; inventory: Inventory; loading: Loading;
  mounted: {setAppearance(appearance: 'light' | 'dark' | 'system'): void; destroy(): void};
  closed: {editor: number; inventory: number; loading: number};
  saves: number; refreshes: number; creates: number; releases: Array<(result: Result) => void>;
  expectedDark: {dialog: string; field: string; text: string}; field?: HTMLTextAreaElement;
}
declare global {interface Window {resourceCompositionHarness: CompositionHarness}}

async function setup(page: Page): Promise<void> {
  await page.goto('/tests/fixture.html');
  await page.emulateMedia({colorScheme: 'light'});
  await page.evaluate(async () => {
    const partsPath = '/src/parts/index.ts',editorPath = '/examples/assemblies/resource-editor.ts',inventoryPath = '/examples/assemblies/resource-inventory.ts',appPath = '/src/app/index.ts';
    const p = await import(partsPath),edit = await import(editorPath),resources = await import(inventoryPath),{createApplication} = await import(appPath);
    const state = {workspaceId: 'w1',workspacePath: '/demo/project',path: '/demo/project/.pi/skills/inspect/SKILL.md',kind: 'skill',name: 'inspect',content: '# Original content 中文',editable: true,workspaceBusy: false};
    const baselineMount = document.body.appendChild(document.createElement('div')),baseline = createApplication(baselineMount,{appearance: 'dark'});
    baseline.resources.openEditor(state);
    const oldDialog = baselineMount.querySelector('dialog[open]')!,oldField = oldDialog.querySelector('textarea')!;
    const expectedDark = {dialog: getComputedStyle(oldDialog).backgroundColor,field: getComputedStyle(oldField).backgroundColor,text: getComputedStyle(oldField).color};
    baseline.destroy();baselineMount.remove();
    const h = {closed: {editor: 0,inventory: 0,loading: 0},saves: 0,refreshes: 0,creates: 0,releases: [],expectedDark} as unknown as CompositionHarness;
    h.editor = edit.composeResourceEditor(state,{onSubmit() {h.saves++;return new Promise<Result>(resolve => h.releases.push(resolve));},onClose() {h.closed.editor++;}});
    h.inventory = resources.composeResourcesInventory({workspace: {id: 'w1',name: 'Original workspace',path: '/demo/project'},instructions: [],skills: [],templates: [],diagnostics: [],canCreateInstructions: true},
      {onRefresh() {h.refreshes++;return new Promise<Result>(resolve => h.releases.push(resolve));},onCreate() {h.creates++;return new Promise<Result>(resolve => h.releases.push(resolve));},onClose() {h.closed.inventory++;}});
    h.loading = edit.composeResourceLoading({kind: 'skill'},{onClose() {h.closed.loading++;}});
    const mount = document.body.appendChild(document.createElement('div'));mount.id = 'resource-composition-root';
    h.mounted = p.mountParts(mount,p.createStackPart({children: [h.editor.part,h.inventory.part,h.loading.part]}),{appearance: 'light'});
    window.resourceCompositionHarness = h;
  });
}

test('dialog disposal is reported once through destruction by its opaque parent', async ({page}) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path),events: string[] = [];
    const field = p.createTextareaPart({value: 'Initial'});
    const dialog = p.createDialogPart({title: 'Owned dialog',children: [field],onDispose() {events.push(field.read());}});
    const mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,p.createStackPart({children: [dialog]}));dialog.open();field.reset('Retained draft');
    tree.destroy();dialog.destroy();tree.destroy();
    return {events,remaining: mount.querySelectorAll('dialog,textarea').length};
  });
  expect(result).toEqual({events: ['Retained draft'],remaining: 0});
});

test('resource compositions share one theme owner and live appearance without resetting the owned draft', async ({page}) => {
  await setup(page);await page.evaluate(() => window.resourceCompositionHarness.editor.open());
  const field = page.getByRole('textbox',{name: 'Markdown',exact: true});await field.fill('# Unsaved shared draft 中文');
  await field.evaluate(node => {const field = node as HTMLTextAreaElement;field.focus();field.setSelectionRange(2,14);window.resourceCompositionHarness.field = field;});
  await page.evaluate(() => window.resourceCompositionHarness.mounted.setAppearance('dark'));
  expect(await page.evaluate(() => {const h = window.resourceCompositionHarness,root = document.querySelector('#resource-composition-root')!,dialog = root.querySelector('dialog[open]')!,field = dialog.querySelector('textarea')!;return {colors: {dialog: getComputedStyle(dialog).backgroundColor,field: getComputedStyle(field).backgroundColor,text: getComputedStyle(field).color},expected: h.expectedDark,sameField: field === h.field,draft: field.value,selection: [field.selectionStart,field.selectionEnd],focus: document.activeElement === field,themeOwners: root.querySelectorAll('[data-appearance]').length + Number(root.hasAttribute('data-appearance')),directDialogs: [...root.firstElementChild!.children].every(node => node.localName === 'dialog')};})).toMatchObject({sameField: true,draft: '# Unsaved shared draft 中文',selection: [2,14],focus: true,themeOwners: 1,directDialogs: true});
  expect(await page.evaluate(() => {const h = window.resourceCompositionHarness,dialog = document.querySelector('dialog[open]')!,field = dialog.querySelector('textarea')!;return {dialog: getComputedStyle(dialog).backgroundColor,field: getComputedStyle(field).backgroundColor,text: getComputedStyle(field).color};})).toEqual(await page.evaluate(() => window.resourceCompositionHarness.expectedDark));
  await page.evaluate(() => {const h = window.resourceCompositionHarness;h.editor.close();h.inventory.open();});
  await expect(page.getByRole('dialog',{name: 'Workspace resources',exact: true})).toBeVisible();
  expect(await page.getByRole('dialog').evaluate(node => getComputedStyle(node).backgroundColor)).toBe(await page.evaluate(() => window.resourceCompositionHarness.expectedDark.dialog));
  await page.evaluate(() => window.resourceCompositionHarness.mounted.destroy());
});

test('parent destruction saves editor draft and retires its pending result exactly once', async ({page}) => {
  await setup(page);await page.evaluate(() => window.resourceCompositionHarness.editor.open());
  await page.getByRole('textbox',{name: 'Markdown',exact: true}).fill('# Draft survives parent destruction');await page.getByRole('button',{name: 'Save',exact: true}).click();
  await page.evaluate(() => {const h = window.resourceCompositionHarness;h.mounted.destroy();h.mounted.destroy();h.releases[0]!({ok: false,error: 'Late write failure'});h.editor.destroy();});
  await expect(page.locator('dialog,textarea')).toHaveCount(0);
  expect(await page.evaluate(() => {const h = window.resourceCompositionHarness;return {draft: h.editor.read(),open: h.editor.isOpen(),saves: h.saves,closed: h.closed};})).toEqual({draft: {name: '',content: '# Draft survives parent destruction'},open: false,saves: 1,closed: {editor: 1,inventory: 0,loading: 0}});
});

test('parent destruction retires inventory refresh and creation while unopened siblings stay silent', async ({page}) => {
  await setup(page);await page.evaluate(() => window.resourceCompositionHarness.inventory.open());
  await page.getByRole('button',{name: 'Refresh',exact: true}).click();await page.getByRole('button',{name: 'Add skill',exact: true}).click();
  await page.evaluate(() => {const h = window.resourceCompositionHarness;h.mounted.destroy();h.releases[0]!({ok: false,error: 'Late refresh'});h.releases[1]!({ok: false,error: 'Late creation'});h.inventory.fail('Retired error');h.inventory.destroy();});
  await expect(page.locator('dialog,article')).toHaveCount(0);
  expect(await page.evaluate(() => {const h = window.resourceCompositionHarness;return {owner: h.inventory.read().workspace.id,open: h.inventory.isOpen(),refreshes: h.refreshes,creates: h.creates,closed: h.closed};})).toEqual({owner: 'w1',open: false,refreshes: 1,creates: 1,closed: {editor: 0,inventory: 1,loading: 0}});
});

test('loading composition follows shared appearance and ignores updates after parent disposal', async ({page}) => {
  await setup(page);await page.evaluate(() => {const h = window.resourceCompositionHarness;h.loading.open();h.mounted.setAppearance('dark');h.loading.update({error: 'Read rejected'});h.loading.fail('Frame failed');});
  await expect(page.getByText('Read rejected',{exact: true})).toBeVisible();await expect(page.getByText('Frame failed',{exact: true})).toBeVisible();
  expect(await page.getByRole('dialog').evaluate(node => getComputedStyle(node).backgroundColor)).toBe(await page.evaluate(() => window.resourceCompositionHarness.expectedDark.dialog));
  await page.evaluate(() => {const h = window.resourceCompositionHarness;h.mounted.destroy();h.loading.update({error: 'Late read'});h.loading.fail('Late failure');h.loading.open();h.loading.destroy();});
  await expect(page.locator('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => window.resourceCompositionHarness.closed)).toEqual({editor: 0,inventory: 0,loading: 1});
});
