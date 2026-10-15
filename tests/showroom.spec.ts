import { test, expect } from '@playwright/test';
import { catalog } from '../showroom/catalog.js';

test('every catalog item mounts real content without errors in both themes', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const item of catalog) for (const theme of ['light', 'dark']) {
    await page.goto(`/?item=${item.id}&theme=${theme}`);
    await expect(page.locator('.gallery-heading h2')).toHaveText(item.title);
    expect(await page.locator('.gallery-demo-host > *').count(), item.id).toBeGreaterThan(0);
    await expect(page.locator('.gallery-spec-values')).toContainText('CSS px');
  }
  expect(errors).toEqual([]);
});

test('catalog search, state links, rulers, themes and lifecycle are usable', async ({ page }) => {
  await page.goto('/?item=text-edit-dialog&theme=light&outcome=late');
  await page.getByLabel('搜索积木', {exact:true}).fill('文本编辑');
  await expect(page.locator('.gallery-nav [data-item]')).toHaveCount(1);
  await page.getByLabel('搜索积木', {exact:true}).fill('');
  await page.getByLabel('并排比较', {exact:true}).selectOption('theme');
  await expect(page.locator('.gallery-canvas[data-appearance=light]')).toHaveCount(1);
  await expect(page.locator('.gallery-canvas[data-appearance=dark]')).toHaveCount(1);
  const duplicateIds = await page.evaluate(() => {
    const ids = Array.from(document.querySelectorAll('[id]'), node => node.getAttribute('id'));
    return ids.filter((id,index) => ids.indexOf(id) !== index);
  });
  expect(duplicateIds).toEqual([]);
  await page.getByRole('button', {name:'显示标尺',exact:true}).click();
  await expect(page.locator('.gallery-rulers')).toHaveCount(2);
  await expect(page).toHaveURL(/rulers=1/);
  await page.getByRole('button', {name:'销毁实例',exact:true}).click();
  await expect(page.getByText('实例已销毁。点击“重新创建”恢复体验。')).toBeVisible();
  await page.getByRole('button', {name:'重播 / 重新创建',exact:true}).click();
  await expect(page.locator('.gallery-demo-host')).toHaveCount(2);
});

test('all comparisons have independent IDs and narrow screens retain controls', async ({ page }) => {
  test.setTimeout(120000);
  for (const item of catalog.filter(item => item.layer !== 'foundations')) {
    await page.goto(`/?item=${item.id}&theme=dark&compare=theme`);
    const ids = await page.locator('.gallery-preview [id]').evaluateAll(nodes => nodes.map(node => node.getAttribute('id')));
    expect(ids.filter((id,index) => ids.indexOf(id) !== index), item.id).toEqual([]);
  }
  await page.setViewportSize({width:390,height:844});
  await page.goto('/?item=text-input&width=320');
  await expect(page.getByLabel('合法状态', {exact:true})).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
