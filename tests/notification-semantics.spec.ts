import {expect, test} from '@playwright/test';

test('a notification region preserves live announcements without adding a navigation landmark', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const ui = await import('../src/index.js');
    ui.mount(document.body, ui.createNotificationRegion({label: 'Completed tasks', content: ui.createText({text: 'Task completed'})}));
  });
  await expect(page.getByRole('region', {name: 'Completed tasks', exact: true})).toHaveAttribute('aria-live', 'polite');
  await expect(page.getByRole('complementary')).toHaveCount(0);
});
