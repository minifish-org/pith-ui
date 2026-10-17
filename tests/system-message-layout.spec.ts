import {expect,test} from '@playwright/test';

test('system message readouts use the source small type and left rule',async({page})=>{
  await page.goto('/tests/fixture.html');
  await page.evaluate(async()=>{
    const ui=await import('../src/index.js');
    ui.mount(document.body,ui.createMessage({role:'system',content:ui.createText({text:'Context has been summarized'})}));
  });
  const readout=page.locator('.pui-message-frame[data-role="system"]');
  expect(await readout.evaluate(node=>{const style=getComputedStyle(node);return{fontSize:style.fontSize,lineHeight:style.lineHeight,borderLeft:style.borderLeftWidth,padding:style.padding,color:style.color};})).toEqual({fontSize:'12px',lineHeight:'18px',borderLeft:'2px',padding:'8px 12px',color:await page.evaluate(()=>{const probe=document.createElement('span');probe.style.color='var(--pui-muted)';document.querySelector('.pui')!.append(probe);const color=getComputedStyle(probe).color;probe.remove();return color;})});
  await expect(readout.locator('.pui-message-frame-footer')).toBeHidden();
});
