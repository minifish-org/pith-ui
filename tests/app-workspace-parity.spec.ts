import {test, expect} from '@playwright/test';

test.beforeEach(async ({page}) => {await page.goto('/tests/fixture.html');});

test('workspace references preserve exact CommonMark paths including all-space names', async ({page}) => {
  const result = await page.evaluate(async () => {
    const entry = '/src/app/index.ts', markdown = '/src/content/markdown.ts';
    const {createApplication} = await import(entry), {renderMarkdown} = await import(markdown);
    const app = createApplication(document.body);
    const paths = ['   ', ' leading.md', 'trailing.md ', '`edge`', 'a``b`file.txt', 'docs/中文 draft.md'];
    const values = paths.map(path => {
      app.workspace.resetDraft(''); app.workspace.insertReferences([path]);
      const draft = app.workspace.readDraft(), output = document.createElement('div');
      output.innerHTML = renderMarkdown(draft);
      return {path, decoded: output.querySelector('code')?.textContent};
    });
    app.destroy(); return values;
  });
  expect(result.map(value => value.decoded)).toEqual(result.map(value => value.path));
});

test('the attachment chooser exposes merged attachment and composer disabled states', async ({page}) => {
  const result = await page.evaluate(async () => {
    const entry = '/src/app/index.ts'; const {createApplication} = await import(entry);
    const app = createApplication(document.body);
    const button = document.querySelector<HTMLButtonElement>('[aria-label="Attach images"]')!;
    const states: boolean[] = [];
    app.workspace.updateAttachments({items: [], disabled: true}); states.push(button.disabled);
    app.workspace.updateComposer({action: 'send'}); states.push(button.disabled);
    app.workspace.updateAttachments({items: [], disabled: false}); states.push(button.disabled);
    app.workspace.updateComposer({disabled: true}); states.push(button.disabled);
    app.workspace.updateAttachments({items: [], disabled: false}); states.push(button.disabled);
    app.workspace.updateComposer({readOnly: true}); states.push(button.disabled);
    app.workspace.updateComposer({action: 'send'}); states.push(button.disabled);
    app.destroy(); return states;
  });
  expect(result).toEqual([true, true, false, true, true, true, false]);
});

test('drop intents distinguish unidentified files from URI-only drags while retaining images', async ({page}) => {
  const result = await page.evaluate(async () => {
    const entry = '/src/app/index.ts'; const {createApplication} = await import(entry);
    const references: unknown[] = [], images: string[][] = [];
    const app = createApplication(document.body, {workspace: {
      onDropReferences: (value: unknown) => references.push(value),
      onImages: (files: File[]) => images.push(files.map(file => file.name)),
    }});
    const form = document.querySelector<HTMLElement>('.pui-composer')!;
    const drop = (files: File[], uris = '') => {
      const transfer = new DataTransfer();
      for (const file of files) transfer.items.add(file);
      if (uris) transfer.setData('text/uri-list', uris);
      form.dispatchEvent(new DragEvent('drop', {bubbles: true, cancelable: true, dataTransfer: transfer}));
    };
    drop([], 'https://example.test/readme.md');
    drop([], 'file:///work/readme.md');
    drop([new File(['image'], 'photo.PNG', {type: ''})]);
    drop([new File(['image'], 'photo.PNG', {type: ''}), new File(['vector'], 'vector.svg', {type: 'image/svg+xml'})], 'https://example.test/readme.md');
    drop([new File(['text'], 'README.md', {type: 'text/plain'})]);
    const rect = form.getBoundingClientRect();
    app.workspace.receiveNativeDrop({paths: ['/work/native.md'], x: rect.x + 8, y: rect.y + 8});
    app.destroy(); return {references, images};
  });
  expect(result).toEqual({
    references: [
      {paths: [], uris: 'https://example.test/readme.md', hasUnidentifiedFiles: false},
      {paths: [], uris: 'file:///work/readme.md', hasUnidentifiedFiles: false},
      {paths: [], uris: 'https://example.test/readme.md', hasUnidentifiedFiles: true},
      {paths: [], uris: '', hasUnidentifiedFiles: true},
      {paths: ['/work/native.md'], hasUnidentifiedFiles: false},
    ],
    images: [['photo.PNG'], ['photo.PNG']],
  });
});

test('an unrelated running target leaves inactive conversation and workspace menu actions usable', async ({page}) => {
  await page.evaluate(async () => {
    const entry = '/src/app/index.ts'; const {createApplication} = await import(entry);
    const calls: unknown[] = [];
    const app = createApplication(document.body, {workspace: {
      onConversationAction: (action: string, id: string) => {calls.push({action, id});},
      onWorkspaceAction: (action: string, id: string) => {calls.push({action, id});},
    }});
    app.workspace.updateNavigation({groups: [
      {id: 'running-work', name: 'Running work', path: '/running', selected: true, children: [{id: 'running', title: 'Running chat', active: true}]},
      {id: 'idle-work', name: 'Idle work', path: '/idle', selected: true, children: [{id: 'idle', title: 'Idle chat', active: false}]},
    ], empty: null});
    app.workspace.updateAvailability({global: true, active: true, conversations: ['running'], workspaces: ['running-work']});
    (window as unknown as {availabilityFixture: {calls: unknown[]; busy(value: boolean): void}}).availabilityFixture = {
      calls, busy(value) {app.workspace.updateAvailability({busy: value, global: true, active: true, conversations: ['running'], workspaces: ['running-work']});},
    };
  });
  await expect(page.getByRole('button', {name: 'Choose model', exact: true})).toBeDisabled();
  await page.getByRole('button', {name: 'Actions for Idle chat', exact: true}).click();
  await expect(page.getByRole('menuitem', {name: 'Rename conversation', exact: true})).toBeEnabled();
  await page.getByRole('menuitem', {name: 'Rename conversation', exact: true}).click();
  await page.getByRole('button', {name: 'Actions for workspace Idle work', exact: true}).click();
  await expect(page.getByRole('menuitem', {name: 'Remove workspace', exact: true})).toBeEnabled();
  await page.getByRole('menuitem', {name: 'Remove workspace', exact: true}).click();
  expect(await page.evaluate(() => (window as unknown as {availabilityFixture: {calls: unknown[]}}).availabilityFixture.calls)).toEqual([{action: 'rename', id: 'idle'}, {action: 'remove', id: 'idle-work'}]);
  await page.getByRole('button', {name: 'Actions for Running chat', exact: true}).click();
  await expect(page.getByRole('menuitem', {name: 'Rename conversation', exact: true})).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.evaluate(() => (window as unknown as {availabilityFixture: {busy(value: boolean): void}}).availabilityFixture.busy(true));
  await page.getByRole('button', {name: 'Actions for Idle chat', exact: true}).click();
  await expect(page.getByRole('menuitem', {name: 'Rename conversation', exact: true})).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.evaluate(() => (window as unknown as {availabilityFixture: {busy(value: boolean): void}}).availabilityFixture.busy(false));
  await page.getByRole('button', {name: 'Actions for Idle chat', exact: true}).click();
  await expect(page.getByRole('menuitem', {name: 'Rename conversation', exact: true})).toBeEnabled();
});

test('global and active run gates preserve permitted message and code copies', async ({page}) => {
  await page.evaluate(async () => {
    const entry = '/src/app/index.ts'; const {createApplication} = await import(entry);
    const calls: string[] = [];
    const app = createApplication(document.body, {workspace: {
      onMessageAction: () => {calls.push('message');}, onCopyCode: () => {calls.push('code');},
    }});
    app.workspace.updateConversation({id: 'active', working: true, messages: [{id: 'm', role: 'assistant', text: 'historical reply\n\n```ts\nconst value = 1;\n```', actions: {copy: 'Copy response'}}]});
    app.workspace.updateMessageAvailability({copy: false, edit: true, branch: true});
    app.workspace.updateAvailability({global: true, active: true, conversations: ['active']});
    (window as unknown as {copyAvailabilityFixture: {calls: string[]}}).copyAvailabilityFixture = {calls};
  });
  await page.getByRole('button', {name: 'Copy response', exact: true}).click();
  await page.getByRole('button', {name: 'Copy code', exact: true}).click();
  expect(await page.evaluate(() => (window as unknown as {copyAvailabilityFixture: {calls: string[]}}).copyAvailabilityFixture.calls)).toEqual(['message', 'code']);
  await expect(page.locator('[data-message-action="copy"]')).toBeEnabled();
  await expect(page.locator('[data-copy-code]')).toBeEnabled();
});

test('pending native references still accept the matching image drop without resolving paths twice', async ({page}) => {
  const result = await page.evaluate(async () => {
    const entry = '/src/app/index.ts'; const {createApplication} = await import(entry);
    const images: string[][] = [], references: unknown[] = [];
    const app = createApplication(document.body, {workspace: {
      onImages: (files: File[]) => images.push(files.map(file => file.name)),
      onDropReferences(value: unknown) {references.push(value); app.workspace.setDropPending(true);},
    }});
    let choices = 0;
    document.querySelector<HTMLInputElement>('input[type="file"]')!.click = () => {choices++;};
    const form = document.querySelector<HTMLElement>('.pui-composer')!;
    const drop = () => {
      const transfer = new DataTransfer(); transfer.items.add(new File(['image'], 'photo.png', {type: 'image/png'}));
      transfer.items.add(new File(['text'], '中文 draft.md', {type: 'text/markdown'}));
      form.dispatchEvent(new DragEvent('drop', {bubbles: true, cancelable: true, dataTransfer: transfer}));
    };
    app.workspace.resetDraft('Review OLD please');
    const input = document.querySelector<HTMLTextAreaElement>('[aria-label="Message Pith"]')!;
    input.setSelectionRange(7, 10);
    const rect = form.getBoundingClientRect();
    app.workspace.receiveNativeDrop({paths: ['/workspace/docs/中文 draft.md', '/workspace/photo.png'], x: rect.x + 8, y: rect.y + 8});
    app.workspace.pickImages();
    drop();
    const pending = {images: [...images], references: [...references], choices};
    app.workspace.setDropPending(false); app.workspace.insertReferences(['docs/中文 draft.md']);
    const draft = app.workspace.readDraft();
    for (const state of [{readOnly: true}, {disabled: true}]) {app.workspace.updateComposer(state); app.workspace.pickImages(); drop();}
    app.workspace.updateComposer({}); app.workspace.updateAvailability({busy: true}); app.workspace.pickImages(); drop();
    const final = {images, references, draft, choices};
    app.destroy(); return {pending, final};
  });
  const references = [{paths: ['/workspace/docs/中文 draft.md', '/workspace/photo.png'], hasUnidentifiedFiles: false}];
  expect(result).toEqual({
    pending: {images: [['photo.png']], references, choices: 1},
    final: {images: [['photo.png']], references, draft: 'Review `docs/中文 draft.md` please', choices: 1},
  });
});

test('welcome suggestions preserve a restoring draft until the composer becomes available', async ({page}) => {
  await page.evaluate(async () => {
    const entry = '/src/app/index.ts'; const {createApplication} = await import(entry);
    const inputs: string[] = [];
    const app = createApplication(document.body, {workspace: {onInput: (text: string) => inputs.push(text)}});
    app.workspace.updateWelcome({workspace: {name: 'Work', path: '/work'}, hasApiKey: true, hasConnections: true});
    app.workspace.resetDraft('restoring draft'); app.workspace.updateComposer({readOnly: true});
    (window as unknown as {welcomeParity: {inputs: string[]; draft(): string; ready(): void}}).welcomeParity = {
      inputs, draft: app.workspace.readDraft, ready() {app.workspace.updateComposer({});},
    };
  });
  await page.getByRole('button', {name: 'Explore my workspace', exact: true}).click();
  expect(await page.evaluate(() => {const fixture = (window as unknown as {welcomeParity: {inputs: string[]; draft(): string}}).welcomeParity; return {draft: fixture.draft(), inputs: fixture.inputs};})).toEqual({draft: 'restoring draft', inputs: []});
  await page.evaluate(() => (window as unknown as {welcomeParity: {ready(): void}}).welcomeParity.ready());
  await page.getByRole('button', {name: 'Explore my workspace', exact: true}).click();
  await expect(page.getByRole('textbox', {name: 'Message Pith', exact: true})).toHaveValue('Explore this workspace and give me a concise overview of its files.');
  await expect(page.getByRole('textbox', {name: 'Message Pith', exact: true})).toBeFocused();
  expect(await page.evaluate(() => (window as unknown as {welcomeParity: {inputs: string[]}}).welcomeParity.inputs)).toEqual(['Explore this workspace and give me a concise overview of its files.']);
});
