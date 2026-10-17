import {test, expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';

test.beforeEach(async ({page}) => {await page.goto('/tests/fixture.html');});

test('an owned code copy invokes the supplied host callback exactly once without a fallback copy', async ({page}) => {
  await page.evaluate(async () => {
    const entry = '/tests/internal/application/index.ts'; const {createApplication} = await import(entry);
    const calls: string[] = [];
    const app = createApplication(document.body, {host: {copyText() {calls.push('fallback');}}, workspace: {onCopyCode(text: string) {calls.push(text);}}});
    app.workspace.updateConversation({id: 'copy', working: false, messages: [{id: 'code', role: 'assistant', text: '```ts\nconst value = 1;\n```'}]});
    (window as unknown as {copyCalls: string[]}).copyCalls = calls;
  });
  await page.getByRole('button', {name: 'Copy code'}).click();
  expect(await page.evaluate(() => (window as unknown as {copyCalls: string[]}).copyCalls)).toEqual(['const value = 1;\n']);
  await expect(page.getByRole('button', {name: 'Code copied'})).toBeVisible();
});

test('browser download retains its URL until the download starts and destroy clears the retained URL', async ({page}) => {
  const download = page.waitForEvent('download');
  const result = await page.evaluate(async () => {
    const entry = '/tests/internal/application/index.ts'; const {createApplication} = await import(entry);
    const app = createApplication(document.body);
    const original = URL.revokeObjectURL.bind(URL), revoked: string[] = [];
    URL.revokeObjectURL = url => {revoked.push(url); original(url);};
    const result = await app.downloadFile({name: '报告.txt', blob: new Blob(['Complete 中文 file'], {type: 'text/plain;charset=utf-8'})});
    (window as unknown as {downloadFixture: {revoked: string[]; destroy(): void}}).downloadFixture = {revoked, destroy: app.destroy};
    return result;
  });
  expect(result).toEqual({ok: true});
  const file = await download;
  expect(file.suggestedFilename()).toBe('报告.txt');
  expect(await readFile((await file.path())!, 'utf8')).toBe('Complete 中文 file');
  expect(await page.evaluate(() => (window as unknown as {downloadFixture: {revoked: string[]}}).downloadFixture.revoked.length)).toBe(0);
  const after = await page.evaluate(() => {
    const fixture = (window as unknown as {downloadFixture: {revoked: string[]; destroy(): void}}).downloadFixture;
    fixture.destroy(); fixture.destroy(); return fixture.revoked.length;
  });
  expect(after).toBe(1);
});

test('unsupported external sign-in URLs never reach the host and failures stay on their owned dialog', async ({page}) => {
  await page.evaluate(async () => {
    const entry = '/tests/internal/application/index.ts'; const {createApplication} = await import(entry);
    let calls = 0;
    const app = createApplication(document.body, {host: {openExternal() {calls++; return {ok: false, error: 'Host refused this link'};}}});
    const invalid = app.settings.openProviderLogin({phase: 'waiting', message: 'Waiting', url: 'javascript:alert(1)'});
    const invalidLinks = document.querySelectorAll('dialog[open] a[href]').length;
    invalid.close();
    app.settings.openProviderLogin({phase: 'waiting', message: 'Waiting', url: 'https://login.example.test/authorize'});
    (window as unknown as {externalFixture: {calls(): number; invalidLinks: number}}).externalFixture = {calls: () => calls, invalidLinks};
  });
  await page.getByRole('link', {name: 'Open sign-in page in your browser', exact: false}).click();
  await expect(page.getByText('Host refused this link', {exact: true})).toBeVisible();
  expect(await page.evaluate(() => {const fixture = (window as unknown as {externalFixture: {calls(): number; invalidLinks: number}}).externalFixture; return {calls: fixture.calls(), invalidLinks: fixture.invalidLinks};})).toEqual({calls: 1, invalidLinks: 0});
});
