import {test, expect} from '@playwright/test';
import type {Input, Select} from '../src/index.js';

// Accepted 0.3.1 sources use native three-row MCP fields, a 300px document
// editor, and a six-row model catalog. The library owns these finite purposes.
test('form text areas keep native three-row code fields and private-value lifecycle', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const ui = await import('../src/index.js');
    const textArea = Reflect.get(ui, 'createTextArea') as (options: unknown) => Input;
    const secretArea = Reflect.get(ui, 'createSecretTextArea') as (options: unknown) => Input;
    const args = textArea({purpose: 'form', label: 'Arguments', value: '[]'});
    const secret = secretArea({purpose: 'form', label: 'Environment', value: '{"KEY":"private"}'});
    const mounted = ui.mount(document.body, ui.createForm({context: 'dialog', children: [args, secret], onSubmit: () => ({ok: true})}));
    Reflect.set(window, 'purposeFields', {args, secret, mounted});
  });
  for (const label of ['Arguments', 'Environment']) {
    const input = page.getByRole('textbox', {name: label, exact: true});
    await expect(input).toHaveAttribute('rows', '3');
    await expect(input).toHaveCSS('min-height', '65px');
    await expect(input).toHaveCSS('font-size', '14px');
    await expect(input).toHaveCSS('line-height', '21px');
    await expect(input).toHaveCSS('padding', '12px');
    await expect(input).toHaveCSS('font-family', /monospace/);
    expect((await input.boundingBox())!.height).toBe(89);
  }
  const secret = page.getByRole('textbox', {name: 'Environment', exact: true});
  const show = page.getByRole('button', {name: 'Show', exact: true});
  const labelBox = await secret.evaluate(node => node.closest('.pui-field')!.querySelector('label')!.getBoundingClientRect().toJSON());
  const inputBox = (await secret.boundingBox())!, showBox = (await show.boundingBox())!;
  expect(showBox.height).toBe(40);
  expect(showBox.x + showBox.width).toBe(inputBox.x + inputBox.width);
  expect(showBox.y + showBox.height / 2).toBe(labelBox.y + labelBox.height / 2);
  expect(inputBox.y - showBox.y - showBox.height).toBe(8);
  await expect(secret).toHaveCSS('-webkit-text-security', 'disc');
  await show.click();
  await expect(secret).toHaveValue('{"KEY":"private"}');
  await expect(secret).toHaveCSS('-webkit-text-security', 'none');
  await page.evaluate(() => Reflect.get(window, 'purposeFields').secret.reset('replacement'));
  await expect(secret).toHaveValue('replacement');
  await expect(secret).toHaveCSS('-webkit-text-security', 'disc');
  await page.evaluate(() => Reflect.get(window, 'purposeFields').args.update({label: 'Arguments', disabled: true}));
  await expect(page.getByRole('textbox', {name: 'Arguments', exact: true})).toHaveAttribute('rows', '3');
  await expect(page.getByRole('textbox', {name: 'Arguments', exact: true})).toHaveValue('[]');
  const retained = await secret.elementHandle();
  await page.evaluate(() => Reflect.get(window, 'purposeFields').mounted.destroy());
  expect(await retained!.evaluate(node => (node as HTMLTextAreaElement).value)).toBe('');
});

test('a document field owns its fixed code editor geometry without changing ordinary text areas', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const ui = await import('../src/index.js');
    const make = Reflect.get(ui, 'createTextArea') as (options: unknown) => Input;
    const document = make({purpose: 'document', label: 'Markdown', value: '# Saved resource'});
    ui.mount(window.document.body, ui.createStack({children: [document, ui.createTextArea({label: 'Ordinary notes', value: 'Notes'})]}));
    Reflect.set(window, 'documentField', document);
  });
  const document = page.getByRole('textbox', {name: 'Markdown', exact: true});
  await expect(document).toHaveCSS('min-height', '300px');
  await expect(document).toHaveCSS('padding', '12px');
  await expect(document).toHaveCSS('border-radius', '10px');
  await expect(document).toHaveCSS('font-size', '14px');
  await expect(document).toHaveCSS('line-height', '21px');
  await expect(document).toHaveCSS('font-family', /monospace/);
  await document.fill('# User draft');
  const node = await document.elementHandle();
  await page.evaluate(() => Reflect.get(window, 'documentField').update({label: 'Markdown', readOnly: true}));
  await expect(document).toHaveValue('# User draft');
  await expect(document).toHaveAttribute('readonly', '');
  expect(await node!.evaluate(node => node === window.document.querySelector('textarea'))).toBe(true);
  await expect(page.getByRole('textbox', {name: 'Ordinary notes', exact: true})).toHaveCSS('min-height', '100px');
});

test('a catalog select owns six native rows while an ordinary list keeps five', async ({page, browserName}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const ui = await import('../src/index.js');
    const make = Reflect.get(ui, 'createListSelect') as (options: unknown) => Select;
    const options = Array.from({length: 8}, (_, index) => ({value: String(index), label: 'Model ' + index}));
    const catalog = make({purpose: 'catalog', label: 'Choose model', labelVisibility: 'hidden', options, value: '2'});
    ui.mount(document.body, ui.createStack({children: [catalog, ui.createListSelect({label: 'Ordinary list', options})]}));
    Reflect.set(window, 'catalogField', {catalog, options});
  });
  const catalog = page.getByRole('listbox', {name: 'Choose model', exact: true});
  expect(await catalog.evaluate(node => node.tagName)).toBe('SELECT');
  await expect(catalog).toHaveAttribute('size', '6');
  await expect(catalog).toHaveCSS('padding', '8px');
  await expect(catalog).toHaveCSS('font-size', '16px');
  await expect(catalog).toHaveCSS('line-height', '24px');
  // Preserve the measured macOS values. Native WebKit metrics differ on Linux;
  // compare every platform against an isolated native select with the accepted
  // source CSS, never a tolerance or another library-controlled implementation.
  const height = (await catalog.boundingBox())!.height;
  if (process.platform === 'darwin') expect(height).toBe(browserName === 'webkit' ? 131 : 210);
  const nativeHeight = await catalog.evaluate(node => {
    const frame = document.createElement('iframe');
    frame.setAttribute('title', 'Independent native catalog measurement');
    frame.style.width = node.getBoundingClientRect().width + 'px';
    frame.style.height = '400px';
    frame.style.border = '0';
    document.body.append(frame);
    try {
      const doc = frame.contentDocument!;
      doc.body.style.margin = '0';
      const select = doc.createElement('select');
      select.size = 6;
      select.style.cssText = "display:block;width:100%;min-width:0;min-height:40px;height:auto;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:16px;font-weight:400;line-height:24px;padding:8px;border:1px solid #CDD3DD;border-radius:8px;";
      for (let index = 0; index < 8; index++) {
        const option = doc.createElement('option');
        option.textContent = 'Model ' + index;
        option.style.cssText = 'box-sizing:border-box;min-height:32px;padding:4px 8px;line-height:24px;border-radius:5px;';
        select.append(option);
      }
      doc.body.append(select);
      if (select.closest('.pui')) throw new Error('Native oracle must not inherit Pith UI styles');
      return select.getBoundingClientRect().height;
    } finally {frame.remove();}
  });
  expect(height).toBe(nativeHeight);
  await catalog.press('ArrowDown');
  await expect(catalog).toHaveValue('3');
  await page.evaluate(() => {const state = Reflect.get(window, 'catalogField'); state.catalog.update({label: 'Choose model', options: state.options});});
  await expect(catalog).toHaveValue('3');
  await expect(catalog).toHaveAttribute('size', '6');
  await expect(page.getByRole('listbox', {name: 'Ordinary list', exact: true})).toHaveAttribute('size', '5');
});
