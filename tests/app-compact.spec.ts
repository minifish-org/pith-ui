import {test, expect} from '@playwright/test';

test.beforeEach(async ({page}) => {await page.goto('/tests/fixture.html');});

test('Compact projects conversation and scoped availability onto the same retained action', async ({page}) => {
  const result = await page.evaluate(async () => {
    const entry = '/src/app/index.ts'; const {createApplication} = await import(entry);
    const actions: string[] = [], errors: string[] = [];
    const app = createApplication(document.body, {workspace: {onAction(action: string) {actions.push(action);}, onError(message: string) {errors.push(message);}}});
    const workspace = app.workspace, button = document.querySelector<HTMLButtonElement>('[data-sdk="compact"]')!;
    const messages = [{id: 'message', role: 'assistant', text: 'Context to summarize'}];
    const states: Array<{name: string; disabled: boolean; calls: number; same: boolean}> = [];
    const record = (name: string) => {button.click(); states.push({name, disabled: button.disabled, calls: actions.length, same: button === document.querySelector('[data-sdk="compact"]')});};
    record('initial');
    workspace.updateAvailability({}); record('no conversation');
    workspace.updateConversation({id: '', messages, working: false}); record('messages without identity');
    workspace.updateConversation({id: 'chat', messages: [], working: false}); record('empty conversation');
    workspace.updateConversation({id: 'chat', messages, working: true}); record('working conversation');
    workspace.updateConversation({id: 'chat', messages, working: false}); record('idle conversation');
    workspace.updateAvailability({active: true}); record('active task');
    workspace.updateAvailability({busy: true}); record('host mutation');
    workspace.updateAvailability({global: true, active: false, conversations: ['other-chat'], workspaces: ['other-workspace']}); record('unrelated task');
    workspace.updateConversation({id: 'chat', messages: [], working: false}); record('messages removed');
    workspace.updateConversation({id: 'chat', messages, working: false}); record('messages restored');
    app.destroy(); return {states, actions, errors};
  });
  expect(result.states).toEqual([
    {name: 'initial', disabled: true, calls: 0, same: true},
    {name: 'no conversation', disabled: true, calls: 0, same: true},
    {name: 'messages without identity', disabled: true, calls: 0, same: true},
    {name: 'empty conversation', disabled: true, calls: 0, same: true},
    {name: 'working conversation', disabled: true, calls: 0, same: true},
    {name: 'idle conversation', disabled: false, calls: 1, same: true},
    {name: 'active task', disabled: true, calls: 1, same: true},
    {name: 'host mutation', disabled: true, calls: 1, same: true},
    {name: 'unrelated task', disabled: false, calls: 2, same: true},
    {name: 'messages removed', disabled: true, calls: 2, same: true},
    {name: 'messages restored', disabled: false, calls: 3, same: true},
  ]);
  expect(result.actions).toEqual(['compact', 'compact', 'compact']);
  expect(result.errors).toEqual([]);
});

test('Compact merges local pending with external restrictions, retries only on click and ignores disposal results', async ({page}) => {
  await page.evaluate(async () => {
    const entry = '/src/app/index.ts'; const {createApplication} = await import(entry);
    let calls = 0, complete: ((result: {ok: true} | {ok: false; error: string}) => void) | undefined;
    const errors: string[] = [];
    const app = createApplication(document.body, {workspace: {
      onAction() {calls++; return new Promise(resolve => {complete = resolve;});}, onError(message: string) {errors.push(message);},
    }});
    const conversation = {id: 'chat', messages: [{id: 'message', role: 'assistant', text: 'Context'}], working: false};
    app.workspace.updateConversation(conversation);
    const button = document.querySelector<HTMLButtonElement>('[data-sdk="compact"]')!;
    (window as unknown as {compactFixture: unknown}).compactFixture = {
      read: () => ({calls, errors: [...errors], same: button === document.querySelector('[data-sdk="compact"]')}),
      clicks() {button.click(); button.click(); button.dispatchEvent(new MouseEvent('click', {bubbles: true}));},
      project(busy: boolean) {app.workspace.updateAvailability({busy}); app.workspace.updateConversation(conversation);},
      finish(result: {ok: true} | {ok: false; error: string}) {complete?.(result);}, destroy: app.destroy,
    };
  });
  const button = page.getByRole('button', {name: 'Compress context', exact: true});
  await expect(button).toBeEnabled();
  await page.evaluate(() => (window as unknown as {compactFixture: {clicks(): void; project(busy: boolean): void}}).compactFixture.clicks());
  await expect(button).toBeDisabled(); await expect(button).toHaveAttribute('aria-busy', 'true');
  await page.evaluate(() => (window as unknown as {compactFixture: {project(busy: boolean): void}}).compactFixture.project(false));
  await expect(button).toBeDisabled();
  expect(await page.evaluate(() => (window as unknown as {compactFixture: {read(): unknown}}).compactFixture.read())).toEqual({calls: 1, errors: [], same: true});
  await page.evaluate(() => (window as unknown as {compactFixture: {finish(result: {ok: true}): void}}).compactFixture.finish({ok: true}));
  await expect(button).toBeEnabled(); await expect(button).toHaveAttribute('aria-busy', 'false');
  await button.click();
  await page.evaluate(() => {
    const fixture = (window as unknown as {compactFixture: {project(busy: boolean): void; finish(result: {ok: false; error: string}): void}}).compactFixture;
    fixture.project(true); fixture.finish({ok: false, error: 'Could not compact'});
  });
  await expect(button).toHaveAttribute('aria-busy', 'false'); await expect(button).toBeDisabled();
  expect(await page.evaluate(() => (window as unknown as {compactFixture: {read(): unknown}}).compactFixture.read())).toEqual({calls: 2, errors: ['Could not compact'], same: true});
  await page.evaluate(() => (window as unknown as {compactFixture: {project(busy: boolean): void}}).compactFixture.project(false));
  await expect(button).toBeEnabled();
  await button.click();
  await page.evaluate(async () => {
    const fixture = (window as unknown as {compactFixture: {destroy(): void; finish(result: {ok: false; error: string}): void}}).compactFixture;
    fixture.destroy(); fixture.finish({ok: false, error: 'Late disposed error'});
    await Promise.resolve(); await Promise.resolve();
  });
  await expect(button).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as {compactFixture: {read(): unknown}}).compactFixture.read())).toEqual({calls: 3, errors: ['Could not compact'], same: false});
});
