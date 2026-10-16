import {expect, test} from '@playwright/test';
import type {Application, CustomConnectionSession, CustomConnectionState} from '../src/app/index.js';
import type {CustomModelValue} from '../src/forms/custom-connection.js';

interface Harness {
  app: Application;
  session: CustomConnectionSession;
  state: CustomConnectionState;
  defaults(): CustomModelValue;
  second?: {app: Application; session: CustomConnectionSession};
}

test.beforeEach(async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const entry = '../src/app/index.js';
    const module = await import(entry);
    const defaults: unknown = Reflect.get(module, 'customModelDefaults');
    if (typeof defaults !== 'function') throw new Error('The application entry must export customModelDefaults');
    const createDefaults = defaults as () => CustomModelValue;
    const mount = document.createElement('div');
    mount.id = 'first-app';
    document.body.append(mount);
    const app: Application = module.createApplication(mount, {brand: {name: 'Defaults test'}});
    const state: CustomConnectionState = {name: 'Endpoint', baseUrl: 'https://example.test/v1', api: 'openai-completions', editing: false, models: [createDefaults()]};
    const harness: Harness = {app, state, defaults: createDefaults, session: app.settings.openCustomConnection(state)};
    Object.assign(window, {customDefaultsTest: harness});
  });
});

test('initial and added models share fixed defaults without inheriting edits from the first model', async ({page}) => {
  const rows = page.locator('#first-app fieldset');
  await expect(rows).toHaveCount(1);
  await expect(rows.first().getByLabel('Context tokens', {exact: true})).toHaveValue('128000');
  await expect(rows.first().getByLabel('Max output tokens', {exact: true})).toHaveValue('8192');
  await rows.first().getByLabel('Model ID', {exact: true}).fill('edited-model');
  await rows.first().getByLabel('Display name', {exact: true}).fill('Edited model');
  await rows.first().getByLabel('Context tokens', {exact: true}).fill('64000');
  await rows.first().getByLabel('Max output tokens', {exact: true}).fill('4096');
  await rows.first().getByLabel('Thinking effort', {exact: true}).check();
  await rows.first().getByLabel('Images', {exact: true}).check();
  await rows.first().getByText('Price estimate (optional)', {exact: true}).click();
  await rows.first().getByLabel('Input', {exact: true}).fill('1');
  await page.getByRole('button', {name: 'Add model', exact: true}).click();
  await expect(rows).toHaveCount(2);
  await expect(rows.last().getByLabel('Model ID', {exact: true})).toHaveValue('');
  await expect(rows.last().getByLabel('Display name', {exact: true})).toHaveValue('');
  await expect(rows.last().getByLabel('Context tokens', {exact: true})).toHaveValue('128000');
  await expect(rows.last().getByLabel('Max output tokens', {exact: true})).toHaveValue('8192');
  await expect(rows.last().getByLabel('Thinking effort', {exact: true})).not.toBeChecked();
  await expect(rows.last().getByLabel('Images', {exact: true})).not.toBeChecked();
  const models = await page.evaluate(() => (window as unknown as {customDefaultsTest: Harness}).customDefaultsTest.session.read().models);
  expect(models[0]).toMatchObject({id: 'edited-model', name: 'Edited model', contextWindow: 64000, maxTokens: 4096, reasoning: true, images: true, prices: {input: '1'}});
  expect(models[1]).toEqual({sourceIndex: 1, id: '', name: '', contextWindow: 128000, maxTokens: 8192, reasoning: false, images: false, prices: {input: '', output: '', cacheRead: '', cacheWrite: ''}});
});

test('adding after every row is removed still uses a fresh blank model', async ({page}) => {
  await page.getByRole('button', {name: 'Remove model', exact: true}).click();
  await expect(page.locator('#first-app fieldset')).toHaveCount(0);
  await page.getByRole('button', {name: 'Add model', exact: true}).click();
  await expect(page.getByLabel('Model ID', {exact: true})).toHaveValue('');
  await expect(page.getByLabel('Context tokens', {exact: true})).toHaveValue('128000');
  await expect(page.getByLabel('Max output tokens', {exact: true})).toHaveValue('8192');
  const model = await page.evaluate(() => (window as unknown as {customDefaultsTest: Harness}).customDefaultsTest.session.read().models[0]);
  expect(model).toMatchObject({sourceIndex: 1, id: '', name: '', contextWindow: 128000, maxTokens: 8192, reasoning: false, images: false});
});

test('existing definitions with absent limits remain blank while explicitly added models get defaults', async ({page}) => {
  await page.evaluate(() => {
    const h = (window as unknown as {customDefaultsTest: Harness}).customDefaultsTest;
    h.session = h.app.settings.openCustomConnection({...h.state, editing: true, models: [{id: 'existing-model'}]});
  });
  await expect(page.getByLabel('Model ID', {exact: true})).toHaveValue('existing-model');
  await expect(page.getByLabel('Context tokens', {exact: true})).toHaveValue('');
  await expect(page.getByLabel('Max output tokens', {exact: true})).toHaveValue('');
  await page.getByRole('button', {name: 'Add model', exact: true}).click();
  await expect(page.getByLabel('Context tokens', {exact: true}).first()).toHaveValue('');
  await expect(page.getByLabel('Max output tokens', {exact: true}).first()).toHaveValue('');
  await expect(page.getByLabel('Context tokens', {exact: true}).last()).toHaveValue('128000');
  await expect(page.getByLabel('Max output tokens', {exact: true}).last()).toHaveValue('8192');
});

test('ordinary custom connection updates retain edited values, focus and selection', async ({page}) => {
  await page.getByLabel('Model ID', {exact: true}).fill('live-model');
  await page.getByLabel('Context tokens', {exact: true}).fill('256000');
  const name = page.getByLabel('Display name', {exact: true});
  await name.fill('Unsaved 中文 model');
  await name.focus();
  await name.evaluate((input: HTMLInputElement) => input.setSelectionRange(2, 8));
  await page.evaluate(() => {
    const h = (window as unknown as {customDefaultsTest: Harness}).customDefaultsTest;
    h.session.update({...h.state, models: [{...h.defaults(), id: 'server-model', name: 'Server snapshot'}], error: 'Validation feedback'});
  });
  await expect(name).toHaveValue('Unsaved 中文 model');
  await expect(name).toBeFocused();
  expect(await name.evaluate((input: HTMLInputElement) => [input.selectionStart, input.selectionEnd])).toEqual([2, 8]);
  await expect(page.getByLabel('Model ID', {exact: true})).toHaveValue('live-model');
  await expect(page.getByLabel('Context tokens', {exact: true})).toHaveValue('256000');
  await expect(page.getByRole('alert').filter({hasText: 'Validation feedback'})).toBeVisible();
});

test('separate application editors cannot leak edited defaults into one another', async ({page}) => {
  await page.getByLabel('Model ID', {exact: true}).fill('first-model');
  await page.getByLabel('Context tokens', {exact: true}).fill('64000');
  await page.evaluate(async () => {
    const h = (window as unknown as {customDefaultsTest: Harness}).customDefaultsTest;
    const entry = '../src/app/index.js';
    const {createApplication} = await import(entry);
    const mount = document.createElement('div');
    mount.id = 'second-app';
    document.body.append(mount);
    const app: Application = createApplication(mount, {brand: {name: 'Second defaults test'}});
    h.second = {app, session: app.settings.openCustomConnection({...h.state, models: [h.defaults()]})};
  });
  const second = page.locator('#second-app');
  await expect(second.getByLabel('Model ID', {exact: true})).toHaveValue('');
  await expect(second.getByLabel('Context tokens', {exact: true})).toHaveValue('128000');
  await second.getByLabel('Model ID', {exact: true}).fill('second-model');
  await second.getByLabel('Context tokens', {exact: true}).fill('32000');
  await second.getByRole('button', {name: 'Add model', exact: true}).click();
  await expect(second.getByLabel('Context tokens', {exact: true}).last()).toHaveValue('128000');
  await page.evaluate(() => {
    const h = (window as unknown as {customDefaultsTest: Harness}).customDefaultsTest;
    h.second!.session.close();
    h.second!.app.destroy();
  });
  const first = page.locator('#first-app');
  await expect(first.getByLabel('Model ID', {exact: true})).toHaveValue('first-model');
  await expect(first.getByLabel('Context tokens', {exact: true})).toHaveValue('64000');
  await first.getByRole('button', {name: 'Add model', exact: true}).click();
  await expect(first.getByLabel('Context tokens', {exact: true}).last()).toHaveValue('128000');
  const models = await page.evaluate(() => (window as unknown as {customDefaultsTest: Harness}).customDefaultsTest.session.read().models);
  expect(models).toHaveLength(2);
  expect(models[0].id).toBe('first-model');
  expect(models[1].id).toBe('');
});
