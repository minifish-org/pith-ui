import {expect,test} from '@playwright/test';

test.beforeEach(async({page})=>{await page.goto('/tests/fixture.html');});

test('small controls mount without DOM handles and preserve draft, selection and native validation',async({page})=>{
  await page.evaluate(async()=>{
    const ui=await import('../src/index.js');
    const name=ui.createTextInput({label:'Connection name',value:'Original',required:true});
    const count=ui.createNumberInput({label:'Tokens',value:'4',min:1,max:10,step:1});
    const form=ui.createForm({children:[name,count],submitLabel:'Save connection',onSubmit:()=>{name.update({label:'Connection name',error:'Rejected'});return {ok:false,error:'Save failed'};}});
    const mounted=ui.mount(document.body,form);
    Object.assign(window,{controls:{name,count,form,mounted}});
  });
  const name=page.getByRole('textbox',{name:/^Connection name/});
  await name.fill('中文 draft');await name.press('ArrowLeft');
  await page.evaluate(()=>{
    const {name}=Reflect.get(window,'controls');name.update({label:'Connection name',description:'Feedback only'});
  });
  await expect(name).toHaveValue('中文 draft');await expect(name).toBeFocused();
  expect(await name.evaluate(node=>(node as HTMLInputElement).selectionStart)).toBe(7);
  await page.getByRole('spinbutton',{name:'Tokens',exact:true}).fill('20');
  await page.getByRole('button',{name:'Save connection',exact:true}).click();
  await expect(page.getByText('Save failed',{exact:true})).toHaveCount(0);
  await page.getByRole('spinbutton',{name:'Tokens',exact:true}).fill('5');
  await page.getByRole('button',{name:'Save connection',exact:true}).click();
  await expect(page.getByText('Save failed',{exact:true})).toBeVisible();await expect(name).toHaveValue('中文 draft');
  expect(await page.evaluate(()=>{const {name}=Reflect.get(window,'controls');return Object.keys(name).sort();})).toEqual(['destroy','focus','read','reset','update']);
});

test('form pending combines external availability and destroying invalidates late writes',async({page})=>{
  await page.evaluate(async()=>{
    const ui=await import('../src/index.js');let finish:(value:import('../src/index.js').ActionResult)=>void=()=>{};let submits=0;
    const name=ui.createTextInput({label:'Name',value:'Keep me'});
    const form=ui.createForm({children:[name],onSubmit:()=>{submits++;return new Promise(resolve=>{finish=resolve;});}});
    const mounted=ui.mount(document.body,form);Object.assign(window,{controls:{form,mounted,finish:()=>finish({ok:false,error:'Late failure'}),count:()=>submits}});
  });
  await page.getByRole('button',{name:'Save',exact:true}).click();await expect(page.getByRole('button',{name:'Save',exact:true})).toBeDisabled();
  await page.evaluate(()=>{const {form}=Reflect.get(window,'controls');form.update({disabled:true});form.submit();});
  expect(await page.evaluate(()=>Reflect.get(window,'controls').count())).toBe(1);
  await page.evaluate(()=>{const x=Reflect.get(window,'controls');x.mounted.destroy();x.finish();});
  await expect(page.getByText('Late failure',{exact:true})).toHaveCount(0);await expect(page.getByRole('textbox')).toHaveCount(0);
});

test('owned dialogs invalidate a child form on close and reopen without losing its draft',async({page})=>{
  await page.evaluate(async()=>{
    const ui=await import('../src/index.js');let finish:(value:import('../src/index.js').ActionResult)=>void=()=>{};
    const field=ui.createTextInput({label:'Draft',value:'Keep draft'});
    const form=ui.createForm({children:[field],onSubmit:()=>new Promise(resolve=>{finish=resolve;})});
    const dialog=ui.createDialog({title:'Owned dialog',content:form});
    const open=ui.createButton({label:'Open dialog',onAction:()=>dialog.open()});
    ui.mount(document.body,ui.createStack({children:[open,dialog]}));Object.assign(window,{controls:{dialog,finish:()=>finish({ok:false,error:'Old error'})}});
  });
  await page.getByRole('button',{name:'Open dialog',exact:true}).click();await page.getByRole('textbox',{name:'Draft',exact:true}).fill('New draft');
  await page.getByRole('button',{name:'Save',exact:true}).click();
  await page.getByRole('button',{name:'Close Owned dialog',exact:true}).click();
  await page.getByRole('button',{name:'Open dialog',exact:true}).click();
  await page.evaluate(()=>Reflect.get(window,'controls').finish());
  await expect(page.getByRole('textbox',{name:'Draft',exact:true})).toHaveValue('New draft');
  await expect(page.getByText('Old error',{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Save',exact:true})).toBeEnabled();
});

test('dropdown and native multiple list retain separate value and keyboard contracts',async({page})=>{
  await page.evaluate(async()=>{
    const ui=await import('../src/index.js');const options=[{value:'a',label:'First'},{value:'b',label:'Second'},{value:'c',label:'Unavailable',disabled:true}];
    const choice=ui.createSelect({label:'Provider',value:'a',options});
    const list=ui.createListSelect({label:'Models',multiple:true,values:['a'],options});
    ui.mount(document.body,ui.createStack({children:[choice,list]}));Object.assign(window,{controls:{choice,list}});
  });
  const select=page.getByRole('combobox',{name:'Provider',exact:true});await select.focus();await select.press('ArrowDown');await select.press('ArrowDown');await select.press('Enter');
  await expect(select).toHaveText('Second');
  const list=page.getByRole('listbox',{name:'Models',exact:true});await list.selectOption(['a','b']);
  expect(await page.evaluate(()=>Reflect.get(window,'controls').list.read())).toEqual(['a','b']);
  await page.evaluate(()=>Reflect.get(window,'controls').list.reset(['b']));await expect(list).toHaveValues(['b']);
  expect(await list.evaluate(node=>({size:(node as HTMLSelectElement).size,font:getComputedStyle(node).fontSize}))).toEqual({size:5,font:'16px'});
});

test('arbitrary styles, nodes, duplicate ownership and unmounted dialogs are rejected at runtime',async({page})=>{
  const failures=await page.evaluate(async()=>{
    const ui=await import('../src/index.js');const result:string[]=[];
    const rejects=(name:string,run:()=>unknown)=>{try{run();}catch{result.push(name);}};
    rejects('style',()=>ui.createButton({label:'Bad',...{style:{padding:100}}}));
    rejects('density',()=>ui.createTextInput({label:'Bad',...{density:'compact'}}));
    rejects('raw node',()=>ui.createStack({children:[document.body as unknown as import('../src/index.js').Control]}));
    const button=ui.createButton({label:'Owned'});const stack=ui.createStack({children:[button]});
    rejects('owner',()=>ui.createToolbar({label:'Duplicate',children:[button]}));
    rejects('duplicate',()=>{const x=ui.createText({text:'X'});return ui.createStack({children:[x,x]});});
    rejects('update',()=>button.update({label:'Bad',...{fontSize:100}}));
    const dialog=ui.createDialog({title:'Unmounted'});rejects('unmounted',()=>dialog.open());dialog.destroy();
    ui.mount(document.body,stack).destroy();rejects('destroyed',()=>ui.mount(document.body,button));
    return result;
  });
  expect(failures).toEqual(['style','density','raw node','owner','duplicate','update','unmounted','destroyed']);
});

test('menus, popovers, confirmation and text editing retain keyboard and late-response behavior',async({page})=>{
  await page.evaluate(async()=>{
    const ui=await import('../src/index.js');
    const editor=ui.createTextEditDialog({title:'Edit text',onSubmit:()=>({ok:false,error:'Keep the draft'})});
    const confirmation=ui.createConfirmDialog({title:'Delete item?',onConfirm:()=>({ok:true})});
    const menu=ui.createMenu({label:'Actions',items:[{id:'edit',label:'Edit',onAction:()=>editor.open({value:'Original'})},{id:'delete',label:'Delete',intent:'danger',onAction:()=>confirmation.open()}]});
    const popover=ui.createPopover({label:'Details',content:ui.createTextInput({label:'Detail',value:'Keep detail'})});
    ui.mount(document.body,ui.createStack({children:[menu,popover,editor,confirmation]}));
  });
  await page.getByRole('button',{name:'Actions',exact:true}).click();await page.getByRole('menuitem',{name:'Edit',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Edit text',exact:true})).toBeVisible();await page.getByRole('textbox',{name:'Message',exact:true}).fill('Draft 中文');await page.getByRole('button',{name:'Save',exact:true}).click();
  await expect(page.getByText('Keep the draft',{exact:true})).toBeVisible();await expect(page.getByRole('textbox',{name:'Message',exact:true})).toHaveValue('Draft 中文');
  await page.getByRole('dialog',{name:'Edit text',exact:true}).press('Escape');
  await page.getByRole('button',{name:'Details',exact:true}).click();await expect(page.getByRole('textbox',{name:'Detail',exact:true})).toHaveValue('Keep detail');
  await page.getByRole('textbox',{name:'Detail',exact:true}).press('Escape');await expect(page.getByRole('textbox',{name:'Detail',exact:true})).toHaveCount(0);
});

test('copy is an owned action with feedback and no clipboard access unless supplied',async({page})=>{
  await page.evaluate(async()=>{
    const ui=await import('../src/index.js');let copied='';
    const copy=ui.createCopyButton({value:'Example 中文',onCopy:async text=>{copied=text;return {ok:true};}});
    const mounted=ui.mount(document.body,copy);Object.assign(window,{controls:{mounted,copied:()=>copied}});
  });
  await page.getByRole('button',{name:'Copy',exact:true}).click();await expect(page.getByRole('button',{name:'Copied.',exact:true})).toHaveText('Copied');
  expect(await page.evaluate(()=>Reflect.get(window,'controls').copied())).toBe('Example 中文');
  await page.evaluate(()=>Reflect.get(window,'controls').mounted.destroy());await expect(page.getByRole('button')).toHaveCount(0);
});

test('context menu anchors to a control and retains failed async actions without duplicate submission',async({page})=>{
  await page.evaluate(async()=>{
    const ui=await import('../src/index.js');let calls=0;
    const menu=ui.createContextMenu({label:'Context actions',items:[{id:'fail',label:'Try action',onAction:async()=>{calls++;return {ok:false,error:'Context action failed'};}},{id:'delete',label:'Delete',intent:'danger',onAction:()=>({ok:true})}]});
    const trigger=ui.createButton({label:'Open context',onAction:()=>menu.open(trigger)});
    const mounted=ui.mount(document.body,ui.createStack({children:[trigger,menu]}));Object.assign(window,{controls:{calls:()=>calls,mounted}});
  });
  const trigger=page.getByRole('button',{name:'Open context',exact:true});await trigger.click();
  const item=page.getByRole('menuitem',{name:'Try action',exact:true});await item.click();
  await expect(page.getByText('Context action failed',{exact:true})).toBeVisible();await expect(item).toBeEnabled();
  expect(await page.evaluate(()=>Reflect.get(window,'controls').calls())).toBe(1);
  await item.press('Escape');await expect(trigger).toBeFocused();await expect(item).toHaveCount(0);
});

for(const item of ['controls-form-page','controls-actions-page'])test(`the ${item} showroom page composes small public controls`,async({page})=>{
  await page.goto(`/?item=${item}&theme=dark&width=800`);
  await expect(page.locator('.gallery-docs')).toContainText('pith-ui · 正式受限积木');
  if(item==='controls-form-page'){
    await page.getByRole('combobox',{name:'模拟异步结果',exact:true}).click();await page.getByRole('option',{name:'失败 · 保留输入',exact:true}).click();
    const field=page.getByRole('textbox',{name:/^Connection name/});await field.fill('Owned draft');
    await page.getByRole('button',{name:'Save connection',exact:true}).click();await expect(page.locator('.gallery-preview')).toContainText('演示保存失败，输入保留。');
    await expect(page.getByRole('textbox',{name:/^Connection name/})).toHaveValue('Owned draft');
  }else{
    await page.getByRole('button',{name:'资源操作',exact:true}).click();await page.getByRole('menuitem',{name:'Edit resource',exact:true}).click();
    await expect(page.getByRole('dialog',{name:'Edit resource',exact:true})).toBeVisible();
  }
});

for(const theme of ['light','dark'] as const)test(`small controls use fixed typography and spacing in ${theme}`,async({page})=>{
  await page.evaluate(async(theme)=>{
    const ui=await import('../src/index.js');ui.mount(document.body,ui.createStack({children:[ui.createButton({label:'Save'}),ui.createTextInput({label:'Name'}),ui.createSelect({label:'Provider',options:[{value:'demo',label:'Demo'}]})]}),{appearance:theme});
  },theme);
  const button=page.getByRole('button',{name:'Save',exact:true});await button.focus();
  expect(await button.evaluate(node=>{const s=getComputedStyle(node);return {font:s.fontSize,line:s.lineHeight,outline:s.outlineStyle,padding:s.padding};})).toEqual({font:'14px',line:'21px',outline:'none',padding:'8px 12px'});
  expect(await page.locator('.pui-control-stack').evaluate(node=>getComputedStyle(node).gap)).toBe('12px');
});

test('idle actions activate once after availability changes and release their first pending operation on destroy',async({page})=>{
  await page.evaluate(async()=>{
    const u=await import('../src/index.js');let calls=0,finish!:(value:import('../src/index.js').ActionResult)=>void;
    const controls=[u.createButton({label:'First button',disabled:true,onAction:()=>{calls++;return new Promise(resolve=>finish=resolve);}}),u.createIconButton({label:'Unused icon',icon:'plus',onAction:()=>{calls++;}}),u.createTextAction({label:'Unused text',onAction:()=>{calls++;}})];
    const mounted=u.mount(document.body,u.createStack({children:controls}));
    Object.assign(window,{activation:{enable(){controls[0].update({label:'First button',disabled:false});},destroy(){mounted.destroy();},finish(){finish({ok:false,error:'Stale first failure'});},calls:()=>calls}});
  });
  await expect(page.getByRole('button',{name:'First button',exact:true})).toBeDisabled();
  await page.evaluate(()=>Reflect.get(window,'activation').enable());
  const first=page.getByRole('button',{name:'First button',exact:true});await first.press('Enter');
  await expect(first).toBeDisabled();
  await page.evaluate(()=>{const state=Reflect.get(window,'activation');state.destroy();state.finish();});
  await expect(page.getByRole('button')).toHaveCount(0);
  await expect(page.getByText('Stale first failure',{exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>Reflect.get(window,'activation').calls())).toBe(1);
});

for(const kind of ['action','copy'] as const)test(`closing and reopening an owned ${kind} retires its pending feedback`,async({page})=>{
  await page.evaluate(async kind=>{
    const u=await import('../src/index.js');let finish!:(value:import('../src/index.js').ActionResult)=>void;const errors:string[]=[];
    const task=()=>new Promise<import('../src/index.js').ActionResult>(resolve=>finish=resolve);
    const action=kind==='copy'?u.createCopyButton({value:'Saved text',label:'Deferred action',onCopy:task,onError:message=>errors.push(message)}):u.createButton({label:'Deferred action',onAction:task,onError:message=>errors.push(message)});
    const dialog=u.createDialog({title:'Retained surface',content:action});
    u.mount(document.body,u.createStack({children:[u.createButton({label:'Open retained surface',onAction:()=>dialog.open()}),dialog]}));
    Object.assign(window,{retained:{finish:()=>finish({ok:false,error:'Previous target failed'}),errors}});
  },kind);
  await page.getByRole('button',{name:'Open retained surface',exact:true}).click();
  await page.getByRole('button',{name:'Deferred action',exact:true}).click();
  await page.getByRole('button',{name:'Close Retained surface',exact:true}).click();
  await page.getByRole('button',{name:'Open retained surface',exact:true}).click();
  await expect(page.getByRole('button',{name:'Deferred action',exact:true})).toBeEnabled();
  await page.evaluate(()=>Reflect.get(window,'retained').finish());
  expect(await page.evaluate(()=>Reflect.get(window,'retained').errors)).toEqual([]);
  await expect(page.getByText('Previous target failed',{exact:true})).toHaveCount(0);
});
