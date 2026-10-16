import {test, expect} from '@playwright/test';

test.beforeEach(async ({page}) => { await page.goto('/tests/fixture.html'); });

test('the application exposes semantic scene handles without DOM or visual escape hatches', async ({page}) => {
  const result = await page.evaluate(async () => {
    const entry = '/src/app/index.ts';
    const {createApplication} = await import(entry);
    const mount = document.createElement('div'); document.body.append(mount);
    const app = createApplication(mount, {appearance: 'light', brand: {name: 'Pith', qualifier: 'Desk'}});
    const forbidden = new Set(['element', 'input', 'control', 'field', 'part', 'id', 'style', 'className', 'html', 'render']);
    const leaks: string[] = [];
    function inspect(value: unknown, path: string, seen = new Set<unknown>()) {
      if (!value || typeof value !== 'object' || seen.has(value)) return;
      seen.add(value);
      if (value instanceof Node) {leaks.push(path); return;}
      for (const [key, child] of Object.entries(value)) {
        if (forbidden.has(key)) leaks.push(path + '.' + key);
        inspect(child, path + '.' + key, seen);
      }
    }
    inspect(app, 'application');
    const scenes = ['workspace', 'settings', 'resources', 'files'].every(name => typeof app[name] === 'object');
    const wordmark = mount.querySelector('.pui-brand')?.textContent;
    const before = app.read(); app.destroy(); app.destroy();
    return {leaks, scenes, wordmark, before, remaining: mount.childElementCount};
  });
  expect(result.leaks).toEqual([]);
  expect(result.scenes).toBe(true);
  expect(result.wordmark).toContain('Pith'); expect(result.wordmark).toContain('Desk');
  expect(result.before).toMatchObject({hasModal: false}); expect(result.remaining).toBe(0);
});

test('snapshot feedback and streaming preserve the composer draft, composition, focus and selection', async ({page}) => {
  const result = await page.evaluate(async () => {
    const entry = '/src/app/index.ts'; const {createApplication} = await import(entry);
    let inputs = 0, submissions = 0;
    const app = createApplication(document.body, {workspace: {onInput() {inputs++;}, onSubmit() {submissions++; return {ok: true};}}});
    const workspace = app.workspace;
    workspace.updateComposer({action: 'send'});
    workspace.resetDraft('draft 中文 text'); workspace.focusComposer();
    const input = document.querySelector<HTMLTextAreaElement>('[aria-label="Message Pith"]')!;
    input.setSelectionRange(6, 8);
    input.dispatchEvent(new CompositionEvent('compositionstart', {data: '中文', bubbles: true}));
    input.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', isComposing: true, bubbles: true, cancelable: true}));
    workspace.updateShell({workspace: 'Example', conversation: 'Streaming', reconnecting: true});
    workspace.updateComposer({action: 'queue', model: {label: 'Example model', description: 'Configured model'}});
    workspace.updateConversation({id: 'chat-a', messages: [{id: 'a', role: 'assistant', text: 'Streamed text'}], working: true});
    const result = {draft: workspace.readDraft(), sameNode: input === document.querySelector('[aria-label="Message Pith"]'), focused: document.activeElement === input, selection: [input.selectionStart, input.selectionEnd], inputs, submissions};
    input.dispatchEvent(new CompositionEvent('compositionend', {data: '中文', bubbles: true}));
    app.destroy(); return result;
  });
  expect(result).toEqual({draft: 'draft 中文 text', sameNode: true, focused: true, selection: [6, 8], inputs: 0, submissions: 0});
});

test('navigation menus own their anchor and return immutable semantic action targets', async ({page}) => {
  await page.evaluate(async () => {
    const entry = '/src/app/index.ts'; const {createApplication} = await import(entry);
    const app = createApplication(document.body, {workspace: {onConversationAction(action: string, id: string) {document.body.dataset.action = JSON.stringify({action, id});}}});
    app.workspace.updateNavigation({groups: [{id: 'w', name: 'Work', path: '/work', selected: true, expanded: true, children: [{id: 'c', title: 'Conversation', active: true, status: {kind: 'unread', label: 'Unread response'}}]}], empty: null});
  });
  const trigger = page.getByRole('button', {name: 'Actions for Conversation', exact: true});
  await trigger.click();
  const menu = page.getByRole('menu'); await expect(menu).toBeVisible();
  const geometry = await page.evaluate(() => {
    const trigger = document.querySelector<HTMLButtonElement>('[aria-label="Actions for Conversation"]')!.getBoundingClientRect();
    const menu = document.querySelector<HTMLElement>('[role="menu"]:not([hidden])')!.getBoundingClientRect();
    return {edge: Math.min(Math.abs(trigger.left - menu.left), Math.abs(trigger.right - menu.right)), gap: Math.min(Math.abs(menu.top - trigger.bottom), Math.abs(menu.bottom - trigger.top))};
  });
  expect(geometry.edge).toBeLessThanOrEqual(2); expect(geometry.gap).toBeLessThanOrEqual(12);
  await page.getByRole('menuitem', {name: /Rename/}).click();
  await expect(page.locator('body')).toHaveAttribute('data-action', JSON.stringify({action: 'rename', id: 'c'}));
});

test('the reader owns folds across conversation switches and preserves selected historical text', async ({page}) => {
  const result = await page.evaluate(async () => {
    const entry = '/src/app/index.ts'; const {createApplication} = await import(entry);
    const app = createApplication(document.body);
    const messages = [{id: 'text', role: 'assistant', text: 'Historical selection stays here'}, {id: 'tool', role: 'tool', toolName: 'read', text: 'output', status: 'done'}];
    app.workspace.updateConversation({id: 'a', messages, working: false});
    const disclosure = document.querySelector<HTMLDetailsElement>('[data-tool-fold]')!; disclosure.open = true;
    const text = document.querySelector('[data-reading-id] p')!.firstChild!;
    const range = document.createRange(); range.setStart(text, 0); range.setEnd(text, 10);
    const selection = getSelection()!; selection.removeAllRanges(); selection.addRange(range);
    app.workspace.updateConversation({id: 'a', messages: [...messages, {id: 'live', role: 'assistant', text: 'New token'}], working: true});
    const selected = selection.toString(), retained = disclosure === document.querySelector('[data-tool-fold]') && disclosure.open;
    app.workspace.updateConversation({id: 'b', messages: [], working: false});
    app.workspace.updateConversation({id: 'a', messages, working: false});
    const restored = document.querySelector<HTMLDetailsElement>('[data-tool-fold]')!.open;
    app.destroy(); return {selected, retained, restored};
  });
  expect(result).toEqual({selected: 'Historical', retained: true, restored: true});
});

test('a closed edit session cannot submit or close a new target after a delayed failure', async ({page}) => {
  await page.evaluate(async () => {
    const entry = '/src/app/index.ts'; const {createApplication} = await import(entry);
    const app = createApplication(document.body);
    let finish!: (result: {ok: false; error: string}) => void;
    const old = app.workspace.openMessageEditor({title: 'Edit message', value: 'old target', submitLabel: 'Save message'}, {onSubmit: () => new Promise(resolve => {finish = resolve;})});
    (window as unknown as {replaceEditor(): void}).replaceEditor = () => {
      old.close();
      const next = app.workspace.openMessageEditor({title: 'Edit message', value: 'new target', submitLabel: 'Save message'}, {onSubmit: () => ({ok: true})});
      old.close(); finish({ok: false, error: 'Old target failure'});
      document.body.dataset.sessions = JSON.stringify({old: old.isOpen(), next: next.isOpen()});
    };
  });
  await page.getByRole('button', {name: 'Save message', exact: true}).click();
  await page.evaluate(() => { (window as unknown as {replaceEditor(): void}).replaceEditor(); });
  await expect(page.getByRole('dialog').getByRole('textbox', {name: 'Message', exact: true})).toHaveValue('new target');
  await expect(page.getByText('Old target failure')).toHaveCount(0);
  await expect(page.locator('body')).toHaveAttribute('data-sessions', JSON.stringify({old: false, next: true}));
});

test('modal state notifications preserve read gating and destroyed sessions cannot reopen', async ({page}) => {
  const result = await page.evaluate(async () => {
    const entry = '/src/app/index.ts'; const {createApplication} = await import(entry);
    const states: boolean[] = [];
    const app = createApplication(document.body, {onUIStateChange: (state: {hasModal: boolean}) => states.push(state.hasModal)});
    const session = app.workspace.openHistory({nodes: [], loading: false}, {});
    const opened = app.read().hasModal;
    session.close(); const closed = app.read().hasModal;
    const next = app.workspace.openHistory({nodes: [], loading: false}, {});
    session.close(); const newerStillOpen = next.isOpen();
    app.destroy(); next.update({nodes: [{id: 'late', role: 'assistant', text: 'Late history', active: false}]});
    return {opened, closed, newerStillOpen, states, dialogs: document.querySelectorAll('dialog[open]').length};
  });
  expect(result.opened).toBe(true); expect(result.closed).toBe(false); expect(result.newerStillOpen).toBe(true);
  expect(result.states).toContain(true); expect(result.states.at(-1)).toBe(false); expect(result.dialogs).toBe(0);
});

test('scene failures belong to the form rather than an unrelated appearance field', async ({page}) => {
  const result = await page.evaluate(async () => {
    const entry = '/src/app/index.ts'; const {createApplication} = await import(entry);
    const app = createApplication(document.body);
    const settings = app.settings.openSettings({baseUrl: 'https://example.test/v1', hasApiKey: true, ready: true});
    settings.fail('General settings action failed');
    const result = {
      form: document.querySelector('[data-dialog-error]')?.textContent,
      appearance: document.querySelector('[id$="appearance-error"]')?.textContent,
    };
    app.destroy(); return result;
  });
  expect(result).toEqual({form: 'General settings action failed', appearance: ''});
});

test('a throwing host close callback cannot leave an empty fixed or feature dialog open', async ({page}) => {
  const result = await page.evaluate(async () => {
    const entry = '/src/app/index.ts'; const {createApplication} = await import(entry);
    const app = createApplication(document.body), outcomes: unknown[] = [];
    for (const open of [
      () => app.settings.openSettings({baseUrl: 'https://example.test', hasApiKey: true}, {onClose() {throw new Error('host cleanup failed');}}),
      () => app.workspace.openHistory({nodes: []}, {onClose() {throw new Error('host cleanup failed');}}),
    ]) {
      const session = open();
      try {session.close();} catch {}
      outcomes.push({open: session.isOpen(), hasModal: app.read().hasModal, emptyDialogs: document.querySelectorAll('dialog[open]').length});
    }
    app.destroy(); return outcomes;
  });
  expect(result).toEqual([{open: false, hasModal: false, emptyDialogs: 0}, {open: false, hasModal: false, emptyDialogs: 0}]);
});

test('destroy releases the whole application even when host close cleanup throws', async ({page}) => {
  const result = await page.evaluate(async () => {
    const entry = '/src/app/index.ts'; const {createApplication} = await import(entry);
    const mount = document.createElement('div'); document.body.append(mount);
    const app = createApplication(mount);
    const onClose = () => {throw new Error('Host cleanup failure');};
    app.settings.openSettings({baseUrl: '', hasApiKey: false}, {onClose});
    app.workspace.openHistory({nodes: []}, {onClose});
    try {app.destroy();} catch {}
    app.destroy();
    return {remaining: mount.childElementCount, modals: document.querySelectorAll('dialog[open]').length, state: app.read().hasModal};
  });
  expect(result).toEqual({remaining: 0, modals: 0, state: false});
});

test('connection and resource loading use the shared feature surface with target ownership', async ({page}) => {
  const result = await page.evaluate(async () => {
    const entry = '/src/app/index.ts'; const {createApplication} = await import(entry);
    const app = createApplication(document.body);
    const connection = app.settings.openConnectionLoading({editing: true});
    const first = document.querySelector('dialog[open] h2')?.textContent;
    const resource = app.resources.openEditorLoading({kind: 'skill'});
    connection.fail('Old connection error'); connection.close(); connection.destroy();
    const second = document.querySelector('dialog[open] h2')?.textContent;
    const retained = resource.isOpen(), old = connection.isOpen();
    const history = app.workspace.openHistory({nodes: [], loading: true});
    resource.fail('Old resource error'); resource.close();
    const result = {first, second, retained, old, resource: resource.isOpen(), history: history.isOpen(), leakedError: document.body.textContent?.includes('Old resource error') || document.body.textContent?.includes('Old connection error')};
    app.destroy(); return result;
  });
  expect(result).toEqual({first: 'Edit model connection', second: 'Create skill', retained: true, old: false, resource: false, history: true, leakedError: false});
});

test('changing the conversation closes its image zoom before retiring image data', async ({page}) => {
  await page.evaluate(async () => {
    const entry = '/src/app/index.ts'; const {createApplication} = await import(entry);
    const bytes = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='), char => char.charCodeAt(0));
    const app = createApplication(document.body, {workspace: {onLoadImage: async () => new Blob([bytes], {type: 'image/png'})}});
    app.workspace.updateConversation({id: 'first', messages: [{id: 'image', role: 'user', text: '', images: [{index: 0}]}], working: false});
    (window as unknown as {switchConversation(): void}).switchConversation = () => app.workspace.updateConversation({id: 'second', messages: [], working: false});
  });
  const image = page.locator('.pui-history-image');
  await expect(image).toHaveAttribute('src', /^blob:/);
  await image.click(); await expect(page.getByRole('dialog', {name: 'Image 1', exact: true})).toBeVisible();
  await page.evaluate(() => (window as unknown as {switchConversation(): void}).switchConversation());
  await expect(page.locator('.pui-image-viewer[open]')).toHaveCount(0);
});
