import {test, expect} from '@playwright/test';

test('published recipes share the root ownership tree and retain a failed resource draft', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const path = '/tests/recipes-fixture.ts';const {parts: p, recipes: r} = await import(path);
    const frame = r.composeFrame({navigation: {groups: [], empty: 'workspaces'}});
    const mount = document.body.appendChild(document.createElement('div')), tree = p.mountParts(mount, frame.part, {appearance: 'dark'});
    const host = r.createDialogHost(frame);
    const state = {workspaceId: 'one',workspacePath: '/one',path: '/one/AGENTS.md',kind: 'instructions',content: 'Original',editable: true,workspaceBusy: false};
    let complete: (value: {ok: false;error: string}) => void;
    const editor = host.open('editor', (onClose: () => void) => r.composeResourceEditor(state, {onClose,onSubmit: () => new Promise(resolve => {complete = resolve;})}), (value: {open(): void}) => value.open());
    Object.assign(window, {recipeTest: {editor,state,tree,fail: () => complete({ok: false,error: 'Save failed'})}});
  });
  const text = page.locator('dialog[open] textarea');
  await text.fill('Unsaved 中文 draft');
  await text.evaluate((node: HTMLTextAreaElement) => node.setSelectionRange(2, 7));
  await page.locator('dialog[open] button[type=submit]').click();
  await page.evaluate(() => {const h = (window as any).recipeTest;h.editor.update({...h.state, saveDisabled: true});h.fail();});
  await expect(page.locator('dialog[open]')).toContainText('Save failed');
  await expect(text).toHaveValue('Unsaved 中文 draft');
  expect(await text.evaluate((node: HTMLTextAreaElement) => [node.selectionStart,node.selectionEnd])).toEqual([2,7]);
  await page.evaluate(() => (window as any).recipeTest.tree.destroy());
  await expect(page.locator('dialog')).toHaveCount(0);
});

test('a nested replacement wins and every dialog close callback runs once', async ({page}) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async () => {
    const path = '/tests/recipes-fixture.ts';const {parts: p, recipes: r} = await import(path);
    const frame = r.composeFrame({navigation: {groups: [],empty: 'workspaces'}}),mount = document.body.appendChild(document.createElement('div'));
    const tree = p.mountParts(mount,frame.part),host = r.createDialogHost(frame),events: string[] = [];
    const open = (title: string,onClose?: () => void): any => host.open('feature', (release: () => void) => {
      const dialog = p.createDialogPart({title,children: [],onClose: release,onDispose: release});
      return {part: dialog,isOpen: dialog.isOpen,close: dialog.close,destroy: dialog.destroy,open: dialog.open};
    }, (value: {open(): void}) => value.open(), () => {events.push(title);onClose?.();});
    open('First', () => open('Winner'));
    const superseded = open('Outer');
    const before = {title: mount.querySelector('dialog[open]')?.textContent,open: superseded.isOpen(),events: [...events]};
    tree.destroy();host.destroy();
    return {before,events,remaining: mount.childElementCount};
  });
  expect(result.before.title).toContain('Winner');
  expect(result.before.open).toBe(false);
  expect(result.before.events).toEqual(['First','Outer']);
  expect(result.events).toEqual(['First','Outer','Winner']);
  expect(result.remaining).toBe(0);
});

test('root teardown retires the dialog host before close callbacks can reopen it', async ({page}) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async () => {
    const path = '/tests/recipes-fixture.ts';const {parts: p, recipes: r} = await import(path);
    const frame = r.composeFrame({navigation: {groups: [],empty: 'workspaces'}}),mount = document.body.appendChild(document.createElement('div'));
    const tree = p.mountParts(mount,frame.part),host = r.createDialogHost(frame);let reopened = false,closed = 0;
    const factory = (release: () => void) => {const dialog = p.createDialogPart({title: 'Owned',children: [],onDispose: release,onClose: release});return {part: dialog,isOpen: dialog.isOpen,open: dialog.open,close: dialog.close,destroy: dialog.destroy};};
    host.open('feature',factory,(value: {open(): void}) => value.open(),() => {closed++;const late = host.open('feature',factory,(value: {open(): void}) => {reopened = true;value.open();});late.destroy();});
    tree.destroy();tree.destroy();host.destroy();
    return {reopened,closed,remaining: mount.childElementCount};
  });
  expect(result).toEqual({reopened: false,closed: 1,remaining: 0});
});
