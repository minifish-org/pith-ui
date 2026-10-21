import {test,expect} from '@playwright/test';

async function setup(page: any) {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const pp = '/src/parts/index.ts',rr = '/src/recipes/index.ts',p = await import(pp),r = await import(rr),events: unknown[] = [];
    let state = {id: 'one',location: 'Server · demo',directory: 'Initial directory: /srv/workspace',status: 'Connected',exists: true,connected: true};
    const terminal = r.composeTerminal(state,{onInput(data: string) {events.push(['input',data]);},onResize(size: unknown) {events.push(['size',size]);},onCopy(text: string) {events.push(['copy',text]);}});
    const search = p.createInputPart({label:'File filter',value:'Keep filter'}),draft = p.createTextareaPart({label:'Conversation draft',value:'Draft 中文'});
    const tools = r.composeWorkspaceTools({files:search,terminal:terminal.part});
    const frame = r.composeFrame({navigation:{groups:[],empty:'workspaces'}},{},{main:[draft],tools:{label:'Workspace tools',children:[tools.part]}});
    const tree = p.mountParts(document.body.appendChild(document.createElement('div')),frame.part,{appearance:'light'});frame.setToolsOpen(true);tools.select('terminal');
    Object.assign(window,{terminalTest:{events,terminal,tree,frame,tools,update(next: object) {state={...state,...next};terminal.update(state);}}});
  });
}

test('UTF8 and ANSI byte fragments, focus-local keys, selection and both retained tool views',async ({page}) => {
  await setup(page);
  await page.evaluate(async () => {
    const h=(window as any).terminalTest,bytes=new TextEncoder().encode('\x1b[31m红色 中文\x1b[0m\r\nsecond row');
    for (let index=0;index<bytes.length;index++) await new Promise<void>(resolve=>h.terminal.write(bytes.slice(index,index+1),resolve));
  });
  await expect(page.getByRole('log',{name:'Terminal display',exact:true})).toContainText('红色 中文');
  const themeMatches = () => page.evaluate(() => {
    const root=document.querySelector('.pui-terminal-viewport')!,rows=document.querySelector('.xterm-rows')!,surface=document.querySelector('.xterm-scrollable-element')!,viewport=document.querySelector('.xterm-viewport')!;
    return getComputedStyle(rows).color===getComputedStyle(root).color && getComputedStyle(rows).fontSize===getComputedStyle(root).fontSize && [surface,viewport].every(node=>getComputedStyle(node).backgroundColor===getComputedStyle(root).backgroundColor);
  });
  await expect.poll(themeMatches).toBe(true);await page.evaluate(()=>(window as any).terminalTest.tree.setAppearance('dark'));await expect.poll(themeMatches).toBe(true);
  const input=page.getByRole('textbox',{name:'Terminal input',exact:true});await input.focus();await input.press('Control+c');await input.press('Escape');await input.press('Tab');
  const events=await page.evaluate(()=>(window as any).terminalTest.events.filter((entry:any)=>entry[0]==='input').map((entry:any)=>entry[1]));
  expect(events).toEqual(['\x03','\x1b','\t']);
  await page.keyboard.insertText('输入中文😀');
  expect(await page.evaluate(()=>(window as any).terminalTest.events.filter((entry:any)=>entry[0]==='input').at(-1)[1])).toBe('输入中文😀');
  const viewport=page.locator('.pui-terminal-viewport'),box=(await viewport.boundingBox())!;
  await page.mouse.move(box.x+1,box.y+8);await page.mouse.down();await page.mouse.move(box.x+90,box.y+8);await page.mouse.up();
  await page.getByRole('button',{name:'Copy selection',exact:true}).click();
  expect(await page.evaluate(()=>(window as any).terminalTest.events.filter((entry:any)=>entry[0]==='copy').at(-1)[1])).toContain('红色');
  await page.getByRole('button',{name:'Files',exact:true}).click();await expect(page.getByRole('textbox',{name:'File filter',exact:true})).toHaveValue('Keep filter');
  await page.getByRole('textbox',{name:'File filter',exact:true}).fill('Unsubmitted search');await page.getByRole('button',{name:'Terminal',exact:true}).click();await expect(page.getByRole('log',{name:'Terminal display',exact:true})).toContainText('second row');
  await page.getByRole('button',{name:'Toggle tools',exact:true}).click();const draft=page.getByRole('textbox',{name:'Conversation draft',exact:true});await expect(draft).toHaveValue('Draft 中文');await draft.fill('Still unsent');await draft.press('Escape');
  await page.getByRole('button',{name:'Toggle tools',exact:true}).click();await page.getByRole('button',{name:'Files',exact:true}).click();await expect(page.getByRole('textbox',{name:'File filter',exact:true})).toHaveValue('Unsubmitted search');await expect(draft).toHaveValue('Still unsent');
});

test('reset and disposal retire parse callbacks, pending clipboard reads and listeners',async ({page}) => {
  await setup(page);
  await page.evaluate(() => {
    const h=(window as any).terminalTest;
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{readText:()=>new Promise(resolve=>h.resolvePaste=resolve)}});
  });
  await page.getByRole('button',{name:'Paste into terminal',exact:true}).click();
  await page.evaluate(() => {const h=(window as any).terminalTest;h.update({id:'two'});h.resolvePaste('late paste');});
  expect(await page.evaluate(()=>(window as any).terminalTest.events.filter((entry:any)=>entry[0]==='input'))).toEqual([]);
  await page.getByRole('button',{name:'Paste into terminal',exact:true}).click();
  await page.evaluate(() => {const h=(window as any).terminalTest;h.update({connected:false});h.update({connected:true});h.resolvePaste('pre-disconnect paste');});
  expect(await page.evaluate(()=>(window as any).terminalTest.events.filter((entry:any)=>entry[0]==='input'))).toEqual([]);
  const result=await page.evaluate(async () => {
    const h=(window as any).terminalTest;let calls=0;h.terminal.write(new Uint8Array(1000).fill(65),()=>calls++);h.terminal.reset({cols:90,rows:30});h.tree.destroy();
    window.visualViewport?.dispatchEvent(new Event('resize'));await new Promise(resolve=>setTimeout(resolve,50));return {calls,remaining:document.querySelectorAll('.xterm').length};
  });expect(result).toEqual({calls:0,remaining:0});
});

test('phone visual viewport resize fits cells, keeps touch keys reachable and retains Escape for terminal apps',async ({page}) => {
  await page.setViewportSize({width:390,height:844});await setup(page);
  const initial=await page.evaluate(()=>(window as any).terminalTest.terminal.readSize());
  await page.evaluate(()=>{Object.defineProperty(window.visualViewport!,'height',{configurable:true,value:330});window.visualViewport!.dispatchEvent(new Event('resize'));});
  await expect.poll(()=>page.evaluate(()=>(window as any).terminalTest.terminal.readSize().rows)).toBeLessThan(initial.rows);
  const viewport=(await page.locator('.pui-terminal-viewport').boundingBox())!;expect(viewport.height).toBeGreaterThan(25);expect(viewport.y+viewport.height).toBeLessThanOrEqual(330);
  const interrupt=page.getByRole('button',{name:'Interrupt terminal',exact:true});const keys=(await interrupt.boundingBox())!;expect(keys.y+keys.height).toBeLessThanOrEqual(330);
  const input=page.getByRole('textbox',{name:'Terminal input',exact:true});await input.focus();await input.press('Escape');await expect(page.getByRole('button',{name:'Toggle tools',exact:true})).toHaveAttribute('aria-expanded','true');
  await interrupt.click();expect(await page.evaluate(()=>(window as any).terminalTest.events.filter((entry:any)=>entry[0]==='input').at(-1)[1])).toBe('\x03');
  await page.getByRole('button',{name:'Close tools',exact:true}).click();await expect(page.getByRole('button',{name:'Toggle tools',exact:true})).toBeFocused();
});
