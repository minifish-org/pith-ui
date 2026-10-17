import {test, expect, type Page} from '@playwright/test';

async function source(page: Page, width = 1800, height = 1200): Promise<string> {
  return page.evaluate(({width,height}) => {const canvas = document.createElement('canvas');canvas.width = width;canvas.height = height;const context = canvas.getContext('2d')!;context.fillStyle = '#5060a8';context.fillRect(0,0,width,height);return canvas.toDataURL('image/png');},{width,height});
}

test('native image parts have finite purposes, data callbacks and no public node or presentation port', async ({page}) => {
  await page.goto('/tests/fixture.html');const src = await source(page,12,8);
  const result = await page.evaluate(async src => {
    const path = '/src/parts/index.ts',p = await import(path),activations: unknown[] = [],loads: unknown[] = [];
    const images = ['content','attachment','preview'].map(purpose => p.createImagePart({purpose,src,alt: 'Diagram',status: 'ready',onActivate(target: unknown) {activations.push(target);},onLoad(target: unknown) {loads.push(target);}}));
    const mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,p.createStackPart({children: images}));
    const native = [...mount.querySelectorAll('img')];await Promise.all(native.map(image => image.decode()));
    native[0]!.click();native[2]!.dispatchEvent(new KeyboardEvent('keydown',{key: 'Enter',bubbles: true,cancelable: true}));
    let presentationRejected = false,sourceRejected = false,purposeRejected = false;
    try {p.createImagePart({purpose: 'preview',src,alt: 'Bad',status: 'ready',width: 70});} catch {presentationRejected = true;}
    try {p.createImagePart({purpose: 'preview',src: 'javascript:alert(1)',alt: 'Bad',status: 'ready'});} catch {sourceRejected = true;}
    try {p.createImagePart({purpose: 'arbitrary',src,alt: 'Bad',status: 'ready'});} catch {purposeRejected = true;}
    const result = {roots: [...mount.firstElementChild!.children].map(node => node.localName),contentClass: native[0]!.className,previewClass: native[2]!.className,
      leaks: images.map(image => Object.values(image).some(value => value instanceof Node)),activations: activations.map(target => ({...(target as object),src: (target as {src: string}).src === src})),
      dataOnly: [...activations,...loads].every(value => value !== null && typeof value === 'object' && Object.values(value).every(value => !(value instanceof Node) && !(value instanceof Event))),presentationRejected,sourceRejected,purposeRejected};
    tree.destroy();return result;
  },src);
  expect(result).toEqual({roots: ['img','img','img'],contentClass: 'pui-history-image',previewClass: 'pui-file-preview-image',leaks: [false,false,false],activations: [{src: true,alt: 'Diagram'},{src: true,alt: 'Diagram'}],dataOnly: true,presentationRejected: true,sourceRejected: true,purposeRejected: true});
});

test('unchanged ready image snapshots retain decoded identity and recover from unavailable without refetching successful content', async ({page}) => {
  let requests = 0;const bytes = Buffer.from((await source(page,1,1)).split(',')[1]!,'base64');
  await page.route('**/image-part-proof.png',route => {requests++;return route.fulfill({status: 200,contentType: 'image/png',body: bytes});});
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path),activations: unknown[] = [],image = p.createImagePart({purpose: 'content',src: '/image-part-proof.png',alt: 'Image 1',status: 'ready',onActivate(target: unknown) {activations.push(target);}});
    const mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,image);
    Object.assign(window,{imagePartHarness: {image,tree,activations,native: mount.querySelector('img')}});
  });
  await expect.poll(() => page.locator('img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(1);
  const result = await page.evaluate(async () => {
    const h = (window as unknown as {imagePartHarness: {image: {update(state: unknown): void};native: HTMLImageElement;activations: unknown[]}}).imagePartHarness;
    h.image.update({src: '/image-part-proof.png',alt: 'Image 1',status: 'ready'});
    h.image.update({alt: 'Image unavailable',status: 'unavailable'});h.native.click();
    const unavailable = {blocked: h.activations.length === 0,marked: h.native.classList.contains('pui-image-unavailable')};
    h.image.update({src: '/image-part-proof.png',alt: 'Image 1',status: 'ready'});await h.native.decode();h.native.click();
    let rejected = false;try {h.image.update({src: 'javascript:alert(1)',alt: 'Bad',status: 'ready'});} catch {rejected = true;}
    return {same: document.querySelector('img') === h.native,unavailable,recovered: !h.native.classList.contains('pui-image-unavailable'),alt: h.native.alt,activations: h.activations.length,rejected,sourceRetained: h.native.getAttribute('src') === '/image-part-proof.png'};
  });
  expect(result).toEqual({same: true,unavailable: {blocked: true,marked: true},recovered: true,alt: 'Image 1',activations: 1,rejected: true,sourceRetained: true});expect(requests).toBe(1);
});

test('zoom image owns fixed fit and original-size semantics without consumer dimensions', async ({page}) => {
  await page.goto('/tests/fixture.html');const src = await source(page);
  await page.evaluate(async src => {
    const path = '/src/parts/index.ts',p = await import(path),statuses: Array<{status: string;label: string}> = [];
    const image = p.createZoomImagePart({src,alt: 'Diagram',onStatus(status: {status: string;label: string}) {statuses.push(status);}});
    const dialog = p.createDialogPart({purpose: 'image',title: 'Diagram',children: [image]});
    const mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,dialog);dialog.open();image.fit();
    Object.assign(window,{zoomPartHarness: {image,dialog,tree,statuses}});
  },src);
  await expect.poll(() => page.locator('.pui-image-viewer-viewport img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(1800);
  const result = await page.evaluate(() => {
    const h = (window as unknown as {zoomPartHarness: {image: {fit(): void;original(): void;zoomIn(): void;zoomOut(): void};statuses: Array<{status: string;label: string}>}}).zoomPartHarness;
    const native = document.querySelector<HTMLImageElement>('.pui-image-viewer-viewport img')!,viewport = native.parentElement!;
    h.image.fit();const fit = {fits: native.width <= viewport.clientWidth && native.height <= viewport.clientHeight,label: h.statuses.at(-1)!.label};
    h.image.original();const original = {width: native.width,height: native.height,label: h.statuses.at(-1)!.label};
    h.image.zoomIn();const zoomed = {width: native.width,label: h.statuses.at(-1)!.label};h.image.zoomOut();
    return {fit,original,zoomed,restored: native.width === 1800,leak: Object.values(h.image).some(value => value instanceof Node)};
  });
  expect(result.fit.fits).toBe(true);expect(result.fit.label).toMatch(/^\d+% · 1800 × 1200$/);expect(result.original).toEqual({width: 1800,height: 1200,label: '100% · 1800 × 1200'});expect(result.zoomed).toEqual({width: 2250,label: '125% · 1800 × 1200'});expect(result.restored).toBe(true);expect(result.leak).toBe(false);
});

test('zoom fit does not enlarge tiny content, follows resize and clears source on terminal disposal', async ({page}) => {
  await page.goto('/tests/fixture.html');const tiny = await source(page,12,8),large = await source(page);
  await page.evaluate(async ({tiny,large}) => {
    const path = '/src/parts/index.ts',p = await import(path),statuses: unknown[] = [];
    const image = p.createZoomImagePart({src: tiny,alt: 'Tiny',onStatus(value: unknown) {statuses.push(value);}}),dialog = p.createDialogPart({purpose: 'image',title: 'Image',children: [image]});
    const mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,dialog);dialog.open();
    Object.assign(window,{zoomResizeHarness: {image,dialog,tree,statuses,large}});
  },{tiny,large});
  await expect.poll(() => page.locator('img').evaluate(node => (node as HTMLImageElement).naturalWidth)).toBe(12);
  await expect.poll(() => page.locator('img').evaluate(node => (node as HTMLImageElement).width)).toBe(12);
  await page.evaluate(() => {const h = (window as unknown as {zoomResizeHarness: {image: {update(value: unknown): void};large: string}}).zoomResizeHarness;h.image.update({src: h.large,alt: 'Large'});});
  await expect.poll(() => page.locator('img').evaluate(node => (node as HTMLImageElement).naturalWidth)).toBe(1800);await page.setViewportSize({width: 600,height: 500});
  await expect.poll(() => page.locator('img').evaluate(node => {const image = node as HTMLImageElement;return image.width <= image.parentElement!.clientWidth && image.height <= image.parentElement!.clientHeight;})).toBe(true);
  const result = await page.evaluate(async () => {
    const h = (window as unknown as {zoomResizeHarness: {image: {clear(): void;update(value: unknown): void;destroy(): void};tree: {destroy(): void};statuses: unknown[];large: string}}).zoomResizeHarness,native = document.querySelector('img')!;
    h.image.clear();const cleared = !native.hasAttribute('src') && !native.hasAttribute('style');h.tree.destroy();const count = h.statuses.length;h.image.update({src: h.large,alt: 'Retired'});h.image.destroy();await Promise.resolve();return {cleared,quiet: h.statuses.length === count,remaining: document.querySelectorAll('dialog,img').length};
  });expect(result).toEqual({cleared: true,quiet: true,remaining: 0});
});

test('zoom shortcuts stay inside the owning dialog and ignore modifiers, composition and editable input', async ({page}) => {
  await page.goto('/tests/fixture.html');const src = await source(page,120,80);
  await page.evaluate(async src => {
    const path = '/src/parts/index.ts',p = await import(path),image = p.createZoomImagePart({src,alt: 'Diagram'}),field = p.createInputPart({label: 'Editable'});
    const dialog = p.createDialogPart({purpose: 'image',title: 'Image',children: [image,field]}),other = p.createDialogPart({title: 'Other',children: []});
    const mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,p.createStackPart({children: [dialog,other]}));dialog.open();image.original();
    Object.assign(window,{zoomKeyboardHarness: {image,dialog,other,tree}});
  },src);
  await expect.poll(() => page.locator('img').evaluate(node => (node as HTMLImageElement).naturalWidth)).toBe(120);
  await page.getByRole('button',{name: 'Close image',exact: true}).focus();await page.keyboard.press('+');await expect.poll(() => page.locator('img').evaluate(node => (node as HTMLImageElement).width)).toBe(150);
  await page.getByRole('textbox',{name: 'Editable',exact: true}).focus();await page.keyboard.press('+');await expect.poll(() => page.locator('img').evaluate(node => (node as HTMLImageElement).width)).toBe(150);
  await page.getByRole('button',{name: 'Close image',exact: true}).evaluate(node => {for (const options of [{key: '+',isComposing: true},{key: '+',ctrlKey: true},{key: '+',metaKey: true},{key: '+',altKey: true}]) node.dispatchEvent(new KeyboardEvent('keydown',{...options,bubbles: true,cancelable: true}));});
  await expect.poll(() => page.locator('img').evaluate(node => (node as HTMLImageElement).width)).toBe(150);
  await page.evaluate(() => (window as unknown as {zoomKeyboardHarness: {other: {open(): void}}}).zoomKeyboardHarness.other.open());await page.keyboard.press('-');await expect.poll(() => page.locator('img').evaluate(node => (node as HTMLImageElement).width)).toBe(150);
});
