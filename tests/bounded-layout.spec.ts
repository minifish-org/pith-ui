import {test,expect} from '@playwright/test';

// Geometry is measured against the accepted pre-migration control composition.
// No consumer CSS, DOM slots or numeric presentation options participate.
test('fixed content columns restore reading, editing and introduction measures without public pixels',async({page})=>{
  await page.setViewportSize({width:1280,height:800});await page.goto('/tests/fixture.html');
  await page.evaluate(async()=>{const u=await import('../src/index.js');const make=Reflect.get(u,'createContentColumn') as (v:unknown)=>u.Control;u.mount(document.body,u.createStack({children:['reading','input','intro'].map(purpose=>make({purpose,content:u.createText({text:purpose})}))}));});
  for(const [purpose,width]of [['reading',774],['input',810],['intro',650]]as const){const box=await page.locator('.pui-column-'+purpose).boundingBox();expect(box!.width).toBe(width);expect(box!.x+box!.width/2).toBe(640);}
});

test('a surface owns one input shell and separates leading and trailing inline actions',async({page})=>{
  await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');const make=Reflect.get(u,'createSurface') as(v:unknown)=>u.Control;const toolbar=u.createToolbar({label:'Editor actions',leading:u.createSelect({label:'Permission',context:'inline',icon:'shield',tone:'warning',options:[{value:'full',label:'Full access'}]}),trailing:u.createIconButton({label:'Send',icon:'up',context:'inline'})}as never);u.mount(document.body,make({content:u.createPromptInput({label:'Draft',value:'Retained text'}),footer:toolbar}));});
  const input=page.getByRole('textbox',{name:'Draft'});await expect(input).toHaveCSS('border-top-width','0px');await expect(page.getByRole('combobox',{name:'Permission'})).toBeVisible();
  const select=(await page.getByRole('combobox',{name:'Permission'}).boundingBox())!,send=(await page.getByRole('button',{name:'Send'}).boundingBox())!;expect(send.x-select.x).toBeGreaterThan(500);expect(send.height).toBe(32);await expect(page.locator('.pui-inline-choice')).toHaveCSS('color','rgb(150, 94, 9)');
  await input.fill('Keep selection');await input.press('Home');await input.press('Shift+ArrowRight');await expect(input).toHaveValue('Keep selection');expect(await input.evaluate(n=>{const x=n as HTMLTextAreaElement;return x.selectionEnd-x.selectionStart;})).toBe(1);
});

test('navigation and inline disclosures keep header icons and auxiliary actions in one compact row',async({page})=>{
 await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');const row=u.createListRow({context:'navigation',title:'Saved conversation',selected:true,onAction(){},actions:u.createIconButton({label:'Conversation actions',icon:'more',context:'inline'})}as never);u.mount(document.body,u.createDisclosure({context:'navigation',title:'Workspace',icon:'folder',open:true,actions:u.createIconButton({label:'New conversation',icon:'plus',context:'inline'}),content:row}as never));});
 const heading=page.locator('summary'),action=page.getByRole('button',{name:'New conversation'});await expect(heading.locator('svg')).toHaveCount(2);expect((await heading.boundingBox())!.height).toBeLessThanOrEqual(40);expect(Math.abs((await action.boundingBox())!.y-(await heading.boundingBox())!.y)).toBeLessThan(8);await expect(page.locator('.pui-disclosure')).toHaveCSS('border-top-width','0px');await expect(page.locator('.pui-list-row')).toHaveCSS('border-top-width','0px');
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
