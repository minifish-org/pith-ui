import {test,expect} from '@playwright/test';

async function setup(page: any) {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const pp = '/src/parts/index.ts',rr = '/src/recipes/index.ts',p = await import(pp),r = await import(rr),events: unknown[] = [];
    let state = {id: 'one',location: 'Server · demo',directory: 'Initial directory: /srv/workspace',status: 'Connected',exists: true,connected: true};
    const terminal = r.composeTerminal(state,{onInput(data: string) {events.push(['input',data]);},onResize(size: unknown) {events.push(['size',size]);},onCopy(text: string) {events.push(['copy',text]);}});
    const search = p.createInputPart({label:'File filter',value:'Keep filter'}),draft = p.createTextareaPart({label:'Conversation draft',value:'Draft 中文'});
    let tabs = {tabs:[{id:'files',kind:'files',label:'Files'},{id:'terminal',kind:'terminal',label:'Terminal',detail:'Server · demo\n/srv/workspace'}],activeId:'terminal',location:'Server',detail:'/srv/workspace'},next=2;
    const tools = r.composeWorkspaceTools(tabs,{onSelect(id:string) {tabs={...tabs,activeId:id};events.push(['select',id]);},onClose(id:string) {events.push(['close',id]);},onNew(kind:'files'|'terminal') {
      const id=kind+next++,label=(kind==='files'?'Files':'Terminal')+' '+(next-1),content=p.createInputPart({label:'View '+id,value:'Retained '+id});
      tools.attach(id,content);tabs={...tabs,tabs:[...tabs.tabs,{id,kind,label}],activeId:id};tools.update(tabs);events.push(['new',kind]);
    }});
    tools.attach('files',search);tools.attach('terminal',terminal.part);
    const frame = r.composeFrame({navigation:{groups:[],empty:'workspaces'}},{},{main:[draft],tools:{label:'Workspace tools',layout:'tabs',close:tools.dismiss,children:[tools.part]}});
    const tree = p.mountParts(document.body.appendChild(document.createElement('div')),frame.part,{appearance:'light'});frame.setToolsOpen(true);
    Object.assign(window,{terminalTest:{events,terminal,tree,frame,tools,update(next: object) {state={...state,...next};terminal.update(state);},remove(id:string) {tools.remove(id);tabs={...tabs,tabs:tabs.tabs.filter(tab=>tab.id!==id),activeId:'files'};tools.update(tabs);}}});
  });
}

test('UTF8 and ANSI byte fragments, focus-local keys, selection and both retained tool views',async ({page}) => {
  await setup(page);
  await expect(page.locator('.pui-tool-tabs-heading')).not.toContainText('Server');
  await expect(page.getByRole('tab',{name:'Terminal',exact:true})).toHaveAttribute('title','Server · demo\n/srv/workspace');
  await expect(page.getByRole('tab',{name:'Files',exact:true})).toHaveAttribute('title','Server\n/srv/workspace');
  await page.evaluate(async () => {
    const h=(window as any).terminalTest,bytes=new TextEncoder().encode('\x1b[31m红色 中文\x1b[0m\r\nsecond row');
    for (let index=0;index<bytes.length;index++) await new Promise<void>(resolve=>h.terminal.write(bytes.slice(index,index+1),resolve));
  });
  await expect(page.getByRole('log',{name:'Terminal display',exact:true})).toContainText('红色 中文');
  const themeMatches = () => page.evaluate(() => {
    const root=document.querySelector('.pui-terminal-viewport')!,rows=document.querySelector('.xterm-rows')!,surface=document.querySelector('.xterm-scrollable-element')!,viewport=document.querySelector('.xterm-viewport')!,rail=document.querySelector('.pui-tools')!,heading=document.querySelector('.pui-tool-tabs-heading')!;
    return getComputedStyle(root).backgroundColor===getComputedStyle(rail).backgroundColor && getComputedStyle(heading).borderBottomWidth==='0px' && getComputedStyle(rows).color===getComputedStyle(root).color && getComputedStyle(rows).fontSize===getComputedStyle(root).fontSize && [surface,viewport].every(node=>getComputedStyle(node).backgroundColor===getComputedStyle(root).backgroundColor);
  });
  await expect.poll(themeMatches).toBe(true);await page.evaluate(()=>(window as any).terminalTest.tree.setAppearance('dark'));await expect.poll(themeMatches).toBe(true);
  const input=page.getByRole('textbox',{name:'Terminal input',exact:true});await input.focus();await input.press('Control+c');await input.press('Escape');await input.press('Tab');
  const events=await page.evaluate(()=>(window as any).terminalTest.events.filter((entry:any)=>entry[0]==='input').map((entry:any)=>entry[1]));
  expect(events).toEqual(['\x03','\x1b','\t']);
  await page.keyboard.insertText('输入中文😀');
  expect(await page.evaluate(()=>(window as any).terminalTest.events.filter((entry:any)=>entry[0]==='input').at(-1)[1])).toBe('输入中文😀');
  const viewport=page.locator('.pui-terminal-viewport'),box=(await viewport.boundingBox())!;
  await page.mouse.move(box.x+1,box.y+8);await page.mouse.down();await page.mouse.move(box.x+90,box.y+8);await page.mouse.up();
  await input.press('Control+Shift+c');
  expect(await page.evaluate(()=>(window as any).terminalTest.events.filter((entry:any)=>entry[0]==='copy').at(-1)[1])).toContain('红色');
  await page.getByRole('tab',{name:'Files',exact:true}).click();await expect(page.getByRole('textbox',{name:'File filter',exact:true})).toHaveValue('Keep filter');
  await page.getByRole('textbox',{name:'File filter',exact:true}).fill('Unsubmitted search');await page.getByRole('tab',{name:'Terminal',exact:true}).click();await expect(page.getByRole('log',{name:'Terminal display',exact:true})).toContainText('second row');
  await page.getByRole('button',{name:'Close tools',exact:true}).click();const draft=page.getByRole('textbox',{name:'Conversation draft',exact:true});await expect(draft).toHaveValue('Draft 中文');await draft.fill('Still unsent');await draft.press('Escape');
  await page.getByRole('button',{name:'Toggle tools',exact:true}).click();await page.getByRole('tab',{name:'Files',exact:true}).click();await expect(page.getByRole('textbox',{name:'File filter',exact:true})).toHaveValue('Unsubmitted search');await expect(draft).toHaveValue('Still unsent');
  await expect(page.getByRole('button',{name:'Copy selection',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Paste into terminal',exact:true})).toHaveCount(0);
  await expect(page.getByRole('button',{name:'Interrupt terminal',exact:true})).toBeHidden();
});

test('native paste follows connection state; reset and disposal retire parse callbacks and listeners',async ({page}) => {
  await setup(page);
  const paste=async (text:string)=>page.evaluate(text=>{const data=new DataTransfer();data.setData('text/plain',text);document.querySelector('textarea[aria-label="Terminal input"]')!.dispatchEvent(new ClipboardEvent('paste',{clipboardData:data,bubbles:true}));},text);
  await paste('paste 中文');await page.evaluate(()=>(window as any).terminalTest.update({connected:false}));await paste('offline paste');
  expect(await page.evaluate(()=>(window as any).terminalTest.events.filter((entry:any)=>entry[0]==='input').map((entry:any)=>entry[1]))).toEqual(['paste 中文']);
  const result=await page.evaluate(async () => {
    const h=(window as any).terminalTest;let calls=0;h.terminal.write(new Uint8Array([13]));h.terminal.write(new Uint8Array(1000).fill(65),()=>calls++);h.terminal.reset({cols:90,rows:30});h.tree.destroy();
    window.visualViewport?.dispatchEvent(new Event('resize'));await new Promise(resolve=>setTimeout(resolve,50));return {calls,remaining:document.querySelectorAll('.xterm').length};
  });expect(result).toEqual({calls:0,remaining:0});
});

test('display resets keep the focused input and cancel old partial control sequences',async ({page}) => {
  await setup(page);const input=page.getByRole('textbox',{name:'Terminal input',exact:true});await input.focus();
  const result=await page.evaluate(async()=>{
    const h=(window as any).terminalTest,input=document.querySelector('textarea[aria-label="Terminal input"]'),encode=(text:string)=>new TextEncoder().encode(text);
    for(let i=0;i<8;i++) {h.terminal.write(encode('stale\x1b[31'));h.terminal.reset({cols:80,rows:24});}
    await new Promise<void>(done=>h.terminal.write(encode('Current 中文'),done));
    return {same:input===document.querySelector('textarea[aria-label="Terminal input"]'),focused:input===document.activeElement};
  });
  expect(result).toEqual({same:true,focused:true});await expect(page.getByRole('log',{name:'Terminal display',exact:true})).toContainText('Current 中文');await expect(page.getByRole('log',{name:'Terminal display',exact:true})).not.toContainText('stale');
  await input.press('Control+c');expect(await page.evaluate(()=>(window as any).terminalTest.events.filter((entry:any)=>entry[0]==='input').at(-1)[1])).toBe('\x03');
});

test('replay preserves the recorded grid while status layout changes; live state resumes fitting',async({page})=>{
  await setup(page);
  await page.evaluate(()=>{const h=(window as any).terminalTest;h.update({connected:false,restoring:true,status:'Restoring terminal output…'});h.terminal.reset({cols:77,rows:31});});
  await page.setViewportSize({width:1200,height:720});
  await page.evaluate(()=>new Promise<void>(done=>requestAnimationFrame(()=>requestAnimationFrame(()=>done()))));
  expect(await page.evaluate(()=>(window as any).terminalTest.terminal.readSize())).toEqual({cols:77,rows:31});
  await page.evaluate(()=>{const h=(window as any).terminalTest;h.update({connected:true,restoring:false});h.terminal.fit();});
  await expect.poll(()=>page.evaluate(()=>(window as any).terminalTest.terminal.readSize())).not.toEqual({cols:77,rows:31});
});

test('real tabs retain panels; add menu, roving keyboard, close intent and overflow remain reachable',async ({page}) => {
  await setup(page);
  const files=page.getByRole('tab',{name:'Files',exact:true}),terminal=page.getByRole('tab',{name:'Terminal',exact:true});
  await expect(terminal).toHaveAttribute('aria-selected','true');await terminal.press('Home');await expect(files).toBeFocused();await expect(files).toHaveAttribute('aria-selected','true');
  await files.press('ArrowRight');await expect(terminal).toBeFocused();await terminal.press('Delete');
  expect(await page.evaluate(()=>(window as any).terminalTest.events.at(-1))).toEqual(['close','terminal']);await expect(terminal).toBeVisible();
  await page.getByRole('button',{name:'New tool tab',exact:true}).click();
  await page.evaluate(async()=>{const h=(window as any).terminalTest;await new Promise<void>(done=>h.terminal.write(new TextEncoder().encode('background output\r\n'.repeat(100)),done));});
  await expect(page.getByRole('menuitem')).toHaveCount(2);await page.getByRole('menuitem',{name:'New terminal',exact:true}).press('Escape');await expect(page.getByRole('button',{name:'New tool tab',exact:true})).toBeFocused();
  for(let i=0;i<5;i++) {await page.getByRole('button',{name:'New tool tab',exact:true}).click();await expect(page.getByRole('menuitem')).toHaveCount(2);await page.getByRole('menuitem',{name:'New files',exact:true}).click();}
  const plus=page.getByRole('button',{name:'New tool tab',exact:true}),strip=page.getByRole('tablist',{name:'Workspace tools',exact:true}),plusBox=(await plus.boundingBox())!,stripBox=(await strip.boundingBox())!;
  expect(plusBox.x).toBeGreaterThanOrEqual(stripBox.x);expect(plusBox.x+plusBox.width).toBeLessThanOrEqual(stripBox.x+stripBox.width+1);
  await expect(page.locator('.pui-tool-tabs-heading')).toHaveCSS('height','44px');
  await plus.click();await page.getByRole('menuitem',{name:'New terminal',exact:true}).click();await expect(page.getByRole('tab',{name:'Terminal 7',exact:true})).toHaveAttribute('aria-selected','true');
  await terminal.click();await expect(terminal).toHaveAttribute('aria-selected','true');await page.getByRole('textbox',{name:'Terminal input',exact:true}).focus();
  await page.evaluate(()=>(window as any).terminalTest.remove('terminal'));await expect(terminal).toHaveCount(0);await expect(page.locator('.xterm')).toHaveCount(0);await expect(files).toBeFocused();
  await expect(page.getByRole('textbox',{name:'File filter',exact:true})).toHaveValue('Keep filter');
});

test('phone visual viewport resize fits cells, keeps touch keys reachable and retains Escape for terminal apps',async ({page}) => {
  await page.setViewportSize({width:390,height:844});await setup(page);
  const initial=await page.evaluate(()=>(window as any).terminalTest.terminal.readSize());
  await page.evaluate(()=>{Object.defineProperty(window.visualViewport!,'height',{configurable:true,value:330});window.visualViewport!.dispatchEvent(new Event('resize'));});
  await expect.poll(()=>page.evaluate(()=>(window as any).terminalTest.terminal.readSize().rows)).toBeLessThan(initial.rows);
  const viewport=(await page.locator('.pui-terminal-viewport').boundingBox())!;expect(viewport.height).toBeGreaterThan(25);expect(viewport.y+viewport.height).toBeLessThanOrEqual(330);
  const interrupt=page.getByRole('button',{name:'Interrupt terminal',exact:true});const keys=(await interrupt.boundingBox())!;expect(keys.y+keys.height).toBeLessThanOrEqual(330);
  const input=page.getByRole('textbox',{name:'Terminal input',exact:true});await input.focus();await input.press('Escape');await expect(page.getByRole('button',{name:'Close tools',exact:true})).toHaveAttribute('aria-expanded','true');
  await interrupt.click();expect(await page.evaluate(()=>(window as any).terminalTest.events.filter((entry:any)=>entry[0]==='input').at(-1)[1])).toBe('\x03');
  await page.getByRole('button',{name:'Close tools',exact:true}).click();await expect(page.getByRole('button',{name:'Toggle tools',exact:true})).toBeFocused();
});
