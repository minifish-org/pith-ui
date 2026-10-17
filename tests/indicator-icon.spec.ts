import {expect,test} from '@playwright/test';

test('attention indicators retain the source warning glyph and can return to inline status',async({page})=>{
  await page.goto('/tests/fixture.html');
  await page.evaluate(async()=>{
    const ui=await import('../src/index.js');
    const status=ui.createStatus({label:'Waiting for approval',tone:'warning',presentation:'indicator'});
    (window as any).attentionIndicator=status;
    ui.mount(document.body,status);
  });
  const indicator=page.getByRole('img',{name:'Waiting for approval',exact:true});
  await expect(indicator.locator('svg circle[cx="12"][cy="12"][r="9"]')).toHaveCount(1);
  await expect(indicator.locator('svg path[d="M12 7v6m0 4h.01"]')).toHaveCount(1);
  await expect(indicator.locator('svg')).toHaveAttribute('stroke-width','1.8');
  expect(await indicator.evaluate(node=>({width:node.getBoundingClientRect().width,height:node.getBoundingClientRect().height}))).toEqual({width:12,height:12});
  await page.evaluate(()=>{(window as any).attentionIndicator.update({label:'Approval finished',presentation:'inline'});});
  await expect(page.getByRole('img',{name:'Approval finished',exact:true})).toHaveCount(0);
  await expect(page.getByText('Approval finished',{exact:true})).toBeVisible();
  await expect(page.locator('svg')).toHaveCount(0);
});
