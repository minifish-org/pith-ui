import { test, expect } from '@playwright/test';
import type { createCostLedger, createCopyFeedback, createUpdatePanel } from '../src/files/systems.js';

declare global {
  interface Window {
    fileFixture: {
      cost?: ReturnType<typeof createCostLedger>; update?: ReturnType<typeof createUpdatePanel>;
      copy?: ReturnType<typeof createCopyFeedback>; resolve?: () => void; reject?: (error: Error) => void; calls?: number;
      rows?: Element[]; refreshRows?: () => void;
    };
  }
}
test.beforeEach(async ({ page }) => { await page.goto('/tests/fixture.html'); await page.evaluate(() => { window.fileFixture = {}; }); });

test('file action buttons never submit their parent form and report the exact local action', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/files/panels.ts'; const { createFileActions } = await import(path);
    const form = document.createElement('form'); form.addEventListener('submit', (event) => { event.preventDefault(); form.dataset.submitted = 'true'; });
    const actions = createFileActions({ kind: 'artifact', ownerId: 'a', path: 'output/报告 v1.md', preview: true, copyMode: 'path', onAction: (action: string) => { form.dataset.action = action; } }); form.append(actions.element); document.body.append(form);
  });
  await page.getByRole('button', { name: 'Open', exact: true }).click();
  await expect(page.locator('form')).toHaveAttribute('data-action', 'open');
  await expect(page.locator('form')).not.toHaveAttribute('data-submitted');
  await page.getByRole('button', { name: 'Copy path', exact: true }).click();
  await expect(page.locator('form')).toHaveAttribute('data-action', 'copy-path');
  await expect(page.getByRole('button', { name: 'Copy path', exact: true })).toHaveAttribute('data-file-path', 'output/报告 v1.md');
});

test('resource rows escape content while Node action slots remain interactive', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/files/panels.ts'; const { createResourcesPanel } = await import(path);
    const container = document.createElement('div'); document.body.append(container);
    const panel = createResourcesPanel({ container, titleId: 'title', dialogId: 'dialog', listId: 'list', errorId: 'error' });
    panel.open('Workspace <unsafe>', document.createDocumentFragment());
    const action = document.createElement('button'); action.type = 'button'; action.textContent = 'Host action'; action.onclick = () => { container.dataset.clicked = 'true'; };
    panel.update({ instructions: [{ name: '<img src=x>', path: '/demo/AGENTS.md', content: '<script>unsafe</script>', actions: action }], skills: [], templates: [], diagnostics: ['<b>literal note</b>'] });
  });
  await expect(page.locator('h2')).toHaveText('Workspace resources');
  await expect(page.getByText('Workspace <unsafe>', { exact: true })).toBeVisible();
  await expect(page.locator('img, script:not([type="module"])')).toHaveCount(0);
  await page.getByText('View instructions', { exact: true }).click();
  await expect(page.locator('pre')).toHaveText('<script>unsafe</script>');
  await page.getByRole('button', { name: 'Host action', exact: true }).click();
  await expect(page.locator('[data-clicked]')).toHaveCount(1);
});

test('cost display preserves expanded rates and distinguishes unknown costs', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/files/systems.ts'; const { createCostLedger } = await import(path);
    const ledger = createCostLedger(); document.body.append(ledger.element); window.fileFixture.cost = ledger;
    ledger.update({ unknownRequests: 1, requests: [{ id: 'known', purpose: 'Agent', status: 'done', provider: 'provider', model: 'model', time: '2026-10-16', source: '<b>saved rate</b>', price: { input: 1 }, known: true, usage: { input: 1000, output: 250, cacheRead: 300, cacheWrite: 10, reasoning: 120, cost: { total: 0.00175 } } }, { id: 'unknown', purpose: 'Summary', status: 'done', provider: 'provider', model: 'model', time: '2026-10-16', source: 'unknown', price: {}, known: false, usage: { input: 1, output: 2, cacheRead: 0, cacheWrite: 0, cost: { total: 0 } } }] });
  });
  await expect(page.getByRole('cell', { name: 'Unknown', exact: true })).toHaveCount(1);
  await expect(page.getByRole('cell', { name: '$0.00175', exact: true })).toBeVisible();
  await page.locator('details[data-cost-id="known"] summary').click();
  await expect(page.getByText('Reasoning tokens: 120 (included in output)', { exact: true })).toBeVisible();
  await page.evaluate(() => { const row = { id: 'known', purpose: 'Agent', status: 'done', provider: 'provider', model: 'model', time: '2026-10-16', source: 'saved rate', price: {}, known: true, usage: { input: 1000, output: 250, cacheRead: 300, cacheWrite: 10, cost: { total: 0.00175 } } }; window.fileFixture.cost!.update({ unknownRequests: 0, requests: [row] }); });
  await expect(page.locator('details[data-cost-id="known"]')).toHaveAttribute('open', '');
});

test('an update snapshot cannot override a pending action and destruction removes handlers', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/files/systems.ts'; const { createUpdatePanel } = await import(path);
    const panel = createUpdatePanel({ productName: 'Demo', onInstall: () => { window.fileFixture.calls = (window.fileFixture.calls || 0) + 1; } }); document.body.append(panel.element); window.fileFixture.update = panel;
    panel.update({ version: '0.1.0', enabled: true, phase: 'available', availableVersion: '0.1.1', progress: 0, message: 'Available' }); panel.setPending(true);
    panel.update({ version: '0.1.0', enabled: true, phase: 'available', availableVersion: '0.1.1', progress: 0, message: 'Snapshot arrived' });
  });
  await expect(page.getByRole('button', { name: 'Update and restart', exact: true })).toBeDisabled();
  await page.evaluate(() => window.fileFixture.update!.setPending(false));
  await page.getByRole('button', { name: 'Update and restart', exact: true }).click();
  expect(await page.evaluate(() => window.fileFixture.calls)).toBe(1);
  await page.evaluate(() => window.fileFixture.update!.destroy());
  await page.getByRole('button', { name: 'Update and restart', exact: true }).click();
  expect(await page.evaluate(() => window.fileFixture.calls)).toBe(1);
});

test('copy feedback ignores a late failure after destruction', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/files/systems.ts'; const { createCopyFeedback } = await import(path);
    const button = document.createElement('button'); button.textContent = 'Copy'; const status = document.createElement('div'); status.setAttribute('role', 'status'); document.body.append(button, status);
    const feedback = createCopyFeedback({ status, isDisabled: () => false, onError: () => { window.fileFixture.calls = (window.fileFixture.calls || 0) + 1; } }); window.fileFixture.copy = feedback;
    button.onclick = () => { void feedback.copy(button, () => new Promise<void>((resolve, reject) => { window.fileFixture.resolve = resolve; window.fileFixture.reject = reject; }), 'Copied'); };
  });
  await page.getByRole('button', { name: 'Copy', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Copy', exact: true })).toBeDisabled();
  await page.evaluate(() => { window.fileFixture.copy!.destroy(); window.fileFixture.reject!(new Error('Late failure')); });
  expect(await page.evaluate(() => window.fileFixture.calls || 0)).toBe(0);
  await expect(page.getByRole('status')).toBeEmpty();
});

test('artifact rows and their focused actions survive status, metadata and reordered list updates', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/files/panels.ts'; const { createArtifactPanel } = await import(path);
    const container = document.createElement('section'), control = document.createElement('div'), toggle = document.createElement('button'), count = document.createElement('span');
    container.tabIndex = -1; document.body.append(control, toggle, count, container);
    const panel = createArtifactPanel({ container, control, toggle, count });
    const a = { name: 'A', path: 'a.md' }, b = { name: 'B', path: 'b.md' };
    panel.update({ ownerId: 'scope', files: [a], loading: false, error: '', copyMode: 'path' }); panel.setOpen(true);
    const button = container.querySelector('[data-file-action="open"]') as HTMLButtonElement; button.focus();
    window.fileFixture.rows = [button, button.closest('article')!];
    window.fileFixture.refreshRows = () => panel.update({ ownerId: 'scope', files: [b, { ...a, name: 'A updated' }], loading: true, error: 'Recoverable list failure', copyMode: 'path' });
  });
  await page.evaluate(() => window.fileFixture.refreshRows!());
  expect(await page.evaluate(() => { const [button, row] = window.fileFixture.rows!; return { row: row === document.querySelector('[data-file-path="a.md"]')!.closest('article'), button: button === document.querySelector('[data-file-path="a.md"][data-file-action="open"]'), focus: document.activeElement === button }; })).toEqual({ row: true, button: true, focus: true });
  await expect(page.getByText('A updated', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveText('Recoverable list failure');
});

test('cost rows preserve exact disclosure and focus while values change and earlier rows are inserted', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/files/systems.ts'; const { createCostLedger } = await import(path);
    const panel = createCostLedger(); document.body.append(panel.element);
    const row = { id: 'stable', purpose: 'Agent', status: 'done', provider: 'provider', model: 'model', time: '2026-10-16', source: 'Saved rates', price: { input: 1 }, known: true, usage: { input: 1, output: 2, cacheRead: 0, cacheWrite: 0, cost: { total: 0.01 } } };
    panel.update({ unknownRequests: 0, requests: [row] });
    const details = panel.element.querySelector('details')!; details.open = true; const summary = details.querySelector('summary')!; summary.focus();
    window.fileFixture.rows = [details, summary, details.closest('tr')!];
    window.fileFixture.refreshRows = () => panel.update({ unknownRequests: 0, requests: [{ ...row, id: 'earlier' }, { ...row, status: 'updated', price: { input: 2 } }] });
  });
  await page.evaluate(() => window.fileFixture.refreshRows!());
  expect(await page.evaluate(() => { const [details, summary, row] = window.fileFixture.rows!; return { details: details === document.querySelector('[data-cost-id="stable"]'), summary: summary === details!.querySelector('summary'), row: row === details!.closest('tr'), open: (details as HTMLDetailsElement).open, focus: document.activeElement === summary }; })).toEqual({ details: true, summary: true, row: true, open: true, focus: true });
  await expect(page.locator('[data-cost-id="stable"] pre')).toContainText('2');
});

test('completion metadata and reordered notices retain their exact focused action', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/files/systems.ts'; const { createCompletionNotices } = await import(path);
    const panel = createCompletionNotices(); document.body.append(panel.element);
    const notice = { id: 'chat-a', runID: 'run-a', title: 'Original', workspace: 'Workspace' };
    panel.update([notice]);
    const button = panel.element.querySelector('[data-conversation]') as HTMLButtonElement; button.focus(); window.fileFixture.rows = [button, button.closest('article')!];
    window.fileFixture.refreshRows = () => panel.update([{ id: 'chat-b', runID: 'run-b', title: 'Second', workspace: 'Workspace' }, { ...notice, title: 'Updated title' }]);
  });
  await page.evaluate(() => window.fileFixture.refreshRows!());
  expect(await page.evaluate(() => { const [button, row] = window.fileFixture.rows!; return { button: button === document.querySelector('[data-conversation="chat-a"]'), row: row === button!.closest('article'), focus: document.activeElement === button }; })).toEqual({ button: true, row: true, focus: true });
  await expect(page.getByText('Workspace · Updated title', { exact: true })).toBeVisible();
});

test('update errors keep disabled and pending conditions and survive releasing pending', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/files/systems.ts'; const { createUpdatePanel } = await import(path);
    const panel = createUpdatePanel(); document.body.append(panel.element); window.fileFixture.update = panel;
    panel.update({ version: '0.1.0', enabled: false, phase: 'disabled', availableVersion: '', progress: 0, message: 'Disabled' }); panel.setError('Read failed');
  });
  await expect(page.getByRole('button', { name: 'Check for updates', exact: true })).toBeDisabled();
  await page.evaluate(() => { window.fileFixture.update!.update({ version: '0.1.0', enabled: true, phase: 'available', availableVersion: '0.1.1', progress: 0, message: 'Available' }); window.fileFixture.update!.setPending(true); window.fileFixture.update!.setError('Temporary failure'); });
  await expect(page.getByRole('button', { name: 'Check for updates', exact: true })).toBeDisabled();
  await page.evaluate(() => window.fileFixture.update!.setPending(false));
  await expect(page.getByRole('button', { name: 'Check for updates', exact: true })).toBeEnabled();
  await expect(page.locator('[data-update-message]')).toHaveText('Temporary failure');
});

test('a failed status read can permit manual checking while install and external conditions stay protected', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/files/systems.ts'; const { createUpdatePanel } = await import(path);
    const panel = createUpdatePanel(); document.body.append(panel.element); window.fileFixture.update = panel;
    panel.update({ version: '0.1.0', enabled: true, phase: 'installing', availableVersion: '0.1.1', progress: 25, message: 'Installing' });
    panel.setError('Status read failed', { allowCheckRetry: true });
  });
  await expect(page.getByRole('button', { name: 'Check for updates', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Update and restart', exact: true })).toBeDisabled();
  await page.evaluate(() => { const panel = window.fileFixture.update!; panel.update({ version: '0.1.0', enabled: false, phase: 'disabled', availableVersion: '', progress: 0, message: 'Disabled' }); panel.setError('Status read failed', { allowCheckRetry: true }); });
  await expect(page.getByRole('button', { name: 'Check for updates', exact: true })).toBeDisabled();
});
