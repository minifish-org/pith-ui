import {test,expect} from '@playwright/test';

test('prompt input preserves IME, draft updates, cursor insertion and explicit submit',async({page})=>{
  await page.goto('/tests/fixture.html');
  await page.evaluate(async()=>{const u=await import('../src/index.js');const sent:string[]=[],drafts:string[]=[];const input=u.createPromptInput({label:'Message',value:'Review OLD please',onInput:value=>drafts.push(value),onSubmit:async value=>{sent.push(value);return {ok:true};}});const owner=u.mount(document.body,input);Object.assign(window,{consumer:{input,sent,drafts,owner}});});
  const input=page.getByRole('textbox',{name:'Message',exact:true});await input.focus();
  await input.evaluate((node:HTMLTextAreaElement)=>{node.setSelectionRange(7,10);node.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true,cancelable:true}));});
  expect(await page.evaluate(()=>Reflect.get(window,'consumer').sent)).toEqual([]);
  await page.evaluate(()=>{const c=Reflect.get(window,'consumer');c.input.update({label:'Message',readOnly:false});c.input.insert('`docs/file.md`');});
  await expect(input).toHaveValue('Review `docs/file.md` please');
  await input.press('Enter');expect(await page.evaluate(()=>Reflect.get(window,'consumer').sent)).toEqual(['Review `docs/file.md` please']);
});

test('image is an owned small control with zoom and safe source replacement',async({page})=>{
  await page.goto('/tests/fixture.html');
  await page.evaluate(async()=>{const u=await import('../src/index.js');const image=u.createImage({label:'Attachment',source:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="30"><rect width="40" height="30" fill="blue"/></svg>')});const owner=u.mount(document.body,image);Object.assign(window,{consumer:{image,owner}});});
  await page.getByRole('button',{name:'Open Attachment',exact:true}).click();
  await expect(page.getByRole('dialog',{name:'Attachment',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Zoom in',exact:true}).click();
  await page.evaluate(()=>Reflect.get(window,'consumer').image.update({label:'New image',source:''}));
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.evaluate(()=>Reflect.get(window,'consumer').owner.destroy());
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('reading area searches across composed items and retains reading intent on updates',async({page})=>{
  await page.goto('/tests/fixture.html');
  await page.evaluate(async()=>{const u=await import('../src/index.js');const items=Array.from({length:40},(_,i)=>({key:String(i),revision:'1',content:u.createMarkdown({text:`## Item ${i}\n\nKnown phrase 中文 line ${i}.`})}));const reader=u.createReadingArea({label:'Reading',identity:'a',items});const owner=u.mount(document.body,reader);reader.find();Object.assign(window,{consumer:{reader,owner,items}});});
  await page.getByRole('searchbox',{name:'Find in this conversation',exact:true}).fill('Known phrase');
  await expect(page.locator('[data-find-count]')).toContainText('40');
  await page.getByRole('button',{name:'Next match',exact:true}).click();
  await page.evaluate(()=>{const c=Reflect.get(window,'consumer');c.reader.update({label:'Reading',identity:'a',items:c.items});});
  await expect(page.getByRole('searchbox',{name:'Find in this conversation',exact:true})).toHaveValue('Known phrase');
  await page.evaluate(()=>Reflect.get(window,'consumer').owner.destroy());await expect(page.getByRole('searchbox')).toHaveCount(0);
});

test('a drop area owns hit testing and excludes disabled drop intents',async({page})=>{
  await page.goto('/tests/fixture.html');
  await page.evaluate(async()=>{const u=await import('../src/index.js');const events:unknown[]=[],drop=u.createDropArea({content:u.createText({text:'Target'}),onDrop:value=>events.push(value)});const owner=u.mount(document.body,drop);Object.assign(window,{consumer:{drop,owner,events}});});
  await page.evaluate(()=>Reflect.get(window,'consumer').drop.receiveNativeDrop({paths:['file.md'],x:-1,y:-1}));
  expect(await page.evaluate(()=>Reflect.get(window,'consumer').events)).toEqual([]);
  const rect=await page.getByText('Target',{exact:true}).boundingBox();
  await page.evaluate(rect=>{const c=Reflect.get(window,'consumer');c.drop.receiveNativeDrop({paths:['file.md'],x:rect!.x+3,y:rect!.y+3});c.drop.update({disabled:true});c.drop.receiveNativeDrop({paths:['again.md'],x:rect!.x+3,y:rect!.y+3});},rect);
  expect(await page.evaluate(()=>Reflect.get(window,'consumer').events)).toEqual([{paths:['file.md'],files:[],uris:'',hasUnidentifiedFiles:false}]);
});

test('message frames compose content and controls without scene state or DOM slots',async({page})=>{
  await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');u.mount(document.body,u.createMessage({role:'assistant',content:u.createMarkdown({text:'A **response**'}),actions:u.createCopyButton({value:'A response',onCopy:async()=>({ok:true})})}));});
  await expect(page.getByText('response',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Copy',exact:true}).click();
  await expect(page.getByRole('button',{name:'Copied.',exact:true})).toBeVisible();
});
