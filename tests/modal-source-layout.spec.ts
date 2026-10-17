import {test, expect, type Page, type Locator} from '@playwright/test';

// Accepted 0.3.1 source contracts: forms/provider-login.ts, forms/panels.ts,
// forms/custom-connection.ts, files/panels.ts, navigation/navigation.ts.
async function box(node: Locator) {const value = await node.boundingBox(); expect(value).not.toBeNull(); return value!;}
async function fixture(page: Page, specimen: 'prompt' | 'fields' | 'model' | 'settings' | 'collections' | 'panels') {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async specimen => {
    const u = await import('../src/index.js');
    const ok = () => ({ok: true as const});
    let content: import('../src/index.js').Control, actions: import('../src/index.js').Control | undefined, purpose: 'form' | 'collection' = 'form';
    if (specimen === 'prompt') content = u.createStack({context: 'flow', children: [
      u.createNotice({presentation: 'inline', message: 'Provider verification.'}),
      u.createForm({context: 'inline', children: [u.createTextInput({label: 'Verification value'})], submitLabel: 'Continue', onSubmit: ok}),
    ]});
    else if (specimen === 'fields') content = u.createStack({context: 'flow', children: [
      u.createText({role: 'lead', text: 'Give this endpoint its own name.'}),
      u.createForm({context: 'dialog', children: [u.createTextInput({label: 'Connection name'}), u.createURLInput({label: 'API base URL'}), u.createListSelect({purpose: 'catalog', labelVisibility: 'hidden', label: 'Choose model', options: [{value: 'test', label: 'Fixture model'}]})], submitLabel: 'Save connection', onSubmit: ok}),
    ]});
    else if (specimen === 'model') {
      purpose = 'collection';
      content = u.createForm({context: 'dialog', children: [u.createFormSection({context: 'model', title: 'Model 1', children: [
        u.createTextInput({label: 'Model ID'}), u.createTextInput({label: 'Display name'}),
        u.createGrid({columns: 'pair', children: [u.createNumberInput({label: 'Context tokens'}), u.createNumberInput({label: 'Max output tokens'})]}),
        u.createGrid({columns: 'pair', children: [u.createCheckbox({label: 'Thinking effort'}), u.createCheckbox({label: 'Images'})]}),
        u.createDisclosure({context: 'inline', title: 'Price estimate (optional)', content: u.createGrid({columns: 'pair', children: ['Input', 'Output', 'Cache read', 'Cache write'].map(label => u.createNumberInput({label}))})}),
        u.createButton({label: 'Remove model', intent: 'danger'}),
      ]})], onSubmit: ok});
    } else if (specimen === 'settings') content = u.createForm({context: 'settings', children: [u.createFormSection({context: 'settings', title: 'Model providers', children: [
      u.createText({role: 'caption', text: 'Connect model providers here.'}),
      u.createSelect({label: 'Provider', options: [{value: 'test', label: 'Fixture provider'}]}),
      u.createDisclosure({context: 'inline', title: 'Advanced connection settings', content: u.createURLInput({label: 'API base URL', description: 'Change the endpoint only for a custom service.'})}),
      u.createSecretInput({label: 'API key', status: 'Configured', description: 'The saved key is never returned to this page.'}),
    ]})], onSubmit: ok});
    else if (specimen === 'panels') {
      purpose = 'collection';
      content = u.createStack({context: 'flow', children: [
        u.createList({items: [{key: 'connection', content: u.createSurface({purpose: 'panel', content: u.createStack({context: 'flow', children: [
          u.createText({role: 'label', text: 'Installed connection'}), u.createText({role: 'code', text: 'https://example.test/mcp'}), u.createText({role: 'caption', text: 'Enabled'}),
          u.createNotice({presentation: 'caption', message: 'Connected'}), u.createActions({align: 'start', children: [u.createButton({label: 'Edit connection'}), u.createButton({label: 'Delete connection'})]}),
        ]})})}]}),
        u.createList({items: [{key: 'branch', content: u.createSurface({purpose: 'notice', content: u.createStack({context: 'flow', children: [
          u.createToolbar({label: 'Branch action', leading: u.createText({role: 'label', text: 'user · current branch'}), trailing: u.createButton({label: 'Continue here'})}),
          u.createText({role: 'body', text: 'Saved branch preview.'}),
        ]})})}]}),
      ]});
      actions = u.createActions({children: [u.createButton({label: 'Close'})]});
    } else {
      purpose = 'collection';
      const actions = () => u.createToolbar({label: 'Resource actions', children: [u.createActions({children: [u.createButton({label: 'Open'}), u.createButton({label: 'Reveal'})]}), u.createActions({children: [u.createButton({label: 'View / edit'})]})]});
      content = u.createStack({context: 'flow', children: [
        u.createText({role: 'lead', text: 'Instructions, skills and prompt templates are loaded for each task.'}),
        u.createToolbar({label: 'Resource inventory', children: [u.createButton({label: 'Refresh'})]}),
        u.createFormSection({title: 'Instructions', children: [u.createList({items: ['first', 'second'].map(key => ({key, content: u.createListRow({context: 'resource', title: key + '.md', meta: '/tmp/' + key + '.md', icon: 'file', actions: actions()})}))})]}),
        u.createFormSection({title: 'Skills', children: [u.createText({role: 'caption', text: 'No skills.'})]}),
        u.createList({items: ['one', 'two'].map(key => ({key, content: u.createListRow({context: 'choice', title: key, description: '/tmp/' + key, icon: 'folder', actions: u.createIcon({name: 'chevron'}), onAction: ok})}))}),
      ]});
    }
    const dialog = u.createDialog({purpose, title: 'Source specimen', content, actions});
    const owner = u.mount(document.body, u.createText({text: 'Host'})); owner.attach(dialog); dialog.open();
  }, specimen);
}

test('a short form keeps the native source label, input and left submission rhythm', async ({page}) => {
  await fixture(page, 'prompt');
  const status = await box(page.getByRole('status')), input = page.getByRole('textbox', {name: 'Verification value', exact: true});
  const label = page.locator('label').filter({hasText: /^Verification value$/});
  await expect(label).toHaveCSS('font-size', '14px');
  await expect(label).toHaveCSS('font-weight', '600');
  const l = await box(label), i = await box(input), button = await box(page.getByRole('button', {name: 'Continue', exact: true}));
  expect(l.y - status.y - status.height).toBe(16);
  expect(i.y - l.y - l.height).toBe(8);
  expect(button.y - i.y - i.height).toBe(12);
  expect(button.x).toBe(i.x);
});

test('dialog fields preserve body-size labels, natural spacing and a hidden catalog label', async ({page}) => {
  await fixture(page, 'fields');
  const intro = page.getByText('Give this endpoint its own name.', {exact: true});
  await expect(intro).toHaveCSS('margin', '16px 0px 24px');
  const name = page.getByRole('textbox', {name: 'Connection name', exact: true}), url = page.getByRole('textbox', {name: 'API base URL', exact: true});
  const labels = page.locator('label').filter({hasText: /^(Connection name|API base URL)$/});
  for (const label of await labels.all()) {await expect(label).toHaveCSS('font-size', '14px'); await expect(label).toHaveCSS('line-height', '21px'); await expect(label).toHaveCSS('font-weight', '600');}
  await expect(name).toHaveCSS('border-radius', '7px');
  const n = await box(name), u = await box(url), label = await box(labels.nth(1));
  expect(label.y - n.y - n.height).toBe(16);
  expect(u.y - label.y - label.height).toBe(8);
  const catalog = await box(page.getByRole('listbox', {name: 'Choose model', exact: true}));
  expect(catalog.y - u.y - u.height).toBe(8);
});

test('a model fieldset preserves its source field, capability and price groups', async ({page}) => {
  await fixture(page, 'model');
  const label = page.locator('label').filter({hasText: /^Model ID$/});
  await expect(label).toHaveCSS('font-size', '14px');
  await expect(label).toHaveCSS('font-weight', '400');
  await expect(label).toHaveCSS('color', 'rgb(102, 112, 133)');
  const id = await box(page.getByRole('textbox', {name: 'Model ID', exact: true})), display = await box(page.getByRole('textbox', {name: 'Display name', exact: true})), context = await box(page.getByRole('spinbutton', {name: 'Context tokens', exact: true}));
  expect(display.y - id.y).toBe(81);
  expect(context.y - display.y).toBe(81);
  const check = await page.getByRole('checkbox', {name: 'Thinking effort', exact: true}).evaluate(node => node.parentElement!.getBoundingClientRect().toJSON());
  expect(check.y - context.y - context.height).toBe(28);
  const price = page.locator('details').filter({has: page.locator('summary').filter({hasText: /^Price estimate/})});
  await expect(price).toHaveCSS('padding', '12px 0px');
  await expect(price).toHaveCSS('border-top-width', '1px');
  await expect(price).toHaveCSS('border-bottom-width', '1px');
  await expect(price.locator(':scope > summary')).toHaveCSS('font-size', '12px');
  expect((await box(price)).y - check.y - check.height).toBe(28);
  const remove = await box(page.getByRole('button', {name: 'Remove model', exact: true})), p = await box(price);
  expect(remove.y - p.y - p.height).toBe(8);
});

test('settings keeps its tighter field rhythm without reducing labels or credential state', async ({page}) => {
  await fixture(page, 'settings');
  const section = page.locator('.pui-section-settings');
  await expect(section).toHaveCSS('margin-top', '16px');
  await expect(section).toHaveCSS('padding-top', '16px');
  await expect(section).toHaveCSS('row-gap', '12px');
  const label = page.locator('label').filter({hasText: /^Provider$/});
  await expect(label).toHaveCSS('font-size', '14px');
  const l = await box(label), control = await box(page.getByRole('combobox', {name: 'Provider', exact: true}));
  expect(control.y - l.y - l.height).toBe(12);
  const advanced = page.locator('.pui-disclosure-inline');
  await expect(advanced).toHaveCSS('margin', '0px');
  await expect(advanced).toHaveCSS('padding', '12px 0px 0px');
  await expect(advanced.locator(':scope > summary')).toHaveCSS('font-size', '14px');
  await expect(advanced.locator(':scope > summary')).toHaveCSS('padding', '0px');
  await expect(page.getByText('Configured', {exact: true})).toHaveCSS('font-size', '12px');
});

test('collection sections, compact resource actions and workspace choices keep their source grouping', async ({page}) => {
  await fixture(page, 'collections');
  const sections = page.locator('.pui-form-section');
  await expect(sections.first()).toHaveCSS('margin-top', '24px');
  await expect(sections.first()).toHaveCSS('padding', '0px');
  await expect(sections.first().locator(':scope > h3')).toHaveCSS('font-size', '16px');
  await expect(sections.first().locator(':scope > h3')).toHaveCSS('margin-bottom', '12px');
  const rows = page.locator('.pui-list-row-resource'), first = await box(rows.nth(0)), second = await box(rows.nth(1));
  expect(second.y - first.y - first.height).toBe(8);
  const open = rows.first().getByRole('button', {name: 'Open', exact: true}), edit = rows.first().getByRole('button', {name: 'View / edit', exact: true});
  expect((await box(open)).height).toBe(30);
  await expect(open).toHaveCSS('padding', '4px 8px');
  expect((await box(edit)).height).toBe(30);
  const reveal = await box(rows.first().getByRole('button', {name: 'Reveal', exact: true})), e = await box(edit);
  expect(e.x - reveal.x - reveal.width).toBe(12);
  const choice = page.locator('.pui-list-row-choice').first();
  expect((await box(choice)).height).toBe(69);
  await expect(choice.locator('.pui-list-row-icon svg')).toHaveCSS('width', '18px');
  const title = await box(choice.getByRole('button', {name: 'one', exact: true})), path = await box(choice.getByText('/tmp/one', {exact: true}));
  expect(path.y - title.y - title.height).toBe(4);
  await expect(choice.getByText('/tmp/one', {exact: true})).toHaveCSS('font-size', '12px');
});

test('collection panels, branch notices and a read-only footer preserve their separate source boundaries', async ({page}) => {
  await fixture(page, 'panels');
  const panel = page.locator('.pui-panel-surface');
  await expect(panel).toHaveCSS('padding', '12px');
  await expect(panel).toHaveCSS('max-width', 'none');
  await expect(panel).toHaveCSS('border-radius', '9px');
  await expect(panel.getByText('Installed connection', {exact: true})).toHaveCSS('font-size', '14px');
  await expect(panel.getByText('Installed connection', {exact: true})).toHaveCSS('color', 'rgb(31, 37, 48)');
  await expect(panel.locator('pre')).toHaveCSS('font-size', '12px');
  await expect(panel.locator('pre')).toHaveCSS('margin', '12px 0px');
  expect((await box(panel.getByRole('button', {name: 'Edit connection', exact: true}))).height).toBe(30);
  const branch = page.locator('.pui-notice-surface');
  await expect(branch).toHaveCSS('padding', '16px');
  await expect(branch).toHaveCSS('border-radius', '12px');
  const preview = branch.getByText('Saved branch preview.', {exact: true});
  await expect(preview).toHaveCSS('font-size', '14px');
  await expect(preview).toHaveCSS('margin', '8px 0px');
  await expect(preview).toHaveCSS('color', 'rgb(102, 112, 133)');
  const footer = page.locator('dialog > .pui-actions');
  await expect(footer).toHaveCSS('margin-top', '16px');
  await expect(footer).toHaveCSS('padding-top', '16px');
  await expect(footer).toHaveCSS('border-top-width', '1px');
});
