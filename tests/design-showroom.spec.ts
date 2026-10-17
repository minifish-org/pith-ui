import { test, expect } from '@playwright/test';

test('typography displays only the three supported text sizes', async ({ page }) => {
  await page.goto('/tests/internal/showroom.html?item=foundation-typography&theme=light');
  const sizes = await page.locator('.pui-demo-type-sample').evaluateAll(nodes =>
    [...new Set(nodes.map(node => parseFloat(getComputedStyle(node).fontSize)))].sort((a, b) => a - b));
  expect(sizes).toEqual([12, 14, 16]);
});

test('typography uses two weights and the same proportional line height', async ({ page }) => {
  await page.goto('/tests/internal/showroom.html?item=foundation-typography&theme=dark');
  const samples = await page.locator('.pui-demo-type-sample').evaluateAll(nodes => nodes.map(node => {
    const style = getComputedStyle(node);
    return { weight: Number(style.fontWeight), ratio: parseFloat(style.lineHeight) / parseFloat(style.fontSize) };
  }));
  expect([...new Set(samples.map(sample => sample.weight))].sort()).toEqual([400, 600]);
  expect(samples.length).toBeGreaterThan(0);
  for (const sample of samples) expect(sample.ratio).toBeCloseTo(1.5, 4);
});

test('typography explains the system and code font roles without a font chooser', async ({ page }) => {
  await page.goto('/tests/internal/showroom.html?item=foundation-typography&theme=light');
  const ui = page.getByRole('region', { name: '系统界面字体', exact: true });
  const code = page.getByRole('region', { name: '等宽代码字体', exact: true });
  await expect(ui).toBeVisible(); await expect(code).toBeVisible();
  const uiFonts = await ui.locator('.pui-demo-type-sample').evaluateAll(nodes => [...new Set(nodes.map(node => getComputedStyle(node).fontFamily))]);
  const codeFonts = await code.locator('.pui-demo-type-sample').evaluateAll(nodes => [...new Set(nodes.map(node => getComputedStyle(node).fontFamily))]);
  expect(uiFonts).toHaveLength(1); expect(codeFonts).toHaveLength(1);
  expect(codeFonts[0]).toContain('monospace'); expect(uiFonts[0]).not.toEqual(codeFonts[0]);
  await expect(page.locator('.gallery-demo-host').getByRole('combobox')).toHaveCount(0);
});

test('spacing shows the five supported distances without an arbitrary gap editor', async ({ page }) => {
  await page.goto('/tests/internal/showroom.html?item=foundation-spacing&theme=light');
  const values = await page.locator('.gallery-demo-host code').allTextContents();
  expect(values.filter(value => /^\d+ CSS px$/.test(value)).map(value => Number.parseInt(value))).toEqual([4, 8, 12, 16, 24]);
  await expect(page.getByRole('combobox', { name: '体验组合间距（仅展厅）', exact: true })).toHaveCount(0);
});

for (const item of ['button', 'text-input', 'workspace-chat']) {
  test(`${item} keeps the standard presentation without a density chooser`, async ({ page }) => {
    await page.goto(`/tests/internal/showroom.html?item=${item}&theme=light`);
    await expect(page.getByRole('combobox', { name: '密度', exact: true })).toHaveCount(0);
    await page.getByRole('combobox', { name: '并排比较', exact: true }).click();
    await expect(page.getByRole('option', { name: '普通 / 紧凑', exact: true })).toHaveCount(0);
    await expect(page.getByRole('option', { name: '明亮 / 深色', exact: true })).toBeVisible();
    await expect(page.getByRole('option', { name: '320 / 800 CSS px', exact: true })).toBeVisible();
  });
}

test('old density links normalize while fixed sizing demonstrations remain available', async ({ page }) => {
  await page.goto('/tests/internal/showroom.html?item=button&theme=light&density=compact&compare=density');
  await expect(page.locator('.gallery-demo-host')).toHaveCount(1);
  await expect(page.locator('.gallery-demo-host .pui-compact')).toHaveCount(0);
  await expect(page.getByRole('combobox', { name: '并排比较', exact: true })).toContainText('单项体验');
  await page.goto('/tests/internal/showroom.html?item=foundation-sizing&theme=light');
  await expect(page.locator('.gallery-demo-host').getByRole('button', { name: 'normal action', exact: true })).toBeVisible();
  await expect(page.locator('.gallery-demo-host').getByRole('button', { name: 'compact action', exact: true })).toBeVisible();
});

test('showroom navigation, headings and specifications follow the same text contract', async ({ page }) => {
  await page.goto('/tests/internal/showroom.html?item=button&theme=light');
  const text = await page.locator('#showroom').evaluate(root => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const result: Array<{ value: string; size: number; weight: number; ratio: number }> = [];
    while (walker.nextNode()) {
      const node = walker.currentNode, element = node.parentElement;
      if (!element || !node.textContent?.trim() || element.closest('.gallery-preview,svg,script,style') || !element.getClientRects().length) continue;
      const style = getComputedStyle(element);
      if (style.visibility !== 'visible') continue;
      result.push({ value: node.textContent.trim().slice(0, 40), size: parseFloat(style.fontSize), weight: Number(style.fontWeight), ratio: parseFloat(style.lineHeight) / parseFloat(style.fontSize) });
    }
    return result;
  });
  expect(text.length).toBeGreaterThan(0);
  expect(text.filter(item => ![12, 14, 16].includes(item.size))).toEqual([]);
  expect(text.filter(item => ![400, 600].includes(item.weight))).toEqual([]);
  for (const item of text) expect(item.ratio, item.value).toBeCloseTo(1.5, 4);
});

test('state, theme, width and browser measurements remain functional', async ({ page }) => {
  await page.goto('/tests/internal/showroom.html?item=text-input&theme=light&width=800');
  const state = page.getByRole('combobox', { name: '合法状态', exact: true });
  await state.click(); await page.getByRole('option', { name: '禁用', exact: true }).click();
  await expect(page.locator('.gallery-demo-host').getByRole('textbox').first()).toBeDisabled();
  await page.getByRole('combobox', { name: '主题', exact: true }).click();
  await page.getByRole('option', { name: '深色', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-appearance', 'dark');
  await page.getByRole('combobox', { name: '容器宽度', exact: true }).click();
  await page.getByRole('option', { name: '320 CSS px', exact: true }).click();
  await expect(page).toHaveURL(/width=320/);
  expect((await page.locator('.gallery-canvas').boundingBox())!.width).toBeLessThanOrEqual(322);
  await expect(page.locator('.gallery-spec-values')).toContainText('CSS px');
  await expect(page.locator('.gallery-spec-values')).toContainText('字号 / 行高');
});
