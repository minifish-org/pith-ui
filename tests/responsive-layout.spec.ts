import {test,expect} from '@playwright/test';
import {measureSourceEffort} from './helpers/source-effort-measure';

// Fixed geometry from the pre-migration desktop baseline, including its
// medium window and mobile breakpoints. Consumers cannot provide pixels.
test('navigation and reading regions preserve the accepted responsive measures',async({page})=>{
 await page.setViewportSize({width:1280,height:800});await page.goto('/tests/fixture.html');
 await page.evaluate(async()=>{
  const u=await import('../src/index.js');
  const navigation=u.createPane({purpose:'navigation',header:u.createText({text:'Brand'}),content:u.createText({text:'Workspaces'})});
  const content=u.createPane({purpose:'conversation',header:u.createToolbar({label:'Navigation',leading:u.createBreadcrumb({label:'Location',items:[{key:'workspace',label:'Workspace',icon:'folder'},{key:'conversation',label:'Conversation'}]}),trailing:u.createIconButton({label:'Files',icon:'file'})}),content:u.createReadingArea({label:'Conversation',identity:'one',column:'reading',viewport:'fill',items:[]}),footer:u.createContentColumn({purpose:'input',content:u.createPromptInput({label:'Message'})})});
  const split=u.createSplitPane({navigation,content});Reflect.set(window,'responsiveSplit',split);u.mount(document.body,split,{viewport:'window'});
 });
 for(const width of [1280,1000,900,740,720,560]){
  await page.setViewportSize({width,height:800});
  const small=width<=720,navWidth=small?0:width<=1000?230:260;
  const nav=page.locator('.pui-split-navigation'),main=page.locator('.pui-split-content'),input=page.locator('.pui-column-input');
  if(small)await expect(nav).toBeHidden();else{await expect(nav).toBeVisible();expect((await nav.boundingBox())!.width).toBe(navWidth);}
  expect((await main.boundingBox())!.x).toBe(navWidth);
  expect((await input.boundingBox())!.width).toBe(small?width-28:width<=1000?width-navWidth-50:Math.min(810,width-navWidth-80));
  expect((await page.locator('.pui-pane-conversation>.pui-pane-header').boundingBox())!.height).toBe(small?64:79);
  expect(await main.evaluate(node=>(node as HTMLElement).inert)).toBe(false);
  if(!small)expect(await nav.evaluate(node=>(node as HTMLElement).inert)).toBe(false);
 }
 await page.evaluate(()=>Reflect.get(window,'responsiveSplit').setNavigationOpen(true));
 expect((await page.locator('.pui-split-navigation').boundingBox())!.width).toBe(260);
 expect(await page.locator('.pui-split-content').evaluate(node=>(node as HTMLElement).inert)).toBe(true);
});

test('a short conversation keeps long panels scrollable above a multiline input',async({page})=>{
 await page.setViewportSize({width:900,height:560});await page.goto('/tests/fixture.html');
 await page.evaluate(async()=>{
  const u=await import('../src/index.js');
  const panel=u.createScrollArea({label:'Pending task details',content:u.createStack({children:Array.from({length:30},(_,i)=>u.createText({text:'Long approval detail '+i}))})});
  const editor=u.createSurface({content:u.createPromptInput({label:'Message',value:'A multiline draft\n'.repeat(8)}),footer:u.createToolbar({label:'Actions',trailing:u.createIconButton({label:'Send message',context:'inline',icon:'arrow'})})});
  const content=u.createPane({purpose:'conversation',header:u.createToolbar({label:'Navigation',children:[u.createText({text:'Conversation'})]}),content:u.createReadingArea({label:'Reading',identity:'one',column:'reading',viewport:'fill',items:[]}),footer:u.createContentColumn({purpose:'input',content:u.createStack({context:'flow',children:[u.createSlot({content:panel}),editor,u.createText({role:'caption',text:'Permission description'})]})})});
  u.mount(document.body,u.createSplitPane({navigation:u.createPane({purpose:'navigation',content:u.createText({text:'Saved conversations'})}),content}),{viewport:'window'});
 });
 const send=(await page.getByRole('button',{name:'Send message'}).boundingBox())!;
 expect(send.y+send.height).toBeLessThanOrEqual(560);
 const panel=page.getByRole('region',{name:'Pending task details'});
 expect((await panel.boundingBox())!.height).toBeGreaterThan(0);
 expect(await panel.evaluate(node=>node.scrollHeight>node.clientHeight)).toBe(true);
 expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBe(560);
});

test('form contexts preserve measured label weight, native legend padding and field spacing',async({page})=>{
 await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');const dialog=u.createDialog({purpose:'form',title:'Measured fields',content:u.createStack({children:[u.createTextInput({label:'Connection name'}),u.createFormSection({context:'settings',title:'Provider',children:[u.createTextInput({label:'API key'})]}),u.createFormSection({context:'model',title:'Custom model',children:[u.createTextInput({label:'Model ID'})]})]})});const owner=u.mount(document.body,u.createText({text:'Host'}));owner.attach(dialog);dialog.open();});
 for(const label of ['Connection name','API key'])await expect(page.locator('.pui-field').filter({has:page.getByRole('textbox',{name:label,exact:true})}).locator('label')).toHaveCSS('font-weight','600');
 await expect(page.locator('.pui-section-model label')).toHaveCSS('font-weight','400');await expect(page.locator('.pui-section-model>legend')).toHaveCSS('padding-left','2px');
 for(const [label,gap]of [['Connection name',8],['API key',12],['Model ID',8]]as const){const field=page.locator('.pui-field').filter({has:page.getByRole('textbox',{name:label,exact:true})});const a=(await field.locator('label').boundingBox())!,b=(await field.getByRole('textbox').boundingBox())!;expect(b.y-a.y-a.height).toBe(gap);}
});

test('input footer text retains its 34px action and effort retains source-native height with an eight pixel note',async({page})=>{
 await page.setViewportSize({width:1280,height:800});await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');u.mount(document.body,u.createContentColumn({purpose:'input',content:u.createStack({children:[u.createSurface({content:u.createPromptInput({label:'Message'}),footer:u.createToolbar({label:'Actions',trailing:u.createActions({children:[u.createTextAction({context:'inline',label:'Demo model'}),u.createSelect({context:'inline',label:'Effort',options:[{value:'high',label:'Thinking: high'}]}),u.createIconButton({context:'inline',label:'Send',icon:'arrow'})]})})}),u.createText({role:'caption',text:'Permission description'})]})}));});
 expect((await page.getByRole('button',{name:'Demo model'}).boundingBox())!.height).toBe(34);
 const effort=page.getByRole('combobox',{name:'Effort'}),effortHeight=(await effort.boundingBox())!.height;
 // Archived0.3.1 styles.css:169–184/820–823 preserve a shared native/trigger
 // row. macOS measures34px; Linux WebKit's native theme can enlarge that row.
 if(process.platform==='darwin')expect(effortHeight).toBe(34);
 const native=await measureSourceEffort(page,['Thinking: high']);
 expect(effortHeight).toBe(native.height);await expect(effort).toHaveCSS('padding','8px 4px');
 const surface=(await page.locator('.pui-input-surface').boundingBox())!,caption=(await page.getByText('Permission description',{exact:true}).boundingBox())!;expect(caption.y-surface.y-surface.height).toBe(8);
});

test('only a selected navigation primary action marks the current page',async({page})=>{
 await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');const current=u.createListRow({context:'navigation',title:'Current conversation',selected:true,onAction(){}});Reflect.set(window,'currentNavigationRow',current);u.mount(document.body,u.createStack({children:[current,u.createListRow({title:'Selected generic item',selected:true,onAction(){}})]}));});
 await expect(page.getByRole('button',{name:'Current conversation'})).toHaveAttribute('aria-current','page');await expect(page.getByRole('button',{name:'Selected generic item'})).not.toHaveAttribute('aria-current');await page.evaluate(()=>Reflect.get(window,'currentNavigationRow').update({title:'Current conversation',selected:false}));await expect(page.getByRole('button',{name:'Current conversation'})).not.toHaveAttribute('aria-current');
});
