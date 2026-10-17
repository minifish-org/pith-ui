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
    await expect(close).toHaveCSS('background-color', 'rgb(228, 232, 238)');
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

test('an owned warning body retains its source row, content flow and quiet close with full explanatory text', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const u = await import('../src/index.js');
    const content = u.createStack({context: 'flow', children: [
      u.createMarkdown({text: 'Give Pith permission to run **all enabled tools, including external MCP connections,** without asking in **Simulated layout review**.'}),
      u.createSurface({purpose: 'notice', tone: 'warning', content: u.createActions({align: 'start', children: [u.createIcon({name: 'shield', context: 'notice'}), u.createStack({children: [
        u.createText({role: 'label', text: 'This is access to your computer account and connected services.'}),
        u.createText({role: 'caption', text: 'Commands can read, change, or delete files outside the workspace and access the network. External tools can act on their connected services. There is no OS sandbox.'}),
      ]})]})}),
    ]});
    const dialog = u.createConfirmDialog({purpose: 'form', tone: 'warning', title: 'Enable full access?', eyebrow: 'CONVERSATION PERMISSIONS', content,
      hint: 'This applies only to the current conversation and stays enabled across app restarts until you revoke it. To revoke it, choose “Ask before changes” or “Allow workspace changes” in the composer. Workspace permission alone never grants external MCP tools access.',
      confirmLabel: 'Enable full access', onConfirm: () => ({ok: true})});
    const owner = u.mount(document.body, u.createText({text: 'Host'})); owner.attach(dialog); dialog.open();
  });
  const dialog = page.getByRole('dialog', {name: 'Enable full access?', exact: true}), close = dialog.getByRole('button', {name: 'Close Enable full access?', exact: true});
  const modal = (await dialog.boundingBox())!, heading = (await dialog.locator('.pui-dialog-heading').boundingBox())!, closeBox = (await close.boundingBox())!;
  expect({width: modal.width, height: modal.height}).toEqual({width: 500, height: 484});
  expect({width: closeBox.width, height: closeBox.height, top: closeBox.y - heading.y}).toEqual({width: 27, height: 27, top: 0});
  const surface = dialog.locator('.pui-notice-surface'), row = surface.locator('>.pui-actions'), icon = row.locator('>[data-icon="shield"]'), body = row.locator('>.pui-control-stack');
  await expect(row).toHaveCSS('flex-wrap', 'nowrap');
  await expect(row).toHaveCSS('margin-top', '0px');
  await expect(row).toHaveCSS('padding-top', '0px');
  await expect(row).toHaveCSS('border-top-width', '0px');
  const card = (await surface.boundingBox())!, glyph = (await icon.boundingBox())!, text = (await body.boundingBox())!;
  expect(card.height).toBe(138);
  expect(text.width).toBe(383);
  expect(text.x - glyph.x - glyph.width).toBe(12);
  expect(glyph.y - text.y).toBe(4);
  const intro = (await dialog.locator('.pui-markdown>p').boundingBox())!, hint = (await dialog.locator('.pui-field-hint').boundingBox())!, footer = (await dialog.locator('.pui-confirm>.pui-actions').boundingBox())!;
  expect(intro.y - heading.y - heading.height).toBe(16);
  expect(card.y - intro.y - intro.height).toBe(24);
  expect(hint.y - card.y - card.height).toBe(16);
  expect(footer.y - hint.y - hint.height).toBe(16);
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
