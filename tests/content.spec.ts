import { test, expect } from '@playwright/test';
import type { ConversationMessage, ConversationViewState } from '../src/content/conversation-view.js';
import type { UIBlock } from '../src/core.js';
import type { createImageViewer } from '../src/content/image-viewer.js';
import type { installConversationReader } from '../src/content/conversation-reader.js';

declare global {
  interface Window {
    contentFixture: {
      view?: UIBlock<ConversationViewState>; messages?: ConversationMessage[];
      viewer?: ReturnType<typeof createImageViewer>; reader?: ReturnType<typeof installConversationReader>;
      first?: Element | null; copied?: string; calls?: string[]; restore?: () => void;
    };
  }
}
test.beforeEach(async ({ page }) => { await page.goto('/tests/fixture.html'); await page.evaluate(() => { window.contentFixture = {}; }); });

test('Markdown uses one sanitization policy, explicit local link resolution and code copy callbacks', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/content/conversation-view.ts'; const { createConversationView } = await import(path);
    const view = createConversationView({ markdown: () => ({ resolveLocalLink: (href: string) => href === 'output/报告.pdf' ? { path: href, conversationId: 'scope' } : null }), onCopyCode: (text: string) => { window.contentFixture.copied = text; } });
    view.update({ id: 'scope', working: false, messages: [{ id: 'answer', role: 'assistant', text: '[报告](output/报告.pdf) [外部](https://example.com) [bad](javascript:alert(1))\n\n<img src=x onerror=alert(1)><script>window.__evil=true</script>\n\n```ts\nconst text = "安全";\n```' }] });
    document.body.append(view.element);
  });
  await expect(page.locator('a[data-download-path]')).toHaveAttribute('data-download-path', 'output/报告.pdf');
  await expect(page.getByRole('link', { name: '外部' })).toHaveAttribute('rel', 'noopener noreferrer');
  await expect(page.locator('img, script:not([type="module"])')).toHaveCount(0);
  await expect(page.locator('a[href^="javascript:"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Copy code', exact: true }).click();
  expect(await page.evaluate(() => window.contentFixture.copied)).toBe('const text = "安全";\n');
});

test('a streamed update retains earlier DOM, text selection, focus and code horizontal position', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/content/conversation-view.ts'; const { createConversationView } = await import(path);
    const messages: ConversationMessage[] = [{ id: 'complete', role: 'assistant', text: `Stable selected words\n\n\`\`\`ts\n${'long_code'.repeat(100)}\n\`\`\``, actions: { copy: 'Copy response' } }, { id: 'stream', role: 'assistant', text: 'First', status: 'streaming' }];
    const view = createConversationView(); document.body.append(view.element); view.update({ id: 'demo', messages, working: false });
    const first = view.element.querySelector('[data-reading-id="complete"]')!;
    const button = first.querySelector('button') as HTMLButtonElement; button.focus();
    const text = first.querySelector('p')!.firstChild!; const range = document.createRange(); range.setStart(text, 0); range.setEnd(text, 6); document.getSelection()!.removeAllRanges(); document.getSelection()!.addRange(range);
    const pre = first.querySelector('pre')!; pre.style.width = '200px'; pre.style.overflow = 'auto'; pre.scrollLeft = 150;
    window.contentFixture = { view, messages, first };
  });
  await page.evaluate(() => { window.contentFixture.messages![1].text += ' more'; window.contentFixture.view!.update({ id: 'demo', messages: window.contentFixture.messages!, working: false }); });
  expect(await page.evaluate(() => ({ same: window.contentFixture.first === document.querySelector('[data-reading-id="complete"]'), selection: document.getSelection()?.toString(), focus: document.activeElement?.getAttribute('aria-label'), scroll: document.querySelector('pre')?.scrollLeft }))).toEqual({ same: true, selection: 'Stable', focus: 'Copy code', scroll: 150 });
});

test('action eligibility is explicit and tool errors retain expanded result nodes', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/content/conversation-view.ts'; const { createConversationView } = await import(path);
    const messages: ConversationMessage[] = [{ id: 'tool', role: 'tool', toolName: 'run_command', status: 'running', text: 'Output', command: { text: 'check', cwd: '/demo' } }, { id: 'assistant', role: 'assistant', text: 'Progress without actions' }];
    const view = createConversationView(); document.body.append(view.element); view.update({ id: 'demo', messages, working: false, folds: new Map([['group-0', true], ['group-0-tool-tool', true]]) }); window.contentFixture = { view, messages };
  });
  await expect(page.getByRole('button', { name: 'Copy response' })).toHaveCount(0);
  await page.evaluate(() => { const { view, messages } = window.contentFixture; messages![0].status = 'error'; messages![0].text = 'Failure output'; view!.update({ id: 'demo', messages: messages!, working: false }); });
  await expect(page.locator('[data-reading-id="tool"]')).toHaveAttribute('open', '');
  await expect(page.locator('.pui-tool-status-error')).toHaveText('Failed');
  await expect(page.getByText('Failure output', { exact: true })).toBeVisible();
});

test('UTF-8 pages reconstruct the full file and large Markdown uses readable plain text', async ({ page }) => {
  const result = await page.evaluate(async () => {
    const path = '/src/content/paged-preview.ts'; const { previewPageRanges, createPagedPreview } = await import(path);
    const text = '```ts\n' + '中文🙂'.repeat(100000) + '\n```'; const bytes = new TextEncoder().encode(text); const decoder = new TextDecoder('utf-8', { fatal: true });
    const ranges: Array<[number, number]> = previewPageRanges(bytes); const joined = ranges.map(([start, end]) => decoder.decode(bytes.subarray(start, end))).join('');
    const preview = createPagedPreview({ text, kind: 'markdown' }); document.body.append(preview.element);
    return { complete: joined === text, pages: ranges.length, empty: previewPageRanges(new Uint8Array()) };
  });
  expect(result.complete).toBe(true); expect(result.pages).toBeGreaterThan(1); expect(result.empty).toEqual([[0, 0]]);
  await expect(page.getByText(/1 \/ .*Plain text preview/)).toBeVisible();
  await expect(page.locator('pre')).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText(/2 \/ .*Plain text preview/)).toBeVisible();
});

test('image viewing supports zoom and restores source focus without closing on padding', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/content/image-viewer.ts'; const { createImageViewer } = await import(path);
    const source = document.createElement('button'); source.textContent = 'Image source'; document.body.append(source); source.focus();
    const viewer = createImageViewer(); document.body.append(viewer.element);
    viewer.open({ src: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="blue"/></svg>'), alt: 'Demo image', returnFocus: source }); window.contentFixture.viewer = viewer;
  });
  await expect(page.locator('[data-image-scale]')).toContainText('800 × 600');
  await page.getByRole('button', { name: 'Original size', exact: true }).click();
  await expect(page.locator('[data-image-scale]')).toContainText('100%');
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await expect(page.locator('[data-image-scale]')).toContainText('125%');
  await page.locator('.pui-image-viewer-viewport').dispatchEvent('click');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close image', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Image source', exact: true })).toBeFocused();
  await page.evaluate(() => { window.contentFixture.viewer!.destroy(); window.contentFixture.viewer!.destroy(); });
});

test('destroying the reader removes its keyboard interception and pending frame', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/content/conversation-reader.ts'; const { installConversationReader } = await import(path);
    const element = document.createElement('section'); element.innerHTML = '<div data-find hidden><input aria-label="Find"><span data-find-count></span><button data-find-previous>Previous</button><button data-find-next>Next</button><button data-find-close>Close</button></div><div data-scroll tabindex="0"><div data-messages><article data-reading-id="a">a+b a+b</article></div></div><button data-latest>Latest</button>';
    document.body.append(element);
    const reader = installConversationReader(element.querySelector('[data-scroll]')!, element.querySelector('[data-messages]')!, element.querySelector('[data-find]')!, element.querySelector('[data-latest]')!, { keyboardTarget: element });
    reader.beforeRender('a'); reader.afterRender(); reader.openFind(); window.contentFixture.reader = reader;
  });
  await page.getByLabel('Find', { exact: true }).fill('a+b');
  await expect(page.locator('[data-find-count]')).toHaveText('1 / 2');
  await page.getByLabel('Find', { exact: true }).press('Enter');
  await expect(page.locator('[data-find-count]')).toHaveText('2 / 2');
  await page.evaluate(() => { window.contentFixture.reader!.destroy(); window.contentFixture.reader!.destroy(); });
  expect(await page.evaluate(() => { const event = new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, cancelable: true, bubbles: true }); document.querySelector('[data-scroll]')!.dispatchEvent(event); return event.defaultPrevented; })).toBe(false);
  await expect(page.locator('mark')).toHaveCount(0);
});
