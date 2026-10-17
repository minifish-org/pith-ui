import {test, expect} from '@playwright/test';
import type {Control} from '../src/index.js';

// Accepted 0.3.1 history uses the ordinary notice frame, a 3px selected left
// border, and a natural-flow card heading. These are small presentation states.
for (const appearance of ['light', 'dark'] as const) {
  test(`selected notice preserves its frame and owned child state in ${appearance}`, async ({page}) => {
    await page.goto('/tests/fixture.html');
    await page.evaluate(async appearance => {
      const ui = await import('../src/index.js');
      const make = Reflect.get(ui, 'createSurface') as (options: unknown) => Control;
      const body = ui.createTextInput({label: 'Retained draft', value: 'Original draft'});
      let calls = 0;
      const action = ui.createButton({label: 'Continue here', onAction() {Reflect.set(window, 'selectedCalls', ++calls);}});
      const selected = make({purpose: 'notice', selected: true, content: body, footer: action});
      const ordinary = ui.createSurface({purpose: 'notice', content: ui.createText({text: 'Unselected notice'})});
      const owner = ui.mount(document.body, ui.createStack({children: [selected, ordinary]}), {appearance});
      Reflect.set(window, 'selectedFixture', {selected, owner});
    }, appearance);
    const card = page.locator('.pui-notice-surface').first();
    const ordinary = page.locator('.pui-notice-surface').last();
    const input = page.getByRole('textbox', {name: 'Retained draft', exact: true});
    const frame = await card.evaluate(node => {
      const css = getComputedStyle(node);
      return {padding: css.padding, radius: css.borderRadius, background: css.backgroundColor,
        top: css.borderTopWidth, right: css.borderRightWidth, bottom: css.borderBottomWidth,
        left: css.borderLeftWidth, leftColor: css.borderLeftColor, shadow: css.boxShadow,
        otherColors: [css.borderTopColor, css.borderRightColor, css.borderBottomColor]};
    });
    expect(frame).toMatchObject({padding: '16px', radius: '12px', top: '1px', right: '1px', bottom: '1px',
      left: '3px', leftColor: appearance === 'light' ? 'rgb(74, 98, 200)' : 'rgb(134, 182, 242)', shadow: 'none'});
    expect(frame.background).toBe(await ordinary.evaluate(node => getComputedStyle(node).backgroundColor));
    expect(frame.otherColors).toEqual(await ordinary.evaluate(node => {
      const css = getComputedStyle(node); return [css.borderTopColor, css.borderRightColor, css.borderBottomColor];
    }));
    await expect(card).not.toHaveAttribute('aria-selected');
    await input.fill('Retained user draft');
    await input.evaluate(node => (node as HTMLInputElement).setSelectionRange(1, 7));
    const before = (await input.boundingBox())!, retained = await input.elementHandle();
    await page.evaluate(() => (Reflect.get(window, 'selectedFixture').selected as Control).update({label: 'Current item'}));
    await expect(card).toHaveCSS('border-left-width', '3px');
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('Retained user draft');
    expect(await input.evaluate(node => [(node as HTMLInputElement).selectionStart, (node as HTMLInputElement).selectionEnd])).toEqual([1, 7]);
    await page.evaluate(() => (Reflect.get(window, 'selectedFixture').selected as Control).update({selected: false}));
    await expect(card).toHaveCSS('border-left-width', '1px');
    expect((await input.boundingBox())!.x).toBe(before.x - 2);
    expect(await retained!.evaluate(node => node === document.querySelector('input'))).toBe(true);
    await page.evaluate(() => (Reflect.get(window, 'selectedFixture').selected as Control).update({selected: true}));
    await expect(card).toHaveCSS('border-left-width', '3px');
    const action = page.getByRole('button', {name: 'Continue here', exact: true});
    await expect(action).toBeEnabled();
    await action.click();
    expect(await page.evaluate(() => Reflect.get(window, 'selectedCalls'))).toBe(1);
    const retainedAction = await action.elementHandle();
    await page.evaluate(() => Reflect.get(window, 'selectedFixture').owner.destroy());
    await retainedAction!.evaluate(node => (node as HTMLButtonElement).click());
    expect(await page.evaluate(() => Reflect.get(window, 'selectedCalls'))).toBe(1);
  });
}

test('ordinary surfaces reject selected state before changing their frame', async ({page}) => {
  await page.goto('/tests/fixture.html');
  const failures = await page.evaluate(async () => {
    const ui = await import('../src/index.js');
    const make = Reflect.get(ui, 'createSurface') as (options: unknown) => Control;
    const failures: string[] = [];
    for (const purpose of [undefined, 'input', 'panel']) {
      const content = ui.createText({text: 'Owned content'});
      try {make({purpose, selected: true, content});}
      catch {failures.push(purpose ?? 'default'); content.destroy();}
    }
    const input = ui.createSurface({content: ui.createText({text: 'Ordinary input surface'})});
    ui.mount(document.body, input);
    for (const state of [{selected: true}, {purpose: 'notice', selected: true}]) {
      try {input.update(state as never);} catch {failures.push('update');}
    }
    return failures;
  });
  expect(failures).toEqual(['default', 'input', 'panel', 'update', 'update']);
  await expect(page.locator('.pui-input-surface')).toHaveCSS('border-left-width', '1px');
  await expect(page.locator('.pui-notice-surface')).toHaveCount(0);
});

test('notice selection rejects invalid purpose and non-boolean transitions without mutation', async ({page}) => {
  await page.goto('/tests/fixture.html');
  const failures = await page.evaluate(async () => {
    const ui = await import('../src/index.js');
    const make = Reflect.get(ui, 'createSurface') as (options: unknown) => Control;
    const notice = make({purpose: 'notice', selected: true, content: ui.createText({text: 'Notice content'})});
    ui.mount(document.body, notice);
    const failures: string[] = [];
    for (const state of [{purpose: 'input', selected: false}, {purpose: 'panel'}, {selected: 'yes'}]) {
      try {notice.update(state);} catch {failures.push(JSON.stringify(state));}
    }
    return failures;
  });
  expect(failures).toHaveLength(3);
  await expect(page.locator('.pui-notice-surface')).toHaveCSS('border-left-width', '3px');
  await expect(page.locator('.pui-panel-surface')).toHaveCount(0);
});

test('natural-flow notice headings top-align title and action in both selection states', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const ui = await import('../src/index.js');
    const make = Reflect.get(ui, 'createSurface') as (options: unknown) => Control;
    ui.mount(document.body, ui.createStack({children: [false, true].map(selected => make({purpose: 'notice', selected,
      content: ui.createStack({context: 'flow', children: [ui.createToolbar({label: selected ? 'Current item' : 'Other item',
        leading: ui.createText({role: 'label', text: selected ? 'Selected item' : 'Saved item'}),
        trailing: ui.createButton({label: 'Continue here'})}), ui.createText({text: 'Saved text content.'})]})}))}));
  });
  for (const card of await page.locator('.pui-notice-surface').all()) {
    const title = card.locator('[data-role="label"]'), action = card.getByRole('button', {name: 'Continue here', exact: true});
    expect((await title.boundingBox())!.y).toBe((await action.boundingBox())!.y);
    await expect(action).toBeEnabled();
  }
});

test('Surface showroom demonstrates selection, retained updates and explicit clearing', async ({page}) => {
  await page.goto('/?item=surface&theme=light');
  const card = page.locator('.pui-notice-surface').filter({hasText: 'Selectable notice example'});
  await expect(card).toHaveCSS('border-left-width', '1px');
  await page.getByRole('button', {name: 'Select notice', exact: true}).click();
  await expect(card).toHaveCSS('border-left-width', '3px');
  await page.getByRole('button', {name: 'Update notice label', exact: true}).click();
  await expect(card).toHaveAttribute('aria-label', 'Updated notice label');
  await expect(card).toHaveCSS('border-left-width', '3px');
  await page.getByRole('button', {name: 'Clear notice selection', exact: true}).click();
  await expect(card).toHaveCSS('border-left-width', '1px');
});
