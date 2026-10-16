import {test, expect} from '@playwright/test';

test.beforeEach(async ({page}) => {await page.goto('/tests/fixture.html');});

test('message callbacks receive the unchanged action payload and actual control without delegated duplicates', async ({page}) => {
  await page.evaluate(async () => {
    const {createConversationView} = await import('../src/content/conversation-view.js');
    const calls: unknown[] = []; let delegated = 0;
    document.addEventListener('click', event => {if ((event.target as Element).closest('[data-message-action], [data-copy-code]')) document.body.dataset.delegated = String(++delegated);});
    const block = createConversationView({onAction(action, button) {calls.push({action, sameControl: button.dataset.messageActionId === action.messageId, control: button.tagName}); document.body.dataset.calls = JSON.stringify(calls);}, onCopyCode(text, button) {document.body.dataset.code = text; document.body.dataset.codeControl = String(button.hasAttribute('data-copy-code'));}});
    document.body.append(block.element);
    block.update({id: 'conversation', working: false, messages: [{id: 'user', role: 'user', text: 'Question', actions: {copy: 'Copy message', edit: true}}, {id: 'answer', role: 'assistant', text: '```ts\nconst answer = 1;\n```', actions: {copy: 'Copy response', branch: {key: 'node'}}}]});
  });
  await page.getByRole('button', {name: 'Copy message', exact: true}).click();
  await page.getByRole('button', {name: 'Edit message', exact: true}).click();
  await page.getByRole('button', {name: 'Branch from this message', exact: true}).click();
  expect(JSON.parse((await page.locator('body').getAttribute('data-calls'))!)).toEqual([
    {action: {action: 'copy', messageId: 'user'}, sameControl: true, control: 'BUTTON'},
    {action: {action: 'edit', messageId: 'user'}, sameControl: true, control: 'BUTTON'},
    {action: {action: 'branch', messageId: 'answer', branchKey: 'node'}, sameControl: true, control: 'BUTTON'},
  ]);
  await page.getByRole('button', {name: 'Copy code', exact: true}).click();
  await expect(page.locator('body')).toHaveAttribute('data-code', 'const answer = 1;\n');
  await expect(page.locator('body')).toHaveAttribute('data-code-control', 'true');
  expect(await page.locator('body').getAttribute('data-delegated')).toBeNull();
  await expect(page.getByRole('button', {name: 'Branch from this message', exact: true})).toHaveAttribute('data-node', 'node');
  await expect(page.locator('[data-sdk]')).toHaveCount(0);
});

test('message action availability updates in place and preserves independent copy feedback', async ({page}) => {
  const result = await page.evaluate(async () => {
    const {createConversationView} = await import('../src/content/conversation-view.js');
    const block = createConversationView(); document.body.append(block.element);
    const state = {id: 'conversation', working: false, messages: [{id: 'user', role: 'user', text: 'Question', actions: {copy: true, edit: true}}, {id: 'answer', role: 'assistant', text: 'Answer', actions: {copy: true, branch: {key: 'node'}}}]};
    block.update(state);
    const copy = block.element.querySelector<HTMLButtonElement>('[data-copy-message="user"]')!;
    const edit = block.element.querySelector<HTMLButtonElement>('[data-edit-message="user"]')!;
    const branch = block.element.querySelector<HTMLButtonElement>('[data-message-action="branch"]')!;
    copy.focus(); block.updateActionAvailability({edit: true, branch: true});
    const during = {copyEnabled: !copy.disabled, editDisabled: edit.disabled, branchDisabled: branch.disabled, sameCopy: copy === block.element.querySelector('[data-copy-message="user"]'), focus: document.activeElement === copy};
    copy.dataset.copyPending = 'true'; copy.disabled = true;
    block.updateActionAvailability({edit: false, branch: false});
    const pendingPreserved = copy.disabled;
    delete copy.dataset.copyPending; copy.disabled = false;
    block.update(state);
    const after = {copyEnabled: !copy.disabled, editEnabled: !edit.disabled, branchEnabled: !branch.disabled};
    block.destroy(); return {during, pendingPreserved, after};
  });
  expect(result).toEqual({during: {copyEnabled: true, editDisabled: true, branchDisabled: true, sameCopy: true, focus: true}, pendingPreserved: true, after: {copyEnabled: true, editEnabled: true, branchEnabled: true}});
});

test('conversation images own ready and unavailable presentation and ignore retired nodes', async ({page}) => {
  const result = await page.evaluate(async () => {
    const {createConversationView} = await import('../src/content/conversation-view.js');
    const block = createConversationView(); document.body.append(block.element);
    block.update({id: 'first', working: false, messages: [{id: 'user', role: 'user', text: '', images: [{index: 0}]}]});
    const [image] = block.images(); block.setImageState(image, {status: 'unavailable'});
    const unavailable = {alt: image.alt, unavailable: image.classList.contains('pui-image-unavailable')};
    const source = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"/>');
    block.setImageState(image, {status: 'ready', src: source});
    const ready = {alt: image.alt, unavailable: image.classList.contains('pui-image-unavailable'), sameNode: block.images()[0] === image};
    block.update({id: 'next', working: false, messages: []}); block.setImageState(image, {status: 'unavailable'});
    const ignored = !image.classList.contains('pui-image-unavailable');
    block.destroy(); return {unavailable, ready, ignored};
  });
  expect(result).toEqual({unavailable: {alt: 'Image unavailable', unavailable: true}, ready: {alt: 'Image 1', unavailable: false, sameNode: true}, ignored: true});
});

test('welcome uses typed callbacks and retains focused controls across unchanged snapshots', async ({page}) => {
  await page.evaluate(async () => {
    const {createWelcomeView} = await import('../src/content/welcome.js');
    const state = {hasApiKey: false, hasConnections: true, modelName: 'Model'};
    const block = createWelcomeView({onAction(action) {document.body.dataset.action = action;}, onPrompt(text) {document.body.dataset.prompt = text;}});
    document.body.append(block.element); block.update(state);
    const first = block.element.querySelector<HTMLButtonElement>('[data-welcome-action="model"]')!; first.focus(); block.update(state);
    document.body.dataset.retained = String(document.activeElement === first && block.element.contains(first));
    Object.assign(window, {contentActionsFixture: {block}});
  });
  await expect(page.locator('body')).toHaveAttribute('data-retained', 'true');
  await page.getByRole('button', {name: /Choose a model/}).click(); await expect(page.locator('body')).toHaveAttribute('data-action', 'model');
  await page.evaluate(() => (window as unknown as {contentActionsFixture: {block: {update(state: unknown): void}}}).contentActionsFixture.block.update({workspace: {name: 'Project', path: '/demo'}, hasApiKey: true, hasConnections: true, modelName: 'Model'}));
  await page.getByRole('button', {name: 'Explore my workspace', exact: true}).click();
  await expect(page.locator('body')).toHaveAttribute('data-prompt', 'Explore this workspace and give me a concise overview of its files.');
});
