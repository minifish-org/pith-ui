import { test, expect } from '@playwright/test';

test('document errors are safe plain text in the owned surface and reject non-string values', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  const message = '<img src=x onerror="window.documentErrorExecuted=true"> Could not read file.';
  await page.evaluate(async error => {
    const ui = await import('../src/index.js');
    const doc = ui.createDocument(Object.assign({ text: 'Old file contents', format: 'markdown' as const }, { error }));
    const dialog = ui.createDialog({ title: 'File preview', purpose: 'document', content: doc });
    const owner = ui.mount(document.body, dialog); dialog.open();
    Object.assign(window, { documentFixture: { doc, dialog, owner } });
  }, message);
  const body = page.locator('.pui-document');
  await expect(body).toHaveText(message);
  await expect(body).toHaveCSS('font-size', '14px');
  await expect(body).toHaveCSS('line-height', '21px');
  await expect(body.locator('pre,.pui-markdown,.pui-preview-pagination,[data-copy-code],img')).toHaveCount(0);
  expect(await page.evaluate(() => Reflect.get(window, 'documentErrorExecuted'))).toBeUndefined();
  const rejected = await page.evaluate(async () => {
    const ui = await import('../src/index.js');
    const state = { text: 'Valid content', format: 'text' };
    return [0, false, null, document.createElement('b')].map(error => {
      const messages: string[] = [];
      try { Reflect.apply(ui.createDocument, undefined, [{ ...state, error }]); } catch (failure) { messages.push(String(failure)); }
      try { Reflect.get(window, 'documentFixture').doc.update({ ...state, error }); } catch (failure) { messages.push(String(failure)); }
      return messages;
    });
  });
  expect(rejected).toHaveLength(4);
  for (const messages of rejected) {
    expect(messages).toHaveLength(2);
    for (const error of messages) expect(error).toMatch(/document error/i);
  }
  await expect(body).toHaveText(message);
});

test('clearing a document error restores its current format, resets paging and retains unrelated actions', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const ui = await import('../src/index.js');
    const text = 'Retained 中文 🐟\n'.repeat(20000);
    const doc = ui.createDocument({ text, format: 'text' });
    const action = ui.createButton({ label: 'Open file' });
    const dialog = ui.createDialog({ title: 'File preview', purpose: 'document', content: doc, actions: action });
    ui.mount(document.body, dialog); dialog.open();
    Object.assign(window, { documentFixture: { doc, text } });
  });
  const body = page.locator('.pui-document'), pre = body.locator('pre');
  const first = await pre.textContent();
  await body.getByRole('button', { name: 'Next', exact: true }).click();
  const second = await pre.textContent();
  expect(second).not.toBe(first);
  await pre.evaluate(node => {
    const range = document.createRange(); range.setStart(node.firstChild!, 0); range.setEnd(node.firstChild!, 8);
    getSelection()!.removeAllRanges(); getSelection()!.addRange(range);
    Object.assign(window, { retainedDocumentPage: node, retainedDocumentSelection: getSelection()!.toString() });
  });
  await page.evaluate(() => { const f = Reflect.get(window, 'documentFixture'); f.doc.update({ text: f.text, format: 'text', disabled: true }); });
  expect(await pre.evaluate(node => node === Reflect.get(window, 'retainedDocumentPage'))).toBe(true);
  expect(await page.evaluate(() => getSelection()!.toString() === Reflect.get(window, 'retainedDocumentSelection'))).toBe(true);
  const action = page.getByRole('button', { name: 'Open file', exact: true });
  await action.focus(); const actionNode = await action.elementHandle();
  await page.evaluate(() => { const f = Reflect.get(window, 'documentFixture'); f.doc.update(Object.assign({ text: f.text, format: 'text' }, { error: 'Read failed.' })); });
  await expect(body).toHaveText('Read failed.');
  await expect(body.locator('pre,.pui-preview-pagination')).toHaveCount(0);
  await expect(action).toBeFocused();
  await page.evaluate(() => { const f = Reflect.get(window, 'documentFixture'); f.doc.update({ text: f.text, format: 'text' }); });
  await expect(pre).toHaveText(first!);
  await expect(body.getByRole('button', { name: 'Previous', exact: true })).toBeDisabled();
  expect(await actionNode!.evaluate(node => node.isConnected && node === [...document.querySelectorAll('dialog button')].find(button => button.textContent === 'Open file'))).toBe(true);
  await expect(action).toBeFocused();
  await page.evaluate(() => Reflect.get(window, 'documentFixture').doc.update(Object.assign({ text: '**Current Markdown**', format: 'markdown' }, { error: 'Temporary error.' })));
  await expect(body).toHaveText('Temporary error.');
  await page.evaluate(() => Reflect.get(window, 'documentFixture').doc.update(Object.assign({ text: '**Current Markdown**', format: 'markdown' }, { error: '' })));
  await expect(body.locator('strong')).toHaveText('Current Markdown');
  await page.evaluate(() => Reflect.get(window, 'documentFixture').doc.update(Object.assign({ text: '-old\n+new', format: 'diff' }, { error: 'Temporary error.' })));
  await page.evaluate(() => Reflect.get(window, 'documentFixture').doc.update({ text: '-old\n+new', format: 'diff' }));
  await expect(body.getByLabel('Proposed file changes')).toContainText('-old\n+new');
});

test('changing document content or errors retires old copy feedback without losing the restored copy action', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const ui = await import('../src/index.js');
    const replies: Array<(result: { ok: true } | { ok: false; error: string }) => void> = [], errors: string[] = [];
    const text = '```ts\nconst saved=1;\n```';
    const doc = ui.createDocument({ text, format: 'markdown', onCopy: () => new Promise(resolve => replies.push(resolve)), onError: message => errors.push(message) });
    ui.mount(document.body, doc); Object.assign(window, { documentFixture: { doc, text, replies, errors } });
  });
  const body = page.locator('.pui-document'), copy = body.locator('[data-copy-code]');
  await copy.click(); await expect(copy).toBeDisabled();
  await page.evaluate(() => { const f = Reflect.get(window, 'documentFixture'); f.doc.update(Object.assign({ text: f.text, format: 'markdown' }, { error: 'Cannot read now.' })); f.replies.shift()({ ok: false, error: 'Old copy failure.' }); });
  await expect(body).toHaveText('Cannot read now.');
  await page.evaluate(() => { const f = Reflect.get(window, 'documentFixture'); f.doc.update({ text: f.text, format: 'markdown' }); });
  await expect(copy).toBeEnabled(); await copy.click();
  await page.evaluate(() => { const f = Reflect.get(window, 'documentFixture'); f.doc.update(Object.assign({ text: f.text, format: 'markdown' }, { error: 'Another read error.' })); f.doc.update({ text: f.text, format: 'markdown' }); f.replies.shift()({ ok: true }); });
  await expect(copy).toBeEnabled();
  await expect(body.locator('[role="status"]')).toHaveText('');
  await expect(copy).not.toHaveAttribute('aria-label', 'Code copied.');
  expect(await page.evaluate(() => Reflect.get(window, 'documentFixture').errors)).toEqual([]);
  await copy.click();
  await page.evaluate(() => Reflect.get(window, 'documentFixture').replies.shift()({ ok: true }));
  await expect(copy).toHaveAttribute('aria-label', 'Code copied.');
});

test('closing, reopening and destroying a document composition invalidate pending copy results', async ({ page }) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const ui = await import('../src/index.js');
    const replies: Array<(result: { ok: true } | { ok: false; error: string }) => void> = [], errors: string[] = [];
    const doc = ui.createDocument({ text: '```ts\nconst saved=1;\n```', format: 'markdown', onCopy: () => new Promise(resolve => replies.push(resolve)), onError: message => errors.push(message) });
    const dialog = ui.createDialog({ title: 'File preview', content: doc }); const owner = ui.mount(document.body, dialog); dialog.open();
    Object.assign(window, { documentFixture: { doc, dialog, owner, replies, errors } });
  });
  const copy = page.locator('.pui-document [data-copy-code]');
  await copy.click();
  await page.evaluate(() => { const f = Reflect.get(window, 'documentFixture'); f.dialog.close(); f.dialog.open(); f.replies.shift()({ ok: false, error: 'Old closed copy failure.' }); });
  await expect(copy).toBeEnabled();
  expect(await page.evaluate(() => Reflect.get(window, 'documentFixture').errors)).toEqual([]);
  await copy.click();
  await page.evaluate(() => { const f = Reflect.get(window, 'documentFixture'); f.owner.destroy(); f.replies.shift()({ ok: false, error: 'Old destroyed copy failure.' }); });
  await expect(page.locator('.pui-document')).toHaveCount(0);
  expect(await page.evaluate(() => Reflect.get(window, 'documentFixture').errors)).toEqual([]);
});
