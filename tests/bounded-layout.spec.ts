import type {Control} from '../src/index.js';
import {test,expect} from '@playwright/test';

// Geometry is measured against the accepted pre-migration control composition.
// No consumer CSS, DOM slots or numeric presentation options participate.
test('fixed content columns restore reading, editing and introduction measures without public pixels',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await page.goto('/tests/fixture.html');
  await page.evaluate(async()=>{const u=await import('../src/index.js');const make=Reflect.get(u,'createContentColumn') as (v:unknown)=>Control;u.mount(document.body,u.createStack({children:['reading','input','intro'].map(purpose=>make({purpose,content:u.createText({text:purpose})}))}));});
  for(const [purpose,width]of [['reading',774],['input',810],['intro',650]]as const){const box=await page.locator('.pui-column-'+purpose).boundingBox();expect(box!.width).toBe(width);expect(box!.x+box!.width/2).toBe(640);}
});

test('a surface owns one input shell and separates leading and trailing inline actions',async({page})=>{
  await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');const make=Reflect.get(u,'createSurface') as(v:unknown)=>Control;const toolbar=u.createToolbar({label:'Editor actions',leading:u.createSelect({label:'Permission',context:'inline',icon:'shield',tone:'warning',options:[{value:'full',label:'Full access'}]}),trailing:u.createIconButton({label:'Send',icon:'arrow',context:'inline'})}as never);u.mount(document.body,make({content:u.createPromptInput({label:'Draft',value:'Retained text'}),footer:toolbar}));});
  const input=page.getByRole('textbox',{name:'Draft'});await expect(input).toHaveCSS('border-top-width','0px');await expect(page.getByRole('combobox',{name:'Permission'})).toBeVisible();
  const select=(await page.getByRole('combobox',{name:'Permission'}).boundingBox())!,send=(await page.getByRole('button',{name:'Send'}).boundingBox())!;expect(send.x-select.x).toBeGreaterThan(500);expect(send.height).toBe(32);await expect(page.locator('.pui-inline-choice')).toHaveCSS('color','rgb(138, 87, 10)');
  await input.fill('Keep selection');await input.evaluate(n=>(n as HTMLTextAreaElement).setSelectionRange(0,1));await expect(input).toHaveValue('Keep selection');expect(await input.evaluate(n=>{const x=n as HTMLTextAreaElement;return x.selectionEnd-x.selectionStart;})).toBe(1);
});

test('navigation and inline disclosures keep header icons and auxiliary actions in one compact row',async({page})=>{
 await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');const row=u.createListRow({context:'navigation',title:'Saved conversation',selected:true,onAction(){},actions:u.createIconButton({label:'Conversation actions',icon:'more',context:'inline'})}as never);u.mount(document.body,u.createDisclosure({context:'navigation',title:'Workspace',icon:'folder',open:true,actions:u.createIconButton({label:'New conversation',icon:'plus',context:'inline'}),content:row}as never));});
 const heading=page.locator('summary'),action=page.getByRole('button',{name:'New conversation'});await expect(heading.locator('svg')).toHaveCount(3);expect((await heading.boundingBox())!.height).toBeLessThanOrEqual(40);expect(Math.abs((await action.boundingBox())!.y-(await heading.boundingBox())!.y)).toBeLessThan(8);await expect(page.locator('.pui-disclosure')).toHaveCSS('border-top-width','0px');await expect(page.locator('.pui-list-row')).toHaveCSS('border-top-width','0px');
 await action.click();await expect(page.locator('details')).toHaveAttribute('open','');await heading.click();await expect(page.locator('details')).not.toHaveAttribute('open','');
});

test('user content is a right-aligned bubble while time and actions share its outside footer',async({page})=>{
 await page.setViewportSize({width:1280,height:800});await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');u.mount(document.body,u.createMessage({role:'user',time:'10:20',content:u.createText({text:'A short user message'}),actions:u.createIconButton({label:'Edit message',icon:'edit'})}));});
 const frame=page.locator('.pui-message-frame'),body=page.locator('.pui-message-frame-body'),meta=page.locator('.pui-message-frame-meta'),actions=page.locator('.pui-message-frame-actions');const a=(await frame.boundingBox())!,b=(await body.boundingBox())!,m=(await meta.boundingBox())!,x=(await actions.boundingBox())!;expect(b.width).toBeLessThan(a.width*.82);expect(b.x+b.width).toBe(a.x+a.width);expect(m.y).toBeGreaterThanOrEqual(b.y+b.height);expect(Math.abs(m.y+m.height/2-x.y-x.height/2)).toBeLessThan(1);await expect(frame).toHaveCSS('background-color','rgba(0, 0, 0, 0)');await expect(body).toHaveCSS('background-color','rgb(240, 242, 246)');
});

test('pane purposes restore fixed navigation padding and a bounded conversation header',async({page})=>{
 await page.setViewportSize({width:1280,height:800});await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');u.mount(document.body,u.createSplitPane({navigation:u.createPane({purpose:'navigation',header:u.createText({text:'Brand'}),content:u.createText({text:'Saved workspaces'}),footer:u.createTextAction({context:'navigation',icon:'settings',label:'Settings'})}as never),content:u.createPane({purpose:'conversation',header:u.createToolbar({label:'Conversation',leading:u.createText({text:'Title'}),trailing:u.createIconButton({label:'Files',icon:'file'})}as never),content:u.createText({text:'Messages'})}as never)}),{viewport:'window'});});
 const header=page.locator('.pui-pane-conversation>.pui-pane-header');expect((await header.boundingBox())!.height).toBe(79);await expect(page.locator('.pui-pane-conversation>.pui-pane-content')).toHaveCSS('padding','0px');await expect(page.locator('.pui-pane-navigation')).toHaveCSS('padding','24px 16px 16px');await expect(page.getByRole('button',{name:'Settings'})).toHaveCSS('justify-content','flex-start');
});

test('small detail controls keep status indicators, paired fields and inline submissions bounded',async({page})=>{
 await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');const grid=Reflect.get(u,'createGrid')as(v:unknown)=>unknown;u.mount(document.body,u.createStack({children:[u.createStatus({label:'Running',presentation:'indicator',activity:'busy'}as never),u.createForm({context:'inline',children:[grid({columns:'pair',children:[u.createTextInput({label:'Input price'}),u.createTextInput({label:'Output price'})]})],submitLabel:'Connect',onSubmit:()=>({ok:true})}as never)]}));});
 const status=page.getByLabel('Running');expect((await status.boundingBox())!.width).toBeLessThanOrEqual(12);const first=(await page.getByRole('textbox',{name:'Input price'}).boundingBox())!,second=(await page.getByRole('textbox',{name:'Output price'}).boundingBox())!;expect(first.y).toBe(second.y);expect(second.x-first.x).toBeGreaterThan(first.width);await expect(page.locator('.pui-form-inline>.pui-actions')).toHaveCSS('margin-top','0px');
});

test('brand, introduction mark and numbered steps retain their small fixed geometry',async({page})=>{
 await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');const brand=Reflect.get(u,'createBrand'),step=Reflect.get(u,'createStep');u.mount(document.body,u.createStack({children:[brand({image:u.createImage({purpose:'brand',label:'Logo',source:''}),label:'Pith',qualifier:'Desk'}),u.createImage({purpose:'intro',label:'Introduction logo',source:''}as never),step({number:1,title:'Connect a model',description:'Choose a provider',onAction(){}})]}));});
 await expect(page.locator('.pui-brand-qualifier')).toHaveCSS('font-weight','400');expect((await page.locator('.pui-image-intro').boundingBox())!.width).toBe(64);expect((await page.locator('.pui-step-marker').boundingBox())!.width).toBe(28);await expect(page.getByRole('button',{name:'Connect a model Choose a provider'})).toBeVisible();
});

test('form dialogs, accessible short actions and warning surfaces retain bounded presentation',async({page})=>{
 await page.setViewportSize({width:1280,height:800});await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');const dialog=u.createDialog({purpose:'form',eyebrow:'MAKE IT YOURS',title:'Settings',content:u.createStack({children:[u.createTextAction({label:'Compact',accessibleLabel:'Compress context',context:'inline'}as never),Reflect.get(u,'createSurface')({purpose:'notice',tone:'warning',content:u.createText({text:'Approval required'})})]})}as never);const owner=u.mount(document.body,u.createText({text:'Host'}));owner.attach(dialog);dialog.open();});
 const dialog=page.getByRole('dialog',{name:'Settings'});expect((await dialog.boundingBox())!.width).toBe(500);await expect(dialog.getByText('MAKE IT YOURS')).toBeVisible();await expect(page.getByRole('button',{name:'Compress context'})).toHaveText('Compact');await expect(page.locator('.pui-notice-surface')).toHaveCSS('border-radius','12px');
});

test('a notification region leaves document flow intact and an inspector stays aligned to its trigger',async({page})=>{
 await page.setViewportSize({width:1280,height:800});await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');const region=Reflect.get(u,'createNotificationRegion');u.mount(document.body,u.createStack({children:[u.createText({text:'Document content'}),region({content:u.createText({text:'Completed'})}),u.createPopover({purpose:'inspector',context:'inline',icon:'file',triggerLabel:'2',label:'Conversation files',content:u.createText({text:'Files'})}as never)]}));});
 const region=page.locator('.pui-notification-region');await expect(region).toHaveCSS('position','fixed');const b=(await region.boundingBox())!;expect(b.y).toBe(96);expect(b.x+b.width).toBe(1256);await page.getByRole('button',{name:'Conversation files'}).click();const panel=page.getByRole('region',{name:'Conversation files'});expect((await panel.boundingBox())!.width).toBe(560);
});

test('a breadcrumb, mobile navigation action and success mark retain finite navigation geometry',async({page})=>{
 await page.setViewportSize({width:1280,height:800});await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');u.mount(document.body,u.createStack({children:[Reflect.get(u,'createBreadcrumb')({label:'Location',items:[{key:'workspace',label:'Workspace',icon:'folder'},{key:'conversation',label:'New conversation'}]}),u.createIconButton({context:'navigation-toggle',label:'Open navigation',icon:'menu'}as never),u.createIcon({name:'check',context:'notice',tone:'success',label:'Completed'}as never)]}));});
 await expect(page.getByRole('navigation',{name:'Location'})).toHaveCSS('font-size','12px');await expect(page.getByRole('button',{name:'Open navigation'})).toBeHidden();expect((await page.getByRole('img',{name:'Completed'}).boundingBox())!.width).toBe(23);await page.setViewportSize({width:600,height:800});await expect(page.getByRole('button',{name:'Open navigation'})).toBeVisible();
});

test('dialog fields keep accessible hidden labels, inline credential state and an explicit close action',async({page})=>{
 await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');u.mount(document.body,u.createForm({context:'dialog',cancelLabel:'Close',onCancel(){},children:[u.createSelect({label:'Appearance',labelVisibility:'hidden',options:[{value:'system',label:'System'}]}as never),u.createSecretInput({label:'API key',status:'Configured'}as never),u.createFormSection({context:'model',title:'Model',children:[u.createTextInput({label:'Name'})]}as never)],onSubmit:()=>({ok:true})}as never));});
 await expect(page.getByRole('combobox',{name:'Appearance'})).toBeVisible();await expect(page.getByText('Configured',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Close',exact:true})).toBeVisible();await expect(page.locator('fieldset.pui-section-model>legend')).toHaveText('Model');
});

test('a compact queued collection preserves a leading marker and bounded scroll frame',async({page})=>{
 await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');u.mount(document.body,u.createList({context:'queue',items:Array.from({length:10},(_,index)=>({key:String(index),content:u.createListRow({context:'queue',title:'A queued message '+index,marker:u.createStatus({label:'Follow-up'}),actions:u.createIconButton({label:'Edit queued message '+index,icon:'edit',context:'inline'})}as never)}))}as never));});
 const list=page.locator('.pui-list-queue');await expect(list).toHaveCSS('max-height','180px');expect(await list.evaluate(n=>n.scrollHeight>n.clientHeight)).toBe(true);const row=page.locator('.pui-list-row-queue').first();await expect(row).toHaveCSS('border-top-width','0px');await expect(row.locator('.pui-list-row-marker')).toHaveText('Follow-up');
});

test('message copying uses an explicit icon while file copying keeps the existing text action',async({page})=>{
 await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');u.mount(document.body,u.createActions({children:[u.createCopyButton({presentation:'icon',label:'Copy message',value:'Message',onCopy:()=>({ok:true})}as never),u.createCopyButton({label:'Copy path',value:'/tmp/file',onCopy:()=>({ok:true})})]}));});
 await expect(page.getByRole('button',{name:'Copy message'}).locator('svg')).toHaveCount(1);await expect(page.getByRole('button',{name:'Copy path'}).locator('svg')).toHaveCount(0);await page.getByRole('button',{name:'Copy message'}).click();
});

test('a selected navigation disclosure keeps its selected state independently of opening and actions',async({page})=>{
 await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');const control=u.createDisclosure({context:'navigation',selected:true,title:'Current workspace',icon:'folder',content:u.createText({text:'Items'})}as never);u.mount(document.body,control);Reflect.set(window,'selectedDisclosure',control);});
 await expect(page.locator('summary')).toHaveCSS('color','rgb(41, 44, 51)');await page.evaluate(()=>Reflect.get(window,'selectedDisclosure').update({title:'Current workspace',selected:false}));await expect(page.locator('.pui-disclosure-navigation')).not.toHaveClass(/pui-selected/);
});
