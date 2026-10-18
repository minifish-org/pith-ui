import {test, expect, type Page} from '@playwright/test';

type Kind = 'instructions' | 'skill' | 'template';
type Result = {ok: true} | {ok: false; error: string};
interface Entry {name: string; path: string; description?: string; content?: string}
interface Target {workspaceId: string; kind: Kind; name: string; path: string}
interface InventoryState {
  workspace: {id: string; name: string; path: string}; instructions: Entry[]; skills: Entry[]; templates: Entry[];
  diagnostics: string[]; canCreateInstructions?: boolean; loading?: boolean; error?: string; busy?: boolean;
}
interface InventoryHandle {read(): InventoryState; update(state: InventoryState): void; fail(message: string): void; close(): void; isOpen(): boolean; destroy(): void}
interface InventoryHarness {
  initial: InventoryState; session: InventoryHandle; actions: Array<{action: string; target?: Target | Kind; frozen?: boolean}>;
  releases: Array<(result: Result) => void>; closed: number;
  retained?: {row: Element; details: HTMLDetailsElement; pre: HTMLElement; text: Node; focus: Element; preScroll: number; dialogScroll: number};
}
declare global {interface Window {inventoryPartsHarness: InventoryHarness}}
const empty: InventoryState = {workspace: {id: 'w1',name: 'Original workspace 中文',path: '/demo/project'}, instructions: [],skills: [],templates: [],diagnostics: [],canCreateInstructions: true};
const full: InventoryState = {...empty,canCreateInstructions: false,
  instructions: [{name: 'AGENTS.md',path: '/parent/AGENTS.md',content: Array.from({length: 70},(_,index) => `Instruction ${index + 1}: preserve the original workspace and behavior 中文.`).join('\n')}],
  skills: [{name: 'inspect',path: '/demo/project/.pi/skills/inspect/SKILL.md',description: 'Inspect this workspace.'},{name: 'review',path: '/demo/project/.pi/skills/review/SKILL.md',description: 'Review the original changes.'}],
  templates: [{name: 'summarize',path: '/demo/project/.pi/prompts/summarize.md',description: 'Summarize the project.'}],diagnostics: ['One optional resource could not be loaded.','Preserve instructions inherited from the parent directory.']};

async function openInventory(page: Page, state: InventoryState = full, appearance: 'light' | 'dark' = 'light', applicationContext = false): Promise<void> {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async ({state,appearance,applicationContext}) => {
    document.documentElement.classList.add('pui'); document.documentElement.dataset.appearance = appearance; document.body.dataset.appearance = appearance;
    const opener = document.body.appendChild(document.createElement('button')); opener.id = 'inventory-opener'; opener.textContent = 'Resources'; opener.focus();
    const mount = document.body.appendChild(document.createElement('div'));
    const h = {initial: state,actions: [],releases: [],closed: 0} as unknown as InventoryHarness;
    const pending = (action: string,target?: Target | Kind) => {
      h.actions.push({action,...(target !== undefined ? {target} : {}),...(typeof target === 'object' ? {frozen: Object.isFrozen(target)} : {})});
      return new Promise<Result>(resolve => h.releases.push(resolve));
    };
    const callbacks = {onRefresh: () => pending('refresh'),onCreate: (kind: Kind) => pending('create',kind),onUse: (target: Target) => pending('use',target),
      onEdit: (target: Target) => pending('edit',target),onFileAction: (action: 'open' | 'reveal',target: Target) => pending(action,target),onClose() {h.closed++;}};

      let recipeMount: HTMLElement = mount;
      const path = '/examples/assemblies/resource-inventory.ts'; const {mountResourcesInventory} = await import(path);
      h.session = mountResourcesInventory(recipeMount,state,callbacks,{appearance});
    window.inventoryPartsHarness = h;
  }, {state,appearance,applicationContext});
  await expect(page.getByRole('dialog',{name: 'Workspace resources',exact: true})).toBeVisible();
}


test('small collection containers retain native cards, literal text, intrinsic grouped header and opaque ownership', async ({page}) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async () => {
    const path = '/src/parts/index.ts'; const p = await import(path);
    const title = p.createTextPart({role: 'strong',text: 'AGENTS.md'}), location = p.createTextPart({role: 'path',text: '/parent/AGENTS.md'});
    const body = p.createCardBodyPart({children: [title,location]});
    const actions = p.createCompactActionsPart({children: [p.createButtonPart({variant: 'secondary',label: 'View / edit'})]});
    const preview = p.createDisclosurePart({purpose: 'preview',title: 'View instructions',children: [p.createPreformattedPart({text: '# Literal instructions'})]});
    const group = p.createGroupedCardPart({summary: [p.createIconPart({name: 'file'}),body,actions],children: [preview]});
    const card = p.createCardPart({children: [p.createCardBodyPart({children: [p.createTextPart({role: 'strong',text: 'Skill'})]})]});
    const section = p.createContentSectionPart({title: 'Instructions',tone: 'standard',children: [group,card]});
    const mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,section);
    const outer = mount.querySelector('.pui-resource-card')!;
    let duplicate = false; try {p.createStackPart({children: [body]});} catch {duplicate = true;}
    const value = {section: mount.firstElementChild!.localName,heading: mount.querySelector('h3')!.textContent,outer: outer.localName,
      children: [...outer.children].map(node => ({tag: node.localName,classes: [...node.classList]})),pathTag: mount.querySelector('.pui-file-path')!.localName,
      noCaptionWrappers: mount.querySelector('.pui-file-info')!.children.length,duplicate,leaks: [section,group,body,actions].map(part => Object.values(part).some(value => value instanceof Node))};
    tree.destroy(); return value;
  });
  expect(result).toEqual({section: 'section',heading: 'Instructions',outer: 'article',children: [{tag: 'div',classes: ['pui-file-card']},{tag: 'details',classes: ['pui-resource-preview']}],pathTag: 'span',noCaptionWrappers: 2,duplicate: true,leaks: [false,false,false,false]});
});

test('rejected grouped-card composition leaves supplied free summary handles alive and unowned', async ({page}) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async () => {
    const path = '/src/parts/index.ts'; const p = await import(path); const results = [];
    if (typeof p.createGroupedCardPart !== 'function' || typeof p.createContentSectionPart !== 'function') throw new Error('The formal collection containers must exist before testing rejection ownership.');
    for (const invalid of ['foreign','duplicate','owned','presentation'] as const) {
      const summary = p.createTextPart({text: invalid}),detail = p.createTextPart({text: 'Detail'});
      const owner = invalid === 'owned' ? p.createStackPart({children: [detail]}) : undefined;
      let rejected = false;
      try {p.createGroupedCardPart({summary: [summary],children: invalid === 'foreign' ? [{}] : invalid === 'duplicate' ? [summary] : [detail],...(invalid === 'presentation' ? {purpose: 'arbitrary'} : {})});}
      catch {rejected = true;}
      const mount = document.body.appendChild(document.createElement('div')); let reusable = false;
      try {const tree = p.mountParts(mount,summary); reusable = mount.textContent === invalid; tree.destroy();} catch {}
      results.push({invalid,rejected,reusable}); owner?.destroy(); detail.destroy();
    }
    const child = p.createTextPart({text: 'Valid section child'});let invalidTone = false;
    try {p.createContentSectionPart({title: 'Invalid',tone: 'neon',children: [child]});} catch {invalidTone = true;}
    const mount = document.body.appendChild(document.createElement('div'));const tree = p.mountParts(mount,child);const sectionReusable = mount.textContent === 'Valid section child';tree.destroy();
    return {results,invalidTone,sectionReusable};
  });
  expect(result).toEqual({results: ['foreign','duplicate','owned','presentation'].map(invalid => ({invalid,rejected: true,reusable: true})),invalidTone: true,sectionReusable: true});
});


test('inventory metadata retains keyed instruction disclosure, native selection, scroll and unaffected row focus', async ({page}) => {
  await openInventory(page);
  await page.evaluate(() => {
    const dialog = document.querySelector<HTMLDialogElement>('dialog[open]')!,row = dialog.querySelector('.pui-resource-card')!,details = row.querySelector('details')!,pre = details.querySelector('pre')!;
    details.open = true;const focus = row.querySelector('button')!;focus.focus();pre.scrollTop = 120;dialog.scrollTop = 100;
    const range = document.createRange();range.setStart(pre.firstChild!,12);range.setEnd(pre.firstChild!,38);const selection = window.getSelection()!;selection.removeAllRanges();selection.addRange(range);
    window.inventoryPartsHarness.retained = {row,details,pre,text: pre.firstChild!,focus,preScroll: pre.scrollTop,dialogScroll: dialog.scrollTop};
    const h = window.inventoryPartsHarness;h.session.update({...h.initial,instructions: h.initial.instructions.map(entry => ({...entry,name: 'Inherited AGENTS.md'})),skills: [...h.initial.skills].reverse(),diagnostics: ['Metadata changed']});
  });
  expect(await page.evaluate(() => {const h = window.inventoryPartsHarness,r = h.retained!,dialog = document.querySelector<HTMLDialogElement>('dialog[open]')!;return {row: dialog.querySelector('.pui-resource-card') === r.row,details: r.details.open,pre: r.details.querySelector('pre') === r.pre,text: r.pre.firstChild === r.text,selection: window.getSelection()!.toString(),focus: document.activeElement === r.focus,preScroll: r.pre.scrollTop === r.preScroll,dialogScroll: dialog.scrollTop === r.dialogScroll};})).toEqual({row: true,details: true,pre: true,text: true,selection: full.instructions[0]!.content!.slice(12,38),focus: true,preScroll: true,dialogScroll: true});
});

test('inventory loading snapshots preserve rendered rows and original workspace ownership', async ({page}) => {
  await openInventory(page);await page.evaluate(() => {const h = window.inventoryPartsHarness;h.session.update({...h.initial,workspace: {id: 'other',name: 'Other',path: '/other'},instructions: [],skills: [],templates: [],error: 'Wrong owner'});});
  await expect(page.getByText('inspect',{exact: true})).toBeVisible();await expect(page.locator('dialog [role=alert]')).not.toHaveText('Wrong owner');
  await page.evaluate(() => {const h = window.inventoryPartsHarness;h.session.update({...h.initial,loading: true});});await expect(page.getByText('inspect',{exact: true})).toBeVisible();
  expect(await page.evaluate(() => window.inventoryPartsHarness.session.read().workspace.id)).toBe('w1');
});

test('create and refresh callbacks preserve separate pending guards and error feedback', async ({page}) => {
  await openInventory(page,empty);const refresh = page.getByRole('button',{name: 'Refresh',exact: true}),addSkill = page.getByRole('button',{name: 'Add skill',exact: true});
  await refresh.click();await refresh.click();await expect(refresh).toBeEnabled();expect(await page.evaluate(() => window.inventoryPartsHarness.actions)).toEqual([{action: 'refresh'}]);
  await addSkill.click();await expect(addSkill).toBeDisabled();await expect(page.getByRole('button',{name: 'Add prompt template',exact: true})).toBeDisabled();await expect(page.getByRole('button',{name: 'Create AGENTS.md in this workspace',exact: true})).toBeDisabled();
  await page.evaluate(() => {const h = window.inventoryPartsHarness;h.session.update({...h.initial,busy: true});h.session.update({...h.initial,busy: false});});await expect(addSkill).toBeDisabled();
  await page.evaluate(() => window.inventoryPartsHarness.releases[1]!({ok: false,error: 'Create rejected'}));await expect(page.locator('dialog [role=alert]')).toHaveText('Create rejected');await expect(addSkill).toBeEnabled();
  await page.evaluate(() => window.inventoryPartsHarness.releases[0]!({ok: false,error: 'Refresh rejected'}));await expect(page.locator('dialog [role=alert]')).toHaveText('Refresh rejected');
});

test('resource row callbacks use current frozen targets while busy availability preserves view and use', async ({page}) => {
  await openInventory(page);const row = page.locator('article.pui-file-card').filter({has: page.getByText('inspect',{exact: true})});
  await row.getByRole('button',{name: 'Open',exact: true}).click();await expect(row.getByRole('button',{name: 'Reveal',exact: true})).toBeDisabled();
  expect(await page.evaluate(() => window.inventoryPartsHarness.actions)).toEqual([{action: 'open',target: {workspaceId: 'w1',kind: 'skill',name: 'inspect',path: full.skills[0]!.path},frozen: true}]);
  await page.evaluate(() => window.inventoryPartsHarness.releases[0]!({ok: true}));
  await page.evaluate(() => {const h = window.inventoryPartsHarness;h.session.update({...h.initial,busy: true,skills: h.initial.skills.map(entry => ({...entry,name: entry.name === 'inspect' ? 'inspect-renamed' : entry.name}))});});
  const renamed = page.locator('article.pui-file-card').filter({has: page.getByText('inspect-renamed',{exact: true})});await expect(renamed.getByRole('button',{name: 'Open',exact: true})).toBeDisabled();await expect(renamed.getByRole('button',{name: 'Use',exact: true})).toBeEnabled();await expect(renamed.getByRole('button',{name: 'View / edit',exact: true})).toBeEnabled();
  await renamed.getByRole('button',{name: 'Use',exact: true}).click();await expect(renamed.getByRole('button',{name: 'Use',exact: true})).toBeDisabled();
  expect(await page.evaluate(() => window.inventoryPartsHarness.actions[1])).toEqual({action: 'use',target: {workspaceId: 'w1',kind: 'skill',name: 'inspect-renamed',path: full.skills[0]!.path},frozen: true});
  await page.evaluate(() => window.inventoryPartsHarness.releases[1]!({ok: false,error: 'Use rejected'}));await expect(page.locator('dialog [role=alert]')).toHaveText('Use rejected');
});

test('every create action connects its original finite resource kind', async ({page}) => {

    await openInventory(page,empty);
    for (const [index,label] of ['Create AGENTS.md in this workspace','Add skill','Add prompt template'].entries()) {
      await page.getByRole('button',{name: label,exact: true}).click();
      await page.evaluate(index => window.inventoryPartsHarness.releases[index]!({ok: true}),index);
      await expect(page.getByRole('button',{name: label,exact: true})).toBeEnabled();
    }
    expect(await page.evaluate(() => window.inventoryPartsHarness.actions)).toEqual([{action: 'create',target: 'instructions'},{action: 'create',target: 'skill'},{action: 'create',target: 'template'}]);
});

test('inherited view, native reveal and template use connect the original row targets', async ({page}) => {

    await openInventory(page);
    await page.locator('article.pui-resource-card').getByRole('button',{name: 'View / edit',exact: true}).click();
    await page.evaluate(() => window.inventoryPartsHarness.releases[0]!({ok: true}));
    await page.locator('article.pui-file-card').filter({has: page.getByText('inspect',{exact: true})}).getByRole('button',{name: 'Reveal',exact: true}).click();
    await page.evaluate(() => window.inventoryPartsHarness.releases[1]!({ok: true}));
    await page.locator('article.pui-file-card').filter({has: page.getByText('summarize',{exact: true})}).getByRole('button',{name: 'Use',exact: true}).click();
    expect(await page.evaluate(() => window.inventoryPartsHarness.actions)).toEqual([
      {action: 'edit',target: {workspaceId: 'w1',kind: 'instructions',name: 'AGENTS.md',path: '/parent/AGENTS.md'},frozen: true},
      {action: 'reveal',target: {workspaceId: 'w1',kind: 'skill',name: 'inspect',path: full.skills[0]!.path},frozen: true},
      {action: 'use',target: {workspaceId: 'w1',kind: 'template',name: 'summarize',path: full.templates[0]!.path},frozen: true},
    ]);
});

test('removed rows and closed inventory discard late outcomes without replay and release once', async ({page}) => {
  await openInventory(page);const row = page.locator('article.pui-file-card').filter({has: page.getByText('inspect',{exact: true})});await row.getByRole('button',{name: 'Use',exact: true}).click();
  await page.evaluate(() => {const h = window.inventoryPartsHarness;h.session.update({...h.initial,skills: h.initial.skills.slice(1)});h.releases[0]!({ok: false,error: 'Retired row error'});});await expect(page.locator('dialog [role=alert]')).not.toHaveText('Retired row error');
  await page.getByRole('button',{name: 'Refresh',exact: true}).click();await page.keyboard.press('Escape');await expect(page.locator('dialog')).toHaveCount(0);await expect(page.locator('#inventory-opener')).toBeFocused();
  await page.evaluate(() => {const h = window.inventoryPartsHarness;h.releases[1]!({ok: false,error: 'Retired refresh error'});h.session.fail('Late failure');h.session.update(h.initial);h.session.destroy();h.session.destroy();});
  expect(await page.evaluate(() => ({open: window.inventoryPartsHarness.session.isOpen(),closed: window.inventoryPartsHarness.closed,actions: window.inventoryPartsHarness.actions.length}))).toEqual({open: false,closed: 1,actions: 2});await expect(page.locator('dialog,article,details')).toHaveCount(0);
});
