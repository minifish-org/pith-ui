import { test, expect } from '@playwright/test';
import type { createWorkspaceShell, ComposerViewState } from '../src/workspace.js';
import type { createResourcesPanel, createArtifactPanel } from '../src/files/panels.js';

declare global {
  interface Window {
    shellFixture: { shell: ReturnType<typeof createWorkspaceShell>; calls: string[]; state: ComposerViewState; finish(value: { ok: boolean; error?: string }): void };
    panelsFixture: { resources: ReturnType<typeof createResourcesPanel>; artifacts: ReturnType<typeof createArtifactPanel>; actions: string[] };
  }
}

test('shell composes typed composer callbacks without rebuilding selected options or an IME draft', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const path = '/src/workspace.ts';
    const { createWorkspaceShell } = await import(path);
    const calls: string[] = [];
    let finish!: (value: { ok: boolean; error?: string }) => void;
    const shell = createWorkspaceShell({ brand: document.createTextNode('Pith Desk'), composer: {
      onSubmit: (text: string) => { calls.push(text); return new Promise(resolve => { finish = resolve; }); },
      onModel: () => calls.push('model'), onThinkingChange: (value: string) => calls.push(value),
    } });
    document.body.append(shell.element);
    const state = { action: 'send', model: { label: 'Existing model', description: 'Provider / model' }, thinking: { options: [{ value: 'off', label: 'Off' }, { value: 'high', label: 'High' }], value: 'high' } };
    shell.composer.update(state); shell.composer.reset('保留中的草稿');
    Object.assign(window, { shellFixture: { shell, calls, state, finish: (value: { ok: boolean; error?: string }) => finish(value) } });
  });
  const input = page.getByRole('textbox', { name: 'Message Pith' });
  const select = page.getByRole('combobox', { name: 'Thinking effort' });
  await input.focus();
  const retained = await page.evaluate(() => {
    const fixture = window.shellFixture;
    const input = fixture.shell.composer.input as HTMLTextAreaElement;
    input.setSelectionRange(1, 4);
    const option = fixture.shell.element.querySelector('select[aria-label="Thinking effort"] option:checked');
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    fixture.shell.composer.update(fixture.state);
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true }));
    return { sameOption: option === fixture.shell.element.querySelector('select[aria-label="Thinking effort"] option:checked'), start: input.selectionStart, end: input.selectionEnd, calls: fixture.calls.length, focused: document.activeElement === input };
  });
  expect(retained).toEqual({ sameOption: true, start: 1, end: 4, calls: 0, focused: true });
  await input.dispatchEvent('compositionend');
  await page.getByRole('button', { name: 'Choose model', exact: true }).click();
  await select.selectOption('off');
  await input.press('Enter');
  await expect(page.getByRole('button', { name: 'Send message', exact: true })).toBeDisabled();
  await input.press('Enter');
  expect(await page.evaluate(() => window.shellFixture.calls)).toEqual(['model', 'off', '保留中的草稿']);
  await page.evaluate(() => window.shellFixture.finish({ ok: false, error: 'Failure keeps the draft' }));
  await expect(input).toHaveValue('保留中的草稿');
  await expect(page.getByRole('alert').filter({ hasText: 'Failure keeps the draft' })).toBeVisible();
});

test('shell owns busy feedback, sidebar and scoped availability without changing host identities', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async () => {
    const path = '/src/workspace.ts'; const { createWorkspaceShell } = await import(path);
    const opened: string[] = []; const closed: string[] = [];
    const shell = createWorkspaceShell({ brand: document.createTextNode('Pith Desk'), onBusyAction: (key: string) => opened.push(key), onDialogClose: (name: string) => closed.push(name) });
    document.body.append(shell.element);
    shell.update({ workspace: 'Workspace', conversation: 'Conversation', busy: { key: 'run-1', message: 'A task is running', actionLabel: 'Open running conversation' }, error: { message: '<unsafe>' } });
    shell.part('workspace-busy').querySelector('button').click();
    shell.setSidebarOpen(true); const sidebar = shell.part('sidebar').classList.contains('pui-open'); shell.setSidebarOpen(false);
    const button = document.createElement('button'); button.dataset.idleConversation = 'c1'; button.dataset.idleAction = ''; button.dataset.controlPending = 'true'; shell.element.append(button);
    shell.updateActionAvailability(() => false); const pending = button.disabled;
    delete button.dataset.controlPending; shell.updateActionAvailability((scope: { kind: string; id?: string }) => scope.kind === 'conversation' && scope.id === 'c1');
    const disabled = button.disabled; shell.openDialog('settings'); shell.closeDialog('settings');
    await new Promise(resolve => setTimeout(resolve, 30));
    const safeError = shell.part('inline-error').textContent === '<unsafe>' && !shell.part('inline-error').querySelector('unsafe');
    shell.destroy(); shell.update({ workspace: 'late result' });
    return { opened, closed, sidebar, pending, disabled, safeError, removed: !shell.element.isConnected };
  });
  expect(result).toEqual({ opened: ['run-1'], closed: ['settings'], sidebar: true, pending: true, disabled: true, safeError: true, removed: true });
});

test('a read-only loading draft does not prevent stopping the running task', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const path = '/src/workspace.ts'; const { createComposerView } = await import(path);
    const composer = createComposerView({ onStop: () => { document.body.dataset.stopped = 'true'; } });
    document.body.append(composer.element); composer.reset('Draft is still loading'); composer.update({ readOnly: true, action: 'stop' });
  });
  await expect(page.getByRole('textbox', { name: 'Message Pith' })).not.toBeEditable();
  await page.getByRole('button', { name: 'Stop agent', exact: true }).click();
  await expect(page.locator('body')).toHaveAttribute('data-stopped', 'true');
  await expect(page.getByRole('textbox', { name: 'Message Pith' })).toHaveValue('Draft is still loading');
});

test('plain Enter on an empty running composer retains the draft and leaves stop explicit', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const path = '/src/workspace.ts'; const { createComposerView } = await import(path);
    const composer = createComposerView({ onSubmit: () => { document.body.dataset.sent = 'true'; }, onStop: () => { document.body.dataset.stopped = 'true'; } });
    document.body.append(composer.element); composer.update({ action: 'stop' });
  });
  const input = page.getByRole('textbox', { name: 'Message Pith' });
  await input.press('Enter');
  await expect(input).toHaveValue('');
  await expect(page.locator('body')).not.toHaveAttribute('data-sent');
  await expect(page.locator('body')).not.toHaveAttribute('data-stopped');
  await input.press('Shift+Enter');
  await expect(input).toHaveValue('\n');
});

test('resource toolbar and artifact dismissal use public callbacks and retain preview exclusions', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const path = '/src/files/panels.ts'; const { createResourcesPanel, createArtifactPanel } = await import(path);
    const actions: string[] = [];
    const resources = createResourcesPanel({ onRefresh: () => actions.push('refresh'), onCreate: (kind: string) => actions.push(kind) });
    document.body.append(resources.element); resources.open('Existing workspace');
    resources.update({ instructions: [], skills: [], templates: [], diagnostics: [], canCreateInstructions: true });
    const control = document.createElement('div'), toggle = document.createElement('button'), count = document.createElement('span'), container = document.createElement('section'), preview = document.createElement('button'), outside = document.createElement('button');
    toggle.textContent = 'Files'; preview.textContent = 'Preview exclusion'; outside.textContent = 'Outside'; container.tabIndex = -1; control.append(toggle, count, container); document.body.append(control, preview, outside);
    const artifacts = createArtifactPanel({ container, control, toggle, count, dismissExclusions: [preview] });
    artifacts.update({ ownerId: 'c1', files: [{ name: 'result.md', path: 'result.md' }], loading: false, error: '', copyMode: 'path' });
    Object.assign(window, { panelsFixture: { resources, artifacts, actions } });
  });
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await page.getByRole('button', { name: 'Add skill', exact: true }).click();
  await page.getByRole('button', { name: 'Add prompt template', exact: true }).click();
  await page.getByRole('button', { name: 'Create AGENTS.md in this workspace', exact: true }).click();
  expect(await page.evaluate(() => window.panelsFixture.actions)).toEqual(['refresh', 'skill', 'template', 'instructions']);
  await page.getByRole('button', { name: 'Conversation files (1 file)' }).click();
  await page.getByRole('button', { name: 'Preview exclusion' }).focus();
  expect(await page.evaluate(() => window.panelsFixture.artifacts.open)).toBe(true);
  await page.getByRole('button', { name: 'Outside' }).focus();
  expect(await page.evaluate(() => window.panelsFixture.artifacts.open)).toBe(false);
});
