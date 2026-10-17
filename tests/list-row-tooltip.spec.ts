import {test,expect} from '@playwright/test';

test('row text tooltips are safe, update in place and can be explicitly cleared',async({page})=>{
  await page.goto('/tests/fixture.html');
  await page.evaluate(async()=>{
    const u=await import('../src/index.js');
    const row=Reflect.get(u,'createListRow')({title:'Pending text',tooltip:'<img src=x onerror=alert(1)>',context:'queue'});
    u.mount(document.body,row);
    Object.assign(window,{tooltipRow:row});
  });
  const text=page.getByText('Pending text',{exact:true});
  await expect(text).toHaveAttribute('title','<img src=x onerror=alert(1)>');
  await expect(page.locator('img')).toHaveCount(0);
  await text.evaluate(node=>{Reflect.set(window,'originalTooltipText',node);const selection=getSelection()!,range=document.createRange();range.selectNodeContents(node);selection.removeAllRanges();selection.addRange(range);});
  await page.evaluate(()=>Reflect.get(window,'tooltipRow').update({title:'Pending text',tooltip:'Full pending text'}));
  expect(await text.evaluate(node=>node===Reflect.get(window,'originalTooltipText')&&getSelection()?.toString()==='Pending text')).toBe(true);
  await expect(text).toHaveAttribute('title','Full pending text');
  await page.evaluate(()=>Reflect.get(window,'tooltipRow').update({title:'Image attachment',tooltip:''}));
  await expect(page.getByText('Image attachment',{exact:true})).not.toHaveAttribute('title');
  expect(await page.evaluate(async()=>{const u=await import('../src/index.js');try{Reflect.apply(u.createListRow,undefined,[{title:'Rejected',tooltip:document.body}]);return false;}catch{return true;}})).toBe(true);
  expect(await page.evaluate(()=>{try{Reflect.get(window,'tooltipRow').update({title:'Rejected',tooltip:document.body});return false;}catch{return true;}})).toBe(true);
  await expect(page.getByText('Image attachment',{exact:true})).toBeVisible();
});
