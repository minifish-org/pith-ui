import {expect,test} from '@playwright/test';

test('showroom navigation and examples expose bounded parts instead of complete templates',async ({page}) => {
  await page.goto('/?item=button-parts');
  await expect(page.getByRole('heading',{name: '按钮零件',exact: true})).toBeVisible();
  await expect(page.getByRole('button',{name: '完整界面',exact: true})).toHaveCount(0);
  await expect(page.getByRole('button',{name: '组合积木',exact: true})).toHaveCount(0);
  await expect(page.locator('.gallery-code')).toContainText("from 'pith-ui'");
  await expect(page.locator('.gallery-code')).not.toContainText('pith-ui/app');
  await expect(page.getByRole('button',{name: 'Save',exact: true})).toBeVisible();
  await page.getByRole('button',{name: 'Save',exact: true}).click();
  await expect(page.getByRole('list',{name: '交互事件',exact: true})).toContainText('Save');
});
