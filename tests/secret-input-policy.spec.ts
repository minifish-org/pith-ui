import {test, expect} from '@playwright/test';

// Accepted forms-provider-login.ts:20–23 creates only a native password input;
// its Continue action follows the input by12px (styles.css:881). Showing a
// saved secret is optional behavior, not an extra layout row every host needs.
test('a non-revealable secret preserves the native field and short-form rhythm', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const ui = await import('../src/index.js');
    const field = Reflect.get(ui, 'createSecretInput')({label: 'Login answer', revealable: false, required: true, value: 'Original secret'});
    const form = ui.createForm({context: 'inline', children: [field], submitLabel: 'Continue', onSubmit: () => ({ok: true})});
    const mounted = ui.mount(document.body, form);
    Reflect.set(window, 'secretPolicy', {field, mounted});
  });
  const input = page.getByLabel(/^Login answer/);
  await expect(input).toHaveAttribute('type', 'password');
  await expect(page.getByRole('button', {name: /^(Show|Hide)$/})).toHaveCount(0);
  const a = (await input.boundingBox())!, b = (await page.getByRole('button', {name: 'Continue', exact: true}).boundingBox())!;
  expect(b.y - a.y - a.height).toBe(12);
  await input.fill('Edited private draft');
  await input.evaluate(node => (node as HTMLInputElement).setSelectionRange(2, 7));
  const retained = await input.elementHandle();
  await page.evaluate(() => Reflect.get(window, 'secretPolicy').field.update({label: 'Login answer', required: true, readOnly: true}));
  await expect(input).toHaveValue('Edited private draft');
  expect(await input.evaluate(node => ({start: (node as HTMLInputElement).selectionStart, end: (node as HTMLInputElement).selectionEnd}))).toEqual({start: 2, end: 7});
  await expect(page.getByRole('button', {name: /^(Show|Hide)$/})).toHaveCount(0);
  await page.evaluate(() => Reflect.get(window, 'secretPolicy').field.reset(''));
  await expect(input).toHaveAttribute('type', 'password');
  await expect(input).toHaveValue('');
  expect(await input.evaluate(node => (node as HTMLInputElement).required)).toBe(true);
  await page.evaluate(() => {const f = Reflect.get(window, 'secretPolicy'); f.field.reset('Secret to scrub'); f.mounted.destroy();});
  expect(await retained!.evaluate(node => (node as HTMLInputElement).value)).toBe('');
});

test('the default secret retains its existing reveal, disable and reset behavior', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const ui = await import('../src/index.js');
    const field = ui.createSecretInput({label: 'Saved key', value: 'Saved secret'});
    ui.mount(document.body, field);
    Reflect.set(window, 'defaultSecretPolicy', field);
  });
  const input = page.getByLabel('Saved key', {exact: true}), show = page.getByRole('button', {name: 'Show', exact: true});
  await expect(show).toHaveAttribute('type', 'button');
  await show.click();
  await expect(input).toHaveAttribute('type', 'text');
  await expect(input).toHaveValue('Saved secret');
  await page.evaluate(() => Reflect.get(window, 'defaultSecretPolicy').update({label: 'Saved key', disabled: true}));
  await expect(page.getByRole('button', {name: 'Hide', exact: true})).toBeDisabled();
  await page.evaluate(() => Reflect.get(window, 'defaultSecretPolicy').reset('Replacement'));
  await expect(input).toHaveAttribute('type', 'password');
  await expect(input).toHaveValue('Replacement');
});

test('secret reveal policy accepts only a construction boolean and has no update or text-field escape', async ({page}) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async () => {
    const ui = await import('../src/index.js'), errors: string[] = [];
    for (const value of ['false', 0, null, document.body]) {
      try {Reflect.apply(ui.createSecretInput, undefined, [{label: 'Invalid', revealable: value}]);}
      catch (error) {errors.push(String(error));}
    }
    const field = Reflect.get(ui, 'createSecretInput')({label: 'Locked policy', revealable: false});
    try {Reflect.apply(field.update, field, [{label: 'Locked policy', revealable: true}]);}
    catch (error) {errors.push(String(error));}
    try {Reflect.apply(ui.createTextInput, undefined, [{label: 'Plain input', revealable: false}]);}
    catch (error) {errors.push(String(error));}
    field.destroy();
    return errors;
  });
  expect(result).toHaveLength(6);
  for (const error of result.slice(0, 4)) expect(error).toMatch(/boolean/);
  for (const error of result.slice(4)) expect(error).toContain('revealable');
});

test('the public secret exhibit exposes both supported construction policies', async ({page}) => {
  await page.goto('/?item=secret-input&theme=light&state=normal');
  const preview = page.locator('.gallery-preview');
  await expect(preview.getByRole('button', {name: 'Show', exact: true})).toHaveCount(1);
  const answer = preview.getByLabel('Secret sign-in answer', {exact: true});
  await expect(answer).toHaveAttribute('type', 'password');
  await answer.fill('An editable demonstration answer');
  await expect(answer).toHaveValue('An editable demonstration answer');
  await preview.getByRole('button', {name: 'Show', exact: true}).click();
  await expect(preview.getByLabel('API key', {exact: true})).toHaveAttribute('type', 'text');
  await expect(answer).toHaveAttribute('type', 'password');
});
