import { test, expect } from '@playwright/test';

test('showroom selectors use shared option surfaces for fields, controls and permissions', async ({ page }) => {
  await page.goto('/tests/internal/showroom.html?item=select&theme=light');
  const provider = page.getByRole('combobox', { name: 'Provider', exact: true });
  await expect(provider).toHaveAttribute('aria-haspopup', 'listbox');
  await expect(page.locator('.gallery-spec-values dd').first()).toContainText('pui-select-trigger');
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

  await page.goto('/tests/internal/showroom.html?item=permission-control&theme=light');
  const permission = page.getByRole('combobox', { name: 'Conversation permissions', exact: true });
  await expect(permission).toHaveAttribute('aria-haspopup', 'listbox');
  await permission.click();
  await page.getByRole('option', { name: 'Allow workspace changes', exact: true }).click();
  await expect(permission).toContainText('Allow workspace changes');
  await expect(page.locator('.gallery-demo-host')).toContainText('工作区文件修改已允许');
});

test('selector showroom exposes supported error, disabled and long-list states', async ({ page }) => {
  await page.goto('/tests/internal/showroom.html?item=select&theme=dark&state=error');
  const provider = () => page.locator('.gallery-demo-host').getByRole('combobox', { name: 'Provider', exact: true });
  await expect(provider()).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('.gallery-demo-host')).toContainText('演示读取失败；当前选择保留');

  await page.goto('/tests/internal/showroom.html?item=select&theme=dark&state=disabled');
  await expect(provider()).toBeDisabled();
  await expect(page.locator('.gallery-demo-host').getByRole('listbox', { name: 'Models (multi-row)', exact: true })).toBeDisabled();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/tests/internal/showroom.html?item=select&theme=dark&state=long&width=320');
  await provider().press('Enter');
  await provider().press('End');
  // Scrolling and viewport placement settle on subsequent animation frames.
  // The active option must remain visible after those positioning updates.
  await page.evaluate(async () => { for (let frame = 0; frame < 4; frame++) await new Promise<void>(resolve => requestAnimationFrame(() => resolve())); });
  const popup = page.getByRole('listbox', { name: 'Provider', exact: true });
  const active = page.locator(`#${await provider().getAttribute('aria-activedescendant')}`);
  const popupBounds = await popup.boundingBox();
  const activeBounds = await active.boundingBox();
  expect(popupBounds).not.toBeNull();
  expect(activeBounds).not.toBeNull();
  expect(activeBounds!.y).toBeGreaterThanOrEqual(popupBounds!.y);
  expect(activeBounds!.y + activeBounds!.height).toBeLessThanOrEqual(popupBounds!.y + popupBounds!.height);
  await provider().press('Enter');
  await expect(provider()).toContainText('Model 20');
  await provider().press('Enter');
  await expect(popup).toBeVisible();
  const bounds = await popup.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await provider().press('Escape');
  await expect(provider()).toBeFocused();
});
