import { test, expect, type Page } from '@playwright/test';
import type { createWorkspacePicker } from '../src/navigation/navigation.js';
import type { createContextMenu } from '../src/navigation/context-menu.js';
import type { createWorkspaceShell } from '../src/workspace.js';

declare global {
  interface Window {
    navigationReview: {
      picker?: ReturnType<typeof createWorkspacePicker>;
      menu?: ReturnType<typeof createContextMenu>;
      shell?: ReturnType<typeof createWorkspaceShell>;
      finishPick?: (value: { path: string }) => void;
    };
  }
}

test.beforeEach(async ({ page }) => { await page.goto('/tests/fixture.html'); });

async function mountContext(page: Page, options: { count?: number; disabled?: boolean; left?: number; top?: number; width?: number; point?: { x: number; y: number } } = {}): Promise<void> {
  await page.evaluate(async options => {
    const { createContextMenu } = await import('../src/navigation/context-menu.js');
    const trigger = document.createElement('button'); trigger.textContent = 'Context source';
    Object.assign(trigger.style, { position: 'fixed', left: `${options.left ?? 120}px`, top: `${options.top ?? 100}px`, width: `${options.width ?? 88}px`, height: '32px' });
    const menu = createContextMenu();
    const state = { label: 'Review actions', items: Array.from({ length: options.count ?? 2 }, (_, index) => ({ id: `action-${index}`, label: `Action ${index}`, disabled: !!options.disabled })) };
    document.body.append(trigger, menu.element);
    trigger.addEventListener('click', () => {
      // The optional point is an additive API; old releases ignore it at runtime.
      Reflect.apply(menu.open, menu, options.point ? [trigger, state, { point: options.point }] : [trigger, state]);
    });
    window.navigationReview = { menu };
  }, options);
  await page.getByRole('button', { name: 'Context source', exact: true }).click();
}

test('folder selection releases pending when availability changes before its result', async ({ page }) => {
  await page.evaluate(async () => {
    const { createWorkspacePicker } = await import('../src/navigation/navigation.js');
    let finishPick!: (value: { path: string }) => void;
    const picker = createWorkspacePicker({ workspaces: [] }, {
      onPick: () => new Promise(resolve => { finishPick = resolve; }),
      onSubmit: () => { document.body.dataset.writes = '1'; return { ok: true }; },
    });
    document.body.append(picker.element);
    window.navigationReview = { picker, finishPick: value => finishPick(value) };
  });
  const choose = page.getByRole('button', { name: 'Choose a folder…', exact: true });
  await choose.click();
  await page.evaluate(async () => {
    window.navigationReview.picker!.update({ workspaces: [], disabled: true });
    window.navigationReview.finishPick!({ path: '/demo/chosen' });
    await Promise.resolve(); await Promise.resolve();
    window.navigationReview.picker!.update({ workspaces: [], disabled: false });
  });
  await expect(choose).toBeEnabled();
  await expect(choose).toHaveAttribute('aria-busy', 'false');
  await expect(page.getByRole('button', { name: 'Add workspace', exact: true })).toBeEnabled();
  await expect(page.getByRole('textbox', { name: 'Absolute folder path', exact: true })).toHaveValue('/demo/chosen');
  await expect(page.locator('body')).not.toHaveAttribute('data-writes');
});

for (const empty of [false, true]) {
  test(`context menu Escape closes ${empty ? 'empty' : 'all-disabled'} actions and restores its source`, async ({ page }) => {
    await mountContext(page, { count: empty ? 0 : 2, disabled: true });
    await expect(page.getByRole('menu', { name: 'Review actions', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menu', { name: 'Review actions', exact: true })).toBeHidden();
    await expect(page.getByRole('button', { name: 'Context source', exact: true })).toBeFocused();
  });
}

test('long context menus stay inside the viewport and scroll to their last item', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mountContext(page, { count: 40 });
  const menu = page.getByRole('menu', { name: 'Review actions', exact: true });
  const bounds = (await menu.boundingBox())!;
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(844);
  await page.keyboard.press('End');
  const last = page.getByRole('menuitem', { name: 'Action 39', exact: true });
  await expect(last).toBeFocused();
  const lastBounds = (await last.boundingBox())!;
  expect(lastBounds.y).toBeGreaterThanOrEqual(bounds.y);
  expect(lastBounds.y + lastBounds.height).toBeLessThanOrEqual(bounds.y + bounds.height);
});

test('context menus align to their button rectangle and flip above a lower edge', async ({ page }) => {
  await mountContext(page);
  const source = page.getByRole('button', { name: 'Context source', exact: true });
  const menu = page.getByRole('menu', { name: 'Review actions', exact: true });
  let sourceBounds = (await source.boundingBox())!, menuBounds = (await menu.boundingBox())!;
  expect(Math.abs(menuBounds.x - sourceBounds.x)).toBeLessThanOrEqual(1);
  expect(menuBounds.y - sourceBounds.y - sourceBounds.height).toBeGreaterThanOrEqual(0);
  expect(menuBounds.y - sourceBounds.y - sourceBounds.height).toBeLessThanOrEqual(12);
  await page.keyboard.press('Escape');
  await source.evaluate(node => { node.style.left = '1184px'; node.style.top = '760px'; });
  await source.click({ position: { x: 2, y: 2 } });
  sourceBounds = (await source.boundingBox())!; menuBounds = (await menu.boundingBox())!;
  expect(Math.abs(menuBounds.x + menuBounds.width - sourceBounds.x - sourceBounds.width)).toBeLessThanOrEqual(1);
  expect(menuBounds.y + menuBounds.height).toBeLessThanOrEqual(sourceBounds.y);
  expect(sourceBounds.y - menuBounds.y - menuBounds.height).toBeLessThanOrEqual(12);
});

test('explicit blank-area points retain a point anchor instead of using the focus source', async ({ page }) => {
  await mountContext(page, { point: { x: 520, y: 360 } });
  const bounds = (await page.getByRole('menu', { name: 'Review actions', exact: true }).boundingBox())!;
  expect(Math.abs(bounds.x - 520)).toBeLessThanOrEqual(1);
  expect(bounds.y).toBeGreaterThanOrEqual(360);
  expect(bounds.y).toBeLessThanOrEqual(372);
});

test('narrow sidebar hides closed controls from Tab and restores focus on Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async () => {
    const { createWorkspaceShell } = await import('../src/workspace.js');
    const shell = createWorkspaceShell({ brand: document.createTextNode('Example') }); document.body.append(shell.element);
    window.navigationReview = { shell };
  });
  await page.keyboard.press('Tab');
  const focus = await page.evaluate(() => {
    const active = document.activeElement as HTMLElement;
    return { inSidebar: !!active.closest('.pui-sidebar'), right: active.getBoundingClientRect().right };
  });
  expect(focus.inSidebar).toBe(false); expect(focus.right).toBeGreaterThan(0);
  const opener = page.getByRole('button', { name: 'Open sidebar', exact: true });
  await opener.click();
  await expect(opener).toHaveAttribute('aria-expanded', 'true');
  expect(await page.evaluate(() => !!document.activeElement?.closest('.pui-sidebar'))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(opener).toHaveAttribute('aria-expanded', 'false');
  await expect(opener).toBeFocused();
  expect(await page.evaluate(() => window.navigationReview.shell!.part('sidebar').inert)).toBe(true);
  await page.setViewportSize({ width: 1280, height: 800 });
  await expect.poll(() => page.evaluate(() => window.navigationReview.shell!.part('sidebar').inert)).toBe(false);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => window.navigationReview.shell!.part('sidebar').inert)).toBe(true);
});

test('attachment opening supports Enter and Space without scrolling or duplicating pointer actions', async ({ page }) => {
  await page.evaluate(async () => {
    const { createAttachments } = await import('../src/composer.js');
    let opened = 0;
    const attachments = createAttachments({ onOpen: () => { document.body.dataset.opened = String(++opened); } });
    attachments.update({ items: [{ id: 'image', url: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=', name: 'Example image' }] });
    document.body.append(attachments.element);
  });
  const image = page.getByRole('button', { name: 'Example image', exact: true });
  await image.press('Enter'); await expect(page.locator('body')).toHaveAttribute('data-opened', '1');
  await image.press('Space'); await expect(page.locator('body')).toHaveAttribute('data-opened', '2');
  await image.click(); await expect(page.locator('body')).toHaveAttribute('data-opened', '3');
});

test('attachment remove glyph is centered inside its circular button', async ({ page }) => {
  await page.goto('/?item=attachments&theme=light');
  const offset = await page.getByRole('button', { name: 'Remove 演示图片 1.png', exact: true }).evaluate(button => {
    const outer = button.getBoundingClientRect(), glyph = button.querySelector('svg')!.getBoundingClientRect();
    return { x: Math.abs(outer.x + outer.width / 2 - glyph.x - glyph.width / 2), y: Math.abs(outer.y + outer.height / 2 - glyph.y - glyph.height / 2) };
  });
  expect(offset.x).toBeLessThanOrEqual(.5); expect(offset.y).toBeLessThanOrEqual(.5);
});

test('navigation exposes typed actions for creation, menus and the empty workspace entry', async ({ page }) => {
  await page.evaluate(async () => {
    const { createWorkspaceNavigation } = await import('../src/navigation/navigation.js');
    const calls: unknown[] = [];
    const options = {
      onSelect: () => {},
      onAction: (event: { action: string; workspaceId?: string; conversationId?: string; trigger: HTMLButtonElement }) => {
        calls.push({ action: event.action, workspaceId: event.workspaceId, conversationId: event.conversationId, trigger: event.trigger.tagName });
        document.body.dataset.navigationCalls = JSON.stringify(calls);
      },
    };
    const navigation = createWorkspaceNavigation({ groups: [{ id: 'workspace', name: 'Project', path: '/demo', expanded: true, selected: true, children: [{ id: 'conversation', title: 'Discussion', active: true }] }], empty: null }, options);
    document.body.append(navigation.element);
    Object.assign(window, { navigationActionReview: navigation });
  });
  await page.getByRole('button', { name: 'New conversation in Project', exact: true }).click();
  await page.getByRole('button', { name: 'Actions for workspace Project', exact: true }).click();
  await page.getByRole('button', { name: 'Actions for Discussion', exact: true }).click();
  await page.evaluate(() => (window as unknown as { navigationActionReview: { update(state: unknown): void } }).navigationActionReview.update({ groups: [], empty: 'workspaces' }));
  await page.getByRole('button', { name: 'Add a workspace', exact: true }).click();
  expect(JSON.parse((await page.locator('body').getAttribute('data-navigation-calls')) || '[]')).toEqual([
    { action: 'new-conversation', workspaceId: 'workspace', trigger: 'BUTTON' },
    { action: 'workspace-menu', workspaceId: 'workspace', trigger: 'BUTTON' },
    { action: 'conversation-menu', conversationId: 'conversation', trigger: 'BUTTON' },
    { action: 'add-workspace', trigger: 'BUTTON' },
  ]);
});

test('showroom measurement chooses a target without invoking its action', async ({ page }) => {
  await page.goto('/?item=button&theme=light');
  await page.getByRole('button', { name: '选择测量目标', exact: true }).click();
  await page.locator('.gallery-demo-host').getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.locator('.gallery-spec-values')).toContainText('CSS px');
  await expect(page.locator('.gallery-events')).not.toContainText('模拟提交');
});

test('drop feedback example sends only through a simulation and retains its page', async ({ page }) => {
  await page.goto('/?item=drop-feedback&theme=light');
  await page.locator('.gallery-demo-host').getByRole('button', { name: 'Send message', exact: true }).click();
  await expect(page).toHaveURL(/item=drop-feedback/);
  await expect(page.locator('.gallery-heading h2')).toHaveText('拖放反馈');
});

test('button showroom retains async outcome controls with the standard presentation', async ({ page }) => {
  await page.goto('/?item=button&theme=light');
  await expect(page.getByRole('combobox', { name: '密度', exact: true })).toHaveCount(0);
  const outcome = page.getByRole('combobox', { name: '模拟异步结果', exact: true });
  await expect(outcome).toBeVisible();
  await outcome.click(); await page.getByRole('option', { name: '失败 · 保留输入', exact: true }).click();
  await page.locator('.gallery-demo-host').getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.locator('.gallery-events')).toContainText('演示保存失败');
});
