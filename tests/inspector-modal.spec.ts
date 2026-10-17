import {expect, test} from '@playwright/test';

for (const scenario of ['inspector-owned', 'ordinary-owned', 'inspector-unrelated'] as const) {
  test(`${scenario} respects modal focus without changing ordinary outside dismissal`, async ({page}) => {
    await page.goto('/tests/fixture.html');
    await page.evaluate(async scenario => {
      const ui = await import('../src/index.js');
      const dialog = ui.createDialog({title: 'File preview', content: ui.createText({text: 'Preview document'})});
      const inspector = ui.createPopover({
        label: 'Inspect files', purpose: scenario === 'ordinary-owned' ? undefined : 'inspector',
        content: ui.createButton({label: 'Preview', onAction: () => dialog.open()}),
      });
      const owner = ui.mount(document.body, ui.createToolbar({label: 'Files',
        leading: ui.createButton({label: 'Outside inspector'}), trailing: inspector,
      }));
      if (scenario === 'inspector-unrelated') {
        const otherHost = document.createElement('section');
        document.body.append(otherHost);
        ui.mount(otherHost, ui.createText({text: 'Independent mounted UI'})).attach(dialog);
      } else owner.attach(dialog);
    }, scenario);
    const trigger = page.getByRole('button', {name: 'Inspect files', exact: true});
    await trigger.click();
    await page.getByRole('button', {name: 'Preview', exact: true}).click();
    const dialog = page.getByRole('dialog', {name: 'File preview', exact: true});
    await expect(dialog).toBeVisible();
    const retained = scenario === 'inspector-owned';
    await expect(trigger).toHaveAttribute('aria-expanded', String(retained));
    await dialog.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toHaveAttribute('aria-expanded', String(retained));
    if (retained) {
      await expect(page.getByRole('button', {name: 'Preview', exact: true})).toBeVisible();
      await page.getByRole('button', {name: 'Outside inspector', exact: true}).click();
      await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    }
  });
}
