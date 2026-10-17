import {test,expect} from '@playwright/test';
test('compact inline feedback preserves the original small error surface',async({page})=>{
 await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');u.mount(document.body,Reflect.get(u,'createNotice')({message:'Write failed. Draft retained.',tone:'error',presentation:'compact'}));});
 const error=page.getByRole('alert');expect(await error.evaluate(n=>{const s=getComputedStyle(n);return{font:s.fontSize,line:s.lineHeight,padding:s.padding,radius:s.borderTopLeftRadius,border:s.borderTopWidth,margin:s.marginBottom,whiteSpace:s.whiteSpace};})).toEqual({font:'12px',line:'18px',padding:'12px',radius:'9px',border:'1px',margin:'12px',whiteSpace:'pre-wrap'});
});
test('navigation footer inline feedback keeps a small warning marker and quiet separated text',async({page})=>{
 await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');u.mount(document.body,u.createPane({purpose:'navigation',content:u.createText({text:'Navigation'}),footer:u.createStack({context:'flow',children:[u.createSlot({content:Reflect.get(u,'createNotice')({message:'Reconnecting…',tone:'info',presentation:'inline'})})]})}));});
 const status=page.getByRole('status');expect(await status.evaluate(n=>{const s=getComputedStyle(n),dot=getComputedStyle(n,'::before');return{font:s.fontSize,line:s.lineHeight,padding:s.padding,border:s.borderTopWidth,color:s.color,dotWidth:dot.width,dotHeight:dot.height,dotColor:dot.backgroundColor};})).toEqual({font:'12px',line:'18px',padding:'16px 12px 0px',border:'1px',color:'rgb(93, 103, 122)',dotWidth:'6px',dotHeight:'6px',dotColor:'rgb(138, 87, 10)'});
});
test('input guidance stays a plain left-aligned caption with the original note gap',async({page})=>{
 await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');u.mount(document.body,u.createContentColumn({purpose:'input',content:u.createStack({context:'flow',children:[u.createSurface({content:u.createPromptInput({label:'Message'})}),u.createSlot({content:u.createText({role:'caption',text:'Choose an image-capable model.'})})]})}));});
 const note=page.getByText('Choose an image-capable model.',{exact:true});await expect(note).toHaveCSS('font-size','12px');expect(await note.evaluate(n=>{const slot=n.closest('.pui-slot')!,s=getComputedStyle(slot);return{margin:s.marginTop,align:getComputedStyle(n).textAlign,border:s.borderTopWidth,background:s.backgroundColor};})).toEqual({margin:'8px',align:'start',border:'0px',background:'rgba(0, 0, 0, 0)'});
});

test('a local input error keeps its source-defined space before editing content',async({page})=>{
 await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');u.mount(document.body,u.createSurface({content:u.createStack({context:'flow',children:[Reflect.get(u,'createNotice')({presentation:'caption',tone:'error',message:'Draft retained'}),u.createPromptInput({label:'Message'})]})}));});
 const error=page.getByRole('alert');expect(await error.evaluate(n=>{const s=getComputedStyle(n);return{margin:s.marginTop,font:s.fontSize,line:s.lineHeight,border:s.borderTopWidth,padding:s.padding,background:s.backgroundColor};})).toEqual({margin:'16px',font:'12px',line:'18px',border:'0px',padding:'0px',background:'rgba(0, 0, 0, 0)'});
 expect((await error.boundingBox())!.y+(await error.boundingBox())!.height).toBeLessThanOrEqual((await page.getByRole('textbox',{name:'Message'}).boundingBox())!.y);
});
