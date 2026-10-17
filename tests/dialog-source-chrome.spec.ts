import {test, expect, type Page} from '@playwright/test';

async function sourceWarningGeometry(page: Page) {
  // Independent literal 0.3.1 template/CSS from Desk52c0d4d. The source UI font
  // remains platform-native; no dimensions or declarations come from Pith UI.
  return page.evaluate(async () => {
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:1280px;height:800px;border:0';
    const ready = new Promise<void>(resolve => {frame.onload = () => resolve();});
    frame.srcdoc = `<!doctype html><html class="pui"><head><style>
      .pui {font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;font-weight:400;line-height:1.5;letter-spacing:normal;font-synthesis:none}
      .pui * {box-sizing:border-box}.pui body {margin:0}
      .pui button {font:inherit;cursor:pointer;border:0;color:inherit}
      .pui strong {font-weight:600}
      .pui .pui-icon {display:inline-block;width:19px;height:19px;flex-shrink:0;vertical-align:middle}
      .pui .pui-primary-button,.pui .pui-secondary-button,.pui .pui-quiet-icon {display:inline-flex;align-items:center;justify-content:center}
      .pui .pui-primary-button,.pui .pui-secondary-button {gap:8px;min-height:40px;font-size:14px;line-height:1.5;font-weight:600;padding:8px 12px;border-radius:7px}
      .pui .pui-secondary-button {border:1px solid #D9DFE8}
      .pui .pui-quiet-icon {padding:4px;border-radius:6px}
      .pui .pui-modal {width:min(500px,calc(100% - 40px));max-height:calc(100dvh - 60px);overflow-y:auto;border:1px solid #B9C2D0;border-radius:15px;padding:24px}
      .pui .pui-modal-heading {display:flex;align-items:center;justify-content:space-between}
      .pui .pui-modal-heading .pui-eyebrow {font-size:12px;letter-spacing:normal;font-weight:600}
      .pui .pui-modal h2 {font-size:16px;font-weight:600;line-height:1.5;letter-spacing:normal;margin:8px 0 0}
      .pui .pui-modal .pui-quiet-icon {align-self:flex-start}
      .pui .pui-modal-description {font-size:14px;line-height:1.5;margin:16px 0 24px}
      .pui .pui-full-access-explanation {display:flex;align-items:flex-start;gap:12px;padding:16px;border:1px solid #D8B470;border-radius:9px}
      .pui .pui-full-access-explanation>.pui-icon {width:21px;height:21px;margin-top:4px}
      .pui .pui-full-access-explanation strong {font-size:14px;font-weight:600}
      .pui .pui-full-access-explanation p {font-size:12px;line-height:1.5;margin:8px 0 0}
      .pui .pui-permission-revoke-note {font-size:12px;line-height:1.5;margin:16px 0 0}
      .pui .pui-form-error:empty {display:none}
      .pui .pui-modal-footer {display:flex;justify-content:flex-end;gap:8px;margin-top:16px;padding-top:16px;border-top:1px solid #D9DFE8}
    </style></head><body><dialog class="pui-modal"><div><div class="pui-full-access-confirmation">
      <div class="pui-modal-heading"><div><span class="pui-eyebrow">CONVERSATION PERMISSIONS</span><h2>Enable full access?</h2></div><button class="pui-quiet-icon"><svg class="pui-icon" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"></path></svg></button></div>
      <p class="pui-modal-description">Give Pith permission to run <strong>all enabled tools, including external MCP connections,</strong> without asking in <strong>Simulated layout review</strong>.</p>
      <div class="pui-full-access-explanation"><svg class="pui-icon" viewBox="0 0 24 24"><path d="m12 3 8 4v5c0 5-8 9-8 9s-8-4-8-9V7Z"></path></svg><div><strong>This is access to your computer account and connected services.</strong><p>Commands can read, change, or delete files outside the workspace and access the network. External tools can act on their connected services. There is no OS sandbox.</p></div></div>
      <p class="pui-permission-revoke-note">This applies only to the current conversation and stays enabled across app restarts until you revoke it. To revoke it, choose “Ask before changes” or “Allow workspace changes” in the composer. Workspace permission alone never grants external MCP tools access.</p>
      <div class="pui-form-error"></div><div class="pui-modal-footer"><button class="pui-secondary-button">Cancel</button><button class="pui-primary-button">Enable full access</button></div>
    </div></div></dialog></body></html>`;
    document.body.append(frame); await ready;
    try {
      const doc = frame.contentDocument!;
      doc.querySelector('dialog')!.showModal();
      const box = (selector: string) => doc.querySelector(selector)!.getBoundingClientRect();
      return {width: box('dialog').width, height: box('dialog').height, warningHeight: box('.pui-full-access-explanation').height,
        introHeight: box('.pui-modal-description').height, hintHeight: box('.pui-permission-revoke-note').height,
        bodyWidth: box('.pui-full-access-explanation>div').width};
    } finally {frame.remove();}
  });
}

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
  const source = await sourceWarningGeometry(page);
  const modal = (await dialog.boundingBox())!, heading = (await dialog.locator('.pui-dialog-heading').boundingBox())!, closeBox = (await close.boundingBox())!;
  expect({width: modal.width, height: modal.height}).toEqual({width: source.width, height: source.height});
  if (process.platform === 'darwin') expect({width: modal.width, height: modal.height}).toEqual({width: 500, height: 484});
  expect({width: closeBox.width, height: closeBox.height, top: closeBox.y - heading.y}).toEqual({width: 27, height: 27, top: 0});
  const surface = dialog.locator('.pui-notice-surface'), row = surface.locator('>.pui-actions'), icon = row.locator('>[data-icon="shield"]'), body = row.locator('>.pui-control-stack');
  await expect(row).toHaveCSS('flex-wrap', 'nowrap');
  await expect(row).toHaveCSS('margin-top', '0px');
  await expect(row).toHaveCSS('padding-top', '0px');
  await expect(row).toHaveCSS('border-top-width', '0px');
  const card = (await surface.boundingBox())!, glyph = (await icon.boundingBox())!, text = (await body.boundingBox())!;
  expect(card.height).toBe(source.warningHeight);
  expect(text.width).toBe(source.bodyWidth);
  if (process.platform === 'darwin') expect({height: card.height, width: text.width}).toEqual({height: 138, width: 383});
  expect(text.x - glyph.x - glyph.width).toBe(12);
  expect(glyph.y - text.y).toBe(4);
  const intro = (await dialog.locator('.pui-markdown>p').boundingBox())!, hint = (await dialog.locator('.pui-field-hint').boundingBox())!, footer = (await dialog.locator('.pui-confirm>.pui-actions').boundingBox())!;
  expect(intro.height).toBe(source.introHeight);
  expect(hint.height).toBe(source.hintHeight);
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

test('small form hints keep their source top rhythm after actions and collapsed native field margins', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const u = await import('../src/index.js');
    const dialog = u.createDialog({purpose: 'collection', title: 'Connection source', content: u.createForm({context: 'dialog', onSubmit: () => ({ok: true}), children: [
      u.createTextInput({label: 'Server URL'}), u.createText({role: 'description', text: 'A saved endpoint is retained.'}),
      u.createButton({label: 'Add model'}), u.createText({role: 'caption', text: 'Limits and capabilities are supplied by the application.'}),
    ]})});
    const owner = u.mount(document.body, u.createText({role: 'description', text: 'Ordinary description'})); owner.attach(dialog); dialog.open();
  });
  const description = page.getByText('A saved endpoint is retained.', {exact: true}), note = page.getByText('Limits and capabilities are supplied by the application.', {exact: true});
  for (const paragraph of [description, note]) {
    await expect(paragraph).toHaveCSS('font-size', '12px');
    await expect(paragraph).toHaveCSS('line-height', '18px');
    await expect(paragraph).toHaveCSS('margin', '8px 0px 0px');
  }
  const field = (await page.getByRole('textbox', {name: 'Server URL', exact: true}).boundingBox())!, hint = (await description.boundingBox())!;
  expect(hint.y - field.y - field.height).toBe(8);
  const action = (await page.getByRole('button', {name: 'Add model', exact: true}).boundingBox())!, caption = (await note.boundingBox())!;
  expect(caption.y - action.y - action.height).toBe(8);
  await expect(page.getByText('Ordinary description', {exact: true})).toHaveCSS('margin', '0px');
});
