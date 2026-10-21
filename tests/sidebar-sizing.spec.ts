import {test,expect} from '@playwright/test';

async function fixture(page: any) {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const partsPath='/src/parts/index.ts',recipesPath='/src/recipes/index.ts',p=await import(partsPath),r=await import(recipesPath);
    const changes: unknown[]=[];
    const frame=r.composeFrame({navigation:{groups:[],empty:'workspaces'}},{onSidebarResize:(widths: unknown)=>changes.push(widths)},
      {titlebar:'overlay',main:[p.createTextareaPart({label:'Draft',value:'Retained 中文 draft'})],tools:{label:'Tools',children:[p.createButtonPart({label:'File'})]}});
    const tree=p.mountParts(document.body.appendChild(document.createElement('div')),frame.part);
    Object.assign(window,{sizing:{frame,tree,changes}});
  });
  await page.getByRole('button',{name:'Toggle tools',exact:true}).click();
}
const width=(page: any,label: string)=>page.getByRole('complementary',{name:label,exact:true}).evaluate((node: HTMLElement)=>node.getBoundingClientRect().width);
async function drag(page: any,label: string,dx: number) {
  const handle=page.getByRole('separator',{name:label,exact:true}),box=(await handle.boundingBox())!;
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
  await page.mouse.move(box.x+box.width/2+dx,box.y+box.height/2,{steps:8});await page.mouse.up();
}

test('rail edges drag independently, support keys and bounds, and preserve input',async({page})=>{
  await page.setViewportSize({width:1600,height:840});await fixture(page);
  const left=page.getByRole('separator',{name:'Resize navigation',exact:true}),right=page.getByRole('separator',{name:'Resize tools',exact:true});
  await expect(left).toHaveAttribute('aria-orientation','vertical');await expect(right).toHaveAttribute('tabindex','0');
  expect((await left.boundingBox())!.width).toBeGreaterThanOrEqual(10);expect(await left.evaluate(node=>getComputedStyle(node).cursor)).toBe('col-resize');
  const draft=page.getByRole('textbox',{name:'Draft',exact:true});await draft.evaluate((node:HTMLTextAreaElement)=>node.setSelectionRange(2,7));
  await drag(page,'Resize navigation',80);await expect.poll(()=>width(page,'Navigation')).toBe(340);expect(await width(page,'Tools')).toBe(300);
  await drag(page,'Resize tools',-120);await expect.poll(()=>width(page,'Tools')).toBe(420);expect(await width(page,'Navigation')).toBe(340);
  await right.press('ArrowLeft');await expect.poll(()=>width(page,'Tools')).toBe(430);
  await right.press('Shift+ArrowRight');await expect.poll(()=>width(page,'Tools')).toBe(390);
  await left.press('Home');await expect.poll(()=>width(page,'Navigation')).toBe(200);await left.press('End');await expect.poll(()=>width(page,'Navigation')).toBe(480);
  await right.press('End');expect(await width(page,'Tools')).toBeLessThanOrEqual(800);expect((await page.locator('main').boundingBox())!.width).toBeGreaterThanOrEqual(320);
  await right.press('Home');await expect.poll(()=>width(page,'Tools')).toBe(240);await expect(right).toHaveAttribute('aria-valuenow','240');
  await expect(draft).toHaveValue('Retained 中文 draft');expect(await draft.evaluate((node:HTMLTextAreaElement)=>[node.selectionStart,node.selectionEnd])).toEqual([2,7]);
  await page.getByRole('button',{name:'Close tools',exact:true}).click();await expect(right).toBeHidden();await page.getByRole('button',{name:'Toggle tools',exact:true}).click();await expect.poll(()=>width(page,'Tools')).toBe(240);
});

test('viewport constraints preserve preferred sizes, native titlebar geometry and teardown cancels a drag',async({page})=>{
  await page.setViewportSize({width:1600,height:840});await fixture(page);
  await page.evaluate(()=>(window as any).sizing.frame.setSidebarWidths({navigation:420,tools:600}));
  await expect.poll(()=>width(page,'Navigation')).toBe(420);await expect.poll(()=>width(page,'Tools')).toBe(600);
  await page.setViewportSize({width:780,height:840});
  await expect.poll(async()=>(await page.locator('main').boundingBox())!.width).toBeGreaterThanOrEqual(319);
  expect(await width(page,'Navigation')+await width(page,'Tools')).toBeLessThanOrEqual(461);
  await page.setViewportSize({width:721,height:840});
  await expect.poll(async()=>(await page.locator('main').boundingBox())!.width).toBeGreaterThanOrEqual(320);
  for(const name of ['Resize navigation','Resize tools']) {
    const handle=page.getByRole('separator',{name,exact:true}),current=Number(await handle.getAttribute('aria-valuenow'));
    expect(current).toBeGreaterThanOrEqual(Number(await handle.getAttribute('aria-valuemin')));expect(current).toBeLessThanOrEqual(Number(await handle.getAttribute('aria-valuemax')));
  }
  await page.setViewportSize({width:1600,height:840});await expect.poll(()=>width(page,'Navigation')).toBe(420);await expect.poll(()=>width(page,'Tools')).toBe(600);
  expect(await page.locator('.pui-native-titlebar').evaluate(node=>node.getBoundingClientRect().width)).toBe(420);
  expect(await page.evaluate(()=>(window as any).sizing.changes)).toEqual([]);
  const handle=page.getByRole('separator',{name:'Resize tools',exact:true}),box=(await handle.boundingBox())!;
  await page.mouse.move(box.x+5,box.y+80);await page.mouse.down();await page.mouse.move(box.x-50,box.y+80);
  await page.keyboard.press('Escape');await page.mouse.up();await expect.poll(()=>width(page,'Tools')).toBe(600);expect(await page.evaluate(()=>(window as any).sizing.changes)).toEqual([]);
  await page.mouse.move(box.x+5,box.y+80);await page.mouse.down();await page.mouse.move(box.x-40,box.y+80);
  await page.evaluate(()=>(window as any).sizing.tree.destroy());await page.mouse.up();await expect(page.getByRole('separator')).toHaveCount(0);
  await page.setViewportSize({width:1000,height:700});expect(await page.evaluate(()=>(window as any).sizing.changes)).toEqual([]);
});

test('phone panels remain overlays without drag handles and restore wide preferences',async({page})=>{
  await page.setViewportSize({width:1300,height:840});await fixture(page);
  await page.evaluate(()=>(window as any).sizing.frame.setSidebarWidths({navigation:350,tools:500}));
  await page.setViewportSize({width:390,height:844});await expect(page.getByRole('separator')).toHaveCount(0);
  await page.getByRole('button',{name:'Toggle tools',exact:true}).click();expect(await width(page,'Tools')).toBeLessThanOrEqual(342);
  expect((await page.locator('main').boundingBox())!.width).toBe(390);
  await page.getByRole('button',{name:'Close tools',exact:true}).press('Escape');await expect(page.getByRole('button',{name:'Toggle tools',exact:true})).toBeFocused();
  await page.setViewportSize({width:1300,height:840});await expect.poll(()=>width(page,'Navigation')).toBe(350);await expect.poll(()=>width(page,'Tools')).toBe(500);
  expect(await page.evaluate(()=>(window as any).sizing.changes)).toEqual([]);
});
