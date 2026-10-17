import {test,expect} from '@playwright/test';

test('the public showroom starts with a usable small component and hides implementation scenes',async({page})=>{
  await page.goto('/');
  await expect(page.locator('.gallery-heading h2')).toHaveText('按钮 Button');
  await expect(page.locator('.gallery-nav')).toContainText('基础积木');
  await expect(page.locator('.gallery-nav')).toContainText('组合示例');
  await expect(page.locator('.gallery-nav')).not.toContainText('应用集成');
  await expect(page.locator('.gallery-nav')).not.toContainText('完整界面');
  await expect(page.locator('.gallery-docs')).not.toContainText('库内实现片段');
  await page.locator('[data-item="controls-form-page"]').click();
  await expect(page.getByLabel('Connection name', {exact:false})).toBeVisible();
  await expect(page.locator('.gallery-docs')).toContainText("from 'pith-ui'");
});

test('removed app and internal deep links do not restore a hidden implementation exhibit',async({page})=>{
  for(const item of ['application-reference','application-workspace','workspace-chat','permission-control']){
    await page.goto('/?item='+item);
    await expect(page.locator('.gallery-heading h2')).toHaveText('按钮 Button');
    await expect(page.locator('iframe')).toHaveCount(0);
  }
});

test('side by side themes reach each public mount even when system theme differs',async({page})=>{
  await page.emulateMedia({colorScheme:'dark'});
  await page.goto('/?item=button&compare=theme');
  const colors=await page.locator('.gallery-demo-host').evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node.querySelector('button')!).backgroundColor));
  expect(colors).toHaveLength(2);
  expect(colors[0]).not.toBe(colors[1]);
});
