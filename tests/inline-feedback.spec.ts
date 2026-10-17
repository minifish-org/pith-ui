import {test, expect} from '@playwright/test';
import type {Control} from '../src/index.js';

// Source contract: pith-ui@0.3.1 forms/provider-login.ts status paragraph keeps
// its body size even in the error phase; the separate form error is smaller.
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
  await page.evaluate(() => Reflect.get(window, 'inlineFeedback').feedback.update({message: 'Provider sign-in failed.', tone: 'error'}));
  const error = page.getByRole('alert');
  await expect(error).toHaveText('Provider sign-in failed.');
  await expect(error).toHaveCSS('font-size', '14px');
  await expect(error).toHaveCSS('line-height', '21px');
  await page.evaluate(() => Reflect.get(window, 'inlineFeedback').feedback.update({presentation: 'caption', message: 'The answer was not accepted.', tone: 'error'}));
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
  await expect(page.getByRole('status')).toHaveCSS('font-size', '12px');
  await expect(page.getByRole('status')).toHaveCSS('padding', '0px');
  await page.evaluate(() => Reflect.get(window, 'inlineFeedback').feedback.update({presentation: 'inline', message: 'Signed in.', tone: 'info'}));
  await expect(page.getByRole('status')).toHaveCSS('font-size', '14px');
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

test('form dialog status keeps the source body color while a failed phase remains an error', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const ui = await import('../src/index.js');
    const status = ui.createNotice({presentation: 'inline', message: 'Simulated provider verification.', tone: 'info'});
    const owner = ui.mount(document.body, ui.createText({text: 'Host'}));
    const dialog = ui.createDialog({purpose: 'form', title: 'Provider sign-in', content: ui.createStack({context: 'flow', children: [status]})});
    owner.attach(dialog); dialog.open();
    Reflect.set(window, 'formStatus', status);
  });
  const dialog = page.getByRole('dialog', {name: 'Provider sign-in', exact: true});
  const status = dialog.getByRole('status');
  await expect(status).toHaveCSS('font-size', '14px');
  await expect(status).toHaveCSS('line-height', '21px');
  await expect(status).toHaveCSS('color', 'rgb(31, 37, 48)');
  await page.evaluate(() => Reflect.get(window, 'formStatus').update({message: 'Provider sign-in failed.', tone: 'error'}));
  await expect(dialog.getByRole('alert')).toHaveCSS('font-size', '14px');
  await expect(dialog.getByRole('alert')).toHaveCSS('color', 'rgb(180, 35, 24)');
});
