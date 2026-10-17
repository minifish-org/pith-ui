import {test,expect} from '@playwright/test';

test('a queued row keeps its attachment count under the retained text body',async({page})=>{
 await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');const row=u.createListRow({context:'queue',title:'A queued draft',meta:'2 images',actions:u.createIconButton({label:'Edit draft',icon:'edit',context:'inline'})});const ordinary=u.createListRow({title:'Ordinary row',meta:'Independent metadata'});u.mount(document.body,u.createStack({children:[row,ordinary]}));Reflect.set(window,'queuedSourceRow',row);});
 const row=page.locator('.pui-list-row-queue'),body=row.locator('.pui-list-row-body'),count=row.getByText('2 images',{exact:true}),text=row.getByText('A queued draft',{exact:true});
 await expect(body.getByText('2 images',{exact:true})).toHaveCount(1);await expect(count).toHaveCSS('display','block');await expect(count).toHaveCSS('font-size','12px');await expect(count).toHaveCSS('margin-top','4px');await expect(count).toHaveCSS('color','rgb(102, 112, 133)');expect((await count.boundingBox())!.y-(await text.boundingBox())!.y-(await text.boundingBox())!.height).toBe(4);
 const node=await count.elementHandle();await page.evaluate(()=>Reflect.get(window,'queuedSourceRow').update({title:'Updated draft',meta:'3 images'}));await expect(body.getByText('3 images',{exact:true})).toHaveCount(1);expect(await node!.evaluate(n=>n===document.querySelector('.pui-list-row-queue .pui-list-row-body small'))).toBe(true);
 await expect(page.getByText('Independent metadata',{exact:true}).locator('..')).toHaveClass('pui-list-row');
});

test('a stop action keeps its source solid glyph and returns to the ordinary arrow',async({page})=>{
 await page.goto('/tests/fixture.html');await page.evaluate(async()=>{const u=await import('../src/index.js');const action=u.createIconButton({label:'Stop agent',context:'inline',icon:'stop',intent:'primary'});u.mount(document.body,u.createSurface({content:u.createPromptInput({label:'Draft'}),footer:u.createToolbar({label:'Draft actions',trailing:action})}));Reflect.set(window,'sourceStopAction',action);});
 const button=page.getByRole('button',{name:'Stop agent',exact:true}),rect=button.locator('svg>rect');expect(await rect.evaluate(n=>({fill:getComputedStyle(n).fill,stroke:getComputedStyle(n).stroke,color:getComputedStyle(n.closest('button')!).color}))).toEqual({fill:await button.evaluate(n=>getComputedStyle(n).color),stroke:'none',color:await button.evaluate(n=>getComputedStyle(n).color)});
 await page.evaluate(()=>Reflect.get(window,'sourceStopAction').update({label:'Send message',icon:'arrow',intent:'primary'}));await expect(page.getByRole('button',{name:'Send message',exact:true}).locator('svg>rect')).toHaveCount(0);await expect(page.getByRole('button',{name:'Send message',exact:true}).locator('svg>path')).toHaveCSS('fill','none');
});
