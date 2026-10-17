import {test,expect} from '@playwright/test';

test('inline text links retain the accepted quiet action geometry and native activation',async({page})=>{
 await page.goto('/tests/fixture.html');
 await page.evaluate(async()=>{const u=await import('../src/index.js');let calls=0;const action=Reflect.get(u,'createTextAction')({label:'Open running conversation',context:'link',onAction(){calls++;document.body.dataset.calls=String(calls);}});u.mount(document.body,action);});
 const action=page.getByRole('button',{name:'Open running conversation',exact:true});
 const style=await action.evaluate(node=>{const s=getComputedStyle(node);return{height:node.getBoundingClientRect().height,padding:s.padding,font:s.fontSize,line:s.lineHeight,border:s.borderTopWidth,decoration:s.textDecorationLine,color:s.color};});
 expect(style).toEqual({height:26,padding:'4px 8px',font:'12px',line:'18px',border:'0px',decoration:'underline',color:'rgb(74, 98, 200)'});
 await action.focus();await action.press('Enter');await action.press('Space');await expect(page.locator('body')).toHaveAttribute('data-calls','2');
});
