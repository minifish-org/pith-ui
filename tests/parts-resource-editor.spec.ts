import {test, expect, type Page} from '@playwright/test';

type Result = {ok: true} | {ok: false; error: string};
interface ResourceState {
  workspaceId: string; workspacePath: string; path?: string; kind: 'instructions' | 'skill' | 'template';
  name?: string; content: string; editable: boolean; workspaceBusy: boolean; disabled?: boolean; error?: string;
}
interface Draft {name: string; content: string}
interface Target {workspaceId: string; kind: string; name: string; path: string}
interface ResourceHandle {read(): Draft; update(state: ResourceState): void; fail(message: string): void; close(): void; isOpen(): boolean; destroy(): void}
interface LoadingHandle {update(state: {error?: string}): void; fail(message: string): void; close(): void; isOpen(): boolean; destroy(): void}
interface ResourceHarness {
  editor: ResourceHandle;
  initial: ResourceState;
  saves: Draft[];
  deletes: Target[];
  closed: number;
  savesReleased: Array<(result: Result) => void>;
  deletesReleased: Array<(result: Result) => void>;
  control?: HTMLTextAreaElement;
  loading?: LoadingHandle;
  committedWrites: number;
  readsAfterWrite: number;
}
declare global {interface Window {resourcePartsHarness: ResourceHarness}}
const create: ResourceState = {workspaceId: 'w1', workspacePath: '/demo/project', kind: 'skill', content: '---\nname: my-skill\ndescription: Inspect this workspace.\n---\n\nPreserve behavior 中文.\n', editable: true, workspaceBusy: false};
const newInstructions: ResourceState = {...create, kind: 'instructions', content: '# Workspace instructions\n\nPreserve the original workspace.'};
const newTemplate: ResourceState = {...create, kind: 'template', content: '# Summarize\n\nSummarize the original workspace.'};
const existing: ResourceState = {...create, name: 'inspect', path: '/demo/project/.pi/skills/inspect/SKILL.md'};
const inherited: ResourceState = {...create, kind: 'instructions', path: '/parent/AGENTS.md', content: '# Inherited instructions\n\nPreserve the original workspace.', editable: false};
const busy: ResourceState = {...existing, editable: false, workspaceBusy: true};

async function openResource(page: Page, old: boolean, state: ResourceState = create, appearance: 'light' | 'dark' = 'light', committed = false, applicationContext = false): Promise<void> {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async ({old, state, appearance, committed, applicationContext}) => {
    document.documentElement.classList.add('pui'); document.documentElement.dataset.appearance = appearance; document.body.dataset.appearance = appearance;
    const opener = document.createElement('button'); opener.id = 'resource-opener'; opener.textContent = 'Resource opener'; document.body.append(opener); opener.focus();
    const mount = document.body.appendChild(document.createElement('div'));
    const h = {initial: state, saves: [], deletes: [], closed: 0, savesReleased: [], deletesReleased: [], committedWrites: 0, readsAfterWrite: 0} as unknown as ResourceHarness;
    const callbacks = {
      async onSubmit(draft: Draft): Promise<Result> {
        h.saves.push(draft);
        if (committed) {
          h.committedWrites++;
          // A following inventory read may fail after the business write has
          // committed. The callback reports that write's successful result.
          try {h.readsAfterWrite++; await Promise.reject(new Error('Inventory refresh failed'));} catch {}
          return {ok: true};
        }
        return new Promise(resolve => h.savesReleased.push(resolve));
      },
      onDelete(target: Target): Promise<Result> {h.deletes.push(target); return new Promise(resolve => h.deletesReleased.push(resolve));},
      onClose() {h.closed++;},
    };
    if (old) {
      const path = '/src/app/index.ts'; const {createApplication} = await import(path);
      const app = createApplication(mount, {appearance}); h.editor = app.resources.openEditor(state, callbacks);
    } else {
      // The production feature dialog is a direct child of the application's
      // flex root. WebKit serializes native automatic minimums differently in
      // a block parent even for fixed top-layer dialogs. Parity uses the actual
      // baseline parent; independent behavior tests keep an ordinary DIV mount.
      let recipeMount: HTMLElement = mount;
      if (applicationContext) {
        const path = '/src/app/index.ts'; const {createApplication} = await import(path);
        createApplication(mount, {appearance}); recipeMount = mount.querySelector<HTMLElement>('.pui-app')!;
      }
      const path = '/examples/assemblies/resource-editor.ts'; const {mountResourceEditor} = await import(path);
      h.editor = mountResourceEditor(recipeMount, state, callbacks, {appearance});
    }
    window.resourcePartsHarness = h;
  }, {old, state, appearance, committed, applicationContext});
  await expect(page.locator('dialog[open]')).toBeVisible();
}

async function openLoading(page: Page, old: boolean, appearance: 'light' | 'dark' = 'light', applicationContext = false): Promise<void> {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async ({old, appearance, applicationContext}) => {
    document.documentElement.classList.add('pui'); document.documentElement.dataset.appearance = appearance; document.body.dataset.appearance = appearance;
    const mount = document.body.appendChild(document.createElement('div'));
    const h = {closed: 0} as ResourceHarness;
    if (old) {
      const path = '/src/app/index.ts'; const {createApplication} = await import(path); const app = createApplication(mount, {appearance});
      h.loading = app.resources.openEditorLoading({kind: 'skill'}, {onClose() {h.closed++;}});
    } else {
      let recipeMount: HTMLElement = mount;
      if (applicationContext) {
        const path = '/src/app/index.ts'; const {createApplication} = await import(path);
        createApplication(mount, {appearance}); recipeMount = mount.querySelector<HTMLElement>('.pui-app')!;
      }
      const path = '/examples/assemblies/resource-editor.ts'; const {mountResourceLoading} = await import(path);
      h.loading = mountResourceLoading(recipeMount, {kind: 'skill'}, {onClose() {h.closed++;}}, {appearance});
    }
    window.resourcePartsHarness = h;
  }, {old, appearance, applicationContext});
  await expect(page.getByRole('dialog', {name: 'Create skill', exact: true})).toBeVisible();
}

async function presentation(page: Page): Promise<unknown> {
  return page.evaluate(async () => {
    await document.fonts.ready;
    for (const animation of document.getAnimations()) if (animation.effect?.getTiming().iterations !== Infinity) animation.finish();
    const dialog = document.querySelector('dialog[open]')!, origin = dialog.getBoundingClientRect();
    const inspect = (node: Element) => {
      const rect = node.getBoundingClientRect(), style = getComputedStyle(node);
      return {tag: node.localName, text: [...node.childNodes].filter(child => child.nodeType === Node.TEXT_NODE).map(child => child.textContent).join('').trim(),
        box: [rect.x - origin.x, rect.y - origin.y, rect.width, rect.height].map(value => Math.round(value * 100) / 100),
        styles: ['display','font-family','font-size','font-weight','line-height','color','background-color','margin-top','margin-bottom','padding-top','padding-right','padding-bottom','padding-left','border-top-width','border-top-color','border-radius','gap','overflow-x','overflow-y','min-height','max-height','resize'].map(key => style.getPropertyValue(key)),
        ...(node instanceof HTMLInputElement || node instanceof HTMLTextAreaElement ? {value: node.value, readOnly: node.readOnly, disabled: node.disabled, required: node.required} : {}),
        ...(node instanceof HTMLButtonElement ? {label: node.getAttribute('aria-label'), disabled: node.disabled, type: node.type} : {})};
    };
    // Body/controller marker classes do not set styles. Compare every visible
    // semantic descendant plus the whole modal geometry and all SVG path data.
    const meaningful = [...dialog.querySelectorAll('h2, label, input, textarea, p, button, .pui-modal-footer')].filter(node => !node.hasAttribute('hidden'));
    return {dialog: inspect(dialog), meaningful: meaningful.map(inspect), svg: [...dialog.querySelectorAll('svg')].map(svg => svg.innerHTML),
      modalClasses: [...dialog.classList].sort(), footerOrder: [...dialog.querySelectorAll('.pui-modal-footer button')].map(button => button.textContent),
      nativeLabel: [...dialog.querySelectorAll('label')].map(label => ({text: label.childNodes[0]?.textContent, control: label.control?.localName, nested: !!label.querySelector('input')})),
      overflow: [dialog.clientWidth, dialog.scrollWidth, dialog.clientHeight, dialog.scrollHeight]};
  });
}

test('small feature dialog, paragraph status, path text and owned native wrapping label are sufficient without DOM ports', async ({page}) => {
  await page.goto('/tests/fixture.html');
  const value = await page.evaluate(async () => {
    const path = '/src/parts/index.ts'; const parts = await import(path);
    const field = parts.createInputPart({label: 'Name', required: true, pattern: '[A-Za-z0-9]([A-Za-z0-9_]|-)*'});
    const labelled = parts.createLabelledFieldPart({label: 'Name', control: field});
    const location = parts.createTextPart({role: 'path-paragraph', text: '/demo/project'});
    const status = parts.createFeedbackPart({presentation: 'paragraph', tone: 'info', message: 'Loading…'});
    const dialog = parts.createDialogPart({purpose: 'feature', title: 'Create skill', children: [location, labelled, status]});
    const mount = document.body.appendChild(document.createElement('div')); const tree = parts.mountParts(mount, dialog); dialog.open();
    const label = mount.querySelector('label')!, input = mount.querySelector('input')!;
    let duplicateRejected = false; try {parts.createStackPart({children: [field]});} catch {duplicateRejected = true;}
    const result = {width: mount.querySelector('dialog')!.getBoundingClientRect().width, labelChildren: [...label.childNodes].map(node => node.nodeType === Node.TEXT_NODE ? '#text' : (node as Element).localName),
      association: label.control === input, path: mount.querySelector('.pui-file-path')!.localName, status: mount.querySelector('[role=status]')!.localName,
      leaks: [field, labelled, dialog].map(part => Object.values(part).some(value => value instanceof Node)), duplicateRejected};
    tree.destroy(); return result;
  });
  expect(value).toEqual({width: 660, labelChildren: ['#text','input'], association: true, path: 'p', status: 'p', leaks: [false,false,false], duplicateRejected: true});
});

for (const appearance of ['light','dark'] as const) for (const [name, state] of Object.entries({create, newInstructions, newTemplate, existing, inherited, busy})) {
  test(`${appearance} resource ${name} assembly preserves the actual Desk feature editor`, async ({page}) => {
    await page.emulateMedia({colorScheme: appearance === 'dark' ? 'light' : 'dark'});
    await openResource(page, true, state, appearance); const old = await presentation(page);
    await openResource(page, false, state, appearance, false, true); expect(await presentation(page)).toEqual(old);
    await expect(page.locator('dialog[open] [aria-label^="Close"]')).toBeFocused();
  });
}

for (const viewport of [{width: 900,height: 568},{width: 390,height: 844}]) test(`resource editor ${viewport.width} keeps the original responsive scrolling and native form geometry`, async ({page}) => {
  await page.setViewportSize(viewport); await openResource(page, true); const old = await presentation(page);
  await openResource(page, false, create, 'light', false, true); expect(await presentation(page)).toEqual(old);
  await page.getByRole('button',{name: 'Save',exact: true}).scrollIntoViewIfNeeded();
  const box = await page.getByRole('button',{name: 'Save',exact: true}).boundingBox(); expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
});

for (const appearance of ['light','dark'] as const) test(`${appearance} resource loading and both error channels preserve the feature frame`, async ({page}) => {
  await openLoading(page, true, appearance); const loading = await presentation(page);
  await page.evaluate(() => window.resourcePartsHarness.loading!.update({error: 'Read rejected'})); const update = await presentation(page);
  await page.evaluate(() => window.resourcePartsHarness.loading!.fail('Frame failure')); const fail = await presentation(page);
  await openLoading(page, false, appearance, true); expect(await presentation(page)).toEqual(loading);
  await page.evaluate(() => window.resourcePartsHarness.loading!.update({error: 'Read rejected'})); expect(await presentation(page)).toEqual(update);
  await page.evaluate(() => window.resourcePartsHarness.loading!.fail('Frame failure')); expect(await presentation(page)).toEqual(fail);
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.evaluate(() => {const loading = window.resourcePartsHarness.loading!; loading.update({error: 'Late update'}); loading.fail('Late frame failure'); loading.destroy();});
  await expect(page.locator('dialog')).toHaveCount(0);
});

test('resource drafts, focus and selection survive metadata and read-only changes, and identity changes are ignored', async ({page}) => {
  await openResource(page, false);
  const name = page.getByRole('textbox',{name: 'Name',exact: true}), markdown = page.getByRole('textbox',{name: 'Markdown',exact: true});
  await name.fill('my-edited-skill'); await markdown.fill('# My unsaved content 中文');
  await markdown.evaluate(element => {const control = element as HTMLTextAreaElement; control.focus(); control.setSelectionRange(2,12); window.resourcePartsHarness.control = control;});
  await page.evaluate(() => {const h = window.resourcePartsHarness; h.editor.update({...h.initial,content: '# Late server content',error: 'Metadata notice'});});
  expect(await markdown.evaluate(element => ({same: element === window.resourcePartsHarness.control,focus: element === document.activeElement,selection: [(element as HTMLTextAreaElement).selectionStart,(element as HTMLTextAreaElement).selectionEnd]}))).toEqual({same: true,focus: true,selection: [2,12]});
  await expect(name).toHaveValue('my-edited-skill'); await expect(markdown).toHaveValue('# My unsaved content 中文');
  await page.evaluate(() => {const h = window.resourcePartsHarness; h.editor.update({...h.initial,workspaceId: 'other',workspacePath: '/other',kind: 'template',path: '/other/target.md',editable: false,content: '# Other target',error: 'Other target error'});});
  await expect(markdown).not.toHaveAttribute('readonly'); await expect(page.locator('form [role=alert]')).toHaveText('Metadata notice');
  await page.evaluate(() => {const h = window.resourcePartsHarness; h.editor.update({...h.initial,workspaceBusy: true});});
  await expect(name).toHaveAttribute('readonly',''); await expect(markdown).toHaveAttribute('readonly',''); await expect(page.getByRole('button',{name: 'Save',exact: true})).toBeDisabled();
});

test('new resource names keep native validation and one pending save across availability snapshots', async ({page}) => {
  await openResource(page, false); const name = page.getByRole('textbox',{name: 'Name',exact: true}), save = page.getByRole('button',{name: 'Save',exact: true});
  await save.click(); expect(await page.evaluate(() => window.resourcePartsHarness.saves)).toEqual([]);
  await name.fill('invalid name'); await save.click(); expect(await page.evaluate(() => window.resourcePartsHarness.saves)).toEqual([]);
  await name.fill('valid-name_2'); await save.click(); await expect(save).toBeDisabled();
  await page.evaluate(() => {const h = window.resourcePartsHarness; h.editor.update({...h.initial,disabled: true}); h.editor.update({...h.initial,disabled: false}); document.querySelector('dialog[open] form')!.dispatchEvent(new SubmitEvent('submit',{bubbles: true,cancelable: true}));});
  await expect(save).toBeDisabled(); expect(await page.evaluate(() => window.resourcePartsHarness.saves.length)).toBe(1);
  await page.evaluate(() => window.resourcePartsHarness.savesReleased[0]!({ok: false,error: 'Disk rejected write'}));
  await expect(page.locator('form [role=alert]')).toHaveText('Disk rejected write'); await expect(save).toBeEnabled();
  await expect(name).toHaveValue('valid-name_2');
});

test('inherited and busy openings preserve original button presence while read-only availability changes', async ({page}) => {
  await openResource(page, false, inherited);
  await expect(page.getByRole('textbox',{name: 'Markdown',exact: true})).toHaveAttribute('readonly','');
  await expect(page.getByRole('button',{name: 'Save',exact: true})).toHaveCount(0); await expect(page.getByRole('button',{name: 'Delete resource',exact: true})).toHaveCount(0);
  await expect(page.getByRole('button',{name: 'Close',exact: true})).toBeVisible();
  await page.evaluate(() => {const h = window.resourcePartsHarness; h.editor.update({...h.initial,editable: true});});
  await expect(page.getByRole('textbox',{name: 'Markdown',exact: true})).not.toHaveAttribute('readonly');
  await expect(page.getByRole('button',{name: 'Save',exact: true})).toHaveCount(0);
});

test('resource delete preserves its original target, guards repeated clicks, reports its own error, and save pending blocks deletion', async ({page}) => {
  await openResource(page, false, existing); const remove = page.getByRole('button',{name: 'Delete resource',exact: true});
  await remove.click(); await remove.click(); expect(await page.evaluate(() => window.resourcePartsHarness.deletes)).toEqual([{workspaceId: 'w1',kind: 'skill',name: 'inspect',path: '/demo/project/.pi/skills/inspect/SKILL.md'}]);
  await page.evaluate(() => window.resourcePartsHarness.deletesReleased[0]!({ok: false,error: 'Delete rejected'}));
  await expect(page.locator('form [role=alert]')).toHaveText('Delete rejected');
  await page.getByRole('button',{name: 'Save',exact: true}).click(); await expect(remove).toBeDisabled();
});

test('resource failure retains its draft, while closing retires late results and destruction is idempotent', async ({page}) => {
  await openResource(page, false, existing); const markdown = page.getByRole('textbox',{name: 'Markdown',exact: true});
  await markdown.fill('# Unsaved original target'); await page.getByRole('button',{name: 'Save',exact: true}).click();
  await page.evaluate(() => window.resourcePartsHarness.editor.close()); await expect(page.locator('dialog')).toHaveCount(0);
  await expect(page.locator('#resource-opener')).toBeFocused();
  await page.evaluate(() => {const h = window.resourcePartsHarness; h.savesReleased[0]!({ok: false,error: 'Retired failure'}); h.editor.update({...h.initial,error: 'Retired snapshot'}); h.editor.destroy(); h.editor.destroy();});
  expect(await page.evaluate(() => ({draft: window.resourcePartsHarness.editor.read(),open: window.resourcePartsHarness.editor.isOpen(),closed: window.resourcePartsHarness.closed}))).toEqual({draft: {name: '',content: '# Unsaved original target'},open: false,closed: 1});
  await expect(page.locator('dialog,textarea')).toHaveCount(0);
});

test('a committed resource write closes once even when its following inventory refresh fails', async ({page}) => {
  await openResource(page, false, existing, 'light', true); await page.getByRole('button',{name: 'Save',exact: true}).click();
  await expect(page.locator('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => ({writes: window.resourcePartsHarness.committedWrites,refreshes: window.resourcePartsHarness.readsAfterWrite,saves: window.resourcePartsHarness.saves.length,closed: window.resourcePartsHarness.closed}))).toEqual({writes: 1,refreshes: 1,saves: 1,closed: 1});
});
