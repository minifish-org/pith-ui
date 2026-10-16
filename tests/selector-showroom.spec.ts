import { test, expect } from '@playwright/test';

test('showroom selectors use shared option surfaces for fields, controls and permissions', async ({ page }) => {
  await page.goto('/?item=select&theme=light');
  const provider = page.getByRole('combobox', { name: 'Provider', exact: true });
  await expect(provider).toHaveAttribute('aria-haspopup', 'listbox');
  await provider.press('ArrowDown');
  await expect(page.getByRole('option', { name: 'Pith', exact: true })).toHaveAttribute('aria-selected', 'true');
  await provider.press('ArrowDown');
  await provider.press('Enter');
  await expect(provider).toContainText('Example provider');
  await expect(page.getByRole('listbox', { name: 'Provider', exact: true })).toBeHidden();
  await expect(page.locator('.gallery-events')).toContainText('Provider: example');

  const comparison = page.getByRole('combobox', { name: '并排比较', exact: true });
  await comparison.click();
  await page.getByRole('option', { name: '明亮 / 深色', exact: true }).click();
  await expect(page.locator('.gallery-canvas[data-appearance=light]')).toHaveCount(1);
  await expect(page.locator('.gallery-canvas[data-appearance=dark]')).toHaveCount(1);

  await page.goto('/?item=permission-control&theme=light');
  const permission = page.getByRole('combobox', { name: 'Conversation permissions', exact: true });
  await expect(permission).toHaveAttribute('aria-haspopup', 'listbox');
  await permission.click();
  await page.getByRole('option', { name: 'Allow workspace changes', exact: true }).click();
  await expect(permission).toContainText('Allow workspace changes');
  await expect(page.locator('.gallery-demo-host')).toContainText('工作区文件修改已允许');
});
