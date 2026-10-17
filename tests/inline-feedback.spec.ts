import {test, expect} from '@playwright/test';
import type {Control} from '../src/index.js';

// Source contracts: pith-ui@0.3.1 forms/provider-login.ts status paragraph and
// form error; feedback stays a live region without introducing a notice card.
test('inline feedback keeps plain status and error presentation on the same live node', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const ui = await import('../src/index.js');
    const make = Reflect.get(ui, 'createNotice') as (options: unknown) => Control;
    const feedback = make({presentation: 'inline', message: 'Check your browser.', tone: 'info'});
    const mounted = ui.mount(document.body, feedback);
    Reflect.set(window, 'inlineFeedback', {feedback, mounted, node: document.querySelector('[role="status"]')});
  });
  const status = page.getByRole('status');
  await expect(status).toHaveText('Check your browser.');
  await expect(status).toHaveCSS('font-size', '14px');
  await expect(status).toHaveCSS('line-height', '21px');
  await expect(status).toHaveCSS('padding', '0px');
  await expect(status).toHaveCSS('border-top-width', '0px');
  await expect(status).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await page.evaluate(() => Reflect.get(window, 'inlineFeedback').feedback.update({message: 'The answer was not accepted.', tone: 'error'}));
  const error = page.getByRole('alert');
  await expect(error).toHaveText('The answer was not accepted.');
  await expect(error).toHaveCSS('font-size', '12px');
  await expect(error).toHaveCSS('line-height', '18px');
  await expect(error).toHaveCSS('padding', '0px');
  await expect(error).toHaveCSS('border-top-width', '0px');
  await expect(error).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  expect(await error.evaluate(node => node === Reflect.get(window, 'inlineFeedback').node)).toBe(true);
  await page.evaluate(() => Reflect.get(window, 'inlineFeedback').feedback.update({message: '', tone: 'error'}));
  await expect(error).toBeHidden();
  await page.evaluate(() => Reflect.get(window, 'inlineFeedback').feedback.update({message: 'Signed in.', tone: 'info'}));
  await expect(page.getByRole('status')).toHaveText('Signed in.');
  await expect(page.getByRole('status')).toHaveCSS('padding', '0px');
  await page.evaluate(() => Reflect.get(window, 'inlineFeedback').mounted.destroy());
  await expect(page.locator('[role="status"], [role="alert"]')).toHaveCount(0);
});

test('ordinary feedback retains its notice surface when no presentation is selected', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const ui = await import('../src/index.js');
    ui.mount(document.body, ui.createNotice({message: 'An ordinary notice.', tone: 'info'}));
  });
  const notice = page.getByRole('status');
  await expect(notice).toHaveText('An ordinary notice.');
  await expect(notice).toHaveCSS('padding', '12px');
  await expect(notice).toHaveCSS('border-top-width', '1px');
});
