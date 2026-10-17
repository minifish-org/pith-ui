import {test,expect,type Page} from '@playwright/test';

interface Message {id: string;role: string;text: string;timestamp?: number;status?: string;actions?: {copy?: boolean|string;edit?: boolean;branch?: {key: string;label?: string}}}
interface State {id: string;messages: Message[];working: boolean}
interface BodyHandle {readonly part?: unknown;update(state: State): void;updateAvailability(state: {copy?: boolean;edit?: boolean;branch?: boolean}): void;destroy(): void}
declare global {interface Window {bodyPartsHarness: {body: BodyHandle;initial: State;actions: unknown[];copy: string[];selected?: Element;button?: Element}}}
const mixed: State = {id: 'chat',working: false,messages: [
  {id: 'user',role: 'user',text: 'Preserved literal 中文 <b>text</b>\nSecond line.',timestamp: 1792200000000,actions: {copy: true,edit: true,branch: {key: 'branch-user'}}},
  {id: 'agent',role: 'assistant',text: '# Result\n\nPreserved streaming prefix 中文.\n\n- First\n- **Second**\n\n> A quote.\n\n| Key | Value |\n|---|---|\n|a|b|\n\n```ts\nconst answer = 42;\n```',timestamp: 1792200001000,actions: {copy: 'Copy answer',branch: {key: 'branch-agent',label: 'Continue from answer'}}},
  {id: 'system',role: 'system',text: 'Context was summarized.'},
]};
async function openBody(page: Page,old: boolean,state = mixed,appearance: 'light'|'dark' = 'light'): Promise<void> {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async ({old,state,appearance}) => {
    // Desk has one HTML appearance scope. The generic fixture's BODY scope
    // would otherwise follow OS appearance and mask createApplication's mode.
    document.body.classList.remove('pui');
    const path = '/src/app/index.ts'; const {createApplication} = await import(path);
    const mount = document.body.appendChild(document.createElement('div'));
    const h = {initial: state,actions: [],copy: []} as unknown as Window['bodyPartsHarness'];
    const callbacks = {onMessageAction(value: unknown) {h.actions.push(value);return {ok: true};},onCopyCode(value: string) {h.copy.push(value);return {ok: true};}};
    const app = createApplication(mount,{appearance,workspace: callbacks}); app.workspace.updateConversation(state);
    if (old) h.body = {update: app.workspace.updateConversation,updateAvailability: app.workspace.updateMessageAvailability,destroy: app.destroy};
    else {const path = '/examples/assemblies/conversation-body.ts',partsPath = '/src/parts/index.ts'; const {composeConversationBody} = await import(path),parts = await import(partsPath);
      h.body = composeConversationBody(state,callbacks); parts.mountParts(mount.querySelector<HTMLElement>('.pui-chat-scroll')!,h.body.part,{appearance});}
    window.bodyPartsHarness = h;
  },{old,state,appearance});
}
async function presentation(page: Page): Promise<unknown> {
  return page.evaluate(async () => {
    await document.fonts.ready;
    const root = document.querySelector('.pui-messages')!,origin = root.getBoundingClientRect();
    const inspect = (node: Element) => {const box = node.getBoundingClientRect(),style = getComputedStyle(node); return {
      tag: node.localName,text: [...node.childNodes].filter(child => child.nodeType === Node.TEXT_NODE).map(child => child.textContent).join('').trim(),
      box: [box.x-origin.x,box.y-origin.y,box.width,box.height].map(value => Math.round(value*100)/100),
      styles: ['display','font-family','font-size','font-weight','line-height','color','background-color','margin-top','margin-bottom','padding-top','padding-right','padding-bottom','padding-left','border-top-width','border-top-color','border-radius','gap','white-space','overflow-wrap','max-width','flex','align-items'].map(key => style.getPropertyValue(key)),
      ...(node instanceof HTMLButtonElement ? {label: node.getAttribute('aria-label'),title: node.title,disabled: node.disabled,type: node.type} : {}),
      ...(node instanceof HTMLTimeElement ? {date: node.dateTime,title: node.title} : {}),
    };};
    const nodes = [...root.querySelectorAll('*')].filter(node => !node.closest('[hidden]') && !node.closest('.pui-sr-only') && !node.closest('svg') && !node.closest('.pui-working-dots'));
    return {root: inspect(root),children: [...root.children].map(node => node.localName),nodes: nodes.map(inspect),svg: [...root.querySelectorAll('svg')].map(svg => svg.innerHTML)};
  });
}
test('literal text update preserves the selected unchanged prefix without inserting a text wrapper',async ({page}) => {
  await page.goto('/tests/fixture.html');
  const value = await page.evaluate(async () => {
    const path = '/src/parts/index.ts'; const p = await import(path),text = p.createTextPart({text: 'Preserved prefix'}),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,text);
    const span = mount.querySelector('span')!,original = span.firstChild!,selection = getSelection()!,range = document.createRange(); range.setStart(original,0);range.setEnd(original,9);selection.removeAllRanges();selection.addRange(range);
    text.update({text: 'Preserved prefix appended 中文'}); const result = {selection: selection.toString(),same: span.firstChild === original,children: span.childNodes.length}; tree.destroy(); return result;
  });
  expect(value).toEqual({selection: 'Preserved',same: true,children: 1});
});
test('reading column and bubbles compose content independently from timestamps and footer actions',async ({page}) => {
  await page.goto('/tests/fixture.html');
  const value = await page.evaluate(async () => {
    const path = '/src/parts/index.ts'; const p = await import(path);
    const text = p.createTextPart({role: 'bubble',text: 'Literal <img>'}),time = p.createTimestampPart({value: 1792200000000}),button = p.createButtonPart({variant: 'quiet-icon',label: 'Edit message',icon: 'edit'});
    const actions = p.createMessageActionsPart({children: [button]}),footer = p.createMessageFooterPart({children: [time,actions]}),bubble = p.createBubblePart({key: 'm1',speaker: 'self',children: [text,footer]});
    const note = p.createReadingNotePart({key: 'system',text: 'Context note'}),working = p.createWorkingIndicatorPart({label: 'Working…'}),root = p.createReadingColumnPart({children: [bubble,note,working]});
    const mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,root);
    const result = {children: [...mount.querySelector('.pui-messages')!.children].map(node => node.localName),body: [...mount.querySelector('.pui-message-content')!.children].map(node => node.localName),dots: mount.querySelectorAll('.pui-working-dots i').length,
      leaked: [text,time,bubble,note,working].some(part => Object.values(part).some(value => value instanceof Node)),literal: mount.querySelectorAll('img').length}; tree.destroy(); return result;
  });
  expect(value).toEqual({children: ['article','div','div'],body: ['div','div'],dots: 3,leaked: false,literal: 0});
});
const scenarios: Record<string,State> = {mixed,empty: {id: 'empty',messages: [],working: false},interrupted: {...mixed,messages: [{id: 'agent',role: 'assistant',text: 'Partial response',status: 'error'}]},working: {...mixed,working: true},unsafe: {...mixed,messages: [{id: 'u',role: 'user',text: '<img onerror=alert(1)>\n<script>bad()</script>'},{id: 'a',role: 'assistant',text: '<script>bad()</script>\n\n[unsafe](javascript:alert(1))\n\n**Literal response**'}]}};
for (const appearance of ['light','dark'] as const) for (const [name,state] of Object.entries(scenarios)) test(`${appearance} conversation body ${name} preserves the actual message presentation`,async ({page}) => {
  await page.emulateMedia({colorScheme: appearance === 'light' ? 'dark' : 'light'}); await openBody(page,true,state,appearance); const old = await presentation(page);
  expect(await page.locator('.pui-messages').evaluate(node => getComputedStyle(node).color)).toBe(appearance === 'light' ? 'rgb(31, 37, 48)' : 'rgb(240, 241, 243)');
  await openBody(page,false,state,appearance); expect(await presentation(page)).toEqual(old);
});
for (const viewport of [{width: 390,height: 844},{width: 900,height: 568}]) test(`conversation body ${viewport.width} preserves reading width and wrapping`,async ({page}) => {
  await page.setViewportSize(viewport); await openBody(page,true);const old = await presentation(page); await openBody(page,false);expect(await presentation(page)).toEqual(old);
});
test('streaming updates retain selected text, code scroll, keyed message and action focus',async ({page}) => {
  for (const old of [true,false]) {
    const streaming = {...mixed,messages: mixed.messages.map(message => message.id === 'agent' ? {...message,text: message.text.replace('const answer = 42;','const answer = 42;'.repeat(160))} : message)};
    await openBody(page,old,streaming); const value = await page.evaluate(() => {
      const h = window.bodyPartsHarness,root = document.querySelector('.pui-messages')!,body = root.querySelector('.pui-user-text')!,text = body.firstChild!,selection = getSelection()!,range = document.createRange(); range.setStart(text,0);range.setEnd(text,9);selection.removeAllRanges();selection.addRange(range);
      const action = root.querySelector<HTMLButtonElement>('[aria-label="Edit message"]')!; const code = root.querySelector('pre')!;code.scrollLeft = 17;
      const next = {...h.initial,messages: h.initial.messages.map(message => message.id === 'user' ? {...message,text: message.text+'\nAdded suffix'} : message.id === 'agent' ? {...message,text: message.text+'\nStreaming addition'} : message)};
      h.body.update(next); const preserved = selection.toString();
      // Native WebKit button.focus() clears a content selection before any
      // render. Verify selection and focused-action retention independently.
      action.focus(); h.body.update({...next,messages: next.messages.map(message => message.id === 'system' ? {...message,text: 'Updated context note'} : message)});
      return {selection: preserved,same: body === root.querySelector('.pui-user-text'),focus: action === document.activeElement,code: code === root.querySelector('pre'),scroll: code.scrollLeft};
    });
    expect(value).toEqual({selection: 'Preserved',same: true,focus: true,code: true,scroll: 17});
  }
});
test('message actions keep stable frozen targets and independent availability',async ({page}) => {
  await openBody(page,false);await page.getByRole('button',{name: 'Edit message',exact: true}).click();await page.getByRole('button',{name: 'Continue from answer',exact: true}).click();
  expect(await page.evaluate(() => window.bodyPartsHarness.actions)).toEqual([{action: 'edit',messageId: 'user'},{action: 'branch',messageId: 'agent',branchKey: 'branch-agent'}]);
  await page.evaluate(() => window.bodyPartsHarness.body.updateAvailability({edit: true,branch: true}));await expect(page.getByRole('button',{name: 'Edit message',exact: true})).toBeDisabled();await expect(page.getByRole('button',{name: 'Continue from answer',exact: true})).toBeDisabled();await expect(page.getByRole('button',{name: 'Copy answer',exact: true})).toBeEnabled();
});
