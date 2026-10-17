import {test, expect} from '@playwright/test';

// Accepted 0.3.1 source: dom.dialogHeading and styles365/619–634,
// feature-toolbar136, workspace choices641–646, resource icons695,
// checkbox fields723–724. Native DOM composition, never pixel offsets.
for (const purpose of ['form', 'collection', 'document'] as const) for (const eyebrow of [false, true]) {
  test(`${purpose} dialog keeps its source close action aligned at the header top (${eyebrow ? 'with' : 'without'} eyebrow)`, async ({page}) => {
    await page.goto('/tests/fixture.html');
    await page.evaluate(async ({purpose, eyebrow}) => {
      const u = await import('../src/index.js');
      const dialog = u.createDialog({purpose, title: 'Source modal', eyebrow: eyebrow ? 'SOURCE CONTEXT' : undefined, content: u.createText({text: 'Owned content'})});
      const owner = u.mount(document.body, u.createText({text: 'Host'})); owner.attach(dialog); dialog.open();
    }, {purpose, eyebrow});
    const header = page.locator('.pui-dialog-heading'), close = header.getByRole('button', {name: 'Close Source modal', exact: true});
    await expect(close).toHaveCSS('align-self', 'flex-start');
    await expect(close).toHaveCSS('padding', '4px');
    await expect(close).toHaveCSS('border-top-width', '0px');
    await expect(close).toHaveCSS('border-radius', '6px');
    await expect(close).toHaveCSS('color', 'rgb(102, 112, 133)');
    const h = (await header.boundingBox())!, b = (await close.boundingBox())!, glyph = (await close.locator('svg').boundingBox())!;
    expect({width: b.width, height: b.height, top: b.y - h.y}).toEqual({width: 36, height: 36, top: 0});
    expect(h.height).toBe(eyebrow ? 53 : 36);
    expect(glyph.width).toBe(19); expect(glyph.height).toBe(19);
    expect(glyph.x - b.x).toBe((b.width - glyph.width) / 2);
    expect(glyph.y - b.y).toBe((b.height - glyph.height) / 2);
    await close.hover();
    await expect(close).toHaveCSS('background-color', 'rgb(224, 229, 238)');
    await expect(close).toHaveCSS('color', 'rgb(31, 37, 48)');
  });
}

test('bounded modal primary actions preserve their borderless source width and keep ordinary controls unchanged', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const u = await import('../src/index.js');
    const dialog = u.createDialog({purpose: 'form', title: 'Primary source', content: u.createForm({context: 'dialog', children: [u.createTextInput({label: 'Name'})], submitLabel: 'Save settings', onSubmit: () => ({ok: true}), onCancel() {}})});
    const owner = u.mount(document.body, u.createButton({label: 'Ordinary primary', intent: 'primary'})); owner.attach(dialog); dialog.open();
  });
  const submit = page.getByRole('button', {name: 'Save settings', exact: true});
  await expect(submit).toHaveCSS('border-top-width', '0px');
  await expect(submit).toHaveCSS('height', '40px');
  await expect(submit).toHaveCSS('padding', '8px 12px');
  await expect(page.getByRole('button', {name: 'Cancel', exact: true})).toHaveCSS('border-top-width', '1px');
  await expect(page.getByRole('button', {name: 'Ordinary primary', exact: true, includeHidden: true})).toHaveCSS('border-top-width', '1px');
});

test('a source warning confirmation keeps its primary frame borderless without changing generic danger', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const u = await import('../src/index.js');
    const dialog = u.createConfirmDialog({purpose: 'form', tone: 'warning', title: 'Warning source', message: 'Review the operation.', confirmLabel: 'Enable access', onConfirm: () => ({ok: true})});
    const owner = u.mount(document.body, u.createButton({label: 'Ordinary danger', intent: 'danger'})); owner.attach(dialog); dialog.open();
  });
  await expect(page.getByRole('button', {name: 'Enable access', exact: true})).toHaveCSS('border-top-width', '0px');
  await expect(page.getByRole('button', {name: 'Ordinary danger', exact: true, includeHidden: true})).toHaveCSS('border-top-width', '1px');
});

test('a retained collection flow preserves inventory toolbar spacing and native checkbox rhythm', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const u = await import('../src/index.js');
    const inventory = u.createStack({context: 'flow', children: [u.createText({role: 'lead', text: 'Source inventory.'}),
      u.createToolbar({label: 'Inventory actions', children: [u.createButton({label: 'Refresh'})]}),
      u.createList({items: [{key: 'entry', content: u.createSurface({purpose: 'panel', content: u.createText({role: 'label', text: 'Saved connection'})})}]}),
      u.createForm({context: 'dialog', children: [u.createURLInput({label: 'Server URL'}), u.createCheckbox({label: 'Sign in with OAuth'}),
        u.createFormSection({context: 'model', title: 'Model', children: [u.createCheckbox({label: 'Thinking effort'})]})], onSubmit: () => ({ok: true})}),
    ]});
    const dialog = u.createDialog({purpose: 'collection', title: 'Connections', content: u.createStack({context: 'flow', children: [u.createNotice({presentation: 'caption', tone: 'error', message: ''}), inventory]})});
    const owner = u.mount(document.body, u.createCheckbox({label: 'Ordinary checkbox'})); owner.attach(dialog); dialog.open();
  });
  const toolbar = (await page.getByRole('toolbar', {name: 'Inventory actions', exact: true}).boundingBox())!, card = (await page.locator('.pui-panel-surface').boundingBox())!;
  expect(card.y - toolbar.y - toolbar.height).toBe(16);
  const checkbox = page.getByRole('checkbox', {name: 'Sign in with OAuth', exact: true}).locator('..');
  await expect(checkbox).toHaveCSS('display', 'flex');
  await expect(checkbox).toHaveCSS('font-size', '12px');
  await expect(checkbox).toHaveCSS('line-height', '18px');
  await expect(checkbox).toHaveCSS('margin', '16px 0px 0px');
  const input = (await page.getByRole('textbox', {name: 'Server URL', exact: true}).boundingBox())!, check = (await checkbox.boundingBox())!;
  expect(check.height).toBe(18); expect(check.y - input.y - input.height).toBe(16);
  await expect(page.getByRole('checkbox', {name: 'Thinking effort', exact: true}).locator('..')).toHaveCSS('font-size', '14px');
  await expect(page.getByRole('checkbox', {name: 'Ordinary checkbox', exact: true, includeHidden: true}).locator('..')).toHaveCSS('font-size', '14px');
});

test('resource and choice glyph wrappers preserve direct flex-item alignment and source colors', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const u = await import('../src/index.js');
    u.mount(document.body, u.createStack({children: [
      u.createListRow({context: 'resource', title: 'AGENTS.md', icon: 'file', meta: '/tmp/AGENTS.md'}),
      u.createListRow({context: 'choice', title: 'Workspace', icon: 'folder', description: '/tmp/workspace', actions: u.createIcon({name: 'chevron'}), onAction() {}}),
    ]}));
  });
  const resource = page.locator('.pui-list-row-resource'), file = resource.locator('.pui-list-row-icon svg');
  const r = (await resource.boundingBox())!, f = (await file.boundingBox())!;
  expect(f.y - r.y).toBe(17);
  await expect(file).toHaveCSS('color', 'rgb(102, 112, 133)');
  const choice = page.locator('.pui-list-row-choice'), folder = choice.locator('.pui-list-row-icon svg'), chevron = choice.locator('.pui-list-row-actions svg');
  const c = (await choice.boundingBox())!, g = (await folder.boundingBox())!, a = (await chevron.boundingBox())!;
  expect(g.y + g.height / 2).toBe(c.y + c.height / 2);
  expect(c.x + c.width - a.x - a.width).toBe(13);
  await expect(chevron).toHaveCSS('color', 'rgb(93, 103, 122)');
});

test('bounded modal placeholders retain the small source text while ordinary fields retain their default', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const u = await import('../src/index.js');
    const dialog = u.createDialog({purpose: 'form', title: 'Placeholder source', content: u.createTextInput({label: 'Folder path', placeholder: '/Users/you/Documents/my-work'})});
    const owner = u.mount(document.body, u.createTextInput({label: 'Ordinary text', placeholder: 'Ordinary placeholder'})); owner.attach(dialog); dialog.open();
  });
  expect(await page.getByRole('textbox', {name: 'Folder path', exact: true}).evaluate(node => getComputedStyle(node, '::placeholder').fontSize)).toBe('12px');
  expect(await page.getByRole('textbox', {name: 'Ordinary text', exact: true, includeHidden: true}).evaluate(node => getComputedStyle(node, '::placeholder').fontSize)).toBe('14px');
});
