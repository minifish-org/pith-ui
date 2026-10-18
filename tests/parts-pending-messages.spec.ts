import {test,expect,type Page} from '@playwright/test';

interface Item {id: string;text: string;mode: string;imageCount?: number}
interface State {items: Item[];running: boolean;busy: boolean}
interface Harness {queue: {update(state: State): void;destroy(): void};state: State;calls: Array<{action: string;id: string}>;retained?: {row: Element;button: Element;selection: string;scroll: number}}
declare global {interface Window {pendingPartsHarness: Harness}}
const mixed: State = {items: [{id: 'follow',text: 'Original follow-up 中文\nSecond line\nThird line',mode: 'follow-up',imageCount: 2},{id: 'steer',text: 'Keep the original constraints.',mode: 'steer'},{id: 'image',text: '',mode: 'follow-up',imageCount: 1}],running: true,busy: false};
async function setup(page: Page,state = mixed,appearance: 'light'|'dark' = 'light'): Promise<void> {
  await page.goto('/tests/fixture.html');await page.emulateMedia({colorScheme: appearance === 'light' ? 'dark' : 'light'});
  await page.evaluate(async ({state,appearance}) => {
document.body.dataset.appearance = appearance;const mount = document.body.appendChild(document.createElement('div')),h = {state,calls: []} as unknown as Harness;
    const callbacks = {onQueueAction(action: string,id: string) {h.calls.push({action,id});}};
    const contextPath = '/tests/region-context.ts', {mountRegion} = await import(contextPath);
    const recipePath = '/examples/assemblies/pending-messages.ts',{composePendingMessages} = await import(recipePath),queue = composePendingMessages(state,callbacks);
    mountRegion(mount,queue.part,'panels',appearance);h.queue = queue;
        window.pendingPartsHarness = h;
  },{state,appearance});await page.mouse.move(0,0);
}
test('compact list, row and constrained preview text own native children without an implicit pending-message template',async ({page}) => {
  await page.goto('/tests/fixture.html');const value = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path),text = p.createRowTextPart({purpose: 'preview',text: 'Literal <b>preview</b>',title: 'Original full text'}),count = p.createRowTextPart({purpose: 'count',text: '2 images'}),body = p.createCompactRowBodyPart({children: [text,count]}),actions = p.createCompactRowActionsPart({children: []}),badge = p.createBadgePart({purpose: 'filled',text: 'Instruction'}),row = p.createCompactRowPart({children: [badge,body,actions]}),root = p.createScrollListPart({label: 'Pending messages',children: [p.createTextPart({role: 'section-title',text: 'Pending messages'}),row],hidden: false});
    const mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,root);let css = false,foreign = false;try {p.createRowTextPart({purpose: 'preview',text: 'Bad',lines: 3});} catch {css = true;}try {row.replace([{}]);} catch {foreign = true;}
    const result = {css,foreign,root: mount.firstElementChild!.localName,row: [...mount.querySelector('.pui-queued-message')!.children].map(node => node.localName),body: [...mount.querySelector('.pui-queued-message-content')!.children].map(node => node.localName),literal: mount.querySelectorAll('b').length,leaks: Object.values(root).some(value => value instanceof Node)};tree.destroy();return result;
  });expect(value).toEqual({css: true,foreign: true,root: 'section',row: ['span','div','div'],body: ['span','small'],literal: 0,leaks: false});
});
const scenarios: Record<string,State> = {mixed,empty: {...mixed,items: []},idle: {...mixed,running: false},busy: {...mixed,busy: true},many: {...mixed,items: Array.from({length: 18},(_,index) => ({id: 'row-'+index,text: 'A queued message '.repeat(12),mode: 'follow-up',imageCount: index%3}))}};
test('keyed snapshots preserve selected text, row identity, focused action and list scroll',async ({page}) => {

    await setup(page,scenarios.many);const value = await page.evaluate(() => {
      const h = window.pendingPartsHarness,list = document.querySelector<HTMLElement>('.pui-queued-messages')!,row = list.querySelector('.pui-queued-message')!,text = row.querySelector('.pui-queued-message-text')!.firstChild!,range = document.createRange();range.setStart(text,0);range.setEnd(text,8);getSelection()!.removeAllRanges();getSelection()!.addRange(range);list.scrollTop = 45;
      h.queue.update({...h.state,busy: false});const selection = getSelection()!.toString(),button = row.querySelector<HTMLButtonElement>('[aria-label="Edit pending message"]')!;button.focus();h.queue.update({...h.state,items: h.state.items.map((item,index) => index === h.state.items.length-1 ? {...item,text: 'Updated unrelated tail'} : item)});
      return {selection,same: row === list.querySelector('.pui-queued-message'),focus: document.activeElement === button,scroll: list.scrollTop};
    });expect(value).toEqual({selection: 'A queued',same: true,focus: true,scroll: 45});
});
test('steer/edit/delete report the current stable ID once and busy snapshots disable every existing action',async ({page}) => {

    await setup(page);const row = page.locator('.pui-queued-message').first();await row.getByRole('button',{name: 'Steer',exact: true}).click();await row.getByRole('button',{name: 'Edit pending message',exact: true}).click();await row.getByRole('button',{name: 'Delete pending message',exact: true}).click();expect(await page.evaluate(() => window.pendingPartsHarness.calls)).toEqual(['steer','edit','delete'].map(action => ({action,id: 'follow'})));
    await page.evaluate(() => {const h = window.pendingPartsHarness;h.queue.update({...h.state,busy: true});});expect(await page.locator('.pui-queued-message button').evaluateAll(nodes => nodes.every(node => (node as HTMLButtonElement).disabled))).toBe(true);
    await page.evaluate(() => {const h = window.pendingPartsHarness;h.queue.destroy();h.queue.update(h.state);});await expect(page.locator('.pui-queued-message')).toHaveCount(0);
});
