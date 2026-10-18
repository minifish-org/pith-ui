import {test,expect} from '@playwright/test';
test.beforeEach(async({page})=>{await page.goto('/tests/fixture.html');});

test('hidden options and groups stay unavailable when their native visibility changes', async ({ page }) => {
  await page.evaluate(async () => {
    const path = '/src/foundations.ts'; const { adoptNativeControl } = await import(path);
    const select = document.createElement('select'); select.setAttribute('aria-label', 'Visible choices');
    select.innerHTML = '<option value="one">First visible</option><option value="secret" hidden>Hidden option</option><optgroup label="Hidden group" hidden><option value="group-secret">Hidden group option</option></optgroup><option value="two">Second visible</option>';
    document.body.append(select); adoptNativeControl(select);
  });
  const trigger = page.getByRole('combobox', { name: 'Visible choices', exact: true });
  await trigger.click();
  await expect(page.getByRole('option', { name: 'Hidden option', exact: true })).toHaveCount(0);
  await expect(page.getByRole('option', { name: 'Hidden group option', exact: true })).toHaveCount(0);
  await trigger.press('ArrowDown'); await trigger.press('Enter');
  await expect(trigger).toHaveText('Second visible');
  await page.locator('select').evaluate(select => {
    select.querySelector('option[value="secret"]')!.removeAttribute('hidden');
    select.querySelector('optgroup')!.removeAttribute('hidden');
  });
  await trigger.click();
  await expect(page.getByRole('option', { name: 'Hidden option', exact: true })).toBeVisible();
  await expect(page.getByRole('option', { name: 'Hidden group option', exact: true })).toBeVisible();
});

test('shared native adoption retains the selector until the final owner releases it', async ({ page }) => {
  const state = await page.evaluate(async () => {
    const path = '/src/foundations.ts'; const { adoptNativeControl } = await import(path);
    const select = document.createElement('select'); select.setAttribute('aria-label', 'Shared choice'); select.tabIndex = 3;
    select.innerHTML = '<option value="a">Alpha</option><option value="b">Beta</option>'; document.body.append(select);
    const first = adoptNativeControl(select), second = adoptNativeControl(select);
    first.destroy(); first.destroy();
    const afterFirst = document.querySelectorAll('.pui-select-trigger').length;
    second.reset('b'); second.focus();
    const retained = document.activeElement?.textContent === 'Beta';
    second.destroy(); second.destroy();
    return { afterFirst, retained, afterLast: document.querySelectorAll('.pui-select-trigger').length,
      restored: select.parentElement === document.body && !select.hasAttribute('aria-hidden') && select.tabIndex === 3 };
  });
  expect(state).toEqual({ afterFirst: 1, retained: true, afterLast: 0, restored: true });
});
