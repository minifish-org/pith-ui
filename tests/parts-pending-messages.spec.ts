import {test,expect,type Page} from '@playwright/test';

interface Item {id: string;text: string;mode: string;imageCount?: number}
interface State {items: Item[];running: boolean;busy: boolean}
interface Harness {queue: {update(state: State): void;destroy(): void};state: State;calls: Array<{action: string;id: string}>;retained?: {row: Element;button: Element;selection: string;scroll: number}}
declare global {interface Window {pendingPartsHarness: Harness}}
const mixed: State = {items: [{id: 'follow',text: 'Original follow-up 中文\nSecond line\nThird line',mode: 'follow-up',imageCount: 2},{id: 'steer',text: 'Keep the original constraints.',mode: 'steer'},{id: 'image',text: '',mode: 'follow-up',imageCount: 1}],running: true,busy: false};
async function setup(page: Page,old: boolean,state = mixed,appearance: 'light'|'dark' = 'light'): Promise<void> {
  await page.goto('/tests/fixture.html');await page.emulateMedia({colorScheme: appearance === 'light' ? 'dark' : 'light'});
  await page.evaluate(async ({old,state,appearance}) => {
    document.body.dataset.appearance = appearance;const appPath = '/src/app/index.ts',{createApplication} = await import(appPath),mount = document.body.appendChild(document.createElement('div')),h = {state,calls: []} as unknown as Harness;
    const callbacks = {onQueueAction(action: string,id: string) {h.calls.push({action,id});}},app = createApplication(mount,{appearance,workspace: callbacks});app.workspace.updatePending(state);
    if (old) h.queue = {update: app.workspace.updatePending,destroy: app.destroy};
    else {
      const clone = mount.firstElementChild!.cloneNode(true);app.destroy();mount.replaceChildren(clone);
      const recipePath = '/examples/assemblies/pending-messages.ts',partsPath = '/src/parts/index.ts',{composePendingMessages} = await import(recipePath),p = await import(partsPath),queue = composePendingMessages(state,callbacks);
      const before = mount.querySelector('.pui-queued-messages')!,parent = before.parentElement!,siblings = [...parent.childNodes],position = siblings.indexOf(before);p.mountParts(parent,queue.part,{appearance});parent.prepend(...siblings.slice(0,position));parent.append(...siblings.slice(position+1));h.queue = queue;
    }
    window.pendingPartsHarness = h;
  },{old,state,appearance});await page.mouse.move(0,0);
}
async function presentation(page: Page): Promise<unknown> {
  return page.evaluate(async () => {
    await document.fonts.ready;const root = document.querySelector('.pui-queued-messages')!,origin = root.getBoundingClientRect();
    const inspect = (node: Element) => {const box = node.getBoundingClientRect(),style = getComputedStyle(node);return {tag: node.localName,text: [...node.childNodes].filter(child => child.nodeType === Node.TEXT_NODE).map(child => child.textContent).join(''),hidden: node.hasAttribute('hidden'),
      box: [box.x-origin.x,box.y-origin.y,box.width,box.height].map(value => Math.round(value*100)/100),
      styles: ['display','font-family','font-size','font-weight','line-height','color','background-color','margin-top','margin-bottom','padding-top','padding-right','padding-bottom','padding-left','border-top-width','border-top-color','border-radius','gap','white-space','overflow-wrap','overflow-x','overflow-y','min-width','max-height','flex','flex-shrink','align-items','-webkit-line-clamp'].map(key => style.getPropertyValue(key)),
      ...(node instanceof HTMLButtonElement ? {disabled: node.disabled,label: node.getAttribute('aria-label'),title: node.title,type: node.type} : {title: node.getAttribute('title')})};};
    return {root: inspect(root),label: root.getAttribute('aria-label'),live: root.getAttribute('aria-live'),nodes: [...root.querySelectorAll('div,span,small,button')].map(inspect),svg: [...root.querySelectorAll('svg')].map(node => node.innerHTML)};
  });
}
test('compact list, row and constrained preview text own native children without an implicit pending-message template',async ({page}) => {
  await page.goto('/tests/fixture.html');const value = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path),text = p.createRowTextPart({purpose: 'preview',text: 'Literal <b>preview</b>',title: 'Original full text'}),count = p.createRowTextPart({purpose: 'count',text: '2 images'}),body = p.createCompactRowBodyPart({children: [text,count]}),actions = p.createCompactRowActionsPart({children: []}),badge = p.createBadgePart({purpose: 'filled',text: 'Instruction'}),row = p.createCompactRowPart({children: [badge,body,actions]}),root = p.createScrollListPart({label: 'Pending messages',children: [p.createSectionHeadingPart({title: 'Pending messages'}),row],hidden: false});
    const mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,root);let css = false,foreign = false;try {p.createRowTextPart({purpose: 'preview',text: 'Bad',lines: 3});} catch {css = true;}try {row.replace([{}]);} catch {foreign = true;}
    const result = {css,foreign,root: mount.firstElementChild!.localName,row: [...mount.querySelector('.pui-queued-message')!.children].map(node => node.localName),body: [...mount.querySelector('.pui-queued-message-content')!.children].map(node => node.localName),literal: mount.querySelectorAll('b').length,leaks: Object.values(root).some(value => value instanceof Node)};tree.destroy();return result;
  });expect(value).toEqual({css: true,foreign: true,root: 'section',row: ['span','div','div'],body: ['span','small'],literal: 0,leaks: false});
});
const scenarios: Record<string,State> = {mixed,empty: {...mixed,items: []},idle: {...mixed,running: false},busy: {...mixed,busy: true},many: {...mixed,items: Array.from({length: 18},(_,index) => ({id: 'row-'+index,text: 'A queued message '.repeat(12),mode: 'follow-up',imageCount: index%3}))}};
for (const appearance of ['light','dark'] as const) for (const [name,state] of Object.entries(scenarios)) test(`${appearance} ${name} pending-message assembly preserves exact old content and bounded layout`,async ({page}) => {
  await setup(page,true,state,appearance);const before = await presentation(page);await setup(page,false,state,appearance);expect(await presentation(page)).toEqual(before);
});
for (const width of [390,900]) test(`${width} pending-message rows preserve clamping and independently scrolling list`,async ({page}) => {
  await page.setViewportSize({width,height: 568});await setup(page,true,scenarios.many);const before = await presentation(page);await setup(page,false,scenarios.many);expect(await presentation(page)).toEqual(before);
});
test('keyed snapshots preserve selected text, row identity, focused action and list scroll',async ({page}) => {
  for (const old of [true,false]) {
    await setup(page,old,scenarios.many);const value = await page.evaluate(() => {
      const h = window.pendingPartsHarness,list = document.querySelector<HTMLElement>('.pui-queued-messages')!,row = list.querySelector('.pui-queued-message')!,text = row.querySelector('.pui-queued-message-text')!.firstChild!,range = document.createRange();range.setStart(text,0);range.setEnd(text,8);getSelection()!.removeAllRanges();getSelection()!.addRange(range);list.scrollTop = 45;
      h.queue.update({...h.state,busy: false});const selection = getSelection()!.toString(),button = row.querySelector<HTMLButtonElement>('[aria-label="Edit pending message"]')!;button.focus();h.queue.update({...h.state,items: h.state.items.map((item,index) => index === h.state.items.length-1 ? {...item,text: 'Updated unrelated tail'} : item)});
      return {selection,same: row === list.querySelector('.pui-queued-message'),focus: document.activeElement === button,scroll: list.scrollTop};
    });expect(value).toEqual({selection: 'A queued',same: true,focus: true,scroll: 45});
  }
});
test('steer/edit/delete report the current stable ID once and busy snapshots disable every existing action',async ({page}) => {
  for (const old of [true,false]) {
    await setup(page,old);const row = page.locator('.pui-queued-message').first();await row.getByRole('button',{name: 'Steer',exact: true}).click();await row.getByRole('button',{name: 'Edit pending message',exact: true}).click();await row.getByRole('button',{name: 'Delete pending message',exact: true}).click();expect(await page.evaluate(() => window.pendingPartsHarness.calls)).toEqual(['steer','edit','delete'].map(action => ({action,id: 'follow'})));
    await page.evaluate(() => {const h = window.pendingPartsHarness;h.queue.update({...h.state,busy: true});});expect(await page.locator('.pui-queued-message button').evaluateAll(nodes => nodes.every(node => (node as HTMLButtonElement).disabled))).toBe(true);
    await page.evaluate(() => {const h = window.pendingPartsHarness;h.queue.destroy();h.queue.update(h.state);});await expect(page.locator('.pui-queued-message')).toHaveCount(0);
  }
});
