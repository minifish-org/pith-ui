import {expect, test} from '@playwright/test';
import type {Application, WorkspaceCallbacks} from './internal/application/index.js';

// Expanding a group is local presentation. Workspace selection belongs to the
// picker session's onSelect callback rather than a second scene-level intent.
const unsupportedCallback: WorkspaceCallbacks = {
  // @ts-expect-error Group expansion must not expose a workspace-selection intent.
  onSelectWorkspace(_id: string) {},
};
void unsupportedCallback;

interface NavigationFixture {app: Application; events: string[]}
declare global {interface Window {navigationParity: NavigationFixture}}

test.beforeEach(async ({page}) => {await page.goto('/tests/fixture.html');});

for (const populated of [false, true]) test(`expanding ${populated ? 'a populated' : 'an empty'} application workspace emits no business intent`, async ({page}) => {
  await page.evaluate(async populated => {
    const entry = '/tests/internal/application/index.ts'; const {createApplication} = await import(entry);
    const events: string[] = [];
    const workspace: WorkspaceCallbacks & {onSelectWorkspace(id: string): void} = {
      onSelectWorkspace: id => events.push('workspace:' + id),
      onSelectConversation: (id: string) => events.push('conversation:' + id),
      onNewConversation: (id: string) => events.push('new:' + id),
    };
    const app: Application = createApplication(document.body, {workspace});
    window.navigationParity = {app, events};
    app.workspace.updateNavigation({groups: [
      {id: 'current', name: 'Current workspace', path: '/current', selected: true, children: [{id: 'active', title: 'Current conversation', active: true}]},
      {id: 'other', name: 'Other workspace', path: '/other', selected: false, children: populated ? [{id: 'other-chat', title: 'Other conversation', active: false}] : []},
    ], empty: null});
  }, populated);
  const toggle = page.locator('[data-toggle-workspace="other"]');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  if (populated) await expect(page.locator('[data-conversation="other-chat"]')).toBeVisible();
  expect(await page.evaluate(() => window.navigationParity.events)).toEqual([]);
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  expect(await page.evaluate(() => window.navigationParity.events)).toEqual([]);
});

test('specific conversation, new-conversation and picker actions retain their distinct semantic callbacks', async ({page}) => {
  await page.evaluate(async () => {
    const entry = '/tests/internal/application/index.ts'; const {createApplication} = await import(entry);
    const events: string[] = [];
    const app: Application = createApplication(document.body, {workspace: {
      onSelectConversation: (id: string) => events.push('conversation:' + id),
      onNewConversation: (id: string) => events.push('new:' + id),
    }});
    window.navigationParity = {app, events};
    app.workspace.updateNavigation({groups: [{id: 'w', name: 'Work', path: '/work', selected: true,
      children: [{id: 'a', title: 'Active conversation', active: true}, {id: 'b', title: 'Another conversation', active: false}]}], empty: null});
  });
  await page.locator('[data-conversation="b"]').click();
  await page.locator('[data-new-workspace="w"]').click();
  await page.evaluate(() => {
    const fixture = window.navigationParity;
    fixture.app.workspace.openWorkspacePicker({workspaces: [{id: 'picker', name: 'Picker workspace', path: '/picker'}]}, {onSelect: id => fixture.events.push('picker:' + id)});
  });
  await page.getByRole('dialog').getByRole('button', {name: /Picker workspace/}).click();
  expect(await page.evaluate(() => window.navigationParity.events)).toEqual(['conversation:b', 'new:w', 'picker:picker']);
});
