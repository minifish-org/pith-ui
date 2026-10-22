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

test('web preview keeps address drafts and the live frame across metadata updates; sandbox and disposal remain bounded',async({page})=>{
  let loads=0;
  await page.route('https://preview.example.test/**',route=>{loads++;return route.fulfill({contentType:'text/html',body:'<button onclick="this.textContent=\'Clicked\'">Project action</button>'});});
  await page.goto('/tests/fixture.html');
  await page.evaluate(async()=>{
    const pp='/src/parts/index.ts',rr='/src/recipes/index.ts',p=await import(pp),r=await import(rr),events:unknown[]=[];
    let state={url:'https://preview.example.test/',externalUrl:'https://preview.example.test/',error:''};
    const preview=r.composeWebPreview(state,{onNavigate:(value:string)=>events.push(value),onRefresh:()=>events.push('refresh'),onExternal:(value:string)=>events.push(value)});
    const tools=r.composeWorkspaceTools({tabs:[{id:'preview',kind:'preview',label:'Web'}],activeId:'preview',location:'Local',detail:'',webPreview:true});tools.attach('preview',preview.part);
    const frame=r.composeFrame({navigation:{groups:[],empty:'workspaces'}},{},{tools:{label:'Workspace tools',layout:'tabs',close:tools.dismiss,children:[tools.part]}});
    const tree=p.mountParts(document.body.appendChild(document.createElement('div')),frame.part);frame.setToolsOpen(true);
    Object.assign(window,{previewTest:{tree,events,preview,update(next:object){state={...state,...next};preview.update(state);},reject(){for(const url of [location.href,'javascript:alert(1)','https://user:secret@example.test']){let threw=false;try{p.createWebPreviewPart({url})}catch{threw=true}if(!threw)throw Error('Unsafe frame admitted')}}}});
  });
  const frame=page.locator('iframe[title="Web preview"]'),address=page.getByRole('textbox',{name:'Web address',exact:true});
  await expect(frame).toHaveAttribute('sandbox','allow-scripts allow-forms allow-same-origin');await expect(frame).toHaveAttribute('referrerpolicy','no-referrer');
  await page.frameLocator('iframe').getByRole('button',{name:'Project action'}).click();await expect(page.frameLocator('iframe').getByRole('button',{name:'Clicked'})).toBeVisible();
  await address.fill('https://typed.example.test/draft');await page.evaluate(()=>(window as any).previewTest.update({error:'Temporary issue'}));
  await expect(page.locator('.pui-web-preview > .pui-form-error')).toHaveText('Temporary issue');
  await expect(address).toHaveValue('https://typed.example.test/draft');await expect(page.frameLocator('iframe').getByRole('button',{name:'Clicked'})).toBeVisible();expect(loads).toBe(1);
  await page.evaluate(()=>(window as any).previewTest.update({error:''}));await expect(page.locator('.pui-web-preview > .pui-form-error')).toBeHidden();
  const refresh=page.getByRole('button',{name:'Refresh',exact:true});
  await address.press('Enter');await refresh.click();await refresh.click({button:'right'});await page.getByRole('menuitem',{name:'Open externally',exact:true}).click();
  expect(await page.evaluate(()=>(window as any).previewTest.events)).toEqual(['https://typed.example.test/draft','refresh','https://preview.example.test/']);
  await refresh.press('Shift+F10');await expect(page.getByRole('menuitem',{name:'Open externally',exact:true})).toBeVisible();await page.keyboard.press('Escape');
  expect(await page.evaluate(()=>{try{(window as any).previewTest.preview.update({url:'https://preview.example.test/',externalUrl:'javascript:alert(1)'});return false}catch{return true}})).toBe(true);
  await expect(page.frameLocator('iframe').getByRole('button',{name:'Clicked'})).toBeVisible();
  await page.getByRole('button',{name:'New tool tab',exact:true}).click();await expect(page.getByRole('menuitem',{name:'New Web',exact:true})).toBeVisible();
  await page.keyboard.press('Escape');await page.evaluate(()=>(window as any).previewTest.update({disabled:true}));await expect(frame).toHaveCount(0);await expect(address).toBeDisabled();
  await page.evaluate(()=>{const h=(window as any).previewTest;h.reject();h.tree.destroy();h.preview.update({url:'https://preview.example.test/'});});await expect(frame).toHaveCount(0);
});
