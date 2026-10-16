import {test, expect} from '@playwright/test';

type Result = {ok: true} | {ok: false; error: string};
type State = Record<string, unknown>;
type Callbacks = Record<string, unknown>;
interface Session {
  update(state: State): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
}
interface EditorSession extends Session {
  read(): {name: string; content: string};
}
interface FutureApplication {
  resources: {
    open(state: State, callbacks?: Callbacks): Session;
    openEditor(state: State, callbacks?: Callbacks): EditorSession;
    destroy(): void;
  };
  files: {
    updateArtifacts(state: State, callbacks?: Callbacks): void;
    openPreview(input: State, callbacks?: Callbacks): Session;
    destroy(): void;
  };
  destroy(): void;
}
interface Fixture {
  app: FutureApplication;
  events: unknown[];
  session?: Session;
  old?: Session;
  editor?: EditorSession;
  oldEditor?: EditorSession;
  initial?: State;
  control?: HTMLTextAreaElement;
  focused?: HTMLElement;
  release?: (result: Result) => void;
  submits: number;
}
declare global {
  interface Window {appResourcesFilesFixture: Fixture}
}

test.beforeEach(async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const entry = '/src/app/index.ts';
    const {createApplication} = await import(entry);
    const mount = document.createElement('div');
    document.body.append(mount);
    window.appResourcesFilesFixture = {app: createApplication(mount, {appearance: 'light'}), events: [], submits: 0};
  });
});
test.afterEach(async ({page}) => {
  await page.evaluate(() => window.appResourcesFilesFixture?.app.destroy());
});

test('resource inventory owns actions and exposes only plain semantic scene and session handles', async ({page}) => {
  await page.evaluate(() => {
    const fixture = window.appResourcesFilesFixture;
    fixture.session = fixture.app.resources.open({
      workspace: {id: 'w1', name: 'Project <literal>', path: '/demo/project'},
      instructions: [{name: 'AGENTS.md', path: '/demo/project/AGENTS.md', content: '<script>window.untrustedResource = true</script>'}],
      skills: [{name: 'inspect-project', path: '/demo/project/.pi/skills/inspect-project/SKILL.md', description: 'Read-only inspection'}],
      templates: [], diagnostics: ['<b>Literal diagnostic</b>'], canCreateInstructions: false,
    }, {
      onRefresh: () => {fixture.events.push({type: 'refresh'});},
      onCreate: (kind: string) => {fixture.events.push({type: 'create', kind});},
      onUse: (target: State) => {fixture.events.push({type: 'use', target});},
      onEdit: (target: State) => {fixture.events.push({type: 'edit', target});},
      onFileAction: (action: string, target: State) => {fixture.events.push({type: 'file', action, target}); return {ok: true};},
    });
  });
  const dialog = page.getByRole('dialog', {name: 'Workspace resources', exact: true});
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Project <literal>', {exact: true})).toBeVisible();
  await dialog.getByRole('button', {name: 'Refresh', exact: true}).click();
  await dialog.getByRole('button', {name: 'Add skill', exact: true}).click();
  const skill = dialog.locator('article').filter({has: page.getByText('inspect-project', {exact: true})});
  await skill.getByRole('button', {name: 'Use', exact: true}).click();
  await skill.getByRole('button', {name: 'View / edit', exact: true}).click();
  await skill.getByRole('button', {name: 'Open', exact: true}).click();
  await dialog.getByText('View instructions', {exact: true}).click();
  await expect(dialog.locator('pre')).toHaveText('<script>window.untrustedResource = true</script>');
  expect(await page.evaluate(() => 'untrustedResource' in window)).toBe(false);
  expect(await page.evaluate(() => window.appResourcesFilesFixture.events)).toEqual([
    {type: 'refresh'}, {type: 'create', kind: 'skill'},
    {type: 'use', target: {workspaceId: 'w1', kind: 'skill', name: 'inspect-project', path: '/demo/project/.pi/skills/inspect-project/SKILL.md'}},
    {type: 'edit', target: {workspaceId: 'w1', kind: 'skill', name: 'inspect-project', path: '/demo/project/.pi/skills/inspect-project/SKILL.md'}},
    {type: 'file', action: 'open', target: {workspaceId: 'w1', kind: 'skill', name: 'inspect-project', path: '/demo/project/.pi/skills/inspect-project/SKILL.md'}},
  ]);
  expect(await page.evaluate(() => {
    const fixture = window.appResourcesFilesFixture;
    return [fixture.app.resources, fixture.app.files, fixture.session!].map(handle => ({
      plain: Object.getPrototypeOf(handle) === Object.prototype,
      leaks: Object.keys(handle).filter(key => ['element', 'id', 'part', 'field', 'input', 'form', 'control', 'body', 'dialog', 'container', 'style', 'className', 'html', 'render'].includes(key)),
      node: Object.values(handle).some(value => value instanceof Node),
    }));
  })).toEqual(Array.from({length: 3}, () => ({plain: true, leaks: [], node: false})));
});

test('resource editing retains exact draft, selection and local pending through snapshots and a failed save', async ({page}) => {
  await page.evaluate(() => {
    const fixture = window.appResourcesFilesFixture;
    fixture.initial = {workspaceId: 'w1', workspacePath: '/demo/project', kind: 'skill', name: 'inspect', content: '# Original', editable: true, workspaceBusy: false};
    fixture.editor = fixture.app.resources.openEditor(fixture.initial, {onSubmit: (draft: State) => {
      fixture.submits++; fixture.events.push(draft);
      return new Promise<Result>(resolve => {fixture.release = resolve;});
    }});
  });
  await page.getByRole('textbox', {name: 'Name', exact: true}).fill('edited-skill');
  const content = page.getByRole('textbox', {name: 'Markdown', exact: true});
  await content.fill('# User draft 中文');
  await content.evaluate((element: HTMLTextAreaElement) => {element.focus(); element.setSelectionRange(2, 9); window.appResourcesFilesFixture.control = element;});
  await page.evaluate(() => {
    const fixture = window.appResourcesFilesFixture;
    fixture.editor!.update({...fixture.initial, content: '# Late server snapshot', error: 'Recoverable metadata notice'});
  });
  expect(await content.evaluate(element => ({same: element === window.appResourcesFilesFixture.control, focused: element === document.activeElement, selection: [(element as HTMLTextAreaElement).selectionStart, (element as HTMLTextAreaElement).selectionEnd]}))).toEqual({same: true, focused: true, selection: [2, 9]});
  await expect(content).toHaveValue('# User draft 中文');
  const save = page.getByRole('button', {name: 'Save', exact: true});
  await save.click();
  await expect(save).toBeDisabled();
  await content.locator('xpath=ancestor::form').evaluate((form: HTMLFormElement) => form.requestSubmit());
  expect(await page.evaluate(() => window.appResourcesFilesFixture.submits)).toBe(1);
  await page.evaluate(() => window.appResourcesFilesFixture.release!({ok: false, error: 'Disk refused write'}));
  await expect(page.getByRole('alert').filter({hasText: 'Disk refused write'})).toBeVisible();
  await expect(save).toBeEnabled();
  expect(await page.evaluate(() => window.appResourcesFilesFixture.editor!.read())).toEqual({name: 'edited-skill', content: '# User draft 中文'});
});

test('inherited resource content stays read-only and never exposes save or delete actions', async ({page}) => {
  await page.evaluate(() => {
    const fixture = window.appResourcesFilesFixture;
    fixture.editor = fixture.app.resources.openEditor({workspaceId: 'w1', workspacePath: '/demo/project', path: '/parent/AGENTS.md', kind: 'instructions', content: '# Inherited instructions', editable: false, workspaceBusy: false}, {
      onSubmit: () => {fixture.submits++; return {ok: true};},
      onDelete: () => {fixture.events.push('delete');},
    });
  });
  await expect(page.getByRole('textbox', {name: 'Markdown', exact: true})).toHaveAttribute('readonly', '');
  await expect(page.getByText('Inherited instructions are read-only here. Add workspace instructions to specialize them.', {exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: 'Save', exact: true})).toHaveCount(0);
  await expect(page.getByRole('button', {name: 'Delete resource', exact: true})).toHaveCount(0);
  expect(await page.evaluate(() => ({submits: window.appResourcesFilesFixture.submits, events: window.appResourcesFilesFixture.events}))).toEqual({submits: 0, events: []});
});

test('closed resource sessions and late submissions cannot mutate or close a newly opened editor', async ({page}) => {
  await page.evaluate(() => {
    const fixture = window.appResourcesFilesFixture;
    fixture.oldEditor = fixture.app.resources.openEditor({workspaceId: 'w1', workspacePath: '/demo/one', path: '/demo/one/AGENTS.md', kind: 'instructions', content: '# Old draft', editable: true, workspaceBusy: false}, {
      onSubmit: () => new Promise<Result>(resolve => {fixture.release = resolve;}),
    });
  });
  await page.getByRole('button', {name: 'Save', exact: true}).click();
  await page.evaluate(() => {
    const fixture = window.appResourcesFilesFixture;
    fixture.oldEditor!.close();
    fixture.editor = fixture.app.resources.openEditor({workspaceId: 'w2', workspacePath: '/demo/two', path: '/demo/two/AGENTS.md', kind: 'instructions', content: '# New target draft', editable: true, workspaceBusy: false});
    fixture.oldEditor!.update({workspaceId: 'w1', workspacePath: '/demo/one', kind: 'instructions', content: '# Wrong late draft', editable: false, workspaceBusy: false, error: 'Old target failure'});
    fixture.oldEditor!.close(); fixture.oldEditor!.destroy();
    fixture.release!({ok: false, error: 'Old submission failure'});
  });
  await expect(page.getByRole('textbox', {name: 'Markdown', exact: true})).toHaveValue('# New target draft');
  await expect(page.getByText('Old target failure', {exact: true})).toHaveCount(0);
  await expect(page.getByText('Old submission failure', {exact: true})).toHaveCount(0);
  expect(await page.evaluate(() => ({old: window.appResourcesFilesFixture.oldEditor!.isOpen(), current: window.appResourcesFilesFixture.editor!.isOpen()}))).toEqual({old: false, current: true});
});

test('file previews own safe Markdown, code copying and pure file targets without Node action slots', async ({page}) => {
  await page.evaluate(() => {
    const fixture = window.appResourcesFilesFixture;
    fixture.session = fixture.app.files.openPreview({owner: {kind: 'artifact', id: 'chat-a'}, name: '报告.md', path: 'reports/报告.md', capabilities: {open: true, reveal: true, copyMode: 'path'}, content: {kind: 'markdown', text: '# Report\n\n```ts\nconst safe = 1;\n```\n\n<script>window.untrustedPreview = true</script><img src="https://example.invalid/tracker">'}}, {
      onFileAction: (action: string, target: State) => {fixture.events.push({action, target}); return {ok: true};},
      onCopyCode: (text: string) => {fixture.events.push({copy: text}); return {ok: true};},
    });
  });
  const dialog = page.getByRole('dialog', {name: '报告.md', exact: true});
  await expect(dialog.getByRole('heading', {name: 'Report', exact: true})).toBeVisible();
  await expect(dialog.locator('img,script')).toHaveCount(0);
  await dialog.getByRole('button', {name: 'Copy code', exact: true}).click();
  await dialog.getByRole('button', {name: 'Open', exact: true}).click();
  await dialog.getByRole('button', {name: 'Reveal', exact: true}).click();
  await dialog.getByRole('button', {name: 'Copy path', exact: true}).click();
  expect(await page.evaluate(() => 'untrustedPreview' in window)).toBe(false);
  expect(await page.evaluate(() => window.appResourcesFilesFixture.events)).toEqual([
    {copy: 'const safe = 1;\n'},
    ...['open', 'reveal', 'copy-path'].map(action => ({action, target: {owner: {kind: 'artifact', id: 'chat-a'}, name: '报告.md', path: 'reports/报告.md'}})),
  ]);
  expect(await page.evaluate(() => {
    const session = window.appResourcesFilesFixture.session!;
    return {plain: Object.getPrototypeOf(session) === Object.prototype, nodes: Object.values(session).some(value => value instanceof Node), keys: Object.keys(session).filter(key => ['element','id','part','field','control','dialog','style','html','render'].includes(key))};
  })).toEqual({plain: true, nodes: false, keys: []});
});

test('stale file-preview sessions cannot overwrite or close a different file after close and reopen', async ({page}) => {
  await page.evaluate(() => {
    const fixture = window.appResourcesFilesFixture;
    fixture.old = fixture.app.files.openPreview({owner: {kind: 'artifact', id: 'chat-a'}, name: 'First.txt', path: 'first.txt', capabilities: {open: true, reveal: true, copyMode: 'path'}});
    fixture.old.close();
    fixture.session = fixture.app.files.openPreview({owner: {kind: 'artifact', id: 'chat-b'}, name: 'Second.txt', path: 'second.txt', capabilities: {open: true, reveal: true, copyMode: 'path'}, content: {kind: 'text', text: 'Current file content'}});
    fixture.old.update({kind: 'text', text: 'Wrong late preview', error: 'Old preview error'});
    fixture.old.close(); fixture.old.destroy();
  });
  await expect(page.getByRole('dialog', {name: 'Second.txt', exact: true})).toBeVisible();
  await expect(page.getByText('Current file content', {exact: true})).toBeVisible();
  await expect(page.getByText('Wrong late preview', {exact: true})).toHaveCount(0);
  await expect(page.getByText('Old preview error', {exact: true})).toHaveCount(0);
  expect(await page.evaluate(() => ({old: window.appResourcesFilesFixture.old!.isOpen(), current: window.appResourcesFilesFixture.session!.isOpen()}))).toEqual({old: false, current: true});
});

test('artifact metadata updates preserve keyed focused actions and report the selected business target', async ({page}) => {
  await page.evaluate(() => {
    const fixture = window.appResourcesFilesFixture;
    fixture.app.files.updateArtifacts({ownerId: 'chat-a', files: [{name: 'Report', path: 'report.md'}], loading: false, error: '', copyMode: 'path'}, {
      onPreview: (target: State) => {fixture.events.push({preview: target});},
      onFileAction: (action: string, target: State) => {fixture.events.push({action, target}); return {ok: true};},
    });
  });
  await page.getByRole('button', {name: 'Conversation files (1 file)', exact: true}).click();
  const article = page.locator('article').filter({has: page.getByText('Report', {exact: true})});
  await article.getByRole('button', {name: 'Open', exact: true}).focus();
  await article.getByRole('button', {name: 'Open', exact: true}).evaluate(element => {window.appResourcesFilesFixture.focused = element as HTMLElement;});
  await page.evaluate(() => window.appResourcesFilesFixture.app.files.updateArtifacts({ownerId: 'chat-a', files: [{name: 'Earlier', path: 'earlier.txt'}, {name: 'Report updated', path: 'report.md'}], loading: true, error: 'Recoverable list failure', copyMode: 'path'}));
  const updated = page.locator('article').filter({has: page.getByText('Report updated', {exact: true})});
  expect(await updated.getByRole('button', {name: 'Open', exact: true}).evaluate(element => ({same: element === window.appResourcesFilesFixture.focused, focus: element === document.activeElement}))).toEqual({same: true, focus: true});
  await updated.getByRole('button', {name: 'Open', exact: true}).click();
  await updated.getByRole('button', {name: 'Preview', exact: true}).click();
  expect(await page.evaluate(() => window.appResourcesFilesFixture.events)).toEqual([
    {action: 'open', target: {owner: {kind: 'artifact', id: 'chat-a'}, name: 'Report updated', path: 'report.md'}},
    {preview: {owner: {kind: 'artifact', id: 'chat-a'}, name: 'Report updated', path: 'report.md'}},
  ]);
});

test('file scene preserves UTF-8 paging and owns image zoom with focus restoration', async ({page}) => {
  await page.evaluate(() => {
    const fixture = window.appResourcesFilesFixture;
    fixture.session = fixture.app.files.openPreview({owner: {kind: 'artifact', id: 'chat-a'}, name: 'Large.txt', path: 'large.txt', capabilities: {open: true, reveal: true, copyMode: 'path'}, content: {kind: 'text', text: 'A'.repeat(300000) + '\n尾部中文😀'}});
  });
  await expect(page.getByText('1 / 2', {exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Next', exact: true}).click();
  await expect(page.getByText('2 / 2', {exact: true})).toBeVisible();
  await expect(page.locator('dialog[open] pre')).toContainText('尾部中文😀');
  await page.evaluate(() => window.appResourcesFilesFixture.session!.update({kind: 'text', text: 'A'.repeat(300000) + '\n尾部中文😀', truncated: true}));
  await expect(page.getByText('2 / 2', {exact: true})).toBeVisible();
  await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 40; canvas.height = 20;
    const fixture = window.appResourcesFilesFixture;
    fixture.session!.close();
    fixture.session = fixture.app.files.openPreview({owner: {kind: 'artifact', id: 'chat-a'}, name: 'Chart.png', path: 'chart.png', capabilities: {open: true, reveal: true, copyMode: 'path'}, content: {kind: 'image', imageSrc: canvas.toDataURL(), imageAlt: 'Chart'}});
  });
  const image = page.locator('dialog[open] img[alt="Chart"]');
  await image.click();
  await expect(page.getByRole('button', {name: 'Zoom in', exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Zoom in', exact: true}).click();
  await expect(page.getByText('125% · 40 × 20', {exact: true})).toBeVisible();
  await page.getByRole('button', {name: 'Close image', exact: true}).click();
  await expect(page.getByRole('dialog', {name: 'Chart.png', exact: true})).toBeVisible();
  await expect(page.locator('dialog[open] img[alt="Chart"]')).toBeFocused();
});

for (const kind of ['inventory', 'editor'] as const) test(`resource scene destruction prevents its ${kind} close callback from reopening a window`, async ({page}) => {
  const result = await page.evaluate(kind => {
    const fixture = window.appResourcesFilesFixture;
    const inventory = {workspace: {id: 'w1', name: 'Project', path: '/demo/project'}, instructions: [], skills: [], templates: [], diagnostics: []};
    const editor = {workspaceId: 'w1', workspacePath: '/demo/project', path: '/demo/project/AGENTS.md', kind: 'instructions', content: '# Instructions', editable: true, workspaceBusy: false};
    const open = (onClose?: () => void): Session => kind === 'inventory'
      ? fixture.app.resources.open(inventory, {onClose})
      : fixture.app.resources.openEditor(editor, {onClose});
    fixture.old = open(() => {fixture.events.push('closed'); fixture.session = open();});
    fixture.app.resources.destroy();
    return {oldOpen: fixture.old.isOpen(), reopened: fixture.session?.isOpen(), openDialogs: document.querySelectorAll('dialog[open]').length, events: fixture.events};
  }, kind);
  expect(result).toEqual({oldOpen: false, reopened: false, openDialogs: 0, events: ['closed']});
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('file scene destruction prevents its preview close callback from reopening a window', async ({page}) => {
  const result = await page.evaluate(() => {
    const fixture = window.appResourcesFilesFixture;
    const input = {owner: {kind: 'artifact', id: 'chat-a'}, name: 'Report.txt', path: 'report.txt', capabilities: {open: true, reveal: true, copyMode: 'path'}, content: {kind: 'text', text: 'Current file'}};
    fixture.old = fixture.app.files.openPreview(input, {onClose() {fixture.events.push('closed'); fixture.session = fixture.app.files.openPreview({...input, name: 'Reopened.txt', path: 'reopened.txt'});}});
    fixture.app.files.destroy();
    return {oldOpen: fixture.old.isOpen(), reopened: fixture.session?.isOpen(), openDialogs: document.querySelectorAll('dialog[open]').length, events: fixture.events};
  });
  expect(result).toEqual({oldOpen: false, reopened: false, openDialogs: 0, events: ['closed']});
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
