import {test,expect,type Page} from '@playwright/test';

interface Message {id: string;role: string;text: string;toolName?: string;toolCallId?: string;status?: string;command?: {text: string;cwd: string;exitCode?: number}}
interface State {id: string;messages: Message[];working: boolean}
interface Handle {update(state: State): void;destroy(): void}
declare global {interface Window {toolPartsHarness: {body: Handle;state: State;retained?: Element;output?: Element}}}
const tool = (id: string,toolName = 'read_file',status = 'done',command = false): Message => ({id,role: 'tool',toolName,toolCallId: 'call-'+id,status,text: 'Literal <b>tool output</b> 中文\n'+('result line\n'.repeat(35)),...(command ? {command: {text: 'printf "literal <tag> 中文"\nls -la',cwd: '/workspace/中文 project',exitCode: status === 'error' ? 7 : status === 'done' ? 0 : undefined}} : {})});
const scenarios: Record<string,Message[]> = {
  result: [tool('read')],unknown: [tool('unknown','unknown_tool','custom')],command: [tool('cmd','run_command','done',true)],
  running: [tool('run','run_command','running',true)],error: [tool('failed','run_command','error',true)],
  exploration: [tool('list','list_files'),tool('read'),tool('grep','grep')],
  mixed: [tool('list','list_files'),tool('cmd','run_command','running',true),tool('fail','write_file','error')],
  commands: [tool('cmd1','run_command','done',true),tool('cmd2','run_command','error',true)],
  separated: [tool('before'),{id: 'assistant',role: 'assistant',text: 'Between tool groups.'},tool('after','codemode')],
};
async function setup(page: Page,old: boolean,messages: Message[] = scenarios.mixed!,appearance: 'light'|'dark' = 'light',expanded = true): Promise<void> {
  await page.goto('/tests/fixture.html');await page.emulateMedia({colorScheme: appearance === 'light' ? 'dark' : 'light'});
  await page.evaluate(async ({old,messages,appearance,expanded}) => {
    document.body.classList.remove('pui');
    const appPath = '/src/app/index.ts',{createApplication} = await import(appPath),mount = document.body.appendChild(document.createElement('div'));
    const app = createApplication(mount,{appearance}),state: State = {id: 'tools',messages,working: false};app.workspace.updateConversation(state);
    let body: Handle;
    if (old) body = {update: app.workspace.updateConversation,destroy: app.destroy};
    else {const recipePath = '/examples/assemblies/conversation-body.ts',partsPath = '/src/parts/index.ts',{composeConversationBody} = await import(recipePath),p = await import(partsPath);const composition = composeConversationBody(state);p.mountParts(mount.querySelector('.pui-chat-scroll'),composition.part,{appearance});body = composition;}
    if (expanded) for (const details of mount.querySelectorAll<HTMLDetailsElement>('.pui-messages details')) details.open = true;
    window.toolPartsHarness = {body,state};
  },{old,messages,appearance,expanded});
  await page.mouse.move(0,0);
}
async function presentation(page: Page): Promise<unknown> {
  return page.evaluate(async () => {
    await document.fonts.ready;
    const root = document.querySelector('.pui-messages')!,origin = root.getBoundingClientRect();
    const inspect = (node: Element) => {const rect = node.getBoundingClientRect(),style = getComputedStyle(node);return {
      tag: node.localName,text: [...node.childNodes].filter(child => child.nodeType === Node.TEXT_NODE).map(child => child.textContent).join('').trim(),
      box: [rect.x-origin.x,rect.y-origin.y,rect.width,rect.height].map(value => Math.round(value*100)/100),
      styles: ['display','font-family','font-size','font-weight','line-height','color','background-color','margin-top','margin-bottom','margin-left','padding-top','padding-right','padding-bottom','padding-left','border-top-width','border-top-color','border-radius','gap','white-space','overflow-wrap','overflow-x','overflow-y','max-height','min-height','flex-shrink','align-items','transform'].map(key => style.getPropertyValue(key)),
      ...(node instanceof HTMLDetailsElement ? {open: node.open,fold: node.dataset.toolFold,reading: node.dataset.readingId} : {}),
    };};
    return {nodes: [...root.querySelectorAll('*')].filter(node => !node.closest('svg') && !node.closest('[hidden]') && !node.closest('.pui-sr-only')).map(inspect),svg: [...root.querySelectorAll('svg')].map(node => node.innerHTML),text: root.textContent};
  });
}

test('compound disclosure transfers summary and content parts without extra wrappers or presentation ports',async ({page}) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path),summary = p.createTextPart({text: 'Caller summary'}),body = p.createTextPart({text: 'Literal <img> body'});
    let duplicate = false,css = false,foreign = false;
    try {p.createCompoundDisclosurePart({purpose: 'result',summary: [summary],children: [summary]});} catch {duplicate = true;}
    const disclosure = p.createCompoundDisclosurePart({purpose: 'result',foldKey: 'result-key',readingKey: 'm1',summary: [summary],children: [body],open: true});
    const mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,disclosure),before = mount.querySelector('summary')!.firstChild;
    try {disclosure.replaceSummary([body]);} catch {foreign = true;}
    try {p.createCompoundDisclosurePart({purpose: 'result',summary: [],children: [],style: {padding: '2px'}});} catch {css = true;}
    const result = {duplicate,css,foreign,same: before === mount.querySelector('summary')!.firstChild,tag: mount.firstElementChild!.localName,children: [...mount.firstElementChild!.children].map(child => child.localName),open: disclosure.isOpen(),literal: mount.querySelectorAll('img').length,leaks: Object.values(disclosure).some(value => value instanceof Node)};
    tree.destroy();return result;
  });
  expect(result).toEqual({duplicate: true,css: true,foreign: true,same: true,tag: 'details',children: ['summary','span'],open: true,literal: 0,leaks: false});
});

for (const appearance of ['light','dark'] as const) for (const [name,messages] of Object.entries(scenarios)) test(`${appearance} ${name} tool assembly matches actual group, command and result presentation`,async ({page}) => {
  await setup(page,true,messages,appearance);const before = await presentation(page);await setup(page,false,messages,appearance);expect(await presentation(page)).toEqual(before);
});
for (const expanded of [false,true]) for (const width of [390,900]) test(`${width} tool groups preserve wrapping and native ${expanded ? 'open' : 'closed'} disclosure layout`,async ({page}) => {
  await page.setViewportSize({width,height: 568});await setup(page,true,scenarios.mixed,'light',expanded);const before = await presentation(page);await setup(page,false,scenarios.mixed,'light',expanded);expect(await presentation(page)).toEqual(before);
});

test('group growth and prepended history retain native disclosure state, literal selection and output scroll',async ({page}) => {
  for (const old of [true,false]) {
    await setup(page,old,[tool('a'),tool('b','run_command','running',true)]);
    const result = await page.evaluate(() => {
      const h = window.toolPartsHarness,group = document.querySelector<HTMLDetailsElement>('.pui-tool-group')!,entry = document.querySelector<HTMLDetailsElement>('[data-reading-id=a]')!,output = entry.querySelector('pre')!;
      const range = document.createRange();range.setStart(output.firstChild!,0);range.setEnd(output.firstChild!,7);getSelection()!.removeAllRanges();getSelection()!.addRange(range);output.scrollTop = 55;
      const next: State = {...h.state,messages: [toolLocal('history'),...h.state.messages.map(message => message.id === 'b' ? {...message,status: 'done',text: message.text+'Streamed suffix'} : message),toolLocal('c')]};
      h.body.update(next);
      const preserved = {group: document.querySelector('.pui-tool-group') === group,entry: document.querySelector('[data-reading-id=a]') === entry,open: group.open && entry.open,selection: getSelection()!.toString(),output: entry.querySelector('pre') === output,scroll: output.scrollTop,fold: group.dataset.toolFold,calls: group.querySelector('.pui-tool-group-count')!.textContent};
      group.open = false;h.body.update({...next,messages: next.messages.map(message => message.id === 'c' ? {...message,status: 'error'} : message)});
      return {...preserved,closedRetained: !group.open};
      function toolLocal(id: string): Message {return {id,role: 'tool',toolName: 'read_file',status: 'done',text: 'New result'};}
    });
    expect(result).toEqual({group: true,entry: true,open: true,selection: 'Literal',output: true,scroll: 55,fold: 'group-a',calls: '4 calls',closedRetained: true});
  }
});

test('overlapping group identity never gives a new group the still-owned retained key',async ({page}) => {
  for (const old of [true,false]) {
    await setup(page,old,[tool('a'),tool('b')]);
    const result = await page.evaluate(() => {
      const h = window.toolPartsHarness,original = document.querySelector<HTMLDetailsElement>('.pui-tool-group')!;
      h.body.update({...h.state,messages: [h.state.messages[1]!]});
      h.body.update({...h.state,messages: [h.state.messages[1]!,{id: 'separator',role: 'assistant',text: 'Separate'},h.state.messages[0]!]});
      const groups = [...document.querySelectorAll<HTMLDetailsElement>('.pui-tool-group')];return {retained: groups[0] === original,keys: groups.map(node => node.dataset.toolFold),open: groups.map(node => node.open)};
    });
    expect(result).toEqual({retained: true,keys: ['group-a','group-a-2'],open: [true,false]});
  }
});
