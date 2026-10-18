import {test,expect} from '@playwright/test';

test('downloads retain exact names, delivery results and delayed or terminal URL cleanup',async({page})=>{
  await page.goto('/tests/fixture.html');await page.clock.install();await page.clock.pauseAt(new Date());
  await page.evaluate(async()=>{
    const path='/tests/recipes-fixture.ts',{parts:p}=await import(path),download=p.createDownloadPart(),mount=document.body.appendChild(document.createElement('div')),tree=p.mountParts(mount,download);
    const deliveries:Array<{name:string;href:string}>=[],revoked:string[]=[];
    const original=URL.revokeObjectURL.bind(URL);URL.revokeObjectURL=value=>{revoked.push(value);original(value);};
    HTMLAnchorElement.prototype.click=function(){deliveries.push({name:this.download,href:this.href});};
    const first=await download.download({blob:new Blob(['中文 result']),name:'Report 中文.md'});Object.assign(window,{downloadTest:{download,tree,first,deliveries,revoked}});
  });
  await page.clock.runFor(29_999);expect(await page.evaluate(()=>(window as any).downloadTest.revoked)).toEqual([]);await page.clock.runFor(1);
  const result=await page.evaluate(async()=>{
    const h=(window as any).downloadTest,second=await h.download.download({blob:new Blob(['diagnostics']),name:'diagnostics.json'});h.tree.destroy();
    const late=await h.download.download({blob:new Blob(['late']),name:'late.txt'});return {first:h.first,second,names:h.deliveries.map((value:{name:string})=>value.name),urls:h.deliveries.every((value:{href:string})=>value.href.startsWith('blob:')),revoked:h.revoked.length,unique:new Set(h.revoked).size,late};
  });expect(result).toEqual({first:{ok:true},second:{ok:true},names:['Report 中文.md','diagnostics.json'],urls:true,revoked:2,unique:2,late:{ok:false,error:'Application has been destroyed.'}});
});
