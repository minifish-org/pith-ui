import {test,expect,type Page} from '@playwright/test';

interface Action {action: 'copy'|'edit'|'branch';messageId: string;branchKey?: string}
interface State {id: string;messages: Array<{id: string;role: string;text: string;actions: {copy: boolean;edit: boolean;branch: {key: string}}}>;working: boolean}
interface Harness {body: {update(state: State): void;updateAvailability(state: {copy?: boolean;edit?: boolean;branch?: boolean}): void;destroy(): void};state: State;actions: Action[];errors: string[];resolves: Array<(result: {ok: true}|{ok: false;error: string}) => void>}
declare global {interface Window {messageActionParts: Harness}}
async function setup(page: Page,old: boolean): Promise<void> {
  await page.goto('/tests/fixture.html');await page.clock.install({time: new Date('2026-01-01T00:00:00Z')});await page.clock.pauseAt(new Date('2026-01-01T00:00:01Z'));
  await page.evaluate(async old => {
    document.body.classList.remove('pui');const state: State = {id: 'actions',working: false,messages: [{id: 'original',role: 'user',text: 'Original text',actions: {copy: true,edit: true,branch: {key: 'original-branch'}}}]};
    const h = {state,actions: [],errors: [],resolves: []} as unknown as Harness;
    const callbacks = {onMessageAction(action: Action) {h.actions.push(action);return new Promise(resolve => h.resolves.push(resolve));},onError(message: string) {h.errors.push(message);}};
    const path = '/src/app/index.ts',{createApplication} = await import(path),mount = document.body.appendChild(document.createElement('div')),app = createApplication(mount,{workspace: callbacks});app.workspace.updateConversation(state);
    if (old) {h.body = {update: app.workspace.updateConversation,updateAvailability: app.workspace.updateMessageAvailability,destroy: app.destroy};mount.querySelector('[id$="copy-status"]')!.setAttribute('data-testid','message-copy-announcement');}
    else {
      const context = mount.querySelector('.pui-app')!.cloneNode(true);app.destroy();mount.append(context);
      const recipePath = '/examples/assemblies/conversation-body.ts',partsPath = '/src/parts/index.ts',{composeConversationBody} = await import(recipePath),p = await import(partsPath),body = composeConversationBody(state,callbacks);
      p.mountParts(mount.querySelector('.pui-chat-scroll'),body.part);
      if (body.announcement) {const live = document.body.appendChild(document.createElement('div'));p.mountParts(live,body.announcement);live.firstElementChild!.setAttribute('data-testid','message-copy-announcement');}h.body = body;
    }
    window.messageActionParts = h;
  },old);
}

test('copy alone owns pending and check feedback through unchanged snapshots and independent availability',async ({page}) => {
  const states: unknown[] = [];
  for (const old of [true,false]) {
    await setup(page,old);const copy = page.getByRole('button',{name: 'Copy message',exact: true}),initial = await copy.locator('svg').evaluate(node => node.innerHTML);
    await copy.click();await expect(copy).toBeDisabled();await expect(page.getByRole('button',{name: 'Edit message',exact: true})).toBeEnabled();
    await page.evaluate(() => {const h = window.messageActionParts;h.body.update(h.state);h.body.updateAvailability({copy: false});document.querySelector('.pui-messages button')!.dispatchEvent(new MouseEvent('click',{bubbles: true}));});
    expect(await page.evaluate(() => window.messageActionParts.actions)).toEqual([{action: 'copy',messageId: 'original',branchKey: undefined}]);await expect(copy).toBeDisabled();
    await page.evaluate(() => window.messageActionParts.resolves[0]!({ok: true}));
    const copied = page.getByRole('button',{name: 'Message copied',exact: true});await expect(copied).toBeDisabled();await expect(page.getByTestId('message-copy-announcement')).toHaveText('Message copied');
    await page.evaluate(() => {const h = window.messageActionParts;h.body.update(h.state);h.body.updateAvailability({copy: true});});
    states.push(await copied.evaluate(node => ({label: node.getAttribute('aria-label'),title: node.getAttribute('title'),text: node.textContent,glyph: node.querySelector('svg')!.innerHTML,busy: node.getAttribute('aria-busy')})));
    await page.clock.fastForward(1499);await expect(copied).toBeVisible();await page.clock.fastForward(1);
    const restored = page.getByRole('button',{name: 'Copy message',exact: true});await expect(restored).toBeDisabled();expect(await restored.locator('svg').evaluate(node => node.innerHTML)).toBe(initial);
  }
  expect(states[1]).toEqual(states[0]);
});

for (const action of ['edit','branch'] as const) test(`${action} dispatch retains the baseline callback behavior without inventing pending UI`,async ({page}) => {
  for (const old of [true,false]) {
    await setup(page,old);const label = action === 'edit' ? 'Edit message' : 'Branch from this message',button = page.getByRole('button',{name: label,exact: true});
    await button.click();await expect(button).toBeEnabled();await button.click();
    expect(await page.evaluate(() => window.messageActionParts.actions)).toEqual([1,2].map(() => ({action,messageId: 'original',branchKey: action === 'branch' ? 'original-branch' : undefined})));
    await page.evaluate(() => window.messageActionParts.resolves[0]!({ok: false,error: 'Host rejected action'}));await expect.poll(() => page.evaluate(() => window.messageActionParts.errors)).toEqual(['Host rejected action']);
    await page.evaluate(() => {const h = window.messageActionParts;h.body.destroy();h.resolves[1]!({ok: false,error: 'Late retired action'});});await page.clock.fastForward(10);expect(await page.evaluate(() => window.messageActionParts.errors)).toEqual(['Host rejected action']);
  }
});

test('local Markdown links retain conversation-scoped resolution and frozen host targets without navigation',async ({page}) => {
  for (const old of [true,false]) {
    await page.goto('/tests/fixture.html');await page.evaluate(async old => {
      document.body.classList.remove('pui');const calls: unknown[] = [],errors: string[] = [],resolutions: string[][] = [];
      const callbacks = {resolveLocalLink(href: string,id: string) {resolutions.push([href,id]);return {path: '/workspace/reports/Result 中文.md',conversationId: id};},onLocalFile(target: unknown) {calls.push({target,frozen: Object.isFrozen(target)});return {ok: false,error: 'Native file open failed'};},onError(message: string) {errors.push(message);}};
      const state = {id: 'original-conversation',messages: [{id: 'answer',role: 'assistant',text: '[Original result](reports/Result%20中文.md)'}],working: false};
      const path = '/src/app/index.ts',{createApplication} = await import(path),mount = document.body.appendChild(document.createElement('div')),app = createApplication(mount,{workspace: callbacks});app.workspace.updateConversation(state);
      if (!old) {const context = mount.firstElementChild!.cloneNode(true);app.destroy();mount.replaceChildren(context);calls.length = errors.length = resolutions.length = 0;const recipePath = '/examples/assemblies/conversation-body.ts',partsPath = '/src/parts/index.ts',{composeConversationBody} = await import(recipePath),p = await import(partsPath),body = composeConversationBody(state,callbacks);p.mountParts(mount.querySelector('.pui-chat-scroll'),body.part);}
      Object.assign(window,{messageLinkParts: {calls,errors,resolutions}});
    },old);
    await page.locator('.pui-messages').getByRole('link',{name: 'Original result',exact: true}).click();
    await expect.poll(() => page.evaluate(() => (window as unknown as {messageLinkParts: {errors: string[]}}).messageLinkParts.errors)).toEqual(['Native file open failed']);
    expect(await page.evaluate(() => (window as unknown as {messageLinkParts: {calls: unknown[];resolutions: string[][]}}).messageLinkParts)).toEqual({calls: [{target: {path: '/workspace/reports/Result 中文.md',conversationId: 'original-conversation'},frozen: true}],errors: ['Native file open failed'],resolutions: [['reports/Result%20中文.md','original-conversation']]});
    expect(new URL(page.url()).pathname).toBe('/tests/fixture.html');
  }
});
