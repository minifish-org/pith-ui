import {test,expect,type Page} from '@playwright/test';

interface State {id: string;working: boolean;messages: Array<{id: string;role: string;text: string}>}
interface Reader {update(state: State): void;openFind(): void;closeFind(): void;followLatest(): void;prune(ids: readonly string[]): void;destroy(): void}
interface Harness {reader: Reader;state: State;tree: {destroy(): void};field?: Element;code?: Element;selection?: string}
declare global {interface Window {readerPartsHarness: Harness}}
const state: State = {id: 'reading',working: false,messages: Array.from({length: 50},(_,index) => ({id: 'message-'+index,role: index%2 ? 'assistant' : 'user',text: `Message ${index} retained 中文.\n\n${index === 3 ? 'Cross **node** match.\n\n' : ''}Line of reading history ${index}.\n\n${index === 7 ? '```text\n'+('long-code '.repeat(160))+'\n```' : 'Literal needle and NEEDLE.'}`}))};
async function setup(page: Page,old: boolean,appearance: 'light'|'dark' = 'light'): Promise<void> {
  await page.goto('/tests/fixture.html');await page.emulateMedia({colorScheme: appearance === 'light' ? 'dark' : 'light'});
  await page.evaluate(async ({old,state,appearance}) => {
    document.body.classList.remove('pui');const path = '/src/app/index.ts',{createApplication} = await import(path),mount = document.body.appendChild(document.createElement('div')),app = createApplication(mount,{appearance});app.workspace.updateNavigation({groups: [],empty: 'workspaces'});app.workspace.updateConversation(state);
    let reader: Reader,tree: {destroy(): void};
    if (old) {reader = {...app.workspace,prune: app.workspace.pruneConversations,destroy: app.destroy,update: app.workspace.updateConversation};tree = app;}
    else {
      // The untested composer is an inert clone used only to keep the actual
      // reading region's available height. Every tested reader node/controller
      // below comes from formal parts, and the old application is destroyed.
      const composer = mount.querySelector('.pui-composer-region')!.cloneNode(true);app.destroy();
      const recipePath = '/examples/assemblies/conversation-reader.ts',framePath = '/examples/assemblies/frame.ts',partsPath = '/src/parts/index.ts';
      const {composeConversationReader} = await import(recipePath),{composeFrame} = await import(framePath),p = await import(partsPath),local = composeConversationReader(state);
      const frame = composeFrame({navigation: {groups: [],empty: 'workspaces'}},{},{main: [local.find,local.region],siblings: [local.announcement]});tree = p.mountParts(mount,frame.part,{appearance});mount.querySelector('main')!.append(composer);reader = local;
    }
    window.readerPartsHarness = {reader,state,tree};
  },{old,state,appearance});
  await page.waitForTimeout(40);
}
async function presentation(page: Page): Promise<unknown> {
  return page.evaluate(async () => {
    await document.fonts.ready;const root = document.querySelector('.pui-conversation-find')!,origin = root.getBoundingClientRect();
    const inspect = (node: Element) => {const box = node.getBoundingClientRect(),style = getComputedStyle(node);return {tag: node.localName,text: node instanceof HTMLInputElement ? node.value : node.textContent,
      box: [box.x-origin.x,box.y-origin.y,box.width,box.height].map(value => Math.round(value*100)/100),hidden: node.hasAttribute('hidden'),
      styles: ['display','position','font-family','font-size','font-weight','line-height','color','background-color','padding-top','padding-right','padding-bottom','padding-left','border-top-width','border-top-color','border-radius','gap','min-width','max-width','min-height','overflow-y','box-shadow'].map(key => style.getPropertyValue(key)),
      ...(node instanceof HTMLInputElement ? {type: node.type,label: node.getAttribute('aria-label'),placeholder: node.placeholder,autocomplete: node.autocomplete} : {}),
      ...(node instanceof HTMLButtonElement ? {disabled: node.disabled,label: node.getAttribute('aria-label'),title: node.title} : {})};};
    return {bar: inspect(root),nodes: [...root.querySelectorAll('input,span,button')].map(inspect),region: [...document.querySelector('.pui-conversation-region')!.children].map(node => ({...inspect(node),text: node.localName === 'section' ? '' : node.textContent})),svg: [...root.querySelectorAll('svg')].map(node => node.innerHTML)};
  });
}

test('reading viewport is one native section with genuine content and bounded data-only search state',async ({page}) => {
  await page.goto('/tests/fixture.html');const value = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path),body = p.createReadingColumnPart({children: [p.createReadingNotePart({key: 'one',text: 'Literal needle text'})]}),states: unknown[] = [];
    let foreign = false,css = false;try {p.createReadingViewportPart({reading: {},children: []});} catch {foreign = true;}
    try {p.createReadingViewportPart({reading: body,children: [body],followDistance: 100});} catch {css = true;}
    const viewport = p.createReadingViewportPart({reading: body,children: [body],onSearchState(state: unknown) {states.push(state);}}),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,viewport);
    viewport.beforeUpdate('one');viewport.afterUpdate();viewport.openSearch('needle');
    const result = {foreign,css,tag: mount.firstElementChild!.localName,children: [...mount.firstElementChild!.children].map(node => node.localName),marks: mount.querySelectorAll('mark').length,state: states.at(-1),leaks: Object.values(viewport).some(value => value instanceof Node)};
    tree.destroy();let quiet = true;try {viewport.openSearch('late');viewport.search('late');viewport.beforeUpdate('late');viewport.afterUpdate();viewport.moveMatch('next');viewport.closeSearch();viewport.followLatest();viewport.prune([]);} catch {quiet = false;}return {...result,quiet};
  });expect(value).toEqual({foreign: true,css: true,tag: 'section',children: ['div'],marks: 1,state: {open: true,query: 'needle',current: 0,total: 1,label: '1 / 1'},leaks: false,quiet: true});
});
test('search inputs report only next or previous Enter intent and preserve native Enter without a callback',async ({page}) => {
  await page.goto('/tests/fixture.html');const value = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path),calls: string[] = [];
    const field = p.createInputPart({kind: 'search',label: 'Literal search',onEnter(direction: string) {calls.push(direction);}}),plain = p.createInputPart({label: 'Plain input'}),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,p.createStackPart({children: [field,plain]}));
    const [input,ordinary] = [...mount.querySelectorAll('input')];
    const event = (options: KeyboardEventInit = {}) => new KeyboardEvent('keydown',{key: 'Enter',bubbles: true,cancelable: true,...options});
    const next = event(),previous = event({shiftKey: true}),composing = event({isComposing: true}),native = event();input!.dispatchEvent(next);input!.dispatchEvent(previous);input!.dispatchEvent(composing);ordinary!.dispatchEvent(native);
    const result = {calls,cancelled: [next.defaultPrevented,previous.defaultPrevented,composing.defaultPrevented,native.defaultPrevented]};tree.destroy();return result;
  });expect(value).toEqual({calls: ['next','previous'],cancelled: [true,true,false,false]});
});
for (const appearance of ['light','dark'] as const) for (const width of [1280,390]) test(`${appearance} ${width} reader toolbar and latest action preserve actual layout and styles`,async ({page}) => {
  await page.setViewportSize({width,height: 800});await setup(page,true,appearance);await page.evaluate(() => window.readerPartsHarness.reader.openFind());const before = await presentation(page);
  await setup(page,false,appearance);await page.evaluate(() => window.readerPartsHarness.reader.openFind());expect(await presentation(page)).toEqual(before);
});

test('literal multilingual search crosses text nodes, cycles matches and preserves native keyboard focus',async ({page}) => {
  for (const old of [true,false]) {
    await setup(page,old);await page.keyboard.press('ControlOrMeta+f');const field = page.getByRole('searchbox',{name: 'Find in this conversation',exact: true});await expect(field).toBeFocused();
    await field.fill('Cross node');await expect(page.locator('[data-find-count]')).toHaveText('1 / 1');await expect(page.locator('mark[data-find-match]')).toHaveCount(2);
    await field.fill('中文');await expect(page.locator('[data-find-count]')).toHaveText('1 / 50');await page.keyboard.press('Enter');await expect(page.locator('[data-find-count]')).toHaveText('2 / 50');await page.keyboard.press('Shift+Enter');await expect(page.locator('[data-find-count]')).toHaveText('1 / 50');
    await page.getByRole('button',{name: 'Previous match',exact: true}).click();await expect(page.locator('[data-find-count]')).toHaveText('50 / 50');await page.getByRole('button',{name: 'Next match',exact: true}).click();await expect(page.locator('[data-find-count]')).toHaveText('1 / 50');
    await field.fill('[not a regex]');await expect(page.locator('[data-find-count]')).toHaveText('No matches');await expect(page.getByRole('button',{name: 'Next match',exact: true})).toBeDisabled();
    await page.keyboard.press('Escape');await expect(page.locator('.pui-conversation-find')).toBeHidden();await expect(page.locator('.pui-chat-scroll')).toBeFocused();await expect(page.locator('mark')).toHaveCount(0);
  }
});

test('streamed content invalidates current search matches without replacing selected unchanged messages or code scroll',async ({page}) => {
  for (const old of [true,false]) {
    await setup(page,old);await page.evaluate(() => window.readerPartsHarness.reader.openFind());const field = page.getByRole('searchbox',{name: 'Find in this conversation',exact: true});await field.fill('new appended');await expect(page.locator('[data-find-count]')).toHaveText('No matches');
    await page.evaluate(() => {const h = window.readerPartsHarness;h.code = document.querySelector('.pui-code-block pre')!;h.code.scrollLeft = 23;h.reader.update({...h.state,messages: h.state.messages.map(message => message.id === 'message-49' ? {...message,text: message.text+' new appended 中文'} : message)});});
    await expect(page.locator('[data-find-count]')).toHaveText('1 / 1');expect(await page.evaluate(() => ({same: window.readerPartsHarness.code === document.querySelector('.pui-code-block pre'),scroll: (window.readerPartsHarness.code as HTMLElement).scrollLeft}))).toEqual({same: true,scroll: 23});
    await page.evaluate(() => window.readerPartsHarness.reader.closeFind());
    await page.evaluate(() => {const h = window.readerPartsHarness,text = document.querySelector('.pui-user-text')!.firstChild!,range = document.createRange();range.setStart(text,0);range.setEnd(text,7);getSelection()!.removeAllRanges();getSelection()!.addRange(range);h.reader.update({...h.state,messages: h.state.messages.map(message => message.id === 'message-49' ? {...message,text: message.text+' Other streamed suffix'} : message)});});expect(await page.evaluate(() => getSelection()!.toString())).toBe('Message');
  }
});

test('manual reading keeps its anchor through appends and conversation switches while latest-follow remains explicit',async ({page}) => {
  for (const old of [true,false]) {
    await setup(page,old);const scroll = page.locator('.pui-chat-scroll');await scroll.evaluate(node => {node.scrollTop = 550;node.dispatchEvent(new Event('scroll'));});await expect(page.getByRole('button',{name: 'Back to latest',exact: true})).toBeVisible();
    const before = await scroll.evaluate(node => node.scrollTop);await page.evaluate(() => {const h = window.readerPartsHarness;h.reader.update({...h.state,messages: [...h.state.messages,{id: 'more',role: 'assistant',text: 'Appended history'}]});});await page.waitForTimeout(40);expect(await scroll.evaluate(node => node.scrollTop)).toBe(before);
    await page.evaluate(() => window.readerPartsHarness.reader.update({id: 'other',messages: [{id: 'other-message',role: 'assistant',text: 'Another conversation'}],working: false}));await page.waitForTimeout(40);await page.evaluate(() => {const h = window.readerPartsHarness;h.reader.update(h.state);});await page.waitForTimeout(40);expect(await scroll.evaluate(node => node.scrollTop)).toBe(before);
    await page.getByRole('button',{name: 'Back to latest',exact: true}).click();await expect(page.getByRole('button',{name: 'Back to latest',exact: true})).toBeHidden();await page.evaluate(() => {const h = window.readerPartsHarness;h.reader.update({...h.state,messages: [...h.state.messages,{id: 'new-last',role: 'assistant',text: 'New final response'}]});});await page.waitForTimeout(40);expect(await scroll.evaluate(node => node.scrollHeight-node.scrollTop-node.clientHeight)).toBeLessThan(2);
  }
});

test('an open modal blocks reader keyboard shortcuts and parent disposal makes direct methods terminal',async ({page}) => {
  for (const old of [true,false]) {
    await setup(page,old);await page.evaluate(() => {const dialog = document.querySelector('.pui-app')!.appendChild(document.createElement('dialog'));dialog.textContent = 'Modal boundary';dialog.showModal();});await page.keyboard.press('ControlOrMeta+f');await expect(page.locator('.pui-conversation-find')).toBeHidden();
    await page.evaluate(() => {document.querySelector('dialog[open]')!.remove();window.readerPartsHarness.tree.destroy();});const quiet = await page.evaluate(() => {const {reader,state} = window.readerPartsHarness;try {reader.openFind();reader.closeFind();reader.followLatest();reader.update(state);reader.prune([]);reader.destroy();return true;} catch {return false;}});expect(quiet).toBe(true);await expect(page.locator('.pui-conversation-find')).toHaveCount(0);
  }
});
