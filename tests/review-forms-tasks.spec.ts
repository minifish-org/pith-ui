import { expect, test } from '@playwright/test';
import type { ActionResult } from '../src/core.js';
import type { createProviderActions, ProviderActionsState, ProviderAction, ResourceAction, ResourceActionTarget } from '../src/forms/actions.js';
import type { createSettingsPanel, SettingsPanelState } from '../src/forms/panels.js';
import type { createResourceEditor, ResourceEditorState } from '../src/forms/resource-editor.js';
import type { createFeatureDialogFrame } from '../src/forms/dialog-frame.js';
import type { createApprovalPanel, ApprovalView } from '../src/tasks/approval.js';

declare global {
  interface Window {
    reviewFormsTasks: {
      calls: string[];
      finish?: (result: ActionResult) => void;
      settings?: ReturnType<typeof createSettingsPanel>;
      settingsState?: SettingsPanelState;
      resource?: ReturnType<typeof createResourceEditor>;
      resourceState?: ResourceEditorState;
      provider?: ReturnType<typeof createProviderActions>;
      providerState?: ProviderActionsState;
      originalAction?: HTMLButtonElement;
      frame?: ReturnType<typeof createFeatureDialogFrame>;
      destroyed?: number;
      approval?: ReturnType<typeof createApprovalPanel>;
      approvalState?: ApprovalView;
      disclosure?: HTMLDetailsElement;
      argsPreview?: HTMLElement;
    };
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(() => { window.reviewFormsTasks = { calls: [] }; });
});

test('resource kind is literal attribute data and cannot install an event handler', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { createResourceActions } = await import('../src/forms/actions.js');
    const kind = 'skill" onclick="document.body.dataset.resourceKindExecuted = \'yes\'';
    const block = createResourceActions({ kind, workspaceId: 'workspace', resource: { name: 'demo', path: '/demo/skill.md' } });
    document.body.append(block.element);
    const action = block.element.querySelector<HTMLButtonElement>('[data-sdk="resource"]')!;
    action.click();
    const result = { kind: action.dataset.kind, handler: action.getAttribute('onclick'), executed: document.body.dataset.resourceKindExecuted ?? null };
    block.destroy(); return { ...result, expectedKind: kind };
  });
  expect(result).toEqual({ kind: result.expectedKind, handler: null, executed: null, expectedKind: result.expectedKind });
});

test('resource actions invoke only their action and never submit an enclosing form', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { createResourceActions } = await import('../src/forms/actions.js');
    const calls: string[] = []; let submits = 0;
    const form = document.createElement('form'); form.addEventListener('submit', event => { event.preventDefault(); submits++; });
    const block = createResourceActions({ kind: 'skill', workspaceId: 'workspace', resource: { name: 'demo', path: '/demo/skill.md' } }, { onAction: action => { calls.push(action); } });
    form.append(block.element); document.body.append(form);
    for (const button of block.element.querySelectorAll<HTMLButtonElement>('button')) button.click();
    block.destroy(); form.remove(); return { calls, submits };
  });
  expect(result).toEqual({ calls: ['use-resource', 'resource'], submits: 0 });
});

for (const reason of ['read-only', 'workspace-busy'] as const) {
  test(`resource ${reason} updates preserve the draft and prevent saving or deletion`, async ({ page }) => {
    await page.evaluate(async reason => {
      const { createResourceEditor } = await import('../src/forms/resource-editor.js');
      const initial = { workspaceId: 'workspace', workspacePath: '/demo', path: '/demo/AGENTS.md', kind: 'instructions', content: 'Initial source', editable: true, workspaceBusy: false };
      const block = createResourceEditor(initial, { onDelete: () => { window.reviewFormsTasks.calls.push('delete'); }, onSubmit: () => { window.reviewFormsTasks.calls.push('save'); return { ok: true }; } });
      document.body.append(block.element); Object.assign(window.reviewFormsTasks, { resource: block, resourceState: initial });
      const textarea = block.element.querySelector<HTMLTextAreaElement>('textarea')!; textarea.value = 'Unsaved 中文 draft'; textarea.focus(); textarea.setSelectionRange(2, 8);
      block.update({ ...initial, editable: reason !== 'read-only', workspaceBusy: reason === 'workspace-busy' });
      block.removeButton!.click(); block.form.requestSubmit();
    }, reason);
    await expect(page.getByRole('textbox', { name: 'Markdown', exact: true })).not.toBeEditable();
    await expect(page.getByRole('button', { name: 'Delete resource', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
    expect(await page.evaluate(() => window.reviewFormsTasks.calls)).toEqual([]);
    await expect(page.getByRole('textbox', { name: 'Markdown', exact: true })).toHaveValue('Unsaved 中文 draft');
    await page.evaluate(() => window.reviewFormsTasks.resource!.update(window.reviewFormsTasks.resourceState!));
    await expect(page.getByRole('textbox', { name: 'Markdown', exact: true })).toBeEditable();
    await expect(page.getByRole('button', { name: 'Delete resource', exact: true })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeEnabled();
    await expect(page.getByRole('textbox', { name: 'Markdown', exact: true })).toHaveValue('Unsaved 中文 draft');
  });
}

test('inactive MCP fields do not block stdio submission and regain validation for HTTP', async ({ page }) => {
  await page.evaluate(async () => {
    const { createMCPConnectionsPanel } = await import('../src/forms/panels.js');
    const block = createMCPConnectionsPanel({}, { onSubmit: draft => { window.reviewFormsTasks.calls.push(draft.type + ':' + draft.command); return { ok: true }; } });
    document.body.append(block.element);
  });
  await page.locator('input[name="name"]').fill('local-tools');
  await page.locator('input[name="url"]').fill('not a URL');
  const type = page.getByRole('combobox', { name: 'Connection type', exact: true });
  await type.click(); await page.getByRole('option', { name: 'Local command (stdio)', exact: true }).click();
  await page.locator('input[name="command"]').fill('/usr/bin/demo');
  expect(await page.locator('form').evaluate(form => (form as HTMLFormElement).checkValidity())).toBe(true);
  await page.getByRole('button', { name: 'Save connection', exact: true }).click();
  expect(await page.evaluate(() => window.reviewFormsTasks.calls)).toEqual(['stdio:/usr/bin/demo']);
  await type.click(); await page.getByRole('option', { name: 'HTTP', exact: true }).click();
  await expect(page.locator('input[name="url"]')).toBeEnabled();
  expect(await page.locator('form').evaluate(form => (form as HTMLFormElement).checkValidity())).toBe(false);
  await page.getByRole('button', { name: 'Save connection', exact: true }).click();
  expect(await page.evaluate(() => window.reviewFormsTasks.calls)).toEqual(['stdio:/usr/bin/demo']);
});

test('removing a saved key excludes saving and testing until completion and keeps a failed draft', async ({ page }) => {
  await page.evaluate(async () => {
    const { createSettingsPanel } = await import('../src/forms/panels.js');
    const state = { baseUrl: 'https://example.test/v1', hasApiKey: true, ready: true };
    const block = createSettingsPanel(state, {
      onRemoveKey: () => { window.reviewFormsTasks.calls.push('remove'); return new Promise(resolve => { window.reviewFormsTasks.finish = resolve; }); },
      onSubmit: () => { window.reviewFormsTasks.calls.push('save'); return { ok: true }; },
      onTest: () => { window.reviewFormsTasks.calls.push('test'); },
    });
    document.body.append(block.element); block.setProviders([{ id: 'provider', name: 'Provider' }], 'provider');
    block.setCredential({ status: 'Configured', hidden: false, required: false, placeholder: 'Keep saved key', removeVisible: true });
    block.element.querySelector<HTMLInputElement>('input[type="password"]')!.value = 'Private unsaved draft';
    Object.assign(window.reviewFormsTasks, { settings: block, settingsState: state });
  });
  await page.getByRole('button', { name: 'Remove saved API key', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save settings', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Test connection', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Remove saved API key', exact: true })).toBeDisabled();
  await page.evaluate(() => {
    const block = window.reviewFormsTasks.settings!;
    block.field<HTMLButtonElement>('test-connection').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    block.field<HTMLFormElement>('settings-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    block.field<HTMLButtonElement>('remove-key').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    window.reviewFormsTasks.finish!({ ok: false, error: 'Could not remove the saved key' });
  });
  await expect(page.locator('[data-dialog-error]')).toHaveText('Could not remove the saved key');
  await expect(page.getByRole('button', { name: 'Save settings', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Test connection', exact: true })).toBeEnabled();
  await expect(page.locator('input[type="password"]')).toHaveValue('Private unsaved draft');
  expect(await page.evaluate(() => window.reviewFormsTasks.calls)).toEqual(['remove']);
});

test('provider metadata changes retain the same pending action and never invoke it twice', async ({ page }) => {
  await page.evaluate(async () => {
    const { createProviderActions } = await import('../src/forms/actions.js');
    const state = { id: 'provider', oauth: true, signedIn: false, custom: true };
    const block = createProviderActions(state, { onAction: action => {
      if (action === 'custom') { window.reviewFormsTasks.calls.push('custom'); return new Promise(resolve => { window.reviewFormsTasks.finish = resolve; }); }
    } });
    document.body.append(block.element); Object.assign(window.reviewFormsTasks, { provider: block, providerState: state });
    window.reviewFormsTasks.originalAction = block.element.querySelector<HTMLButtonElement>('[data-sdk="custom"]')!;
  });
  const action = page.getByRole('button', { name: 'Edit models and prices', exact: true });
  await action.click(); await expect(action).toBeDisabled();
  await page.evaluate(() => {
    const fixture = window.reviewFormsTasks; fixture.provider!.update({ ...fixture.providerState!, signedIn: true });
    fixture.provider!.element.querySelector<HTMLButtonElement>('[data-sdk="custom"]')!.click();
  });
  await expect(action).toBeDisabled();
  expect(await page.evaluate(() => window.reviewFormsTasks.originalAction === window.reviewFormsTasks.provider!.element.querySelector('[data-sdk="custom"]'))).toBe(true);
  expect(await page.evaluate(() => window.reviewFormsTasks.calls)).toEqual(['custom']);
  await page.evaluate(() => window.reviewFormsTasks.finish!({ ok: true }));
  await expect(action).toBeEnabled();
});

for (const kind of ['custom', 'resource', 'full-access'] as const) {
  test(`default ${kind} content cancels its feature frame without sharing private IDs`, async ({ page }) => {
    await page.evaluate(async kind => {
      const { createFeatureDialogFrame } = await import('../src/forms/dialog-frame.js');
      const { createCustomConnectionEditor } = await import('../src/forms/custom-connection.js');
      const { createResourceEditor } = await import('../src/forms/resource-editor.js');
      const { createFullAccessConfirmation } = await import('../src/tasks/permission.js');
      const content = kind === 'custom'
        ? createCustomConnectionEditor({ name: 'Endpoint', baseUrl: 'https://example.test/v1', api: 'openai-responses', editing: true, models: [] })
        : kind === 'resource'
          ? createResourceEditor({ workspaceId: 'workspace', workspacePath: '/demo', path: '/demo/skill.md', kind: 'skill', content: 'Draft', editable: true, workspaceBusy: false })
          : createFullAccessConfirmation({ title: 'Conversation' });
      const frame = createFeatureDialogFrame();
      window.reviewFormsTasks.destroyed = 0; window.reviewFormsTasks.frame = frame;
      frame.open({ title: 'Edit content', body: { element: content.element, destroy() { window.reviewFormsTasks.destroyed!++; content.destroy(); } } });
    }, kind);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    expect(await page.evaluate(() => window.reviewFormsTasks.frame!.isOpen())).toBe(false);
    await expect.poll(() => page.evaluate(() => window.reviewFormsTasks.destroyed)).toBe(1);
    await page.evaluate(() => window.reviewFormsTasks.frame!.destroy());
    expect(await page.evaluate(() => window.reviewFormsTasks.destroyed)).toBe(1);
  });
}

test('full-access confirmation updates the displayed target as safe text', async ({ page }) => {
  await page.evaluate(async () => {
    const { createFullAccessConfirmation } = await import('../src/tasks/permission.js');
    const block = createFullAccessConfirmation({ title: 'Conversation A' }); document.body.append(block.element);
    block.update({ title: 'Conversation B <unsafe>', error: 'Review before continuing' });
  });
  await expect(page.getByText('Conversation B <unsafe>', { exact: true })).toBeVisible();
  await expect(page.getByText('Conversation A', { exact: true })).toHaveCount(0);
  await expect(page.locator('unsafe')).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveText('Review before continuing');
});

test('same-approval metadata updates retain disclosure, preview page and focus', async ({ page }) => {
  await page.evaluate(async () => {
    const { createApprovalPanel } = await import('../src/tasks/approval.js');
    const approval = { id: 'approval-a', toolName: 'edit_file', canAlwaysAllow: true, argsText: 'argument line\n'.repeat(30_000), preview: { kind: 'modify', path: 'README.md', diff: '-old\n+new' } };
    const block = createApprovalPanel({ approval }); document.body.append(block.element);
    const disclosure = block.element.querySelector<HTMLDetailsElement>('details')!; disclosure.open = true;
    Object.assign(window.reviewFormsTasks, { approval: block, approvalState: approval, disclosure });
  });
  const args = page.locator('[id$="approval-args-preview"]');
  await args.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(args.getByText('2 / 2', { exact: true })).toBeVisible();
  await page.evaluate(() => {
    const fixture = window.reviewFormsTasks; fixture.argsPreview = fixture.approval!.element.querySelector<HTMLElement>('[id$="approval-args-preview"] pre')!;
    fixture.disclosure!.querySelector('summary')!.focus(); fixture.approval!.update({ approval: { ...fixture.approvalState!, warning: 'Additional review information' } });
  });
  expect(await page.evaluate(() => window.reviewFormsTasks.approval!.element.querySelector('details') === window.reviewFormsTasks.disclosure)).toBe(true);
  await expect(page.locator('details')).toHaveAttribute('open', '');
  await expect(page.locator('summary')).toBeFocused();
  await expect(args.getByText('2 / 2', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.reviewFormsTasks.approval!.element.querySelector('[id$="approval-args-preview"] pre') === window.reviewFormsTasks.argsPreview)).toBe(true);
  await expect(page.getByText('Additional review information', { exact: true })).toBeVisible();
});

test('runtime value updates preserve selection in an unchanged value and keep the disclosure open', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { createRuntimePanel } = await import('../src/tasks/runtime.js');
    const state = { visible: true, summary: 'Running', duration: '1s', speed: '1', provider: 'Demo provider', inputTokens: '1000', outputTokens: '1', cacheRead: '0', cacheWrite: '0', contextTokens: '1000', contextWindow: '10000', compactions: '0', toolFailures: '0', recordedCost: '$0', latestCost: '$0' };
    const block = createRuntimePanel(state); document.body.append(block.element); (block.element as HTMLDetailsElement).open = true;
    const provider = [...block.element.querySelectorAll('dd')].find(node => node.textContent === 'Demo provider')!;
    const range = document.createRange(); range.selectNodeContents(provider); getSelection()!.removeAllRanges(); getSelection()!.addRange(range);
    block.update({ ...state, outputTokens: '2' });
    const result = { selected: getSelection()!.toString(), sameNode: [...block.element.querySelectorAll('dd')].some(node => node === provider), open: (block.element as HTMLDetailsElement).open, updated: [...block.element.querySelectorAll('dd')].some(node => node.textContent === '1000 / 2') };
    block.destroy(); return result;
  });
  expect(result).toEqual({ selected: 'Demo provider', sameNode: true, open: true, updated: true });
});



test('typed provider actions take precedence over legacy callbacks and DOM delegation', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { createProviderActions } = await import('../src/forms/actions.js');
    const received: Array<{ action: ProviderAction; id: string }> = []; let legacy = 0, delegated = 0;
    document.addEventListener('click', event => { if ((event.target as Element).closest('[data-sdk]')) delegated++; });
    const state = { id: 'provider', oauth: true, signedIn: false, custom: true };
    const block = createProviderActions(state, { onProviderAction(action, target) { received.push({ action, id: target.id }); }, onAction() { legacy++; } });
    document.body.append(block.element);
    for (const action of ['login', 'custom', 'remove-connection']) block.element.querySelector<HTMLButtonElement>(`[data-sdk="${action}"]`)!.click();
    block.update({ ...state, signedIn: true }); block.element.querySelector<HTMLButtonElement>('[data-sdk="logout"]')!.click();
    block.destroy(); return { received, legacy, delegated };
  });
  expect(result).toEqual({ received: [
    { action: 'login', id: 'provider' }, { action: 'custom', id: 'provider' }, { action: 'remove-connection', id: 'provider' }, { action: 'logout', id: 'provider' },
  ], legacy: 0, delegated: 0 });
});

test('typed resource actions expose resource identity and command without DOM datasets', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { createResourceActions } = await import('../src/forms/actions.js');
    const received: Array<{ action: ResourceAction; target: ResourceActionTarget }> = []; let legacy = 0, delegated = 0;
    document.addEventListener('click', event => { if ((event.target as Element).closest('[data-sdk]')) delegated++; });
    const block = createResourceActions({ kind: 'skill', workspaceId: 'workspace', resource: { name: 'demo', path: '/demo/skill.md' } }, {
      onResourceAction(action, target) { received.push({ action, target }); }, onAction() { legacy++; },
    });
    document.body.append(block.element); for (const button of block.element.querySelectorAll<HTMLButtonElement>('button')) button.click();
    block.destroy(); return { received, legacy, delegated };
  });
  expect(result.received).toHaveLength(2);
  expect(result.received[0]).toMatchObject({ action: 'use-resource', target: { workspaceId: 'workspace', kind: 'skill', resource: { name: 'demo', path: '/demo/skill.md' }, command: '/skill:demo ' } });
  expect(result.received[1]).toMatchObject({ action: 'resource', target: { workspaceId: 'workspace', kind: 'skill', resource: { name: 'demo', path: '/demo/skill.md' } } });
  expect({ legacy: result.legacy, delegated: result.delegated }).toEqual({ legacy: 0, delegated: 0 });
});

test('MCP typed actions own their callbacks, retain pending through status updates and honor disabled state', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const { createMCPConnectionList } = await import('../src/forms/panels.js');
    type Action = import('../src/forms/panels.js').MCPConnectionAction;
    const received: Array<{ action: Action; name: string }> = []; let delegated = 0;
    document.addEventListener('click', event => { if ((event.target as Element).closest('[data-sdk^="mcp-"], [data-mcp-edit], [data-mcp-toggle], [data-mcp-remove]')) delegated++; });
    const entry = { name: 'tools', type: 'http', url: 'https://example.test/mcp', enabled: true, status: 'connected', statusLabel: 'Connected', oauth: true, signedIn: true };
    let finish!: (result: ActionResult) => void;
    const block = createMCPConnectionList({ entries: [entry] }, { onAction(action, target) {
      received.push({ action, name: target.name });
      if (action === 'mcp-toggle') return new Promise(resolve => { finish = resolve; });
    } });
    document.body.append(block.element);
    for (const selector of ['[data-sdk="mcp-login"]', '[data-sdk="mcp-logout"]', '[data-mcp-edit]', '[data-mcp-remove]']) block.element.querySelector<HTMLButtonElement>(selector)!.click();
    const toggle = block.element.querySelector<HTMLButtonElement>('[data-mcp-toggle]')!; toggle.click();
    block.update({ entries: [{ ...entry, statusLabel: 'Still connected' }] }); toggle.click();
    const pending = toggle.disabled;
    block.update({ entries: [entry], disabled: true });
    finish({ ok: true }); await new Promise(resolve => setTimeout(resolve, 0));
    const externalDisabled = [...block.element.querySelectorAll<HTMLButtonElement>('button')].every(button => button.disabled);
    const retained = block.element.querySelector('[data-mcp-toggle]') === toggle;
    block.destroy(); return { received, pending, externalDisabled, retained, delegated };
  });
  expect(result).toEqual({ received: [
    { action: 'mcp-login', name: 'tools' }, { action: 'mcp-logout', name: 'tools' }, { action: 'mcp-edit', name: 'tools' }, { action: 'mcp-remove', name: 'tools' }, { action: 'mcp-toggle', name: 'tools' },
  ], pending: true, externalDisabled: true, retained: true, delegated: 0 });
});
