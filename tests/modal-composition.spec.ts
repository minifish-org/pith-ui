import {test, expect} from '@playwright/test';
import type {Control} from '../src/index.js';

// Source contracts: accepted pith-ui@0.3.1 forms/panels.ts connection-editor,
// files/panels.ts resource-card, and tasks/permission.ts warning confirmation.
// The consumer supplies safe text and owned small controls, never CSS or DOM.
test('an editor section owns the separate heading and form group after its collection', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const ui = await import('../src/index.js');
    const section = Reflect.get(ui, 'createFormSection') as (options: unknown) => Control;
    const editor = section({context: 'editor', title: '', children: [
      ui.createToolbar({label: 'Connection editor', leading: ui.createText({role: 'label', text: 'Add connection'}), trailing: ui.createButton({label: 'New connection'})}),
      ui.createForm({context: 'dialog', cancelLabel: 'Close', children: [ui.createTextInput({label: 'Name'})], submitLabel: 'Save connection', onSubmit: () => ({ok: true}), onCancel() {}}),
    ]});
    ui.mount(document.body, ui.createStack({context: 'flow', children: [ui.createText({text: 'Existing connections'}), editor]}));
    Reflect.set(window, 'editorSection', editor);
  });
  const editor = page.locator('.pui-section-editor');
  await expect(editor).toHaveCSS('margin-top', '24px');
  await expect(editor).toHaveCSS('padding-top', '16px');
  await expect(editor).toHaveCSS('border-top-width', '1px');
  await expect(editor).toHaveCSS('border-right-width', '0px');
  const heading = await page.getByText('Add connection', {exact: true}).boundingBox();
  const action = await page.getByRole('button', {name: 'New connection', exact: true}).boundingBox();
  expect(heading!.y + heading!.height / 2).toBe(action!.y + action!.height / 2);
  await expect(page.getByText('Add connection', {exact: true})).toHaveCSS('font-size', '12px');
  await page.evaluate(() => (Reflect.get(window, 'editorSection') as Control).update({title: ''}));
  await expect(editor).toHaveCSS('margin-top', '24px');
  await expect(page.getByRole('button', {name: 'Close', exact: true})).toBeVisible();
});

test('a resource row owns a closed source disclosure inside its shared card border', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const ui = await import('../src/index.js');
    const row = Reflect.get(ui, 'createListRow') as (options: unknown) => Control;
    const source = ui.createDisclosure({title: 'View instructions', content: ui.createText({role: 'code', text: '# Saved instructions'})});
    const card = row({context: 'resource', title: 'AGENTS.md', meta: '/tmp/fixture/AGENTS.md', icon: 'file', details: source,
      actions: ui.createActions({children: [ui.createButton({label: 'Open', context: 'inline'}), ui.createButton({label: 'Reveal', context: 'inline'}), ui.createButton({label: 'View / edit', context: 'inline'})]}),
    });
    const mounted = ui.mount(document.body, card);
    Reflect.set(window, 'resourceComposition', {card, source, mounted});
  });
  const card = page.locator('.pui-list-row-resource');
  await expect(card).toHaveCSS('border-top-width', '1px');
  await expect(card).toHaveCSS('border-radius', '8px');
  await expect(card).toHaveCSS('padding', '0px');
  const disclosure = card.locator('details');
  const summary = disclosure.locator('summary');
  await expect(disclosure).not.toHaveAttribute('open', '');
  await expect(disclosure).toHaveCSS('border-top-width', '1px');
  await expect(summary).toHaveCSS('padding', '8px 12px');
  await expect(summary).toHaveCSS('font-size', '12px');
  await expect(card.locator('.pui-list-row-icon svg')).toHaveCSS('width', '17px');
  const outer = await card.boundingBox(), title = await card.getByText('AGENTS.md', {exact: true}).boundingBox();
  expect(title!.x - outer!.x).toBe(42);
  await summary.press('Space');
  await expect(card.getByText('# Saved instructions', {exact: true})).toBeVisible();
  await expect(card.locator('pre')).toHaveCSS('max-height', '220px');
  await expect(card.locator('pre')).toHaveCSS('font-size', '12px');
  await page.evaluate(() => Reflect.get(window, 'resourceComposition').card.update({title: 'AGENTS.md', meta: '/tmp/fixture/AGENTS.md', icon: 'file'}));
  await expect(disclosure).toHaveAttribute('open', '');
  await expect(card).toHaveCSS('border-radius', '8px');
  await page.evaluate(() => Reflect.get(window, 'resourceComposition').mounted.destroy());
  await expect(page.locator('details')).toHaveCount(0);
});

test('a bounded warning confirmation owns its body and retains the warning action through updates', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const ui = await import('../src/index.js');
    const make = Reflect.get(ui, 'createConfirmDialog') as (options: unknown) => ReturnType<typeof ui.createConfirmDialog>;
    const notice = ui.createSurface({purpose: 'notice', tone: 'warning', content: ui.createToolbar({label: 'Access warning', leading: ui.createActions({children: [
      ui.createIcon({name: 'shield', context: 'notice'}),
      ui.createStack({children: [ui.createText({role: 'label', text: 'Access to your account and connected services.'}), ui.createText({role: 'caption', text: 'External tools can act on their connected services.'})]}),
    ]})})});
    const content = ui.createStack({context: 'flow', children: [ui.createMarkdown({text: 'Give permission to run **all enabled tools** without asking in **this conversation**.'}), notice]});
    const confirmation = make({purpose: 'form', tone: 'warning', eyebrow: 'CONVERSATION PERMISSIONS', title: 'Enable access?', confirmLabel: 'Enable access', content, hint: 'The permission remains until revoked.', onConfirm: () => ({ok: true})});
    const mounted = ui.mount(document.body, ui.createText({text: 'Host'}));
    mounted.attach(confirmation);
    confirmation.open();
    Reflect.set(window, 'warningConfirmation', confirmation);
  });
  const dialog = page.getByRole('dialog', {name: 'Enable access?', exact: true});
  expect((await dialog.boundingBox())!.width).toBe(500);
  await expect(dialog.getByText('CONVERSATION PERMISSIONS', {exact: true})).toBeVisible();
  const intro = dialog.locator('.pui-markdown > p');
  await expect(intro).toHaveCSS('font-size', '14px');
  await expect(intro).toHaveCSS('line-height', '21px');
  await expect(intro).toHaveCSS('margin', '16px 0px 24px');
  await expect(intro).toHaveCSS('color', 'rgb(102, 112, 133)');
  await expect(intro.locator('strong')).toHaveCount(2);
  await expect(intro.locator('strong').first()).toHaveCSS('font-weight', '600');
  const introColors = await intro.locator('strong').first().evaluate(node => ({actual: getComputedStyle(node).color, expected: getComputedStyle(node).getPropertyValue('--pui-text').trim()}));
  expect(introColors.actual).toBe('rgb(31, 37, 48)');
  expect(introColors.expected.toUpperCase()).toBe('#1F2530');
  await expect(dialog.locator('[data-icon="shield"] svg')).toHaveCount(1);
  const surface = dialog.locator('.pui-notice-surface');
  await expect(surface).toHaveCSS('border-radius', '9px');
  await expect(surface).toHaveCSS('padding', '16px');
  const title = dialog.getByText('Access to your account and connected services.', {exact: true});
  const description = dialog.getByText('External tools can act on their connected services.', {exact: true});
  await expect(title).toHaveCSS('font-size', '14px');
  await expect(title).toHaveCSS('color', 'rgb(119, 73, 5)');
  await expect(description).toHaveCSS('font-size', '12px');
  await expect(description).toHaveCSS('color', 'rgb(138, 87, 10)');
  const cardBox = (await surface.boundingBox())!, iconBox = (await dialog.locator('[data-icon="shield"] svg').boundingBox())!;
  const titleBox = (await title.boundingBox())!, descriptionBox = (await description.boundingBox())!;
  expect(iconBox.width).toBe(21);
  expect(iconBox.x - cardBox.x).toBe(17);
  expect(iconBox.y - titleBox.y).toBe(4);
  expect(titleBox.x - iconBox.x - iconBox.width).toBe(12);
  expect(descriptionBox.y - titleBox.y - titleBox.height).toBe(8);
  const footer = dialog.locator('.pui-confirm > .pui-actions');
  await expect(footer).toHaveCSS('margin-top', '16px');
  await expect(footer).toHaveCSS('padding-top', '16px');
  await expect(footer).toHaveCSS('border-top-width', '1px');
  const confirm = dialog.getByRole('button', {name: 'Enable access', exact: true});
  const warning = await confirm.evaluate(node => ({actual: getComputedStyle(node).backgroundColor, expected: getComputedStyle(node).getPropertyValue('--pui-warning-action').trim()}));
  expect(warning.actual).toBe('rgb(150, 97, 29)');
  expect(warning.expected.toUpperCase()).toBe('#96611D');
  await page.evaluate(() => Reflect.get(window, 'warningConfirmation').update({title: 'Enable access?', confirmLabel: 'Enable access', hint: 'The permission remains until revoked.'}));
  await expect(confirm).toHaveCSS('background-color', 'rgb(150, 97, 29)');
  await expect(dialog.getByText('Access to your account and connected services.', {exact: true})).toBeVisible();
});

test('closing and reopening an owned confirmation body retires its earlier action result', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const ui = await import('../src/index.js');
    const make = Reflect.get(ui, 'createConfirmDialog') as (options: unknown) => ReturnType<typeof ui.createConfirmDialog>;
    const fixture = {calls: 0, errors: [] as string[], resolve: undefined as ((result: {ok: false; error: string}) => void) | undefined};
    const body = ui.createButton({label: 'Read detail', onAction: async () => {
      fixture.calls++;
      if (fixture.calls === 1) return new Promise<{ok: false; error: string}>(resolve => {fixture.resolve = resolve;});
      return {ok: true};
    }, onError: message => {fixture.errors.push(message);}});
    const confirmation = make({purpose: 'form', title: 'Confirm operation', content: body, onConfirm: () => ({ok: true})});
    const mounted = ui.mount(document.body, ui.createText({text: 'Host'}));
    mounted.attach(confirmation);
    confirmation.open();
    Reflect.set(window, 'ownedConfirmation', {fixture, confirmation, mounted});
  });
  const action = page.getByRole('button', {name: 'Read detail', exact: true});
  await action.click();
  await expect(action).toBeDisabled();
  await page.evaluate(() => {const state = Reflect.get(window, 'ownedConfirmation'); state.confirmation.close(); state.confirmation.open(); state.fixture.resolve({ok: false, error: 'Earlier body failure'});});
  await expect(action).toBeEnabled();
  await action.click();
  expect(await page.evaluate(() => Reflect.get(window, 'ownedConfirmation').fixture)).toMatchObject({calls: 2, errors: []});
  const retainedNode = await action.elementHandle();
  await page.evaluate(() => Reflect.get(window, 'ownedConfirmation').mounted.destroy());
  await retainedNode!.evaluate(node => (node as HTMLButtonElement).click());
  expect(await page.evaluate(() => Reflect.get(window, 'ownedConfirmation').fixture.calls)).toBe(2);
  await expect(page.locator('dialog')).toHaveCount(0);
});

test('an ordinary confirmation retains its existing default danger presentation', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const ui = await import('../src/index.js');
    const confirmation = ui.createConfirmDialog({title: 'Remove entry?', message: 'Remove the selected entry.', onConfirm: () => ({ok: true})});
    const mounted = ui.mount(document.body, ui.createText({text: 'Host'}));
    mounted.attach(confirmation);
    confirmation.open();
  });
  expect((await page.getByRole('dialog', {name: 'Remove entry?', exact: true}).boundingBox())!.width).toBe(600);
  await expect(page.getByRole('button', {name: 'Remove', exact: true})).toHaveClass(/pui-danger/);
});

test('an owned confirmation body cannot also receive a separate message body', async ({page}) => {
  await page.goto('/tests/fixture.html');
  const error = await page.evaluate(async () => {
    const ui = await import('../src/index.js');
    const make = Reflect.get(ui, 'createConfirmDialog') as (options: unknown) => ReturnType<typeof ui.createConfirmDialog>;
    const content = ui.createText({text: 'Owned safe content'});
    try {make({title: 'Conflicting body', content, message: 'Second body', onConfirm: () => ({ok: true})});}
    catch (error) {content.destroy(); return String(error);}
    return '';
  });
  expect(error).toMatch(/message|exclusive|both|content/i);
});
