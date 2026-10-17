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

test('document pagination retains complete UTF-8 content and fixed controls',async({page})=>{
  await page.goto('/tests/fixture.html');const text='中文 🐟\n'.repeat(36000);
  await page.evaluate(async text=>{const u=await import('../src/index.js');u.mount(document.body,u.createDocument({text,format:'text'}));},text);
  const first=await page.locator('pre').textContent();await page.getByRole('button',{name:'Next',exact:true}).click();
  const second=await page.locator('pre').textContent();expect(first!+second!).toBe(text);
});

test('safe Markdown has a data-only local link port',async({page})=>{
  await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');const opened:string[]=[];u.mount(document.body,u.createMarkdown({text:'[Source](README.md)',resolveLink:url=>url==='README.md'?url:undefined,onLocalLink:key=>{opened.push(key);}}));Object.assign(window,{opened});});
  await page.getByRole('link',{name:'Source',exact:true}).click();expect(await page.evaluate(()=>Reflect.get(window,'opened'))).toEqual(['README.md']);
});

test('the window mount supplies fixed viewport layout without consumer CSS',async({page})=>{
  await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');u.mount(document.body,u.createText({text:'Full window'}),{viewport:'window'});});
  const viewport=page.viewportSize()!;const bounds=await page.locator('body').boundingBox();expect(bounds?.x).toBe(0);expect(bounds?.y).toBe(0);expect(bounds?.width).toBe(viewport.width);expect(bounds?.height).toBe(viewport.height);
});

test('URL constraints block submission and secret reset restores masking',async({page})=>{
  await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');const submitted:string[]=[];const url=u.createURLInput({label:'Endpoint',value:'not-a-url',required:true});const secret=u.createSecretTextArea({label:'Private JSON',value:'{"KEY":"private"}'});const password=u.createSecretInput({label:'Password',value:'old'});u.mount(document.body,u.createStack({children:[u.createForm({children:[url],onSubmit:async()=>{submitted.push(url.read());return{ok:true};}}),secret,password]}));Object.assign(window,{consumer:{url,secret,password,submitted}});});
  await page.getByRole('button',{name:'Save',exact:true}).click();expect(await page.evaluate(()=>Reflect.get(window,'consumer').submitted)).toEqual([]);
  await page.getByRole('textbox',{name:/^Endpoint/}).fill('https://example.test');await page.getByRole('button',{name:'Save',exact:true}).click();
  expect(await page.evaluate(()=>Reflect.get(window,'consumer').submitted)).toEqual(['https://example.test']);
  const json=page.getByRole('textbox',{name:'Private JSON',exact:true});await page.getByRole('button',{name:'Show',exact:true}).first().click();
  await page.evaluate(()=>{const c=Reflect.get(window,'consumer');c.secret.reset('');c.password.reset('');});await expect(json).toHaveValue('');
  await expect(page.getByRole('button',{name:'Show',exact:true})).toHaveCount(2);
});

test('explicit prompt reset clears an earlier submission error',async({page})=>{
  await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');const prompt=u.createPromptInput({label:'Message',value:'Draft',onSubmit:async()=>({ok:false,error:'Could not send'})});u.mount(document.body,prompt);Object.assign(window,{prompt});});
  await page.getByRole('textbox',{name:'Message',exact:true}).press('Enter');await expect(page.getByText('Could not send',{exact:true})).toBeVisible();
  await page.evaluate(()=>Reflect.get(window,'prompt').reset('Other draft'));await expect(page.getByText('Could not send',{exact:true})).not.toBeVisible();
});

test('form validation and submission reset are semantic ports without replacing a draft',async({page})=>{
  await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');const input=u.createTextInput({label:'Name',value:'Draft',required:true});let finish!:(value:{ok:false;error:string})=>void;const form=u.createForm({children:[input],onSubmit:()=>new Promise(resolve=>{finish=resolve;})});u.mount(document.body,form);Object.assign(window,{consumer:{input,form,finish:()=>finish({ok:false,error:'Old submission'})}});});
  const input=page.getByRole('textbox',{name:/^Name/});await input.focus();await input.evaluate((node:HTMLInputElement)=>node.setSelectionRange(1,3));
  expect(await page.evaluate(()=>Reflect.get(window,'consumer').form.validate())).toBe(true);
  await page.getByRole('button',{name:'Save',exact:true}).click();await expect(input).toBeDisabled();
  await page.evaluate(()=>{const c=Reflect.get(window,'consumer');c.form.resetSubmission();c.finish();});
  await expect(input).toBeEnabled();await expect(input).toHaveValue('Draft');await expect(page.getByText('Old submission',{exact:true})).toHaveCount(0);
});

test('image zoom allocates its surface only when opened',async({page})=>{
  await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');const images=Array.from({length:12},(_,i)=>u.createImage({label:'Image '+i,source:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"/>')}));const owner=u.mount(document.body,u.createStack({children:images}));Object.assign(window,{owner});});
  await expect(page.locator('dialog')).toHaveCount(0);await page.getByRole('button',{name:'Open Image 0',exact:true}).click();await expect(page.locator('dialog')).toHaveCount(1);
  await page.evaluate(()=>Reflect.get(window,'owner').destroy());await expect(page.locator('dialog')).toHaveCount(0);
});

test('resetting a revealed secret input restores its masked presentation',async({page})=>{
  await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');const secret=u.createSecretInput({label:'Password',value:'private'});u.mount(document.body,secret);Object.assign(window,{secret});});
  await page.getByRole('button',{name:'Show',exact:true}).click();await expect(page.getByLabel('Password',{exact:true})).toHaveAttribute('type','text');
  await page.evaluate(()=>Reflect.get(window,'secret').reset('replacement'));await expect(page.getByLabel('Password',{exact:true})).toHaveAttribute('type','password');
});
