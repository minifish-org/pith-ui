import {test, expect, type Page} from '@playwright/test';

interface Viewer {open(input: {src: string; alt?: string}): void; close(): void; isOpen(): boolean; destroy(): void}
declare global {interface Window {imageViewerHarness: {viewer: Viewer;src: string;closed: number;native?: HTMLImageElement}}}

async function openViewer(page: Page, old: boolean, appearance: 'light' | 'dark' = 'light', tiny = false): Promise<void> {
  await page.goto('/tests/fixture.html');await page.emulateMedia({colorScheme: appearance === 'light' ? 'dark' : 'light'});
  await page.evaluate(async ({old,appearance,tiny}) => {
    document.documentElement.classList.add('pui');document.documentElement.dataset.appearance = appearance;document.body.dataset.appearance = appearance;
    const canvas = document.createElement('canvas');canvas.width = tiny ? 12 : 1800;canvas.height = tiny ? 8 : 1200;const context = canvas.getContext('2d')!;context.fillStyle = '#5060a8';context.fillRect(0,0,canvas.width,canvas.height);const src = canvas.toDataURL('image/png');
    const mount = document.body.appendChild(document.createElement('div')),appPath = '/src/app/index.ts',{createApplication} = await import(appPath),app = createApplication(mount,{appearance});
    const h = {src,closed: 0} as {viewer: Viewer;src: string;closed: number};
    if (old) {
      app.files.openPreview({owner: {kind: 'artifact',id: 'c1'},name: 'diagram.png',path: '/demo/diagram.png',capabilities: {open: false,reveal: false,copyMode: 'none'},content: {kind: 'image',imageSrc: src,imageAlt: 'Diagram 中文'}});
      const image = mount.querySelector<HTMLImageElement>('.pui-file-preview-image')!;await image.decode();image.click();
      const dialog = mount.querySelector<HTMLDialogElement>('.pui-image-viewer')!;
      h.viewer = {open(input) {image.src = input.src;image.alt = input.alt ?? '';image.click();},close() {dialog.close();},isOpen: () => dialog.open,destroy() {app.destroy();}};
    } else {
      const partsPath = '/src/parts/index.ts',recipePath = '/examples/assemblies/image-viewer.ts',p = await import(partsPath),{composeImageViewer} = await import(recipePath);
      const viewer = composeImageViewer({onClose() {h.closed++;}});h.viewer = viewer;
      // The actual old modal is directly under the application's flex root.
      // Its preview trigger is outside this measured region; preserve that
      // parent context without reintroducing a public whole-application API.
      p.mountParts(mount.querySelector('.pui-app'),viewer.part,{appearance});
      const triggerMount = document.body.appendChild(document.createElement('div'));
      const trigger = p.createImagePart({purpose: 'preview',src,alt: 'Diagram 中文',status: 'ready',onActivate: (input: {src: string;alt: string}) => viewer.open(input)});
      p.mountParts(triggerMount,trigger,{appearance});const image = triggerMount.querySelector<HTMLImageElement>('img')!;await image.decode();image.click();
    }
    window.imageViewerHarness = h;
  },{old,appearance,tiny});
  await expect(page.locator('dialog.pui-image-viewer[open]')).toBeVisible();
  await expect.poll(() => page.locator('dialog.pui-image-viewer img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(tiny ? 12 : 1800);
}

async function presentation(page: Page): Promise<unknown> {
  return page.evaluate(async () => {
    await document.fonts.ready;for (const animation of document.getAnimations()) if (animation.effect?.getTiming().iterations !== Infinity) animation.finish();
    const dialog = document.querySelector('dialog.pui-image-viewer[open]')!,origin = dialog.getBoundingClientRect();
    const inspect = (node: Element) => {const rect = node.getBoundingClientRect(),style = getComputedStyle(node);return {
      tag: node.localName,text: [...node.childNodes].filter(child => child.nodeType === Node.TEXT_NODE).map(child => child.textContent).join('').trim(),
      box: [rect.x - origin.x,rect.y - origin.y,rect.width,rect.height].map(value => Math.round(value * 100) / 100),
      styles: ['display','font-family','font-size','font-weight','line-height','color','background-color','margin-top','margin-bottom','padding-top','padding-right','padding-bottom','padding-left','border-top-width','border-top-color','border-radius','gap','overflow-x','overflow-y','min-height','max-height','max-width','object-fit','flex','align-items','justify-content'].map(key => style.getPropertyValue(key)),
      ...(node instanceof HTMLButtonElement ? {label: node.getAttribute('aria-label'),type: node.type,disabled: node.disabled} : {}),
      ...(node instanceof HTMLImageElement ? {alt: node.alt,natural: [node.naturalWidth,node.naturalHeight]} : {})};};
    return {dialog: inspect(dialog),classes: [...dialog.classList].sort(),nodes: [...dialog.querySelectorAll('h2,button,img,.pui-image-viewer-viewport,.pui-image-viewer-toolbar,[role=status]')].map(inspect),svg: [...dialog.querySelectorAll('svg')].map(svg => svg.innerHTML)};
  });
}

test('media toolbar composes a genuine status text and actions with one intrinsic action group', async ({page}) => {
  await page.goto('/tests/fixture.html');
  const value = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path),status = p.createTextPart({text: '100% · 12 × 8'}),button = p.createButtonPart({label: 'Fit',variant: 'secondary'});
    const toolbar = p.createMediaToolbarPart({status,actions: [button]}),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,toolbar);
    const result = {root: mount.firstElementChild!.className,children: [...mount.firstElementChild!.children].map(node => node.localName),status: mount.querySelector('[role=status]')!.textContent,actions: mount.querySelector('div > div')!.querySelectorAll('button').length,leaks: Object.values(toolbar).some(value => value instanceof Node)};tree.destroy();
    const free = p.createTextPart({text: 'Free'});let rejected = false;try {p.createMediaToolbarPart({status: free,actions: [free]});} catch {rejected = true;}
    const remount = document.body.appendChild(document.createElement('div')),remounted = p.mountParts(remount,free);const reusable = remount.textContent === 'Free';remounted.destroy();return {...result,rejected,reusable};
  });
  expect(value).toEqual({root: 'pui-image-viewer-toolbar',children: ['span','div'],status: '100% · 12 × 8',actions: 1,leaks: false,rejected: true,reusable: true});
});

for (const appearance of ['light','dark'] as const) for (const tiny of [false,true]) test(`${appearance} ${tiny ? 'tiny' : 'large'} image viewer assembly preserves actual application fit and toolbar`, async ({page}) => {
  await openViewer(page,true,appearance,tiny);const fit = await presentation(page);
  await page.getByRole('button',{name: 'Original size',exact: true}).click();const original = await presentation(page);
  await page.getByRole('button',{name: 'Zoom in',exact: true}).click();const zoomed = await presentation(page);
  // Match each old pointer/hover state as well as image scale. Returning to
  // original scale with Zoom out leaves a different button hovered.
  await page.getByRole('button',{name: 'Zoom out',exact: true}).click();const returned = await presentation(page);
  await page.getByRole('button',{name: 'Fit',exact: true}).click();const refitted = await presentation(page);
  await openViewer(page,false,appearance,tiny);expect(await presentation(page)).toEqual(fit);
  await page.getByRole('button',{name: 'Original size',exact: true}).click();expect(await presentation(page)).toEqual(original);
  await page.getByRole('button',{name: 'Zoom in',exact: true}).click();expect(await presentation(page)).toEqual(zoomed);
  await page.getByRole('button',{name: 'Zoom out',exact: true}).click();expect(await presentation(page)).toEqual(returned);
  await page.getByRole('button',{name: 'Fit',exact: true}).click();expect(await presentation(page)).toEqual(refitted);
});

for (const viewport of [{width: 900,height: 568},{width: 390,height: 844}]) test(`image viewer ${viewport.width} preserves bounded viewport and responsive controls`, async ({page}) => {
  await page.setViewportSize(viewport);await openViewer(page,true);const old = await presentation(page);
  await openViewer(page,false);expect(await presentation(page)).toEqual(old);
});

test('image viewer closes and reopens the retained image with reset fit and scroll', async ({page}) => {
  await openViewer(page,false);
  await page.getByRole('button',{name: 'Original size',exact: true}).click();await page.getByRole('button',{name: 'Zoom in',exact: true}).click();
  await page.evaluate(() => {const image = document.querySelector<HTMLImageElement>('dialog.pui-image-viewer img')!,viewport = image.parentElement!;window.imageViewerHarness.native = image;viewport.scrollTop = 80;viewport.scrollLeft = 80;});
  await page.keyboard.press('Escape');await expect(page.locator('dialog.pui-image-viewer[open]')).toHaveCount(0);
  await expect(page.locator('img.pui-file-preview-image')).toBeFocused();
  expect(await page.locator('dialog.pui-image-viewer img').evaluate(image => ({source: image.hasAttribute('src'),style: image.hasAttribute('style')}))).toEqual({source: false,style: false});
  await page.evaluate(() => {const h = window.imageViewerHarness;h.viewer.open({src: h.src,alt: 'Reopened'});});await expect.poll(() => page.locator('dialog.pui-image-viewer img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(1800);
  expect(await page.locator('dialog.pui-image-viewer img').evaluate(image => ({same: image === window.imageViewerHarness.native,scroll: [image.parentElement!.scrollLeft,image.parentElement!.scrollTop],title: document.querySelector('dialog.pui-image-viewer h2')!.textContent}))).toEqual({same: true,scroll: [0,0],title: 'Reopened'});
  await page.evaluate(() => {const h = window.imageViewerHarness;h.viewer.destroy();h.viewer.destroy();h.viewer.open({src: h.src});});await expect(page.locator('dialog.pui-image-viewer')).toHaveCount(0);
});
