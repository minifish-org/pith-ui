import {test, expect, type Page} from '@playwright/test';

type Kind = 'text' | 'markdown' | 'diff' | 'image';
interface PreviewState {kind: Kind; text?: string; imageSrc?: string; imageAlt?: string; truncated?: boolean; error?: string; disabled?: boolean}
interface PreviewTarget {owner: {kind: 'artifact'; id: string}; name: string; path: string}
interface PreviewSession {update(state: PreviewState): void; fail(message: string): void; close(): void; isOpen(): boolean; destroy(): void}
interface PreviewHarness {
  session: PreviewSession; tree: {destroy(): void}; state?: PreviewState; imageSource: string;
  input: PreviewTarget; closed: number; calls: {action: string; target: PreviewTarget; frozen: boolean; argc: number}[];
  copies: string[]; images: {src: string; alt: string}[]; resolve?: (result: {ok: true} | {ok: false; error: string}) => void;
  before?: Element; selection?: string;
}
declare global {interface Window {filePreviewHarness: PreviewHarness}}

async function setup(page: Page, kind: Kind | 'loading' | 'error' = 'text', appearance: 'light' | 'dark' = 'light', large = false): Promise<void> {
  await page.goto('/tests/fixture.html');await page.emulateMedia({colorScheme: appearance === 'light' ? 'dark' : 'light'});
  await page.evaluate(async ({kind,appearance,large}) => {
    document.documentElement.classList.add('pui');document.documentElement.dataset.appearance = appearance;document.body.dataset.appearance = appearance;
    const canvas = document.createElement('canvas');canvas.width = 1200;canvas.height = 800;canvas.getContext('2d')!.fillRect(0,0,1200,800);const imageSource = canvas.toDataURL('image/png');
    const largeText = '# Multi-page source\n' + ('中文 🙂 literal <script>not executable</script>\n'.repeat(8000));
    const state: PreviewState | undefined = kind === 'loading' ? undefined : kind === 'error' ? {kind: 'text',error: 'Preview unavailable 中文',truncated: true}
      : kind === 'image' ? {kind,imageSrc: imageSource,imageAlt: 'Architecture 中文',truncated: true}
      : {kind,text: large ? largeText : kind === 'markdown' ? '# Overview\n\nA **strong** note and [safe](https://example.com).\n\n```ts\nconst value = "中文";\n```\n\n<script>alert(1)</script>' : kind === 'diff' ? 'diff --git a/a.ts b/a.ts\n--- a/a.ts\n+++ b/a.ts\n@@ -1 +1 @@\n-old\n+new 中文\n context' : 'Literal <b>source</b>\n中文 and emoji 🙂\n' + 'line\n'.repeat(12),truncated: true};
    const input: PreviewTarget & {capabilities: {open: boolean;reveal: boolean;copyMode: 'path'};content?: PreviewState} = {owner: {kind: 'artifact',id: 'session-original'},name: 'Report 中文.md',path: '/workspace/reports/Report 中文.md',capabilities: {open: true,reveal: true,copyMode: 'path'},...(state ? {content: state} : {})};
    const h = {input,state,imageSource,closed: 0,calls: [],copies: [],images: []} as unknown as PreviewHarness;
    const callbacks = {
      onFileAction(...args: [string,PreviewTarget]) {const [action,target] = args;h.calls.push({action,target,frozen: Object.isFrozen(target) && Object.isFrozen(target.owner),argc: args.length});return new Promise<{ok: true} | {ok: false;error: string}>(resolve => {h.resolve = resolve;});},
      onCopyCode(text: string) {h.copies.push(text);return {ok: true as const};},
      onImage(image: {src: string;alt: string}) {h.images.push(image);},
      onClose() {h.closed++;},
    };
const mount=document.body.appendChild(document.createElement('div'));
    const contextPath = '/tests/region-context.ts', {mountRegion} = await import(contextPath);
    const path='/tests/recipes-fixture.ts',{parts:p,recipes:r}=await import(path),announcement=p.createAnnouncementPart({message:''}),session=r.composeFilePreview(input,callbacks,announcement);
    h.session=session;h.tree=mountRegion(mount,session.part,'dialog',appearance,[announcement]);session.open();
        window.filePreviewHarness = h;
  },{kind,appearance,large});
  await expect(page.locator('dialog.pui-file-preview-modal[open]')).toBeVisible();
  if (kind === 'image') await page.locator('dialog.pui-file-preview-modal img').evaluate(image => (image as HTMLImageElement).decode());
  await page.mouse.move(0,0);
}

async function presentation(page: Page): Promise<unknown> {
  return page.evaluate(async () => {
    await document.fonts.ready;for (const animation of document.getAnimations()) if (animation.effect?.getTiming().iterations !== Infinity) animation.finish();
    const dialog = document.querySelector('dialog.pui-file-preview-modal[open]')!,origin = dialog.getBoundingClientRect();
    const inspect = (node: Element) => {const rect = node.getBoundingClientRect(),style = getComputedStyle(node);return {
      tag: node.localName,text: [...node.childNodes].filter(child => child.nodeType === Node.TEXT_NODE).map(child => child.textContent).join('').trim(),
      box: [rect.x - origin.x,rect.y - origin.y,rect.width,rect.height].map(value => Math.round(value * 100) / 100),
      styles: ['display','font-family','font-size','font-weight','line-height','color','background-color','margin-top','margin-bottom','padding-top','padding-right','padding-bottom','padding-left','border-top-width','border-top-color','border-radius','gap','overflow-x','overflow-y','min-height','max-height','max-width','white-space','overflow-wrap','flex','align-items','justify-content'].map(key => style.getPropertyValue(key)),
      ...(node instanceof HTMLButtonElement ? {label: node.getAttribute('aria-label'),type: node.type,disabled: node.disabled} : {}),
      ...(node instanceof HTMLImageElement ? {alt: node.alt,natural: [node.naturalWidth,node.naturalHeight]} : {}),
      ...(node.hasAttribute('aria-live') ? {live: node.getAttribute('aria-live')} : {}),
    };};
    const nodes = [...dialog.querySelectorAll('h2,p,button,.pui-modal-heading,.pui-file-preview-body,.pui-file-preview-actions,.pui-file-actions,.pui-preview-pagination,pre,.pui-markdown,h1,code,blockquote,li,a,img,.pui-diff-line,.pui-preview-pagination > span')].filter(node => !node.closest('.pui-sr-only'));
    return {dialog: inspect(dialog),classes: [...dialog.classList].sort(),nodes: nodes.map(inspect),svg: [...dialog.querySelectorAll('svg')].map(svg => svg.innerHTML),labelled: dialog.querySelector('h2')!.id === dialog.getAttribute('aria-labelledby')};
  });
}

test('bounded preview containers and pagination reject presentation escapes and preserve transferred children atomically', async ({page}) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path),child = p.createPreformattedPart({text: 'Retained literal <b>source</b>'});
    const viewport = p.createContentViewportPart({purpose: 'preview',content: [child]}),mount = document.body.appendChild(document.createElement('div'));p.mountParts(mount,viewport);
    const native = mount.querySelector('pre');viewport.replace([child]);let foreign = false,css = false,windowSize = false;
    try {viewport.replace([{}]);} catch {foreign = true;}
    const retained = native === mount.querySelector('pre') && mount.textContent === 'Retained literal <b>source</b>';
    try {p.createContentViewportPart({purpose: 'preview',content: 'Text',style: {height: '20px'}});} catch {css = true;}
    const pages: number[] = [];const pager = p.createPaginationPart({page: 0,total: 3,note: 'Plain text preview',onPage(page: number) {pages.push(page);}});
    const pagerMount = document.body.appendChild(document.createElement('div'));p.mountParts(pagerMount,pager);
    const root = pagerMount.firstElementChild!,buttons = [...root.querySelectorAll<HTMLButtonElement>('button')];buttons[1]!.click();pager.update({page: 2,total: 3});buttons[0]!.click();
    try {p.createPaginationPart({page: 0,total: 2,onPage() {},pageBytes: 40});} catch {windowSize = true;}
    const previousDisabled = buttons[0]!.disabled,nextDisabled = buttons[1]!.disabled;
    viewport.replace('Literal <img src=x onerror=alert(1)>');const literal = mount.textContent,html = mount.querySelector('img') === null;
    return {foreign,retained,css,windowSize,pages,previousDisabled,nextDisabled,literal,html,root: root.className,children: [...root.children].map(node => node.localName),leaks: Object.values(viewport).some(value => value instanceof Node)};
  });
  expect(result).toEqual({foreign: true,retained: true,css: true,windowSize: true,pages: [1,1],previousDisabled: false,nextDisabled: true,literal: 'Literal <img src=x onerror=alert(1)>',html: true,root: 'pui-feature-toolbar pui-preview-pagination',children: ['button','span','button'],leaks: false});
});

test('viewport literal text and composed footnotes share one root and reject invalid children without mutation', async ({page}) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path),note = p.createTextPart({role: 'footnote',text: 'Truncated source'});
    const viewport = p.createContentViewportPart({purpose: 'preview',content: {message: 'Read failed',children: [note]}}),mount = document.body.appendChild(document.createElement('div'));p.mountParts(mount,viewport);
    const native = mount.querySelector('p'),text = mount.firstElementChild!.firstChild;let foreign = false,duplicate = false;
    try {viewport.replace({message: 'Changed',children: [{}]});} catch {foreign = true;}
    try {viewport.replace({message: 'Changed',children: [note,note]});} catch {duplicate = true;}
    const retained = native === mount.querySelector('p') && text === mount.firstElementChild!.firstChild && mount.textContent === 'Read failedTruncated source';
    viewport.replace({message: 'Read failed',children: [note]});const same = text === mount.firstElementChild!.firstChild;
    return {foreign,duplicate,retained,same,nodes: [...mount.firstElementChild!.childNodes].map(node => node.nodeType === Node.TEXT_NODE ? '#text' : (node as Element).localName)};
  });expect(result).toEqual({foreign: true,duplicate: true,retained: true,same: true,nodes: ['#text','p']});
});

test('UTF-8 Markdown paging keeps original literal windows and retains page, selection and scroll on identical snapshots', async ({page}) => {
  const snapshots: unknown[] = [],texts: string[] = [];

    await setup(page,'markdown','light',true);snapshots.push(await presentation(page));
    await expect(page.locator('.pui-preview-pagination')).toContainText('Plain text preview');await expect(page.locator('dialog .pui-markdown')).toHaveCount(0);
    await page.getByRole('button',{name: 'Next',exact: true}).click();await page.mouse.move(0,0);texts.push(await page.locator('.pui-file-preview-text').innerText());
    await page.evaluate(() => {const h = window.filePreviewHarness,pre = document.querySelector('.pui-file-preview-text')!;h.before = pre;const range = document.createRange();range.setStart(pre.firstChild!,0);range.setEnd(pre.firstChild!,6);getSelection()!.removeAllRanges();getSelection()!.addRange(range);h.selection = getSelection()!.toString();document.querySelector('.pui-file-preview-body')!.scrollTop = 130;h.session.update({...h.state!,disabled: true});});
    expect(await page.evaluate(() => ({same: window.filePreviewHarness.before === document.querySelector('.pui-file-preview-text'),selection: getSelection()!.toString() === window.filePreviewHarness.selection,scroll: document.querySelector('.pui-file-preview-body')!.scrollTop,status: document.querySelector('.pui-preview-pagination')!.textContent}))).toEqual({same: true,selection: true,scroll: 130,status: expect.stringContaining('2 /')});
    await page.evaluate(() => window.filePreviewHarness.session.update({kind: 'text',text: 'Replacement literal source'}));await expect(page.locator('.pui-preview-pagination')).toHaveCount(0);await expect(page.locator('.pui-file-preview-text')).toHaveText('Replacement literal source');
  expect(texts[0]).not.toContain('�');expect(texts[0]).toContain('中文 🙂 literal');
});

test('file actions capture immutable owner targets, share open pending and retain independent copy feedback', async ({page}) => {

    await setup(page);await page.evaluate(() => {const h = window.filePreviewHarness;h.input.owner.id = 'mutated';h.input.name = 'changed';h.input.path = '/changed';});
    await page.getByRole('button',{name: 'Open',exact: true}).click();for (const name of ['Open','Reveal','Copy path']) await expect(page.getByRole('button',{name,exact: true})).toBeDisabled();
    await page.evaluate(() => window.filePreviewHarness.session.update({...window.filePreviewHarness.state!,disabled: false}));await expect(page.getByRole('button',{name: 'Open',exact: true})).toBeDisabled();
    await page.evaluate(() => window.filePreviewHarness.resolve!({ok: true}));await expect(page.getByRole('button',{name: 'Open',exact: true})).toBeEnabled();
    await page.getByRole('button',{name: 'Copy path',exact: true}).click();await expect(page.getByRole('button',{name: 'Copy path',exact: true})).toBeDisabled();await expect(page.getByRole('button',{name: 'Reveal',exact: true})).toBeEnabled();
    await page.evaluate(() => window.filePreviewHarness.resolve!({ok: true}));await expect(page.getByRole('button',{name: 'Path copied.',exact: true})).toHaveText('Copied');
    await page.evaluate(() => window.filePreviewHarness.session.update({...window.filePreviewHarness.state!,disabled: false}));await expect(page.getByRole('button',{name: 'Path copied.',exact: true})).toHaveText('Copied');
    expect(await page.evaluate(() => window.filePreviewHarness.calls)).toEqual(['open','copy-path'].map(action => ({action,target: {owner: {kind: 'artifact',id: 'session-original'},name: 'Report 中文.md',path: '/workspace/reports/Report 中文.md'},frozen: true,argc: 2})));
});

test('preview errors recover, code copy and image activation follow actual disabled behavior, and closed results stay quiet', async ({page}) => {

  await setup(page,'markdown');await page.evaluate(() => window.filePreviewHarness.session.update({...window.filePreviewHarness.state!,disabled: true}));
  // Existing preview disabled state gates file actions; rendered content copy
  // and image activation remain available in the actual old application.
  await expect(page.getByRole('button',{name: 'Open',exact: true})).toBeDisabled();await page.getByRole('button',{name: 'Copy code',exact: true}).click();expect(await page.evaluate(() => window.filePreviewHarness.copies)).toHaveLength(1);
  await page.evaluate(() => window.filePreviewHarness.session.fail('Read failed'));await expect(page.locator('.pui-file-preview-body')).toContainText('Read failed');
  await page.evaluate(() => {const h = window.filePreviewHarness;h.session.update({kind: 'image',imageSrc: h.imageSource,imageAlt: 'Preview image',disabled: true});});
  await page.locator('img.pui-file-preview-image').evaluate(image => (image as HTMLImageElement).decode());await page.locator('img.pui-file-preview-image').click();
  expect(await page.evaluate(() => window.filePreviewHarness.images)).toEqual([{src: expect.stringContaining('data:image/png'),alt: 'Preview image'}]);
  await page.evaluate(() => window.filePreviewHarness.session.update({kind: 'text',text: 'Recovered'}));await expect(page.locator('.pui-file-preview-text')).toHaveText('Recovered');
  await page.getByRole('button',{name: 'Reveal',exact: true}).click();await page.keyboard.press('Escape');await expect(page.locator('dialog.pui-file-preview-modal[open]')).toHaveCount(0);
  await page.evaluate(() => {const h = window.filePreviewHarness;h.resolve!({ok: false,error: 'Late native cancellation'});h.session.fail('Late external failure');h.session.update({kind: 'text',text: 'Late content'});});
  await expect.poll(() => page.evaluate(() => window.filePreviewHarness.closed)).toBe(1);
  expect(await page.evaluate(() => ({open: window.filePreviewHarness.session.isOpen(),closed: window.filePreviewHarness.closed}))).toEqual({open: false,closed: 1});
  // The old shell retains an empty native dialog; the owned composition removes
  // its terminal dialog. Neither lifetime may display a late result.
  await expect(page.locator('dialog.pui-file-preview-modal').filter({hasText: 'Late'})).toHaveCount(0);
  await page.evaluate(() => {const h = window.filePreviewHarness;h.tree.destroy();h.session.destroy();h.tree.destroy();});await expect(page.locator('dialog.pui-file-preview-modal')).toHaveCount(0);expect(await page.evaluate(() => window.filePreviewHarness.closed)).toBe(1);
});
