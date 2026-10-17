import {test,expect,type Page} from '@playwright/test';

interface Message {id: string;role: string;text: string;toolName?: string;images?: Array<{index: number;mimeType?: string}>}
interface State {id: string;working: boolean;messages: Message[]}
interface Harness {body: {update(state: State): void;destroy(): void};state: State;calls: Array<{target: {conversationId: string;messageId: string;index: number};frozen: boolean}>;activations: Array<{src: string;alt: string}>;resolves: Array<(blob: Blob|null) => void>;blob: Blob;revoked: string[];image?: Element}
declare global {interface Window {conversationImageParts: Harness}}
async function setup(page: Page,old: boolean,role = 'user',mode: 'ready'|'pending'|'unavailable' = 'ready',appearance: 'light'|'dark' = 'light'): Promise<void> {
  await page.goto('/tests/fixture.html');await page.emulateMedia({colorScheme: appearance === 'light' ? 'dark' : 'light'});
  await page.evaluate(async ({old,role,mode,appearance}) => {
    document.body.classList.remove('pui');
    const canvas = document.createElement('canvas');canvas.width = 320;canvas.height = 180;canvas.getContext('2d')!.fillRect(0,0,320,180);const blob = await (await fetch(canvas.toDataURL())).blob();
    const state: State = {id: 'original',working: false,messages: [{id: 'image-message',role,text: role === 'tool' ? 'Tool image result' : '',toolName: 'read_file',images: [{index: 0,mimeType: 'image/png'},{index: 2,mimeType: 'image/png'}]}]};
    const h = {state,calls: [],activations: [],resolves: [],blob,revoked: []} as unknown as Harness;
    const revoke = URL.revokeObjectURL.bind(URL);URL.revokeObjectURL = url => {h.revoked.push(url);revoke(url);};
    const callbacks = {onLoadImage(target: {conversationId: string;messageId: string;index: number}) {h.calls.push({target,frozen: Object.isFrozen(target)});return mode === 'pending' ? new Promise(resolve => h.resolves.push(resolve)) : mode === 'unavailable' && h.calls.length <= 2 ? null : blob;},onImage(image: {src: string;alt: string}) {h.activations.push(image);}};
    const path = '/src/app/index.ts',{createApplication} = await import(path),mount = document.body.appendChild(document.createElement('div')),app = createApplication(mount,{appearance,workspace: callbacks});app.workspace.updateConversation(state);
    if (old) h.body = {update: app.workspace.updateConversation,destroy: app.destroy};
    else {
      const context = mount.querySelector('.pui-app')!.cloneNode(true);app.destroy();mount.append(context);h.calls.length = 0;h.resolves.length = 0;h.revoked.length = 0;
      const recipePath = '/examples/assemblies/conversation-body.ts',partsPath = '/src/parts/index.ts',{composeConversationBody} = await import(recipePath),p = await import(partsPath),body = composeConversationBody(state,callbacks);p.mountParts(mount.querySelector('.pui-chat-scroll'),body.part,{appearance});h.body = body;
    }
    for (const details of mount.querySelectorAll<HTMLDetailsElement>('.pui-messages details')) details.open = true;
    window.conversationImageParts = h;
  },{old,role,mode,appearance});
  if (mode === 'ready') await expect.poll(() => page.locator('.pui-messages img').evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth === 320))).toBe(true);
  if (mode === 'unavailable') await expect(page.locator('.pui-messages img.pui-image-unavailable')).toHaveCount(2);
  await page.mouse.move(0,0);
}
async function presentation(page: Page): Promise<unknown> {
  return page.locator('.pui-messages').evaluate(root => {
    const origin = root.getBoundingClientRect();return [...root.querySelectorAll('.pui-message-images,img')].map(node => {const box = node.getBoundingClientRect(),style = getComputedStyle(node);return {
      tag: node.localName,classes: [...node.classList].sort(),box: [box.x-origin.x,box.y-origin.y,box.width,box.height].map(value => Math.round(value*100)/100),
      styles: ['display','max-width','max-height','border-radius','margin-top','margin-bottom','gap','cursor','color','font-size','line-height','opacity','flex-wrap','object-fit'].map(key => style.getPropertyValue(key)),
      ...(node instanceof HTMLImageElement ? {alt: node.alt,title: node.title,role: node.getAttribute('role'),tab: node.tabIndex,loading: node.loading,natural: [node.naturalWidth,node.naturalHeight]} : {}),
    };});
  });
}

test('image group owns only one native gallery and its caller supplied images',async ({page}) => {
  await page.goto('/tests/fixture.html');const result = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path),image = p.createImagePart({purpose: 'content',alt: 'Image 1'}),group = p.createImageGroupPart({children: [image]}),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,group);
    let css = false,foreign = false;try {p.createImageGroupPart({children: [],gap: 100});} catch {css = true;}try {group.replace([{}]);} catch {foreign = true;}
    const result = {css,foreign,root: mount.firstElementChild!.localName,classes: mount.firstElementChild!.className,children: [...mount.firstElementChild!.children].map(node => node.localName),leaks: Object.values(group).some(value => value instanceof Node)};tree.destroy();return result;
  });expect(result).toEqual({css: true,foreign: true,root: 'div',classes: 'pui-message-images',children: ['img'],leaks: false});
});
for (const appearance of ['light','dark'] as const) for (const role of ['user','tool']) for (const mode of ['ready','pending','unavailable'] as const) test(`${appearance} ${role} ${mode} image gallery preserves actual presentation and image accessibility`,async ({page}) => {
  await setup(page,true,role,mode,appearance);const before = await presentation(page);await setup(page,false,role,mode,appearance);expect(await presentation(page)).toEqual(before);
});

test('unavailable image retries on a later projection, while successful keyed images stay decoded and focused',async ({page}) => {
  for (const old of [true,false]) {
    await setup(page,old,'user','unavailable');await page.evaluate(() => {const h = window.conversationImageParts;h.image = document.querySelector('.pui-messages img')!;h.body.update(h.state);});
    await expect.poll(() => page.locator('.pui-messages img').first().evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(320);
    await page.locator('.pui-messages img').first().focus();await page.evaluate(() => {const h = window.conversationImageParts;h.body.update({...h.state,messages: [...h.state.messages,{id: 'new',role: 'assistant',text: 'New answer'}]});});
    expect(await page.evaluate(() => ({same: document.querySelector('.pui-messages img') === window.conversationImageParts.image,focus: document.activeElement === window.conversationImageParts.image,calls: window.conversationImageParts.calls}))).toEqual({same: true,focus: true,calls: [0,2,0,2].map(index => ({target: {conversationId: 'original',messageId: 'image-message',index},frozen: true}))});
  }
});

test('click and native Enter or Space activation enlarge only a ready image and retain its focus on close',async ({page}) => {
  for (const old of [true,false]) for (const activation of ['click','Enter','Space']) {
    await setup(page,old);const image = page.locator('.pui-messages img').first();if (activation === 'click') await image.click();else {await image.focus();await page.keyboard.press(activation);}
    if (old) {await expect(page.locator('dialog.pui-image-viewer[open]')).toBeVisible();await page.keyboard.press('Escape');await expect(image).toBeFocused();}
    else {await expect(page.locator('dialog[open]')).toHaveCount(0);expect(await page.evaluate(() => window.conversationImageParts.activations)).toEqual([{src: expect.stringContaining('blob:'),alt: 'Image 1'}]);}
  }
});

test('switching conversations retires pending image results and releases all live object URLs on disposal',async ({page}) => {
  for (const old of [true,false]) {
    await setup(page,old,'user','pending');await page.evaluate(() => {const h = window.conversationImageParts;h.body.update({id: 'other',messages: [],working: false});for (const resolve of h.resolves) resolve(h.blob);});
    await expect(page.locator('.pui-messages img')).toHaveCount(0);expect(await page.evaluate(() => window.conversationImageParts.revoked)).toEqual([]);
    await page.evaluate(() => {const h = window.conversationImageParts;h.resolves.length = 0;h.body.update(h.state);});await expect.poll(() => page.evaluate(() => window.conversationImageParts.resolves.length)).toBe(2);
    await page.evaluate(() => {const h = window.conversationImageParts;for (const resolve of h.resolves) resolve(h.blob);});await expect.poll(() => page.locator('.pui-messages img').first().evaluate(image => (image as HTMLImageElement).naturalWidth)).toBe(320);
    await page.evaluate(() => {const h = window.conversationImageParts;h.body.destroy();h.body.update(h.state);});expect(await page.evaluate(() => window.conversationImageParts.revoked.length)).toBe(2);await expect(page.locator('.pui-messages img')).toHaveCount(0);
  }
});
