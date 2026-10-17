import {expect,test} from '@playwright/test';

test('an inline message result stays eight pixels below its content and before the footer',async({page})=>{
  await page.goto('/tests/fixture.html');
  await page.evaluate(async()=>{
    const ui=await import('../src/index.js');
    const status=ui.createStatus({label:'Response interrupted',presentation:'inline',tone:'error'});
    const content=ui.createStack({context:'flow',children:[ui.createMarkdown({text:'A partial response'}),ui.createSlot({content:status})]});
    ui.mount(document.body,ui.createMessage({role:'assistant',content,time:'12:34'}));
  });
  const result=page.getByText('Response interrupted',{exact:true});
  expect(await result.evaluate(node=>{const body=node.closest('.pui-message-frame-body')!,markdown=body.querySelector('.pui-markdown')!,style=getComputedStyle(node);return{gap:node.getBoundingClientRect().top-markdown.getBoundingClientRect().bottom,fontSize:style.fontSize,outsideFooter:!node.closest('.pui-message-frame-footer')};})).toEqual({gap:8,fontSize:'12px',outsideFooter:true});
  await expect(page.locator('.pui-message-frame-meta')).toHaveText('12:34');
});
