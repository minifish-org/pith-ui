import {test, expect} from '@playwright/test';
import type {Form} from '../src/index.js';

// Accepted 0.3.1 forms/resource-editor.ts: Delete, Cancel and Save share one
// right-aligned footer. The auxiliary action keeps its own disabled state.
test('a form owns auxiliary footer actions and merges submission availability without rewriting them', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const ui = await import('../src/index.js');
    const make = Reflect.get(ui, 'createForm') as (options: unknown) => Form;
    const state = {deletes: 0, submits: 0, cancels: 0, resolve: undefined as ((result: {ok: false; error: string}) => void) | undefined};
    const auxiliary = ui.createButton({label: 'Delete resource', intent: 'danger', onAction() {state.deletes++;}});
    const form = make({context: 'dialog', auxiliaryActions: auxiliary, children: [ui.createTextInput({label: 'Name', value: 'Saved resource'})], submitLabel: 'Save', onCancel() {state.cancels++;}, onSubmit() {state.submits++; return new Promise<{ok: false; error: string}>(resolve => {state.resolve = resolve;});}});
    const mounted = ui.mount(document.body, form);
    Reflect.set(window, 'auxiliaryForm', {state, auxiliary, form, mounted});
  });
  const remove = page.getByRole('button', {name: 'Delete resource', exact: true});
  const cancel = page.getByRole('button', {name: 'Cancel', exact: true});
  const save = page.getByRole('button', {name: 'Save', exact: true});
  const boxes = await Promise.all([remove, cancel, save].map(button => button.boundingBox()));
  expect(boxes[0]!.x + boxes[0]!.width).toBeLessThan(boxes[1]!.x);
  expect(boxes[1]!.x + boxes[1]!.width).toBeLessThan(boxes[2]!.x);
  expect(boxes[0]!.y + boxes[0]!.height / 2).toBe(boxes[2]!.y + boxes[2]!.height / 2);
  await save.click();
  await expect(remove).toBeDisabled();
  await expect(save).toBeDisabled();
  await expect(cancel).toBeEnabled();
  await remove.evaluate(node => (node as HTMLButtonElement).click());
  expect(await page.evaluate(() => Reflect.get(window, 'auxiliaryForm').state.deletes)).toBe(0);
  await page.evaluate(() => Reflect.get(window, 'auxiliaryForm').state.resolve({ok: false, error: 'Save rejected'}));
  await expect(page.getByRole('alert')).toHaveText('Save rejected');
  await expect(remove).toBeEnabled();
  await page.evaluate(() => {const item = Reflect.get(window, 'auxiliaryForm'); item.auxiliary.update({label: 'Delete resource', intent: 'danger', disabled: true}); item.form.update({submitLabel: 'Save', disabled: true}); item.form.update({submitLabel: 'Save', disabled: false});});
  await expect(remove).toBeDisabled();
  await expect(cancel).toBeEnabled();
  await page.evaluate(() => {const item = Reflect.get(window, 'auxiliaryForm'); item.auxiliary.update({label: 'Delete resource', intent: 'danger', disabled: false}); item.form.update({submitLabel: 'Save', pending: true});});
  await expect(remove).toBeDisabled();
  await expect(cancel).toBeEnabled();
  await page.evaluate(() => Reflect.get(window, 'auxiliaryForm').form.update({submitLabel: 'Save', pending: false}));
  await remove.click();
  expect(await page.evaluate(() => Reflect.get(window, 'auxiliaryForm').state)).toMatchObject({deletes: 1, submits: 1, cancels: 0});
  const retained = await remove.elementHandle();
  await page.evaluate(() => Reflect.get(window, 'auxiliaryForm').mounted.destroy());
  await retained!.evaluate(node => (node as HTMLButtonElement).click());
  expect(await page.evaluate(() => Reflect.get(window, 'auxiliaryForm').state.deletes)).toBe(1);
  await expect(page.locator('form')).toHaveCount(0);
});
