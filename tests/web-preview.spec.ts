import {test,expect} from '@playwright/test';

test('web toolbar stays on one line with only an address and refresh icon',async({page})=>{
  await page.goto('/tests/fixture.html');
  await page.evaluate(async()=>{
    const pp='/src/parts/index.ts',rr='/src/recipes/index.ts',p=await import(pp),r=await import(rr);
    const preview=r.composeWebPreview({url:''});
    const mount=document.body.appendChild(document.createElement('div'));mount.style.cssText='width:240px;height:300px';
    p.mountParts(mount,preview.part);
  });
  const toolbar=page.locator('.pui-web-preview-toolbar'),refresh=toolbar.getByRole('button',{name:'Refresh',exact:true});
  await expect(toolbar.getByRole('button')).toHaveCount(1);await expect(refresh).toBeVisible();
  await expect(refresh).toHaveText('');await expect(refresh.locator('svg')).toHaveCount(1);
  const address=await toolbar.getByRole('textbox',{name:'Web address',exact:true}).boundingBox(),button=await refresh.boundingBox();
  expect(address).not.toBeNull();expect(button).not.toBeNull();expect(Math.abs(address!.y+address!.height/2-button!.y-button!.height/2)).toBeLessThan(2);
  expect(address!.x+address!.width).toBeLessThanOrEqual(button!.x);
  await expect(page.locator('.pui-web-preview > .pui-feature-hint:visible')).toHaveCount(0);
});


test('native viewport retains address drafts, reports geometry and yields to popovers, dialogs, hidden tabs and disposal',async({page})=>{
  let requests=0;await page.route('https://preview.example.test/**',route=>{requests++;return route.abort();});
  await page.goto('/tests/fixture.html');
  await page.evaluate(async()=>{
    const pp='/src/parts/index.ts',rr='/src/recipes/index.ts',p=await import(pp),r=await import(rr),events:unknown[]=[];
    let state={url:'https://preview.example.test/',externalUrl:'https://preview.example.test/',presentation:'native',error:''};
    const preview=r.composeWebPreview(state,{onNavigate:(v:string)=>events.push(v),onRefresh:()=>events.push('refresh'),onExternal:(v:string)=>events.push(v),onViewport:(v:unknown)=>Object.assign(window,{bounds:v})});
    const tools=r.composeWorkspaceTools({tabs:[{id:'web',kind:'preview',label:'Web'},{id:'other',kind:'files',label:'Files'}],activeId:'web',location:'Local',detail:'',webPreview:true});tools.attach('web',preview.part);
    const frame=r.composeFrame({navigation:{groups:[],empty:'workspaces'}},{},{tools:{label:'Workspace tools',layout:'tabs',close:tools.dismiss,children:[tools.part]}});
    const tree=p.mountParts(document.body.appendChild(document.createElement('div')),frame.part);frame.setToolsOpen(true);
    Object.assign(window,{previewTest:{events,preview,tree,frame,tools,update(next:object){state={...state,...next};preview.update(state);}}});
  });
  const bounds=()=>page.evaluate(()=>(window as any).bounds);
  await expect.poll(async()=>(await bounds())?.height??0).toBeGreaterThan(100);
  expect(requests).toBe(0);await expect(page.locator('iframe')).toHaveCount(0);
  const address=page.getByRole('textbox',{name:'Web address',exact:true,includeHidden:true});await address.fill('https://typed.example.test/draft');
  await page.evaluate(()=>(window as any).previewTest.update({error:'Temporary issue'}));await expect(address).toHaveValue('https://typed.example.test/draft');
  const refresh=page.getByRole('button',{name:'Refresh',exact:true});await address.press('Enter');await refresh.click();await refresh.press('Shift+F10');
  await expect.poll(bounds).toBeNull();await page.getByRole('menuitem',{name:'Open externally',exact:true}).click();
  await expect.poll(bounds).not.toBeNull();expect(await page.evaluate(()=>(window as any).previewTest.events)).toEqual(['https://typed.example.test/draft','refresh','https://preview.example.test/']);
  await page.evaluate(()=>{const dialog=document.createElement('dialog');dialog.textContent='Native host must yield';document.body.append(dialog);dialog.showModal();});
  await expect.poll(bounds).toBeNull();await page.evaluate(()=>document.querySelector('dialog')!.remove());await expect.poll(bounds).not.toBeNull();
  await page.evaluate(()=>(window as any).previewTest.tools.update({tabs:[{id:'web',kind:'preview',label:'Web'},{id:'other',kind:'files',label:'Files'}],activeId:'other',location:'Local',detail:''}));await expect.poll(bounds).toBeNull();
  await page.evaluate(()=>(window as any).previewTest.update({disabled:true}));await expect(address).toBeDisabled();
  await page.evaluate(()=>{const h=(window as any).previewTest;h.tree.destroy();h.preview.update({url:'https://preview.example.test/'});});await expect.poll(bounds).toBeNull();
});

test('external presentation never creates browser content; unsafe metadata is rejected',async({page})=>{
  await page.goto('/tests/fixture.html');
  await page.evaluate(async()=>{
    const rr='/src/recipes/index.ts',r=await import(rr);
    for(const url of ['https://example.test/','http://8.8.8.8/','http://192.168.1.20:3000/','https://[fd00::1]/','http://localhost/']) {
      const preview=r.composeWebPreview({url,externalUrl:url,presentation:'external'});preview.destroy();
    }
    for(const url of [location.href,'javascript:alert(1)']) {
      let threw=false;try{r.composeWebPreview({url})}catch{threw=true}if(!threw)throw Error('Unsafe metadata admitted');
    }
  });
  await expect(page.locator('iframe')).toHaveCount(0);
});
