import {test,expect} from '@playwright/test';
import type {ImageControl,Mount} from '../src/index.js';

// Accepted 0.3.1 composer.ts createAttachments + styles.css802–807:
// one horizontally scrolling strip,104×80 thumbnails,visible filenames,
// an inset22px removal button and12px centered glyph.
test('attachment images preserve the original labeled strip and inset removal geometry',async({page})=>{
 await page.goto('/tests/fixture.html');
 await page.evaluate(async()=>{const u=await import('../src/index.js');const source='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="100"><rect width="120" height="100" fill="#86b6f2"/></svg>');const host=document.createElement('div');host.style.width='240px';document.body.append(host);const images=Array.from({length:3},(_,i)=>u.createImage({purpose:'attachment',label:i?'Image '+i:'Long attachment filename for review.png',source,onRemove(){}}));u.mount(host,u.createList({items:images.map((content,i)=>({key:String(i),content}))}));});
 const list=page.locator('.pui-control-list'),image=page.getByRole('img',{name:'Long attachment filename for review.png',exact:true});
 await expect.poll(()=>image.evaluate(node=>(node as HTMLImageElement).complete)).toBe(true);
 await expect(image).toHaveCSS('width','104px');await expect(image).toHaveCSS('height','80px');await expect(image).toHaveCSS('object-fit','cover');await expect(image).toHaveCSS('border-radius','9px');await expect(image).toHaveCSS('border-top-width','1px');
 const caption=page.locator('figcaption').first();await expect(caption).toHaveText('Long attachment filename for review.png');await expect(caption).toHaveCSS('font-size','12px');await expect(caption).toHaveCSS('padding-top','8px');await expect(caption).toHaveCSS('white-space','nowrap');await expect(caption).toHaveCSS('text-overflow','ellipsis');
 await expect(list).toHaveCSS('flex-wrap','nowrap');await expect(list).toHaveCSS('overflow-x','auto');await expect(list).toHaveCSS('padding','4px 0px 12px');await expect(list).toHaveCSS('gap','8px');
 const figures=page.locator('.pui-image-attachment'),boxes=await figures.evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().toJSON()));expect(boxes.every(box=>box.width===104&&box.y===boxes[0].y)).toBe(true);expect(await list.evaluate(node=>node.scrollWidth>node.clientWidth)).toBe(true);
 const remove=page.getByRole('button',{name:'Remove Long attachment filename for review.png',exact:true}),button=(await remove.boundingBox())!,glyph=(await remove.locator('svg').boundingBox())!;
 expect(button.width).toBe(22);expect(button.height).toBe(22);expect(button.y-boxes[0].y).toBe(4);expect(boxes[0].x+boxes[0].width-button.x-button.width).toBe(4);expect(glyph.width).toBe(12);expect(glyph.x+glyph.width/2).toBe(button.x+button.width/2);expect(glyph.y+glyph.height/2).toBe(button.y+button.height/2);
});

test('attachment labels update safely in place while native opening, removal and ownership remain intact',async({page})=>{
 await page.goto('/tests/fixture.html');
 await page.evaluate(async()=>{const u=await import('../src/index.js');const source='data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';let calls=0;const image=u.createImage({purpose:'attachment',label:'First image',source,onRemove(){calls++;Reflect.set(window,'attachmentCalls',calls);}});const mounted=u.mount(document.body,image);Reflect.set(window,'attachmentSourceState',{image,mounted,source});});
 const image=page.getByRole('img',{name:'First image',exact:true}),node=await image.elementHandle();
 await page.getByRole('button',{name:'Open First image',exact:true}).press('Enter');await expect(page.locator('dialog[open]')).toHaveCount(1);await page.keyboard.press('Escape');
 await page.evaluate(()=>{const s=Reflect.get(window,'attachmentSourceState') as {image:ImageControl;source:string};s.image.update({label:'<img src=x onerror=alert(1)>',source:s.source,removeDisabled:true});});
 await expect(page.locator('figcaption')).toHaveText('<img src=x onerror=alert(1)>');await expect(page.locator('figcaption img')).toHaveCount(0);expect(await node!.evaluate(n=>n===document.querySelector('.pui-image-attachment img'))).toBe(true);
 const remove=page.getByRole('button',{name:'Remove <img src=x onerror=alert(1)>',exact:true});await expect(remove).toBeDisabled();await remove.evaluate(n=>(n as HTMLButtonElement).click());expect(await page.evaluate(()=>Reflect.get(window,'attachmentCalls')??0)).toBe(0);
 await page.evaluate(()=>{const s=Reflect.get(window,'attachmentSourceState') as {image:ImageControl;source:string};s.image.update({label:'Updated image',source:s.source});});
 const enabled=page.getByRole('button',{name:'Remove Updated image',exact:true});await enabled.click();expect(await page.evaluate(()=>Reflect.get(window,'attachmentCalls'))).toBe(1);const retained=await enabled.elementHandle();
 await page.evaluate(()=>(Reflect.get(window,'attachmentSourceState') as {mounted:Mount}).mounted.destroy());await retained!.evaluate(n=>(n as HTMLButtonElement).click());expect(await page.evaluate(()=>Reflect.get(window,'attachmentCalls'))).toBe(1);await expect(page.locator('figcaption')).toHaveCount(0);
});
