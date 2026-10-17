import {expect, test} from '@playwright/test';

interface ContentHarness {
  content: {update(state: {text: string; disabled?: boolean}): void; destroy(): void};
  mounted: {destroy(): void};
  calls: string[];
  release?(result: {ok: true} | {ok: false; error: string}): void;
}
declare global {interface Window {contentPartsHarness: ContentHarness}}
test.beforeEach(async ({page}) => {await page.goto('/tests/fixture.html');});

test('bounded Markdown sanitizes content and routes semantic file targets without exposing a node', async ({page}) => {
  const result = await page.evaluate(async () => {
    const path = '/src/parts/index.ts';
    const {createMarkdownPart, mountParts} = await import(path);
    const calls: string[] = [];
    const content = createMarkdownPart({text: '# Heading\n\n[Result](result.txt)\n\n<img src=x onerror="window.injected=true"><form><input></form><svg></svg><script>window.injected=true</script>\n\n[Unsafe](javascript:alert(1))',
      resolveLocalLink(href: string) {return href === 'result.txt' ? {path: 'result.txt', conversationId: 'chat-a'} : null;},
      onLocalFile(target: {path: string; conversationId: string}) {calls.push(JSON.stringify(target)); return {ok: true};},
    });
    window.contentPartsHarness = {content, calls, mounted: mountParts(document.body.appendChild(document.createElement('div')), content)};
    return Object.keys(content);
  });
  expect(result).not.toContain('element');
  await expect(page.getByRole('heading', {name: 'Heading'})).toBeVisible();
  await expect(page.locator('img, form, input, svg, script:not([type=module])')).toHaveCount(0);
  await expect(page.getByRole('link', {name: 'Unsafe'})).toHaveCount(0);
  await page.getByRole('link', {name: 'Result'}).click();
  expect(await page.evaluate(() => window.contentPartsHarness.calls)).toEqual(['{"path":"result.txt","conversationId":"chat-a"}']);
  await page.evaluate(() => window.contentPartsHarness.mounted.destroy());
});

test('Markdown stream patches preserve selected prefix, code scroll and native disclosure state', async ({page}) => {
  await page.evaluate(async () => {
    const path = '/src/parts/index.ts';
    const {createMarkdownPart, mountParts} = await import(path);
    const text = 'Selected prefix remains.\n\n```ts\n' + 'veryLongCode'.repeat(100) + '\n```\n\n<details><summary>Reasoning</summary><p>Details</p></details>';
    const content = createMarkdownPart({text});
    const mounted = mountParts(document.body.appendChild(document.createElement('div')), content);
    window.contentPartsHarness = {content, mounted, calls: []};
    const paragraph = document.querySelector('.pui-markdown > p')!;
    const range = document.createRange(); range.setStart(paragraph.firstChild!, 0); range.setEnd(paragraph.firstChild!, 8);
    const selection = window.getSelection()!; selection.removeAllRanges(); selection.addRange(range);
    const pre = document.querySelector('pre')!; pre.scrollLeft = 120;
    (document.querySelector('details') as HTMLDetailsElement).open = true;
    Object.assign(window.contentPartsHarness, {before: {paragraph, pre, scroll: pre.scrollLeft}, original: text});
  });
  const result = await page.evaluate(() => {
    const fixture = window.contentPartsHarness as ContentHarness & {before: {paragraph: Element; pre: HTMLElement; scroll: number}; original: string};
    fixture.content.update({text: fixture.original + '\n\nA streamed suffix.'});
    return {selection: getSelection()?.toString(), sameParagraph: fixture.before.paragraph === document.querySelector('.pui-markdown > p'), sameCode: fixture.before.pre === document.querySelector('pre'), scroll: document.querySelector('pre')!.scrollLeft, expectedScroll: fixture.before.scroll, open: (document.querySelector('details') as HTMLDetailsElement).open};
  });
  expect(result).toEqual({selection: 'Selected', sameParagraph: true, sameCode: true, scroll: result.expectedScroll, expectedScroll: result.expectedScroll, open: true});
  await page.evaluate(() => window.contentPartsHarness.mounted.destroy());
});

test('code copy merges pending with external availability and preserves literal code', async ({page}) => {
  await page.evaluate(async () => {
    const path = '/src/parts/index.ts';
    const {createMarkdownPart, mountParts} = await import(path);
    const fixture = {calls: []} as unknown as ContentHarness;
    const content = createMarkdownPart({text: '```html\n<b>Literal 中文 code</b>\n```', onCopyCode(text: string) {
      fixture.calls.push(text); return new Promise(resolve => {fixture.release = resolve;});
    }});
    Object.assign(fixture, {content, mounted: mountParts(document.body.appendChild(document.createElement('div')), content)});
    window.contentPartsHarness = fixture;
  });
  const copy = page.getByRole('button', {name: 'Copy code', exact: true});
  await copy.click();
  await expect(copy).toBeDisabled();
  await expect(copy).toHaveAttribute('aria-busy', 'true');
  await page.evaluate(() => window.contentPartsHarness.content.update({text: '```html\n<b>Literal 中文 code</b>\n```', disabled: true}));
  await page.evaluate(() => window.contentPartsHarness.release?.({ok: true}));
  await expect(page.getByRole('button', {name: 'Code copied', exact: true})).toBeDisabled();
  expect(await page.evaluate(() => window.contentPartsHarness.calls)).toEqual(['<b>Literal 中文 code</b>\n']);
  await expect(page.locator('code b')).toHaveCount(0);
  await page.evaluate(() => window.contentPartsHarness.mounted.destroy());
});

test('destroy ignores late code-copy feedback and never replays the write', async ({page}) => {
  await page.evaluate(async () => {
    const path = '/src/parts/index.ts';
    const {createMarkdownPart, mountParts} = await import(path);
    const fixture = {calls: []} as unknown as ContentHarness;
    const content = createMarkdownPart({text: '```\nOne write\n```', onCopyCode(text: string) {fixture.calls.push(text); return new Promise(resolve => {fixture.release = resolve;});}, onError(message: string) {fixture.calls.push(message);}});
    Object.assign(fixture, {content, mounted: mountParts(document.body.appendChild(document.createElement('div')), content)}); window.contentPartsHarness = fixture;
  });
  await page.getByRole('button', {name: 'Copy code'}).click();
  await page.evaluate(() => {window.contentPartsHarness.mounted.destroy(); window.contentPartsHarness.release?.({ok: false, error: 'Stale failure'});});
  await expect(page.getByRole('button')).toHaveCount(0);
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(await page.evaluate(() => window.contentPartsHarness.calls)).toEqual(['One write\n']);
});

test('preformatted text and diff remain literal and use the existing semantic diff palette', async ({page}) => {
  await page.evaluate(async () => {
    const path = '/src/parts/index.ts';
    const {createPreformattedPart, createStackPart, mountParts} = await import(path);
    const plain = createPreformattedPart({text: '<img src=x>\n中文', kind: 'text'});
    const diff = createPreformattedPart({text: '--- a/file\n+++ b/file\n-old\n+new', kind: 'diff', label: 'Proposed file changes'});
    const mounted = mountParts(document.body.appendChild(document.createElement('div')), createStackPart({children: [plain, diff]}));
    window.contentPartsHarness = {content: plain, mounted, calls: []};
  });
  await expect(page.locator('img')).toHaveCount(0);
  await expect(page.locator('pre').first()).toHaveText('<img src=x>\n中文');
  await expect(page.locator('.pui-diff-add')).toHaveText('+new');
  await expect(page.locator('.pui-diff-remove')).toHaveText('-old');
  expect(await page.locator('.pui-diff-add').evaluate(node => getComputedStyle(node).color)).toBe('rgb(22, 101, 52)');
  await page.evaluate(() => window.contentPartsHarness.mounted.destroy());
});

test('content parts reject markup, styles, density and animation escape options', async ({page}) => {
  const rejected = await page.evaluate(async () => {
    const path = '/src/parts/index.ts';
    const {createMarkdownPart, createPreformattedPart} = await import(path);
    return [() => createMarkdownPart({text: 'Text', className: 'override'}), () => createMarkdownPart({text: 'Text', style: {fontSize: '20px'}}), () => createPreformattedPart({text: 'Text', density: 'compact'}), () => createPreformattedPart({text: 'Text', animationDuration: 100})].map(create => {try {create(); return false;} catch {return true;}});
  });
  expect(rejected).toEqual([true, true, true, true]);
});
