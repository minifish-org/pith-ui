import {test, expect} from '@playwright/test';

test('inline and readout folds retain native triangles while navigation and output keep their icons', async ({page, browserName}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const ui = await import('../src/index.js');
    ui.mount(document.body, ui.createStack({context: 'flow', children: ['inline', 'readout', 'navigation', 'output'].map(context => ui.createDisclosure({context: context as 'inline' | 'readout' | 'navigation' | 'output', title: context, content: ui.createText({text: context + ' content'})}))}));
  });
  for (const context of ['inline', 'readout']) {
    const fold = page.locator('.pui-disclosure-' + context), summary = fold.locator(':scope > summary');
    await expect(summary).toHaveCSS('display', 'list-item');
    await expect(summary).toHaveCSS('list-style-position', 'inside');
    await expect(summary).toHaveCSS('list-style-type', 'disclosure-closed');
    await expect(summary.locator('.pui-disclosure-chevron')).toBeHidden();
    const closedTextOffset = await summary.evaluate(node => {const title = node.querySelector('span:not([class])')!, range = document.createRange(); range.selectNodeContents(title); return range.getBoundingClientRect().x - node.getBoundingClientRect().x;});
    expect(closedTextOffset).toBe(browserName === 'webkit' ? 14.8544921875 : 14.828125);
    await summary.press('Space');
    await expect(summary).toHaveCSS('list-style-type', 'disclosure-open');
    const openTextOffset = await summary.evaluate(node => {const title = node.querySelector('span:not([class])')!, range = document.createRange(); range.selectNodeContents(title); return range.getBoundingClientRect().x - node.getBoundingClientRect().x;});
    expect(openTextOffset).toBe(browserName === 'webkit' ? 14.3828125 : 14.828125);
  }
  for (const context of ['navigation', 'output']) {
    const summary = page.locator('.pui-disclosure-' + context + ' > summary');
    await expect(summary).toHaveCSS('display', 'flex');
    await expect(summary.locator('.pui-disclosure-chevron')).toBeVisible();
  }
});

test('a warning explanation keeps its native argument fold at the compact source size', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const ui = await import('../src/index.js');
    ui.mount(document.body, ui.createSurface({purpose: 'notice', tone: 'warning', content: ui.createDisclosure({context: 'readout', title: 'Tool arguments', content: ui.createDocument({format: 'text', text: '{"path":"README.md"}'})})}));
  });
  const fold = page.locator('.pui-disclosure-readout');
  await expect(fold).toHaveCSS('margin', '8px 0px 0px');
  await expect(fold.locator(':scope > summary')).toHaveCSS('font-size', '12px');
  await expect(fold.locator(':scope > summary')).toHaveCSS('line-height', '18px');
  await expect(fold.locator(':scope > summary')).toHaveCSS('display', 'list-item');
  await expect(fold.locator('.pui-disclosure-chevron')).toBeHidden();
});

// Source contracts: accepted 0.3.1 styles.css run-status and cost-requests,
// tasks/runtime.ts dl + paragraph in natural flow. Ordinary KeyValue is separate.
test('a readout owns right-aligned runtime values, natural paragraphs and nested request details', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const ui = await import('../src/index.js');
    const items = [
      {key: 'provider', label: 'Provider', value: 'Simulated provider'},
      {key: 'duration', label: 'Latest task duration', value: '3s'},
    ];
    const values = ui.createKeyValue({items});
    const costs = ui.createDisclosure({context: 'inline', title: 'Request breakdown', content: ui.createStack({context: 'flow', children: [
      ui.createNotice({presentation: 'inline', message: 'Simulated request status.'}),
      ui.createText({role: 'body', text: 'Costs estimate recorded requests. This is not a provider bill.'}),
    ]})});
    const readout = ui.createDisclosure({context: 'readout', title: 'Finished', open: true, content: ui.createStack({context: 'flow', children: [
      values, ui.createText({role: 'body', text: 'Duration and average speed cover the latest task, including tools and waits.'}), ui.createSlot({content: costs}),
    ]})});
    ui.mount(document.body, ui.createStack({context: 'flow', children: [readout, ui.createKeyValue({items: [{key: 'ordinary', label: 'Ordinary value', value: 'Independent'}]})]}));
    Reflect.set(window, 'readoutLayout', {values, items, readout});
  });
  const readout = page.locator('.pui-disclosure-readout').first();
  await expect(readout).toHaveCSS('color', 'rgb(102, 112, 133)');
  await expect(readout.locator(':scope > summary')).toHaveCSS('color', 'rgb(102, 112, 133)');
  await expect(readout.locator(':scope > summary')).toHaveCSS('padding', '8px 0px');
  const values = readout.locator('dl').first();
  await expect(values).toHaveCSS('display', 'grid');
  await expect(values).toHaveCSS('row-gap', '8px');
  await expect(values).toHaveCSS('margin', '8px 0px');
  const row = values.locator(':scope > div').first();
  await expect(row).toHaveCSS('column-gap', '16px');
  await expect(row).toHaveCSS('padding', '0px');
  for (const value of await values.locator('dd').all()) {
    await expect(value).toHaveCSS('text-align', 'right');
    await expect(value).toHaveCSS('color', 'rgb(102, 112, 133)');
    const valueBox = (await value.boundingBox())!, valuesBox = (await values.boundingBox())!;
    expect(valueBox.x + valueBox.width).toBe(valuesBox.x + valuesBox.width);
  }
  const note = readout.getByText('Duration and average speed cover the latest task, including tools and waits.', {exact: true});
  await expect(note).toHaveCSS('font-size', '14px');
  await expect(note).toHaveCSS('line-height', '21px');
  await expect(note).toHaveCSS('margin', '14px 0px');
  await expect(note).toHaveCSS('max-width', '720px');
  const costs = readout.locator('.pui-disclosure-inline');
  await expect(costs).toHaveCSS('margin', '12px 0px 0px');
  await expect(costs).toHaveCSS('padding', '8px 0px 0px');
  await expect(costs).toHaveCSS('border-top-width', '1px');
  await costs.locator(':scope > summary').press('Space');
  await expect(costs.getByText('Costs estimate recorded requests. This is not a provider bill.', {exact: true})).toHaveCSS('font-size', '14px');
  await page.evaluate(() => {
    const state = Reflect.get(window, 'readoutLayout');
    const provider = [...document.querySelectorAll('dd')].find(node => node.textContent === 'Simulated provider')!;
    const range = document.createRange(); range.selectNodeContents(provider); getSelection()!.removeAllRanges(); getSelection()!.addRange(range);
    state.values.update({items: [state.items[0], {...state.items[1], value: '4s'}]});
  });
  expect(await page.evaluate(() => getSelection()!.toString())).toBe('Simulated provider');
  await expect(readout).toHaveAttribute('open', '');
  await expect(values.getByText('4s', {exact: true})).toBeVisible();
  const ordinary = page.locator('dl').last();
  await expect(ordinary).toHaveCSS('margin', '0px');
  await expect(ordinary.locator(':scope > div')).toHaveCSS('padding', '4px 0px');
  await expect(ordinary.locator('dd')).toHaveCSS('text-align', 'start');
});
