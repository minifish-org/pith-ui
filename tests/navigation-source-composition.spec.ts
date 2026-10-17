import {test, expect, type Page} from '@playwright/test';

// Literal accepted0.3.1 styles.css393–424 and Desk52c0d4d call structure.
// Include nested action groups, closed menus and hidden status slots: a flat
// isolated disclosure cannot catch wrapping or the extra flex gaps they create.
async function openNavigation(page: Page) {
  await page.setViewportSize({width:1280,height:800});
  await page.goto('/tests/fixture.html');
  await page.evaluate(async()=>{
    const ui=await import('../src/index.js');
    const menu=(label:string)=>{
      const popup=ui.createContextMenu({label,items:[{id:'rename',label:'Rename',onAction(){}}]});
      const trigger=ui.createIconButton({context:'navigation',label,icon:'more',onAction:()=>popup.open(trigger)});
      return ui.createActions({children:[trigger,popup]});
    };
    const conversation=(label:string,selected=false)=>ui.createSlot({content:ui.createListRow({title:label,selected,context:'navigation',
      status:ui.createSlot({content:ui.createStatus({label:'',presentation:'indicator'}),hidden:true}),actions:menu('Actions for '+label),onAction(){}})});
    const children=ui.createList({items:[{key:'a',content:conversation('Simulated layout review',true)},{key:'b',content:conversation('Conversation b')}]});
    const first=ui.createDisclosure({context:'navigation',title:'Review workspace',icon:'folder',open:true,selected:true,content:children,
      actions:ui.createActions({children:[menu('Workspace actions'),ui.createIconButton({context:'navigation',icon:'compose',label:'New conversation'})]})});
    const second=ui.createDisclosure({context:'navigation',title:'Other workspace',icon:'folder',content:ui.createText({text:'No conversations yet'}),
      actions:ui.createActions({children:[menu('Other workspace actions'),ui.createIconButton({context:'navigation',icon:'compose',label:'Other new conversation'})]})});
    const list=ui.createList({items:[{key:'first',content:ui.createSlot({content:first})},{key:'second',content:ui.createSlot({content:second})}]});
    const footer=ui.createStack({context:'flow',children:[...(['Workspace resources','Connections','Settings'] as const).map(label=>ui.createTextAction({context:'navigation',label})),ui.createNotice({presentation:'inline',message:''})]});
    const image=ui.createImage({purpose:'brand',label:'',source:'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="24" height="24"/%3E'});
    const sidebar=ui.createPane({purpose:'navigation',header:ui.createStack({children:[ui.createBrand({image,label:'Pith',qualifier:'Desk'}),
      ui.createToolbar({label:'Workspaces',leading:ui.createText({role:'label',text:'WORKSPACES'}),trailing:ui.createIconButton({context:'inline',icon:'plus',label:'Manage workspaces'})}),
      ui.createSearchInput({context:'navigation',label:'Search conversation titles',placeholder:'Search conversations'})]}),
      content:ui.createStack({children:[list,ui.createSlot({hidden:true}),ui.createSlot({hidden:true})]}),footer});
    const intro=ui.createContentColumn({purpose:'intro',content:ui.createStack({children:[ui.createSlot({content:ui.createStack({context:'flow',children:[
      ui.createActions({align:'center',children:[ui.createText({role:'caption',text:'Working in Review workspace'}),ui.createButton({label:'Change'})]})]})})]})});
    ui.mount(document.body,ui.createSplitPane({navigation:sidebar,content:ui.createPane({purpose:'conversation',content:intro})}),{appearance:'light',viewport:'window'});
  });
  await page.mouse.move(1,1);
}

test('navigation disclosure action groups keep the accepted single-row geometry',async({page})=>{
  await openNavigation(page);
  const summary=page.locator('.pui-disclosure-navigation>summary').first();
  await expect(summary).toHaveCSS('height','37px');
  await expect(summary.locator('>.pui-disclosure-chevron')).toHaveCSS('width','10px');
  await expect(summary.locator('>.pui-disclosure-icon svg')).toHaveCSS('width','16px');
  const bounds=(await summary.boundingBox())!;
  const title=(await summary.locator('>span:not([class])').boundingBox())!;
  expect(title.x-bounds.x).toBe(50);
  const more=page.getByRole('button',{name:'Workspace actions',exact:true});
  const add=page.getByRole('button',{name:'New conversation',exact:true});
  for(const action of [more,add]){
    await expect(action).toHaveCSS('height','27px');
    await expect(action).toHaveCSS('border-top-width','0px');
    await expect(action).toHaveCSS('color','rgb(102, 112, 133)');
  }
  expect((await more.boundingBox())!.x).toBe(bounds.x+bounds.width-62);
  expect((await add.boundingBox())!.x).toBe(bounds.x+bounds.width-31);
  expect((await more.boundingBox())!.y).toBe(bounds.y+5);
  const first=page.getByRole('button',{name:'Simulated layout review',exact:true});
  expect((await first.boundingBox())!.y).toBe(bounds.y+41);
  const second=(await page.locator('.pui-disclosure-navigation>summary').nth(1).boundingBox())!;
  expect(second.y).toBe(bounds.y+119+8);
});

test('navigation rows keep the original text allocation and hidden status takes no space',async({page})=>{
  await openNavigation(page);
  const selected=page.getByRole('button',{name:'Simulated layout review',exact:true});
  const other=page.getByRole('button',{name:'Conversation b',exact:true});
  await expect(selected).toHaveCSS('color','rgb(31, 37, 48)');
  await expect(other).toHaveCSS('color','rgb(93, 103, 122)');
  const row=selected.locator('xpath=ancestor::*[contains(concat(" ",normalize-space(@class)," ")," pui-list-row-navigation ")][1]');
  expect((await row.boundingBox())!.width-(await selected.boundingBox())!.width).toBe(29);
  const actions=page.getByRole('button',{name:'Actions for Simulated layout review',exact:true});
  await expect(actions).toHaveCSS('width','25px');
  await expect(actions).toHaveCSS('height','25px');
  expect((await other.boundingBox())!.y-(await selected.boundingBox())!.y).toBe(41);
});

test('navigation heading and footer retain source alignment and contiguous action rows',async({page})=>{
  await openNavigation(page);
  const toolbar=page.getByRole('toolbar',{name:'Workspaces',exact:true});
  const label=toolbar.getByText('WORKSPACES',{exact:true});
  const bounds=(await toolbar.boundingBox())!;
  expect((await label.boundingBox())!.y).toBe(bounds.y+1);
  await expect(page.getByRole('button',{name:'Manage workspaces',exact:true})).toHaveCSS('color','rgb(102, 112, 133)');
  const rows=await Promise.all(['Workspace resources','Connections','Settings'].map(name=>page.getByRole('button',{name,exact:true}).boundingBox()));
  for(let i=0;i<rows.length-1;i++)expect(rows[i+1]!.y).toBe(rows[i]!.y+37);
  expect(rows[2]!.y+rows[2]!.height).toBe(784);
});

test('intro location action retains source secondary-button treatment',async({page})=>{
  await openNavigation(page);
  const change=page.getByRole('button',{name:'Change',exact:true});
  await expect(change).toHaveCSS('font-weight','600');
  await expect(change).toHaveCSS('background-color','rgb(240, 242, 246)');
  await expect(change).toHaveCSS('border-radius','7px');
});
