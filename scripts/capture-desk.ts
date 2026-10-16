import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const url = process.env.DESK_URL ?? 'http://127.0.0.1:5198';
const fixture = process.env.DESK_FIXTURE ?? '/tmp/pith-ui-baseline/frontend/e2e/fixture.mjs';
const label = process.env.DESK_VARIANT ?? 'baseline';
const directory = resolve(process.env.PITH_UI_EVIDENCE_DIR ?? '/tmp/pith-ui-evidence-20261016', `screenshots-${label}`);
await mkdir(directory, { recursive: true });
const { installFixture } = await import(pathToFileURL(fixture).href);
const browser = await chromium.launch();
const records: unknown[] = [];
const viewports = [{ width: 900, height: 600 }, { width: 1280, height: 800 }, { width: 1440, height: 900 }];
const scenes = ['chat', 'settings', 'model', 'message-edit', 'queue-edit', 'approval', 'resources', 'confirmation'] as const;
try {
  for (const theme of ['light', 'dark'] as const) for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, locale: 'en-US', timezoneId: 'UTC', colorScheme: theme, reducedMotion: 'reduce', deviceScaleFactor: 1 });
    await context.addInitScript(installFixture);
    await context.addInitScript(({ theme }) => {
      const scope = window as unknown as {
        reviewState: { settings: { appearance: string }; messages: unknown[] };
        review: { resources: unknown };
      };
      scope.reviewState.settings.appearance = theme;
      const timestamp = Date.parse('2026-10-13T13:53:00Z');
      scope.reviewState.messages = [
        { id: 'user', role: 'user', branchNodeId: 'user', text: '帮我阅读这个项目，并整理已有行为。\n\nPlease preserve the working behavior and keep the UI simple.', timestamp },
        { id: 'old-answer', role: 'assistant', branchNodeId: 'old-answer', status: 'done', text: '## Existing behavior\n\nThe current implementation preserves **drafts**, keyboard focus, and reading position.\n\n- Keep the existing palette.\n- Reuse the same components.\n\n```ts\nconst message = "中文 example 🐟";\nconsole.log(message);\n```', timestamp: timestamp + 60000 },
        { id: 'answer', role: 'assistant', branchNodeId: 'answer', status: 'done', text: 'I will check the existing behavior before changing the interface.', timestamp: timestamp + 120000 },
      ];
      scope.review.resources = {
        instructions: [{ name: 'AGENTS.md', path: '/tmp/pith-review/AGENTS.md', content: '# Workspace instructions\nPreserve existing behavior.' }],
        skills: [{ name: 'example-skill', path: '/tmp/pith-review/.pi/skills/example/SKILL.md', description: 'A reusable workflow with explicit boundaries.' }],
        templates: [{ name: 'review', path: '/tmp/pith-review/prompts/review.md', description: 'Read the source and provide evidence.' }], diagnostics: [],
      };
    }, { theme });
    const page = await context.newPage(); const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const scene of scenes) {
      await page.goto(url);
      await expect(page.locator('#composer-input')).toBeEditable();
      if (scene === 'settings') {
        await page.locator('#sidebar [data-action="settings"]').click(); await expect(page.locator('#save-settings')).toBeVisible();
        await expect(page.locator('#settings-provider')).toHaveValue('custom-test');
        await expect(page.locator('#settings-dialog [data-update-message]')).toHaveText('Local review fixture');
      } else if (scene === 'model') {
        await page.locator('#composer-model').click(); await expect(page.locator('#picker-model option')).toHaveCount(1);
      } else if (scene === 'message-edit') {
        await page.locator('[data-edit-message="user"]').click(); await expect(page.locator('#message-edit-text')).toBeFocused();
      } else if (scene === 'queue-edit') {
        await page.evaluate(() => {
          const scope = window as unknown as { reviewState: { running: boolean; queuedMessages: unknown[] }; emitReview(): void };
          scope.reviewState.running = true; scope.reviewState.queuedMessages = [{ id: 'queued', mode: 'follow-up', text: 'Pending 中文 follow-up', imageCount: 1 }]; scope.emitReview();
        });
        await page.locator('[data-queue-action="edit"]').click(); await expect(page.locator('#queue-edit-text')).toBeFocused();
      } else if (scene === 'approval') {
        await page.evaluate(() => {
          const scope = window as unknown as { reviewState: { running: boolean; runtime: { phase: string }; pendingApproval: unknown; queuedMessages: unknown[] }; emitReview(): void };
          scope.reviewState.running = true; scope.reviewState.runtime.phase = 'tool';
          scope.reviewState.pendingApproval = { id: 'approval', toolName: 'edit_file', args: { path: 'result.md', edits: [{ oldText: 'old line', newText: 'new line' }] }, preview: { kind: 'modify', path: 'result.md', diff: '--- a/result.md\n+++ b/result.md\n' + '-old line\n+new line\n'.repeat(50) } };
          scope.reviewState.queuedMessages = Array.from({ length: 6 }, (_, index) => ({ id: `q${index}`, text: 'Pending follow-up message', mode: 'follow-up' })); scope.emitReview();
        });
        await expect(page.locator('[data-approval="allow"]')).toBeAttached(); await page.locator('#composer-input').fill('A multiline draft\n'.repeat(6));
      } else if (scene === 'resources') {
        await page.locator('[data-action="resources"]').click(); await expect(page.locator('#resources-content')).toContainText('AGENTS.md');
      } else if (scene === 'confirmation') {
        await page.locator('[data-action="connections"]').click(); await page.locator('[data-mcp-remove]').click(); await expect(page.locator('#cancel-delete')).toBeFocused();
      }
      await page.evaluate(() => document.fonts.ready);
      const file = `${scene}-${theme}-${viewport.width}x${viewport.height}.png`;
      const path = join(directory, file);
      await page.screenshot({ path, fullPage: false, animations: 'disabled', caret: 'hide' });
      const geometry = await page.evaluate(() => {
        const composer = document.getElementById('composer-input')?.getBoundingClientRect();
        const dialogs = [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].map(dialog => ({ id: dialog.id, height: dialog.getBoundingClientRect().height, scrollHeight: dialog.scrollHeight }));
        return { documentHeight: document.documentElement.scrollHeight, viewportHeight: innerHeight, composerBottom: composer?.bottom, dialogs };
      });
      const data = await readFile(path);
      records.push({ scene, theme, viewport, file, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex'), geometry });
    }
    if (errors.length) throw new Error(`Page errors in ${theme} ${viewport.width}: ${errors.join('; ')}`);
    await context.close();
  }
} finally { await browser.close(); }
const report = join(directory, 'manifest.json');
await writeFile(report, JSON.stringify({ label, url, fixture, browser: 'chromium', records }, null, 2));
console.log(JSON.stringify({ report, screenshots: records.length }, null, 2));
