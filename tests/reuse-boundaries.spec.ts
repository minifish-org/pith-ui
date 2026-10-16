import { test, expect } from '@playwright/test';
import type { createBranchHistory, BranchHistoryState } from '../src/forms/history.js';
import type { createArtifactPanel } from '../src/files/panels.js';

declare global {
  interface Window {
    reuseFixture: {
      history?: ReturnType<typeof createBranchHistory>;
      state?: BranchHistoryState;
      calls: string[];
      finish?: () => void;
      reject?: (error: Error) => void;
      action?: HTMLButtonElement;
      artifacts?: ReturnType<typeof createArtifactPanel>;
    };
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(() => { window.reuseFixture = { calls: [] }; });
});

test('branch continuation keeps one pending action through unchanged and metadata updates', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/forms/history.ts'; const { createBranchHistory } = await import(path);
    const state = { nodes: [{ id: 'saved-a', role: 'user', text: 'Saved question', active: true }] };
    const history = createBranchHistory(state, { onContinue: (id: string) => {
      window.reuseFixture.calls.push(id);
      return new Promise<void>(resolve => { window.reuseFixture.finish = resolve; });
    } });
    document.body.append(history.element); Object.assign(window.reuseFixture, { history, state });
    const action = history.element.querySelector('[data-branch]') as HTMLButtonElement;
    window.reuseFixture.action = action; action.focus(); action.click(); action.click();
    history.update(state);
    history.update({ nodes: [{ ...state.nodes[0], text: 'Updated saved question' }] });
    (history.element.querySelector('[data-branch]') as HTMLButtonElement).click();
  });
  expect(await page.evaluate(() => window.reuseFixture.calls)).toEqual(['saved-a']);
  await expect(page.getByRole('button', { name: 'Continue here', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => window.reuseFixture.action === window.reuseFixture.history!.element.querySelector('[data-branch]'))).toBe(true);
  await expect(page.getByText('Updated saved question', { exact: true })).toBeVisible();
  await page.evaluate(() => window.reuseFixture.finish!());
  await expect(page.getByRole('button', { name: 'Continue here', exact: true })).toBeEnabled();
});

test('branch continuation reports failure locally and discards rejected work after destruction', async ({ page }) => {
  const pageErrors: string[] = []; page.on('pageerror', error => pageErrors.push(error.message));
  await page.evaluate(async () => {
    const path = '/src/forms/history.ts'; const { createBranchHistory } = await import(path);
    const history = createBranchHistory({ nodes: [{ id: 'saved-a', role: 'user', text: 'Saved question', active: false }] }, {
      onContinue: (id: string) => {
        window.reuseFixture.calls.push(id);
        return new Promise<void>((_resolve, reject) => { window.reuseFixture.reject = reject; });
      },
    });
    document.body.append(history.element); window.reuseFixture.history = history;
  });
  await page.getByRole('button', { name: 'Continue here', exact: true }).click();
  await page.evaluate(() => window.reuseFixture.reject!(new Error('The saved branch is unavailable')));
  await expect(page.getByRole('alert')).toHaveText('The saved branch is unavailable');
  await expect(page.getByRole('button', { name: 'Continue here', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => window.reuseFixture.calls)).toEqual(['saved-a']);
  await page.getByRole('button', { name: 'Continue here', exact: true }).click();
  await page.evaluate(async () => {
    window.reuseFixture.history!.destroy();
    const path = '/src/forms/history.ts'; const { createBranchHistory } = await import(path);
    const replacement = createBranchHistory({ nodes: [] }); document.body.append(replacement.element);
    window.reuseFixture.reject!(new Error('Late failure belongs to the destroyed history'));
    await new Promise(resolve => setTimeout(resolve, 0));
  });
  await expect(page.getByText('No history yet.', { exact: true })).toBeVisible();
  await expect(page.getByText('Late failure belongs to the destroyed history', { exact: true })).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

test('artifact anchored surface preserves exclusions, focus, Escape and dialog precedence', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/files/panels.ts'; const { createArtifactPanel } = await import(path);
    const control = document.createElement('div'), toggle = document.createElement('button'), count = document.createElement('span'), container = document.createElement('section');
    const preview = document.createElement('button'), outside = document.createElement('button'), dialog = document.createElement('dialog');
    dialog.id = 'preview-dialog'; dialog.textContent = 'Preview';
    preview.textContent = 'Preview exclusion'; outside.textContent = 'Outside'; container.tabIndex = -1;
    control.append(toggle, count, container); document.body.append(control, preview, outside, dialog);
    const artifacts = createArtifactPanel({ container, control, toggle, count, dismissExclusions: [preview, dialog] });
    artifacts.update({ ownerId: 'chat-a', files: [{ name: 'Report', path: 'report.md' }], loading: false, error: '', copyMode: 'path' });
    window.reuseFixture.artifacts = artifacts;
  });
  const toggle = page.getByRole('button', { name: 'Conversation files (1 file)', exact: true });
  await toggle.click();
  expect(await page.evaluate(() => document.activeElement === window.reuseFixture.artifacts!.element)).toBe(true);
  await page.getByRole('button', { name: 'Preview exclusion', exact: true }).focus();
  await page.getByRole('button', { name: 'Preview exclusion', exact: true }).click();
  expect(await page.evaluate(() => window.reuseFixture.artifacts!.open)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await page.evaluate(() => (document.getElementById('preview-dialog') as HTMLDialogElement).showModal());
  await page.keyboard.press('Escape');
  expect(await page.evaluate(() => window.reuseFixture.artifacts!.open)).toBe(true);
  await page.getByRole('button', { name: 'Outside', exact: true }).focus();
  expect(await page.evaluate(() => window.reuseFixture.artifacts!.open)).toBe(false);
  await toggle.click();
  await page.evaluate(() => window.reuseFixture.artifacts!.destroy());
  const expandedAfterDestroy = await toggle.getAttribute('aria-expanded');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', expandedAfterDestroy!);
});
