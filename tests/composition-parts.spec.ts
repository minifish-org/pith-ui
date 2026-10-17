import {test,expect} from '@playwright/test';

test('small layout pieces own keyed children and preserve input selection while reordered',async({page})=>{
  await page.goto('/tests/fixture.html');
  await page.evaluate(async()=>{
    const u=await import('../src/index.js');const a=u.createTextInput({label:'First',value:'Draft 中文'}),b=u.createTextInput({label:'Second',value:'Other'});
    const list=u.createList({items:[{key:'a',content:a},{key:'b',content:b}]});const slot=u.createSlot({content:u.createText({text:'Footer'})});
    const pane=u.createPane({header:u.createText({role:'heading',text:'Editor'}),content:list,footer:slot});
    const layout=u.createSplitPane({navigation:u.createButton({label:'Navigation'}),content:pane});const mounted=u.mount(document.body,layout);
    Object.assign(window,{parts:{u,a,b,list,slot,layout,mounted}});
  });
  await page.getByLabel('First',{exact:true}).focus();
  await page.getByLabel('First',{exact:true}).evaluate((node:HTMLInputElement)=>node.setSelectionRange(2,5));
  await page.evaluate(()=>{const p=Reflect.get(window,'parts');p.list.update({items:[{key:'b',content:p.b},{key:'a',content:p.a}]});p.slot.set(p.u.createText({text:'Updated footer'}));});
  await expect(page.getByLabel('First',{exact:true})).toBeFocused();
  await expect(page.getByLabel('First',{exact:true})).toHaveValue('Draft 中文');
  expect(await page.getByLabel('First',{exact:true}).evaluate((node:HTMLInputElement)=>[node.selectionStart,node.selectionEnd])).toEqual([2,5]);
  await expect(page.getByText('Updated footer')).toBeVisible();
  await page.evaluate(()=>Reflect.get(window,'parts').mounted.destroy());
  await expect(page.getByLabel('First',{exact:true})).toHaveCount(0);
});

test('generic mount owns independent small dialogs without an app or scene interface',async({page})=>{
  await page.goto('/tests/fixture.html');
  await page.evaluate(async()=>{const u=await import('../src/index.js');const mounted=u.mount(document.body,u.createText({text:'Main'}));const dialog=u.createConfirmDialog({title:'Independent',onConfirm:()=>({ok:true})});const owner=mounted.attach(dialog);dialog.open();Object.assign(window,{parts:{mounted,dialog,owner}});});
  await expect(page.getByRole('dialog',{name:'Independent',exact:true})).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'parts').mounted.read().hasModal)).toBe(true);
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>Reflect.get(window,'parts').mounted.read().hasModal)).toBe(false);
  await page.evaluate(()=>Reflect.get(window,'parts').mounted.destroy());
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('content pieces sanitize Markdown and diff while preserving unchanged reading nodes',async({page})=>{
  await page.goto('/tests/fixture.html');
  await page.evaluate(async()=>{const u=await import('../src/index.js');const text=u.createMarkdown({text:'# Title\n\nSafe <script>bad()</script> text'});const diff=u.createDiff({text:'-<script>bad()</script>\n+safe'});u.mount(document.body,u.createStack({children:[text,diff]}));Object.assign(window,{parts:{text,first:document.querySelector('.pui-markdown h1')}});});
  await expect(page.locator('.pui-markdown script, .pui-diff script')).toHaveCount(0);
  await expect(page.locator('.pui-diff-add')).toContainText('+safe');
  await page.evaluate(()=>{const p=Reflect.get(window,'parts');p.text.update({text:'# Title\n\nSafe <script>bad()</script> text and streaming'});p.same=p.first===document.querySelector('.pui-markdown h1');});
  expect(await page.evaluate(()=>Reflect.get(window,'parts').same)).toBe(true);
});

test('safe content routes link failures locally and ignores completion after destroy',async({page})=>{
  await page.goto('/tests/fixture.html');
  await page.evaluate(async()=>{const u=await import('../src/index.js');const errors:string[]=[],global:string[]=[];window.addEventListener('error',event=>global.push(event.message));let finish!:(value:{ok:false;error:string})=>void;const block=u.createMarkdown({text:'[Throw](https://throw.test) [Late](https://late.test)\n\n```ts\nsecret\n```',onLink:url=>{if(url.includes('throw'))throw new Error('Local failure');return new Promise(resolve=>{finish=resolve;});},onError:message=>errors.push(message)});const owner=u.mount(document.body,block);Object.assign(window,{parts:{errors,global,owner,finish:()=>finish({ok:false,error:'Late failure'})}});});
  await page.getByRole('link',{name:'Throw',exact:true}).click();
  expect(await page.evaluate(()=>Reflect.get(window,'parts').errors)).toEqual(['Local failure']);
  expect(await page.evaluate(()=>Reflect.get(window,'parts').global)).toEqual([]);
  await expect(page.getByRole('button',{name:'Copy code',exact:true})).toBeHidden();
  await page.getByRole('link',{name:'Late',exact:true}).click();
  await page.evaluate(()=>{const p=Reflect.get(window,'parts');p.owner.destroy();p.finish();});
  expect(await page.evaluate(()=>Reflect.get(window,'parts').errors)).toEqual(['Local failure']);
});
