import {test, expect, type Page} from '@playwright/test';

interface Viewer {open(input: {src: string; alt?: string}): void; close(): void; isOpen(): boolean; destroy(): void}
declare global {interface Window {imageViewerHarness: {viewer: Viewer;src: string;closed: number;native?: HTMLImageElement}}}

async function openViewer(page: Page, appearance: 'light' | 'dark' = 'light', tiny = false): Promise<void> {
  await page.goto('/tests/fixture.html');await page.emulateMedia({colorScheme: appearance === 'light' ? 'dark' : 'light'});
  await page.evaluate(async ({appearance,tiny}) => {
    document.documentElement.classList.add('pui');document.documentElement.dataset.appearance = appearance;document.body.dataset.appearance = appearance;
    const canvas = document.createElement('canvas');canvas.width = tiny ? 12 : 1800;canvas.height = tiny ? 8 : 1200;const context = canvas.getContext('2d')!;context.fillStyle = '#5060a8';context.fillRect(0,0,canvas.width,canvas.height);const src = canvas.toDataURL('image/png');
const mount=document.body.appendChild(document.createElement('div')),h={src,closed:0} as {viewer:Viewer;src:string;closed:number};
    const contextPath = '/tests/region-context.ts', {mountRegion} = await import(contextPath);
    const path='/tests/recipes-fixture.ts',{parts:p,recipes:r}=await import(path),viewer=r.composeImageViewer({onClose(){h.closed++;}});h.viewer=viewer;
    const trigger=p.createImagePart({purpose:'preview',src,alt:'Diagram 中文',status:'ready',onActivate:(input:{src:string;alt:string})=>viewer.open(input)});
    mountRegion(mount,viewer.part,'dialog',appearance,[trigger]);const image=mount.querySelector<HTMLImageElement>('img')!;await image.decode();image.click();
        window.imageViewerHarness = h;
  },{appearance,tiny});
  await expect(page.locator('dialog.pui-image-viewer[open]')).toBeVisible();
  await expect.poll(() => page.locator('dialog.pui-image-viewer img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(tiny ? 12 : 1800);
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

test('image viewer closes and reopens the retained image with reset fit and scroll', async ({page}) => {
  await openViewer(page);
  await page.getByRole('button',{name: 'Original size',exact: true}).click();await page.getByRole('button',{name: 'Zoom in',exact: true}).click();
  await page.evaluate(() => {const image = document.querySelector<HTMLImageElement>('dialog.pui-image-viewer img')!,viewport = image.parentElement!;window.imageViewerHarness.native = image;viewport.scrollTop = 80;viewport.scrollLeft = 80;});
  await page.keyboard.press('Escape');await expect(page.locator('dialog.pui-image-viewer[open]')).toHaveCount(0);
  await expect(page.locator('img.pui-file-preview-image')).toBeFocused();
  expect(await page.locator('dialog.pui-image-viewer img').evaluate(image => ({source: image.hasAttribute('src'),style: image.hasAttribute('style')}))).toEqual({source: false,style: false});
  await page.evaluate(() => {const h = window.imageViewerHarness;h.viewer.open({src: h.src,alt: 'Reopened'});});await expect.poll(() => page.locator('dialog.pui-image-viewer img').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(1800);
  expect(await page.locator('dialog.pui-image-viewer img').evaluate(image => ({same: image === window.imageViewerHarness.native,scroll: [image.parentElement!.scrollLeft,image.parentElement!.scrollTop],title: document.querySelector('dialog.pui-image-viewer h2')!.textContent}))).toEqual({same: true,scroll: [0,0],title: 'Reopened'});
  await page.evaluate(() => {const h = window.imageViewerHarness;h.viewer.destroy();h.viewer.destroy();h.viewer.open({src: h.src});});await expect(page.locator('dialog.pui-image-viewer')).toHaveCount(0);
});
