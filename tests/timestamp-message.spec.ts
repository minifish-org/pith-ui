import {test, expect} from '@playwright/test';

const saved = Date.parse('2026-10-13T13:53:00Z');

// Accepted conversation-view.ts:154–156 owns <time>, canonical ISO datetime,
// full local title, and the short local hour/minute label. No caller format.
test('a timestamp owns native time semantics and the fixed local display', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async value => {
    const ui = await import('../src/index.js');
    const timestamp = Reflect.get(ui, 'createTimestamp')({value});
    ui.mount(document.body, timestamp);
    Reflect.set(window, 'timestampFixture', timestamp);
  }, saved);
  const time = page.locator('time');
  const expected = await page.evaluate(value => {const d = new Date(value); return {iso: d.toISOString(), title: d.toLocaleString(), label: d.toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'})};}, saved);
  await expect(time).toHaveAttribute('datetime', expected.iso);
  await expect(time).toHaveAttribute('title', expected.title);
  await expect(time).toHaveText(expected.label);
  await expect(time).toHaveCSS('font-size', '12px');
  await expect(time).toHaveCSS('white-space', 'nowrap');
});

test('timestamp updates retain their node, clear missing dates and can recover', async ({page}) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async value => {
    const ui = await import('../src/index.js'), time = Reflect.get(ui, 'createTimestamp')({value});
    const mounted = ui.mount(document.body, time), node = document.querySelector('time')!;
    const range = document.createRange(); range.selectNodeContents(node); const selection = getSelection()!; selection.removeAllRanges(); selection.addRange(range);
    const label = selection.toString(); time.update({value});
    const stable = node === document.querySelector('time') && selection.toString() === label;
    const cleared = [0, NaN, Infinity, -Infinity, 9e15].map(value => {time.update({value}); return {same: node === document.querySelector('time'), hidden: node.hidden, text: node.textContent, datetime: node.getAttribute('datetime'), title: node.getAttribute('title')};});
    time.update({value: value + 60000});
    const recovered = {same: node === document.querySelector('time'), hidden: node.hidden, datetime: node.getAttribute('datetime')};
    mounted.destroy();
    return {stable, cleared, recovered, removed: !node.isConnected};
  }, saved);
  expect(result.stable).toBe(true);
  for (const state of result.cleared) expect(state).toEqual({same: true, hidden: true, text: '', datetime: null, title: null});
  expect(result.recovered).toEqual({same: true, hidden: false, datetime: new Date(saved + 60000).toISOString()});
  expect(result.removed).toBe(true);
});

test('timestamps reject invalid types and presentation escapes before mutating saved time', async ({page}) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async value => {
    const ui = await import('../src/index.js'), make = Reflect.get(ui, 'createTimestamp'), errors: string[] = [];
    for (const invalid of ['2026-10-13', null, document.body, new Date(value)]) {
      try {Reflect.apply(make, undefined, [{value: invalid}]);} catch (error) {errors.push(String(error));}
    }
    const time = make({value}), mounted = ui.mount(document.body, time), node = document.querySelector('time')!, original = node.outerHTML;
    for (const state of [{value: 'Retarget'}, {value, format: 'full'}, {value, title: '<img src=x>'}, {value, style: {fontSize: 20}}]) {
      try {Reflect.apply(time.update, time, [state]);} catch (error) {errors.push(String(error));}
    }
    const retained = node.outerHTML === original; mounted.destroy(); return {errors, retained};
  }, saved);
  expect(result.errors).toHaveLength(8);
  expect(result.retained).toBe(true);
});

test('message roles retain their fixed accessible names without custom labels', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const ui = await import('../src/index.js'), message = ui.createMessage({role: 'user', content: ui.createText({text: 'A saved message'})});
    ui.mount(document.body, message); Reflect.set(window, 'namedMessage', message);
  });
  await expect(page.getByRole('article', {name: 'Your message', exact: true})).toHaveCount(1);
  await page.evaluate(() => Reflect.get(window, 'namedMessage').update({role: 'assistant'}));
  await expect(page.getByRole('article', {name: 'Agent response', exact: true})).toHaveCount(1);
  await page.evaluate(() => Reflect.get(window, 'namedMessage').update({role: 'system'}));
  await expect(page.locator('article')).not.toHaveAttribute('aria-label');
});

test('message numeric times reuse timestamp semantics while plain metadata remains unchanged', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async value => {
    const ui = await import('../src/index.js'), message = Reflect.get(ui, 'createMessage')({role: 'assistant', time: value, content: ui.createText({text: 'A saved response'})});
    ui.mount(document.body, message); Reflect.set(window, 'timedMessage', message);
  }, saved);
  const time = page.locator('.pui-message-frame time'), node = await time.elementHandle();
  await expect(time).toHaveAttribute('datetime', new Date(saved).toISOString());
  await expect(time).toHaveAttribute('title', await page.evaluate(value => new Date(value).toLocaleString(), saved));
  await expect(time).toHaveText(await page.evaluate(value => new Date(value).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'}), saved));
  await page.evaluate(value => Reflect.get(window, 'timedMessage').update({role: 'assistant', time: value + 60000, status: 'Completed'}), saved);
  expect(await node!.evaluate(node => node === document.querySelector('time'))).toBe(true);
  await expect(time).toHaveAttribute('datetime', new Date(saved + 60000).toISOString());
  await expect(page.locator('.pui-message-frame-meta')).toContainText(' · Completed');
  await page.evaluate(() => Reflect.get(window, 'timedMessage').update({role: 'assistant', time: '12:34', status: 'Saved'}));
  await expect(time).toBeHidden();
  await expect(page.locator('.pui-message-frame-meta')).toHaveText('12:34 · Saved');
  await page.evaluate(() => Reflect.get(window, 'timedMessage').update({role: 'assistant', time: 0}));
  await expect(page.locator('.pui-message-frame-footer')).toBeHidden();
});

test('message time rejects non-text data before changing the current identity or footer', async ({page}) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async () => {
    const ui = await import('../src/index.js'), message = ui.createMessage({role: 'assistant', time: 'Saved metadata', content: ui.createText({text: 'Response'})});
    const mounted = ui.mount(document.body, message), node = document.querySelector('article')!, before = node.outerHTML, errors: string[] = [];
    for (const time of [null, document.body, new Date()]) {
      try {Reflect.apply(message.update, message, [{role: 'user', time}]);}
      catch (error) {errors.push(String(error));}
    }
    const retained = node.outerHTML === before;
    message.update({role: 'assistant', time: '<img src=x onerror=alert(1)>'});
    const safe = !node.querySelector('img') && node.querySelector('.pui-message-frame-meta')!.textContent === '<img src=x onerror=alert(1)>';
    mounted.destroy(); return {retained, safe, errors};
  });
  expect(result.errors).toHaveLength(3);
  expect(result.retained).toBe(true);
  expect(result.safe).toBe(true);
});

test('the public timestamp exhibit demonstrates update, clear and recovery', async ({page}) => {
  await page.goto('/?item=timestamp&theme=light&state=normal');
  const time = page.locator('.gallery-preview time');
  await expect(time).toHaveAttribute('datetime', new Date(saved).toISOString());
  await page.getByRole('button', {name: 'Advance one minute', exact: true}).click();
  await expect(time).toHaveAttribute('datetime', new Date(saved + 60000).toISOString());
  await page.getByRole('button', {name: 'Clear time', exact: true}).click();
  await expect(time).toBeHidden();
  await page.getByRole('button', {name: 'Show saved time', exact: true}).click();
  await expect(time).toBeVisible();
  await expect(time).toHaveAttribute('datetime', new Date(saved).toISOString());
});
