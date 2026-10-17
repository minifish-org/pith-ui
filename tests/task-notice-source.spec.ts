import {test, expect} from '@playwright/test';

// Source: published0.3.1 tasks/approval.ts, files/systems.ts, composer.ts and
// styles.css:583–612/669–679/860–869. The host uses explicit document flow;
// these small pieces own their warning body, footer, queue and overlay layout.
test('an input warning notice keeps the source flow, code preview and separate footer note', async ({page}) => {
  await page.setViewportSize({width:1280,height:800});
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const u = await import('../src/index.js');
    const heading = u.createToolbar({label:'Notice heading',leading:u.createActions({align:'start',children:[u.createIcon({name:'shield',context:'notice'}),u.createStack({context:'flow',children:[u.createText({role:'label',tone:'warning',text:'Pith needs your permission'}),u.createText({role:'caption',tone:'warning',text:'Review this action before it runs.'})]})]}),trailing:u.createStatus({label:'edit_file',presentation:'code',tone:'warning'})});
    const file = u.createSlot({content:u.createActions({align:'start',children:[u.createText({role:'caption',text:'',value:'Modify file'}),u.createText({role:'code',text:'README.md'})]})});
    const diff = u.createSlot({content:u.createDocument({format:'diff',text:'--- a/README.md\n+++ b/README.md\n-Old layout\n+Preserved layout'})});
    const args = u.createDisclosure({context:'readout',title:'Tool arguments',content:u.createDocument({format:'text',text:'{"path":"README.md"}'})});
    const note = u.createSlot({content:u.createText({role:'caption',tone:'warning',text:'Workspace permission applies to this conversation. Commands and external connection tools still need approval.'})});
    const footer = u.createStack({context:'flow',children:[note,u.createActions({align:'end',children:[u.createButton({label:'Deny'}),u.createButton({label:'Always allow workspace changes'}),u.createButton({label:'Allow this action',intent:'primary',icon:'check'})]})]});
    const card = u.createSurface({purpose:'notice',tone:'warning',content:u.createStack({context:'flow',children:[heading,file,diff,u.createSlot({content:args})]}),footer});
    u.mount(document.body,u.createContentColumn({purpose:'input',content:u.createStack({context:'flow',children:[u.createScrollArea({label:'Pending details',content:u.createStack({context:'flow',children:[u.createSlot({content:card})]})})]})}));
  });
  const card=page.locator('.pui-notice-surface'), heading=page.getByRole('toolbar',{name:'Notice heading'}), title=page.getByText('Pith needs your permission',{exact:true});
  await expect(title).toHaveCSS('color','rgb(119, 73, 5)');
  expect((await heading.boundingBox())!.height).toBe(46);
  const badge=page.getByText('edit_file',{exact:true});expect(await badge.evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
  const file=page.getByText('Modify file',{exact:true}).locator('xpath=ancestor::*[contains(@class,"pui-actions")][1]');
  await expect(file).toHaveCSS('margin','12px 0px 8px');await expect(file).toHaveCSS('align-items','baseline');
  const code=page.getByText('README.md',{exact:true});await expect(code).toHaveCSS('font-size','12px');await expect(code).toHaveCSS('color','rgb(31, 37, 48)');
  const diff=page.getByLabel('Proposed file changes');await expect(diff).toHaveCSS('font-size','12px');await expect(diff).toHaveCSS('line-height','18px');await expect(diff).toHaveCSS('padding','8px 0px');await expect(diff).toHaveCSS('border-top-width','1px');await expect(diff).toHaveCSS('margin','12px 0px');await expect(diff).toHaveCSS('max-height','208px');expect((await diff.boundingBox())!.height).toBe(90);
  const summary=page.locator('summary');await expect(summary).toHaveCSS('padding','0px');expect((await summary.boundingBox())!.height).toBe(18);
  const note=page.getByText(/^Workspace permission applies/).locator('xpath=ancestor::*[contains(@class,"pui-slot")][1]');await expect(note).toHaveCSS('margin','8px 0px 12px');
  const deny=page.getByRole('button',{name:'Deny',exact:true});await expect(deny).toHaveCSS('background-color','rgb(240, 242, 246)');await expect(deny).toHaveCSS('font-weight','600');await expect(deny).toHaveCSS('border-radius','7px');
  expect((await card.boundingBox())!.height).toBe(320);
  await summary.click();const args=page.locator('.pui-disclosure-content pre');await expect(args).toHaveCSS('font-size','12px');await expect(args).toHaveCSS('padding','12px');await expect(args).toHaveCSS('max-height','160px');await expect(args).toHaveCSS('background-color','rgb(255, 236, 203)');
});

test('queue actions retain their source quiet sizes without enlarging one pending row', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async()=>{const u=await import('../src/index.js');u.mount(document.body,u.createList({context:'queue',items:[{key:'heading',content:u.createText({role:'label',text:'Pending messages'})},{key:'message',content:u.createListRow({context:'queue',title:'Simulated queued follow-up',actions:u.createActions({children:[u.createTextAction({context:'inline',label:'Steer',icon:'steer'}),u.createIconButton({context:'inline',label:'Edit pending message',icon:'edit'}),u.createIconButton({context:'inline',label:'Delete pending message',icon:'trash'})]})})}]}));});
  expect((await page.locator('.pui-list-queue').boundingBox())!.height).toBe(78);
  const steer=page.getByRole('button',{name:'Steer',exact:true});expect((await steer.boundingBox())!.height).toBe(26);await expect(steer).toHaveCSS('border-top-width','0px');await expect(steer).toHaveCSS('padding','4px');
  const edit=page.getByRole('button',{name:'Edit pending message',exact:true});expect((await edit.boundingBox())!.width).toBe(23);expect((await edit.boundingBox())!.height).toBe(23);await expect(edit).toHaveCSS('border-top-width','0px');await expect(edit.locator('svg')).toHaveCSS('width','15px');
});

for(const width of [1280,360])test(`notification pieces retain the source top alignment and paragraph flow at ${width}`,async({page})=>{
  await page.setViewportSize({width,height:800});await page.goto('/tests/fixture.html');
  await page.evaluate(async()=>{const u=await import('../src/index.js');const contents=u.createToolbar({label:'Task completed',leading:u.createActions({align:'start',children:[u.createIcon({name:'check',context:'notice',tone:'success'}),u.createStack({context:'flow',children:[u.createText({role:'label',text:'Task completed'}),u.createText({role:'caption',text:'Review workspace · Conversation b'}),u.createTextAction({context:'link',label:'Open conversation'})]})]}),trailing:u.createIconButton({context:'inline',label:'Dismiss completion notification',icon:'close'})});u.mount(document.body,u.createNotificationRegion({label:'Completed tasks',content:u.createList({items:[{key:'done',content:u.createSurface({purpose:'notice',content:contents})}]})}));});
  const region=page.getByRole('region',{name:'Completed tasks'}), card=page.locator('.pui-notice-surface'), icon=card.locator('[data-icon="check"]'), dismiss=page.getByRole('button',{name:'Dismiss completion notification',exact:true});
  const box=(await region.boundingBox())!,a=(await icon.boundingBox())!,d=(await dismiss.boundingBox())!;expect(box.width).toBe(width===1280?360:328);expect(box.x+box.width).toBe(width-(width===1280?24:16));expect(box.y).toBe(width===1280?96:76);
  expect(a.y-box.y).toBe(17);expect(d.y-box.y).toBe(17);expect(d.height).toBe(22);expect(d.width).toBe(22);await expect(dismiss).toHaveCSS('border-top-width','0px');await expect(dismiss.locator('svg')).toHaveCSS('width','19px');
  const caption=card.getByText('Review workspace · Conversation b',{exact:true}).locator('xpath=parent::*');await expect(caption).toHaveCSS('margin','8px 0px');
  const open=page.getByRole('button',{name:'Open conversation',exact:true});await expect(open).toHaveCSS('padding','0px');await expect(open).toHaveCSS('text-decoration-line','none');expect((await open.boundingBox())!.height).toBe(18);
  if(width===1280){expect((await card.boundingBox())!.height).toBe(110);expect((await open.boundingBox())!.x-a.x-a.width).toBe(12);}
});
