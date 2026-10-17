import {expect,test,type Page} from '@playwright/test';

interface WelcomeState {workspace?: {name: string;path: string};hasApiKey: boolean;hasConnections: boolean;modelName: string;hidden?: boolean}
interface WelcomeHarness {update(state: WelcomeState): void;setUnavailable(value: boolean): void;events: string[];destroy(): void;retained?: {mark: Element;action: Element}}
declare global {interface Window {welcomePartsHarness: WelcomeHarness}}
const initial: WelcomeState = {hasApiKey: false,hasConnections: false,modelName: ''};
const ready: WelcomeState = {workspace: {name: 'Original project',path: '/original/project'},hasApiKey: true,hasConnections: true,modelName: 'Original model'};

async function openWelcome(page: Page,old: boolean,state: WelcomeState = initial,appearance: 'light'|'dark' = 'light'): Promise<void> {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async ({old,state,appearance}) => {
    document.documentElement.className = 'pui';document.documentElement.dataset.appearance = appearance;document.body.dataset.appearance = appearance;
    const mount = document.body.appendChild(document.createElement('div')),events: string[] = [];
    if (old) {
      const path = '/src/app/index.ts',{createApplication} = await import(path),app = createApplication(mount,{appearance,brand: {name: 'Pith',qualifier: 'Desk',mark: {symbol: 'pith',alt: ''}},workspace: {onAction(action: string) {events.push('action:'+action);},onInput(text: string) {events.push('input:'+text);}}});
      app.workspace.updateWelcome(state);app.workspace.updateConversation({id: '',working: false,messages: []});
      window.welcomePartsHarness = {events,update: app.workspace.updateWelcome,setUnavailable(value) {app.workspace.updateComposer({disabled: value});},destroy: app.destroy};
    } else {
      const partsPath = '/src/parts/index.ts',recipePath = '/examples/assemblies/welcome.ts',framePath = '/examples/assemblies/frame.ts',p = await import(partsPath),{composeWelcome} = await import(recipePath),{mountFrame} = await import(framePath);
      let unavailable = false;const input = p.createTextareaPart({purpose: 'message',label: 'Message Pith'});
      const welcome = composeWelcome(state,{onAction(action: string) {events.push('action:'+action);},canPrompt: () => !unavailable,onPrompt(text: string) {input.reset(text);events.push('input:'+text);input.focus();}});
      const reading = p.createReadingColumnPart({children: [],hidden: true}),viewport = p.createReadingViewportPart({reading,children: [welcome.part,reading]}),region = p.createReadingRegionPart({children: [viewport]});
      const frame = mountFrame(mount,{navigation: {groups: [],empty: 'workspaces'}},{},{appearance},{main: [region,input]});
      window.welcomePartsHarness = {events,update: welcome.update,setUnavailable(value) {unavailable = value;},destroy() {frame.destroy();}};
    }
  },{old,state,appearance});
  await expect(page.locator('.pui-welcome')).toBeVisible();
}

async function presentation(page: Page): Promise<unknown> {
  return page.locator('.pui-welcome').evaluate(async node => {
    await document.fonts.ready;const origin = node.getBoundingClientRect();
    const inspect = (element: Element) => {const box = element.getBoundingClientRect(),style = getComputedStyle(element);return {tag: element.localName,
      text: [...element.childNodes].filter(child => child.nodeType === Node.TEXT_NODE).map(child => child.textContent).join('').trim(),
      box: [box.x-origin.x,box.y-origin.y,box.width,box.height].map(value => Math.round(value*100)/100),
      styles: ['display','font-family','font-size','font-weight','line-height','color','background-color','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-bottom','border-top-width','border-top-color','border-bottom-width','border-radius','gap','width','height','max-width','text-align','white-space','overflow-x','overflow-y','text-overflow','transform','opacity'].map(key => style.getPropertyValue(key)),
      ...(element instanceof HTMLButtonElement ? {disabled: element.disabled,label: element.getAttribute('aria-label'),title: element.getAttribute('title')} : {})};};
    return {origin: [origin.x,origin.y,origin.width,origin.height].map(value => Math.round(value*100)/100),nodes: [node,...node.querySelectorAll('div,p,h1,span,strong,small,button,i,br')].filter(element => !element.closest('[hidden]')).map(inspect),svg: [...node.querySelectorAll('svg')].map(svg => svg.innerHTML),text: node.textContent?.replace(/\s+/g,' ').trim()};
  });
}

test('introduction pieces own the original useful native nodes and accept no presentation escapes',async ({page}) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path);let clicked = 0,disposed = 0;
    const mark = p.createBrandMarkPart({symbol: 'pith',alt: ''}),tile = p.createBrandTilePart({mark});
    const step = p.createStepActionPart({step: '1',completed: false,label: 'Connect',description: 'Your provider',onAction() {clicked++;}});
    const group = p.createStepGroupPart({title: 'Make yourself at home',summary: 'Two quick steps',children: [step]});
    const lead = p.createResponsiveLeadPart({lines: ['First line',' second line']}),inline = p.createTextFlowPart({role: 'inline',segments: [{text: 'Working in '},{text: 'Original',emphasis: 'strong'}]});
    const line = p.createContextLinePart({children: [p.createIconPart({name: 'folder'}),inline,p.createButtonPart({label: 'Change',variant: 'secondary'})]});
    const suggestion = p.createButtonPart({variant: 'suggestion',icon: 'file',label: 'Explore'}),suggestions = p.createSuggestionGroupPart({children: [suggestion]}),note = p.createIconNotePart({icon: 'shield',text: 'Local workspace.'});
    const center = p.createCenteredContentPart({children: [tile,p.createTextPart({role: 'eyebrow-paragraph',text: 'YOUR LOCAL WORK COMPANION'}),p.createTextPart({role: 'display-heading',text: 'Original heading'}),lead,group,line,suggestions,note],onDispose() {disposed++;}}),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,center);
    const node = mount.firstElementChild!,button = mount.querySelector('.pui-setup-step')!; (button as HTMLButtonElement).click();
    const shape = {root: node.localName,step: [...button.children].map(node => node.localName),caption: [...button.children[1].children].map(node => node.localName),lead: [...mount.querySelector('.pui-welcome-description')!.childNodes].map(node => node.nodeType === Node.TEXT_NODE ? '#text' : (node as Element).localName),inline: [...mount.querySelector('.pui-welcome-workspace')!.children].map(node => node.localName),clicked};
    const rejects = (operation: () => unknown) => {try {operation();return false;} catch {return true;}};
    const bad = [rejects(() => step.update({step: '1',completed: 'yes',label: 'Invalid',description: ''})),rejects(() => p.createCenteredContentPart({children: [],width: 800})),rejects(() => p.createIconNotePart({icon: 'custom',text: 'Invalid'})),rejects(() => p.createStepGroupPart({title: 'Invalid',summary: '',children: [suggestion]}))];
    const free = p.createStepActionPart({step: '2',completed: true,label: 'Reusable',description: 'Original'}),atomic = rejects(() => p.createStepGroupPart({title: 'Bad',summary: '',children: [free,{}]})),other = document.body.appendChild(document.createElement('div')),owned = p.mountParts(other,free),reusable = other.textContent === 'ReusableOriginal';owned.destroy();
    const leak = [center,tile,step,group,lead,line,suggestions,note].some(part => Object.values(part).some(value => value instanceof Node));tree.destroy();center.destroy();return {...shape,bad,atomic,reusable,leak,disposed,empty: !mount.firstChild};
  });
  expect(result).toEqual({root: 'div',step: ['span','span','svg'],caption: ['strong','small'],lead: ['#text','br','#text'],inline: ['svg','span','button'],clicked: 1,bad: [true,true,true,true],atomic: true,reusable: true,leak: false,disposed: 1,empty: true});
});

const scenarios: Array<[string,WelcomeState]> = [['setup',initial],['connected',{...initial,hasConnections: true}],['model-selected',{...initial,hasApiKey: true,hasConnections: true,modelName: 'Original model'}],['workspace-only',{...initial,workspace: ready.workspace}],['ready',ready],['long',{...ready,workspace: {name: '<Original unsafe> '+ 'long '.repeat(14),path: '/path/'.repeat(40)},modelName: 'Long model'}]];
for (const [name,state] of scenarios) for (const appearance of ['light','dark'] as const) for (const width of [1280,390]) test(`${name} ${appearance} ${width} welcome preserves the actual old application`,async ({page}) => {
  await page.setViewportSize({width,height: 1000});await openWelcome(page,true,state,appearance);const old = await presentation(page);await openWelcome(page,false,state,appearance);expect(await presentation(page)).toEqual(old);
});

test('setup actions follow current provider/workspace state without inventing a business write',async ({page}) => {
  for (const old of [true,false]) {
    await openWelcome(page,old);await page.getByRole('button',{name: '1 Connect a provider Bring your provider API key',exact: true}).click();
    await page.evaluate(() => window.welcomePartsHarness.update({hasApiKey: false,hasConnections: true,modelName: ''}));await page.getByRole('button',{name: '1 Choose a model Your provider connection is ready',exact: true}).click();await page.getByRole('button',{name: '2 Choose a workspace A folder Pith can help you work in',exact: true}).click();
    expect(await page.evaluate(() => window.welcomePartsHarness.events)).toEqual(['action:settings','action:model','action:workspace']);
  }
});

test('ready suggestions replace the draft once, focus it and respect current unavailability',async ({page}) => {
  const prompts = [
    ['Explore my workspace','Explore this workspace and give me a concise overview of its files.'],
    ['Think through a task','Help me plan a task. Start by asking what I want to accomplish.'],
    ['Create something',"I'd like help creating a document in this workspace. Ask me what it should cover."],
  ];
  for (const old of [true,false]) {
    await openWelcome(page,old,ready);const input = page.getByRole('textbox',{name: 'Message Pith',exact: true});
    await page.evaluate(() => window.welcomePartsHarness.setUnavailable(true));await page.getByRole('button',{name: prompts[0][0],exact: true}).click();await expect(input).toHaveValue('');expect(await page.evaluate(() => window.welcomePartsHarness.events)).toEqual([]);
    await page.evaluate(() => window.welcomePartsHarness.setUnavailable(false));
    for (const [label,prompt] of prompts) {await page.getByRole('button',{name: label,exact: true}).click();await expect(input).toHaveValue(prompt);await expect(input).toBeFocused();}
    expect(await page.evaluate(() => window.welcomePartsHarness.events)).toEqual(prompts.map(([,text]) => 'input:'+text));
    await page.getByRole('button',{name: 'Change',exact: true}).click();expect(await page.evaluate(() => window.welcomePartsHarness.events.at(-1))).toBe('action:workspace');
  }
});

test('welcome metadata keeps the focused action and original brand node',async ({page}) => {
  for (const old of [true,false]) {
    await openWelcome(page,old,ready);await page.getByRole('button',{name: 'Explore my workspace',exact: true}).focus();
    await page.evaluate(() => {const h = window.welcomePartsHarness;h.retained = {mark: document.querySelector('.pui-welcome-mark > *')!,action: document.activeElement!};h.update({workspace: {name: 'Renamed project',path: '/renamed/project'},hasApiKey: true,hasConnections: true,modelName: 'Updated model'});});
    expect(await page.evaluate(() => {const r = window.welcomePartsHarness.retained!;return {mark: document.querySelector('.pui-welcome-mark > *') === r.mark,focus: document.activeElement === r.action};})).toEqual({mark: true,focus: true});
    await expect(page.getByText('Renamed project',{exact: true})).toBeVisible();
  }
});

test('shared parent disposal retires welcome callbacks and quiets future snapshots',async ({page}) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async state => {
    const partsPath = '/src/parts/index.ts',recipePath = '/examples/assemblies/welcome.ts',p = await import(partsPath),{composeWelcome} = await import(recipePath);
    let resolve!: (value: {ok: false;error: string}) => void,errors = 0;
    const welcome = composeWelcome(state,{onAction() {return new Promise(done => {resolve = done;});},onError() {errors++;}}),root = p.createFramePart({children: [welcome.part]}),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,root);
    (mount.querySelector('.pui-setup-step') as HTMLButtonElement).click();tree.destroy();resolve({ok: false,error: 'Retired'});await new Promise(done => setTimeout(done,0));welcome.update(state);welcome.destroy();return {errors,empty: !mount.firstChild};
  },initial);
  expect(result).toEqual({errors: 0,empty: true});
});
