import {expect,test,type Page} from '@playwright/test';

interface Item {id: string;url: string;name: string}
interface State {items: Item[];disabled?: boolean}
interface Composition {update(state: State): void;destroy(): void}
interface Harness {state: State;composition: Composition;tree: {destroy(): void};opens: Array<{src: string;alt: string}>;removed: string[];native?: {figure: Element;image: Element;button: Element}}
declare global {interface Window {attachmentsPartsHarness: Harness}}
const tiny = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="16" height="12"%3E%3Cpath fill="%235060a8" d="M0 0h16v12H0z"/%3E%3C/svg%3E';
const populated: State = {items: [{id: 'one',url: tiny,name: 'Original diagram 中文.png'},{id: 'two',url: tiny,name: '<literal & unsafe> very long image name '.repeat(5)+'.svg'}]};

async function setup(page: Page,old: boolean,state: State = populated,appearance: 'light'|'dark' = 'light'): Promise<void> {
  await page.goto('/tests/fixture.html');await page.emulateMedia({colorScheme: appearance === 'light' ? 'dark' : 'light'});
  await page.evaluate(async ({old,state,appearance}) => {
    const appPath = '/src/app/index.ts',{createApplication} = await import(appPath),mount = document.body.appendChild(document.createElement('div'));
    document.body.dataset.appearance = appearance;
    const h = {state,opens: [],removed: []} as unknown as Harness;
    const callbacks = {onRemove(id: string) {h.removed.push(id);},onOpen(image: {src: string;alt: string}) {h.opens.push({src: image.src,alt: image.alt});}};
    const app = createApplication(mount,{appearance});app.workspace.updateAttachments(state);
    const clone = mount.firstElementChild!.cloneNode(true);app.destroy();mount.replaceChildren(clone);
    if (old) {
      // Use the real composer host and the old factory, whose native image is
      // adapted to the same data-only test boundary as the new recipe.
      const legacyPath = '/src/composer.ts',{createAttachments} = await import(legacyPath),old = mount.querySelector<HTMLElement>('.pui-draft-images')!;
      const attachments = createAttachments({container: old,onRemove: callbacks.onRemove,onOpen: callbacks.onOpen});attachments.update(state);
      h.composition = attachments;h.tree = attachments;
    } else {
      const recipePath = '/examples/assemblies/attachments.ts',partsPath = '/src/parts/index.ts',{composeAttachments} = await import(recipePath),p = await import(partsPath),attachments = composeAttachments(state,callbacks);
      const before = mount.querySelector('.pui-draft-images')!,boundary = document.createElement('div');
      h.tree = p.mountParts(boundary,attachments.part,{appearance});
      // The old immediate parent is FORM, which intentionally is not a public
      // mount. Place the already-owned test subtree into that exact old parent;
      // production composes it as a child of the genuine composer FormPart.
      before.replaceWith(boundary.firstElementChild!);h.composition = attachments;
    }
    window.attachmentsPartsHarness = h;
  },{old,state,appearance});await page.mouse.move(0,0);
}

async function presentation(page: Page): Promise<unknown> {
  return page.locator('.pui-draft-images').evaluate(async root => {
    await document.fonts.ready;await Promise.all([...root.querySelectorAll('img')].map(image => image.decode().catch(() => {})));
    const origin = root.getBoundingClientRect(),inspect = (node: Element) => {const box = node.getBoundingClientRect(),style = getComputedStyle(node);return {tag: node.localName,text: [...node.childNodes].filter(child => child.nodeType === Node.TEXT_NODE).map(child => child.textContent).join(''),
      box: [box.x-origin.x,box.y-origin.y,box.width,box.height].map(value => Math.round(value*100)/100),hidden: node.hasAttribute('hidden'),role: node.getAttribute('role'),label: node.getAttribute('aria-label'),title: node.getAttribute('title'),
      styles: ['display','position','font-family','font-size','font-weight','line-height','color','background-color','gap','flex-basis','flex-shrink','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left','border-top-width','border-top-style','border-top-color','border-radius','object-fit','overflow-x','overflow-y','text-overflow','white-space','top','right','width','height'].map(key => style.getPropertyValue(key)),
      ...(node instanceof HTMLButtonElement ? {type: node.type,disabled: node.disabled} : {}),...(node instanceof HTMLImageElement ? {src: node.getAttribute('src'),alt: node.alt,tabIndex: node.tabIndex} : {})};};
    return {nodes: [root,...root.querySelectorAll('figure,img,figcaption,button')].map(inspect),children: [...root.children].map(figure => [...figure.children].map(node => node.localName)),svg: [...root.querySelectorAll('svg')].map(node => node.innerHTML)};
  });
}

test('thumbnail parts retain direct native structure, ownership and closed overlay actions',async ({page}) => {
  await page.goto('/tests/fixture.html');
  const value = await page.evaluate(async tiny => {
    const path = '/src/parts/index.ts',p = await import(path),caption = p.createCaptionPart({text: '<Literal & caption>'}),image = p.createImagePart({purpose: 'attachment',src: tiny,alt: 'Diagram',status: 'ready'}),close = p.createButtonPart({variant: 'overlay-close',icon: 'close',label: 'Remove Diagram'});
    const figure = p.createThumbnailPart({children: [image,caption,close]}),strip = p.createThumbnailStripPart({label: 'Images',children: [figure]}),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,strip);
    const rejects = (run: () => unknown) => {try {run();return false;} catch {return true;}};
    const invalid = [rejects(() => p.createThumbnailStripPart({children: [],gap: 1})),rejects(() => p.createThumbnailPart({children: [],style: {}})),rejects(() => p.createCaptionPart({text: 'Bad',html: '<b>Bad</b>'})),rejects(() => p.createButtonPart({variant: 'overlay-close',label: 'Missing icon'})),rejects(() => p.createButtonPart({variant: 'overlay-close',icon: 'edit',label: 'Wrong icon'})),rejects(() => close.update({variant: 'overlay-close',icon: 'trash',label: 'Wrong icon'})),rejects(() => p.createButtonPart({purpose: 'prompt',variant: 'overlay-close',icon: 'close',label: 'Wrong context'}))];
    const free = p.createCaptionPart({text: 'Free'}),atomic = rejects(() => p.createThumbnailPart({children: [free,{}]})),other = document.body.appendChild(document.createElement('div')),owned = p.mountParts(other,free),reusable = other.textContent === 'Free';owned.destroy();
    const value = {root: mount.firstElementChild!.localName,figure: mount.querySelector('figure')!.className,children: [...mount.querySelector('figure')!.children].map(node => node.localName),caption: mount.querySelector('figcaption')!.textContent,closeChildren: [...mount.querySelector('button')!.children].map(node => node.localName),label: mount.querySelector('button')!.getAttribute('aria-label'),invalid,atomic,reusable,leaks: [caption,image,close,figure,strip].some(part => Object.values(part).some(value => value instanceof Node))};tree.destroy();return {...value,empty: !mount.firstChild};
  },tiny);
  expect(value).toEqual({root: 'div',figure: 'pui-draft-image',children: ['img','figcaption','button'],caption: '<Literal & caption>',closeChildren: ['svg'],label: 'Remove Diagram',invalid: [true,true,true,true,true,true,true],atomic: true,reusable: true,leaks: false,empty: true});
});

const scenarios: Array<[string,State]> = [['populated',populated],['empty',{items: []}],['disabled',{...populated,disabled: true}],['overflow',{items: Array.from({length: 9},(_,index) => ({id: String(index),url: tiny,name: `Image ${index+1}.svg`}))}]];
for (const [name,state] of scenarios) for (const appearance of ['light','dark'] as const) for (const width of [1280,390]) test(`${name} ${appearance} ${width} attachments preserve the actual composer subtree`,async ({page}) => {
  await page.setViewportSize({width,height: 844});await setup(page,true,state,appearance);const old = await presentation(page);await setup(page,false,state,appearance);expect(await presentation(page)).toEqual(old);
});

test('remove availability stays separate from image opening and callbacks carry only data',async ({page}) => {
  for (const old of [true,false]) {
    await setup(page,old,{...populated,disabled: true});await expect(page.getByRole('button',{name: 'Remove '+populated.items[0]!.name,exact: true})).toBeDisabled();
    const image = page.locator('.pui-draft-image img').first();await image.click();await image.focus();await page.keyboard.press('Enter');await page.keyboard.press('Space');
    expect(await page.evaluate(() => ({opens: window.attachmentsPartsHarness.opens,removed: window.attachmentsPartsHarness.removed}))).toEqual({opens: Array.from({length: 3},() => ({src: tiny,alt: populated.items[0]!.name})),removed: []});
    await page.evaluate(() => {const h = window.attachmentsPartsHarness;h.composition.update({...h.state,disabled: false});});await page.getByRole('button',{name: 'Remove '+populated.items[0]!.name,exact: true}).click();
    expect(await page.evaluate(() => window.attachmentsPartsHarness.removed)).toEqual(['one']);expect(await page.evaluate(() => window.attachmentsPartsHarness.opens.length)).toBe(3);
  }
});

test('broken native image sources still open and repeated keys suppress scrolling without reopening',async ({page}) => {
  for (const old of [true,false]) {
    await setup(page,old,{items: [{id: 'broken',url: 'data:image/png;base64,broken',name: 'Unavailable.png'}],disabled: true});
    const image = page.locator('.pui-draft-image img');await image.click();
    const result = await image.evaluate(node => {
      const send = (options: KeyboardEventInit) => {const event = new KeyboardEvent('keydown',{bubbles: true,cancelable: true,...options});node.dispatchEvent(event);return event.defaultPrevented;};
      return {normal: send({key: 'Enter'}),repeat: send({key: ' ',repeat: true}),composing: send({key: 'Enter',isComposing: true}),other: send({key: 'ArrowRight'}),opens: window.attachmentsPartsHarness.opens};
    });
    expect(result).toEqual({normal: true,repeat: true,composing: false,other: false,opens: [{src: 'data:image/png;base64,broken',alt: 'Unavailable.png'},{src: 'data:image/png;base64,broken',alt: 'Unavailable.png'}]});
  }
});

test('the formal attachment image keeps the old repeat-key default suppression',async ({page}) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async tiny => {
    const oldPath = '/src/composer.ts',partsPath = '/src/parts/index.ts',{createAttachments} = await import(oldPath),p = await import(partsPath);
    const inspect = (image: HTMLImageElement) => {const event = new KeyboardEvent('keydown',{key: ' ',repeat: true,bubbles: true,cancelable: true});image.dispatchEvent(event);return event.defaultPrevented;};
    const legacy = createAttachments({onOpen() {}});document.body.append(legacy.element);legacy.update({items: [{id: 'one',url: tiny,name: 'Image'}]});const old = inspect(legacy.element.querySelector('img')!);legacy.destroy();
    const image = p.createImagePart({purpose: 'attachment',src: tiny,alt: 'Image',status: 'ready',onActivate() {}}),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,image),current = inspect(mount.querySelector('img')!);tree.destroy();return {old,current};
  },tiny);expect(result).toEqual({old: true,current: true});
});

test('keyed attachment updates retain decoded images, action identity and current callback targets',async ({page}) => {
  for (const old of [true,false]) {
    await setup(page,old);await page.evaluate(() => {const h = window.attachmentsPartsHarness,figure = document.querySelector('.pui-draft-image')!;h.native = {figure,image: figure.querySelector('img')!,button: figure.querySelector('button')!};(h.native.image as HTMLElement).focus();h.composition.update({items: [{...h.state.items[0]!,name: 'Renamed.png'},h.state.items[1]!]});});
    expect(await page.evaluate(() => {const h = window.attachmentsPartsHarness;return {figure: h.native!.figure === document.querySelector('.pui-draft-image'),image: h.native!.image === document.querySelector('.pui-draft-image img'),button: h.native!.button === document.querySelector('.pui-draft-image button'),focus: h.native!.image === document.activeElement};})).toEqual({figure: true,image: true,button: true,focus: true});
    await page.evaluate(() => {const h = window.attachmentsPartsHarness;h.composition.update({items: [h.state.items[1]!,{...h.state.items[0]!,name: 'Current.png'}]});});await page.getByRole('button',{name: 'Remove Current.png',exact: true}).click();
    expect(await page.evaluate(() => {const h = window.attachmentsPartsHarness;return {retained: h.native!.figure === document.querySelectorAll('.pui-draft-image')[1],removed: h.removed};})).toEqual({retained: true,removed: ['one']});
    await page.evaluate(() => window.attachmentsPartsHarness.composition.update({items: []}));await expect(page.locator('.pui-draft-images')).toBeHidden();await expect(page.locator('.pui-draft-image')).toHaveCount(0);
  }
});

test('attachment composition is one frame-owned tree and stays terminal after ancestor destruction',async ({page}) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async state => {
    document.body.className = '';const recipePath = '/examples/assemblies/attachments.ts',partsPath = '/src/parts/index.ts',{composeAttachments} = await import(recipePath),p = await import(partsPath);let opens = 0,removed = 0;
    const composition = composeAttachments(state,{onOpen() {opens++;},onRemove() {removed++;}}),root = p.createFramePart({children: [composition.part]}),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,root,{appearance: 'dark'}),image = mount.querySelector('img')!,button = mount.querySelector('button')!;
    const shared = mount.querySelectorAll('.pui').length === 0 && mount.querySelectorAll('[data-appearance]').length === 0;root.replace([]);image.dispatchEvent(new MouseEvent('click',{bubbles: true}));button.click();composition.update(state);composition.destroy();tree.destroy();return {shared,opens,removed,empty: !mount.firstChild,scope: !mount.classList.contains('pui')};
  },populated);expect(result).toEqual({shared: true,opens: 0,removed: 0,empty: true,scope: true});
});
