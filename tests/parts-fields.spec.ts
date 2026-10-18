import {expect, test} from '@playwright/test';

interface FieldHandle {
  read(): string;
  reset(value: string): void;
  update(state: Record<string, unknown>): void;
  focus(): void;
  destroy(): void;
}
interface FieldsFixture {
  input: FieldHandle;
  select: FieldHandle;
  checkbox: {read(): boolean; reset(value: boolean): void; update(state: Record<string, unknown>): void};
  mounted: {destroy(): void};
  changes: string[];
}
declare global {interface Window {partsFieldsFixture: FieldsFixture}}

test.beforeEach(async ({page}) => {await page.goto('/tests/fixture.html');});

test('opaque fields keep a live draft, composition, selection and native validation without field wrappers', async ({page}) => {
  await page.evaluate(async () => {
    const path = '/src/parts/index.ts';
    const {createInputPart, createFieldLabelPart, mountParts, createStackPart} = await import(path);
    const changes: string[] = [];
    const input = createInputPart({label: 'Endpoint', kind: 'url', name: 'endpoint', value: 'https://initial.example', required: true, onInput(value: string) {changes.push(value);}});
    const label = createFieldLabelPart({label: 'Endpoint', control: input});
    const mounted = mountParts(document.body.appendChild(document.createElement('div')), createStackPart({children: [label, input]}));
    window.partsFieldsFixture = {input, mounted, changes} as FieldsFixture;
  });
  const input = page.getByRole('textbox', {name: 'Endpoint', exact: true});
  await input.fill('https://edited.example/中文');
  await input.focus();
  const before = await input.evaluate((node: HTMLInputElement) => {
    node.dispatchEvent(new CompositionEvent('compositionstart', {data: '中', bubbles: true}));
    return {parent: node.parentElement?.tagName, siblings: [...node.parentElement!.children].map(child => child.tagName)};
  });
  expect(before.parent).toBe('DIV');
  expect(before.siblings).toEqual(['LABEL', 'INPUT']);
  await page.evaluate(() => window.partsFieldsFixture.input.update({disabled: false, readOnly: false, placeholder: 'Another snapshot'}));
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('https://edited.example/中文');
  await expect(input).toHaveAttribute('placeholder', 'Another snapshot');
  const result = await page.evaluate(() => {
    const handle = window.partsFieldsFixture.input;
    return {keys: Object.keys(handle), read: handle.read(), changes: window.partsFieldsFixture.changes};
  });
  expect(result.keys).not.toContain('element');
  expect(result.keys).not.toContain('control');
  expect(result.read).toBe('https://edited.example/中文');
  expect(result.changes).toEqual(['https://edited.example/中文']);
  await page.evaluate(() => window.partsFieldsFixture.input.reset(''));
  expect(await input.evaluate((node: HTMLInputElement) => node.validity.valueMissing)).toBe(true);
  await page.evaluate(() => window.partsFieldsFixture.input.reset('not-a-url'));
  expect(await input.evaluate((node: HTMLInputElement) => node.validity.typeMismatch)).toBe(true);
  await page.evaluate(() => window.partsFieldsFixture.mounted.destroy());
  await expect(input).toHaveCount(0);
});

test('opaque textareas preserve selection and update read-only state without changing the draft', async ({page}) => {
  await page.evaluate(async () => {
    const path = '/src/parts/index.ts';
    const {createTextareaPart, mountParts} = await import(path);
    const input = createTextareaPart({label: 'Markdown', value: 'Original 中文 text'});
    window.partsFieldsFixture = {input, mounted: mountParts(document.body.appendChild(document.createElement('div')), input), changes: []} as unknown as FieldsFixture;
  });
  const field = page.getByRole('textbox', {name: 'Markdown'});
  await field.fill('Edited 中文 draft');
  await field.evaluate((node: HTMLTextAreaElement) => {node.focus(); node.setSelectionRange(2, 8);});
  await page.evaluate(() => window.partsFieldsFixture.input.update({readOnly: true, disabled: false}));
  expect(await field.evaluate((node: HTMLTextAreaElement) => [node.value, node.selectionStart, node.selectionEnd, node.readOnly])).toEqual(['Edited 中文 draft', 2, 8, true]);
  await expect(field).toBeFocused();
  await page.evaluate(() => window.partsFieldsFixture.input.reset('New target'));
  await expect(field).toHaveValue('New target');
  await page.evaluate(() => window.partsFieldsFixture.mounted.destroy());
});

test('opaque single choice uses the existing popup and explicit reset stays silent', async ({page}) => {
  await page.evaluate(async () => {
    const path = '/src/parts/index.ts';
    const {createSelectPart, mountParts} = await import(path);
    const changes: string[] = [];
    const select = createSelectPart({label: 'Provider', value: 'one', options: [{value: 'one', label: 'First'}, {value: 'two', label: '<Second>'}], onChange(value: string) {changes.push(value);}});
    window.partsFieldsFixture = {select, mounted: mountParts(document.body.appendChild(document.createElement('div')), select), changes} as FieldsFixture;
  });
  const choice = page.getByRole('combobox', {name: 'Provider', exact: true});
  await expect(choice).toHaveJSProperty('tagName', 'BUTTON');
  await choice.click();
  await page.getByRole('option', {name: '<Second>', exact: true}).click();
  expect(await page.evaluate(() => ({read: window.partsFieldsFixture.select.read(), changes: window.partsFieldsFixture.changes}))).toEqual({read: 'two', changes: ['two']});
  await page.evaluate(() => window.partsFieldsFixture.select.reset('one'));
  await expect(choice).toHaveText('First');
  expect(await page.evaluate(() => window.partsFieldsFixture.changes)).toEqual(['two']);
  await choice.click();
  await page.evaluate(() => window.partsFieldsFixture.select.update({disabled: true}));
  await expect(choice).toBeDisabled();
  await expect(page.getByRole('listbox')).toBeHidden();
  await page.evaluate(() => window.partsFieldsFixture.select.update({disabled: false}));
  await choice.click();
  await page.evaluate(() => window.partsFieldsFixture.mounted.destroy());
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await expect(choice).toHaveCount(0);
  await expect(page.locator('select')).toHaveCount(0);
});

test('opaque choice list retains the native multirow interaction and owns its row count', async ({page}) => {
  await page.evaluate(async () => {
    const path = '/src/parts/index.ts';
    const {createChoiceListPart, mountParts} = await import(path);
    const select = createChoiceListPart({label: 'Choose model', value: 'one', options: [{value: 'one', label: 'One'}, {value: 'two', label: 'Two'}]});
    window.partsFieldsFixture = {select, mounted: mountParts(document.body.appendChild(document.createElement('div')), select), changes: []} as unknown as FieldsFixture;
  });
  const list = page.getByRole('listbox', {name: 'Choose model'});
  await expect(list).toHaveJSProperty('tagName', 'SELECT');
  await expect(list).toHaveAttribute('size', '6');
  await list.focus();
  await page.keyboard.press('ArrowDown');
  await expect(list).toHaveValue('two');
  expect(await page.evaluate(() => window.partsFieldsFixture.select.read())).toBe('two');
  await page.evaluate(() => window.partsFieldsFixture.select.update({options: [{value: 'two', label: 'Renamed'}, {value: 'three', label: 'Three'}]}));
  await expect(list).toHaveValue('two');
  await expect(list).toBeFocused();
  await page.evaluate(() => window.partsFieldsFixture.mounted.destroy());
});

test('opaque checkbox has a single native control and separates reset from user changes', async ({page}) => {
  await page.evaluate(async () => {
    const path = '/src/parts/index.ts';
    const {createCheckboxPart, mountParts} = await import(path);
    const changes: string[] = [];
    const checkbox = createCheckboxPart({label: 'Images', checked: false, onChange(value: boolean) {changes.push(String(value));}});
    window.partsFieldsFixture = {checkbox, mounted: mountParts(document.body.appendChild(document.createElement('div')), checkbox), changes} as unknown as FieldsFixture;
  });
  const field = page.getByRole('checkbox', {name: 'Images'});
  await field.check();
  expect(await page.evaluate(() => ({value: window.partsFieldsFixture.checkbox.read(), changes: window.partsFieldsFixture.changes}))).toEqual({value: true, changes: ['true']});
  await page.evaluate(() => window.partsFieldsFixture.checkbox.reset(false));
  await expect(field).not.toBeChecked();
  expect(await page.evaluate(() => window.partsFieldsFixture.changes)).toEqual(['true']);
  await page.evaluate(() => window.partsFieldsFixture.checkbox.update({disabled: true}));
  await expect(field).toBeDisabled();
  await page.evaluate(() => window.partsFieldsFixture.mounted.destroy());
});

test('field options reject CSS and native-size escape hatches at runtime', async ({page}) => {
  const rejected = await page.evaluate(async () => {
    const path = '/src/parts/index.ts';
    const {createInputPart, createSelectPart, createChoiceListPart} = await import(path);
    return [
      () => createInputPart({label: 'Bad', style: {width: '99px'}}),
      () => createInputPart({label: 'Bad', className: 'override'}),
      () => createSelectPart({label: 'Bad', options: [], density: 'compact'}),
      () => createChoiceListPart({label: 'Bad', options: [], size: 20}),
    ].map(create => {try {create(); return false;} catch {return true;}});
  });
  expect(rejected).toEqual([true, true, true, true]);
});

test('choice defaults select the first enabled option and native form reset restores construction state', async ({page}) => {
  const result = await page.evaluate(async () => {
    const path = '/src/parts/index.ts';
    const {createSelectPart, createChoiceListPart, mountParts} = await import(path);
    const values = [];
    for (const factory of [createSelectPart, createChoiceListPart]) {
      const mount = document.body.appendChild(document.createElement('div'));
      const part = factory({label: 'Choice', options: [{value: 'blocked', label: 'Blocked', disabled: true}, {value: 'one', label: 'One'}, {value: 'two', label: 'Two'}]});
      const mounted = mountParts(mount, part);
      const form = document.createElement('form'); mount.before(form); form.append(mount);
      const initial = part.read(); part.reset('two'); form.reset();
      await Promise.resolve();
      values.push({initial, reset: part.read()});
      mounted.destroy(); form.remove();
    }
    return values;
  });
  expect(result).toEqual([{initial: 'one', reset: 'one'}, {initial: 'one', reset: 'one'}]);
});

test('separate field labels name the visible select immediately and update its accessible name', async ({page}) => {
  await page.evaluate(async () => {
    const path = '/src/parts/index.ts';
    const {createSelectPart, createFieldLabelPart, createStackPart, mountParts} = await import(path);
    const select = createSelectPart({options: [{value: 'one', label: 'First'}], value: 'one'});
    const label = createFieldLabelPart({label: 'Provider', control: select});
    window.partsFieldsFixture = {select, mounted: mountParts(document.body.appendChild(document.createElement('div')), createStackPart({children: [label, select]})), changes: []} as unknown as FieldsFixture;
    Object.assign(window.partsFieldsFixture, {label});
  });
  const choice = page.getByRole('combobox', {name: 'Provider', exact: true});
  await expect(choice).toBeVisible();
  await page.locator('label').click();
  await expect(choice).toBeFocused();
  await page.evaluate(() => (window.partsFieldsFixture as unknown as {label: {update(state: {label: string}): void}}).label.update({label: 'Endpoint provider'}));
  await expect(page.getByRole('combobox', {name: 'Endpoint provider', exact: true})).toBeVisible();
  await page.evaluate(() => window.partsFieldsFixture.mounted.destroy());
});

test('removing an enhanced choice leaves no unwrapped native control in its parent', async ({page}) => {
  const result = await page.evaluate(async () => {
    const path = '/src/parts/index.ts';
    const {createSelectPart, createStackPart, mountParts} = await import(path);
    const select = createSelectPart({label: 'Choice', options: [{value: 'one', label: 'One'}], value: 'one'});
    const root = createStackPart({children: [select]});
    const mount = document.body.appendChild(document.createElement('div'));
    const mounted = mountParts(mount, root);
    root.replace([]);
    const remaining = mount.firstElementChild!.children.length;
    mounted.destroy();
    return {remaining, afterDestroy: mount.children.length};
  });
  expect(result).toEqual({remaining: 0, afterDestroy: 0});
});

test('destroy clears secret values and runtime reset rejects non-text values', async ({page}) => {
  const result = await page.evaluate(async () => {
    const path = '/src/parts/index.ts';
    const {createInputPart, createTextareaPart} = await import(path);
    const secret = createTextareaPart({label: 'Environment', purpose: 'secret', value: 'PRIVATE_VALUE'});
    const password = createInputPart({label: 'Key', kind: 'password', value: 'PRIVATE_KEY'});
    let invalidReset = false;
    try {password.reset(true);} catch {invalidReset = true;}
    secret.destroy(); password.destroy();
    return {secret: secret.read(), password: password.read(), invalidReset};
  });
  expect(result).toEqual({secret: '', password: '', invalidReset: true});
});

test('semantic hiding and description references keep the same select and native field', async ({page}) => {
  await page.evaluate(async () => {
    const path = '/src/parts/index.ts';
    const {createSelectPart, createFieldLabelPart, createTextPart, createStackPart, mountParts} = await import(path);
    const hint = createTextPart({text: 'Model capabilities', role: 'hint'});
    const select = createSelectPart({label: 'Thinking effort', value: 'high', options: [{value: 'off', label: 'Off'}, {value: 'high', label: 'High'}], describedBy: [hint]});
    const label = createFieldLabelPart({label: 'Thinking effort', control: select});
    const root = createStackPart({children: [label, select, hint]});
    window.partsFieldsFixture = {select, mounted: mountParts(document.body.appendChild(document.createElement('div')), root), changes: []} as unknown as FieldsFixture;
    Object.assign(window.partsFieldsFixture, {label});
  });
  const choice = page.getByRole('combobox', {name: 'Thinking effort', exact: true});
  await expect(choice).toHaveAccessibleDescription('Model capabilities');
  await choice.focus();
  await page.evaluate(() => {
    window.partsFieldsFixture.select.update({hidden: true});
    (window.partsFieldsFixture as unknown as {label: {update(state: {label: string; hidden: boolean}): void}}).label.update({label: 'Thinking effort', hidden: true});
  });
  await expect(choice).toBeHidden();
  await page.evaluate(() => window.partsFieldsFixture.select.update({hidden: false}));
  await expect(choice).toBeVisible();
  await expect(choice).toHaveText('High');
  expect(await page.evaluate(() => window.partsFieldsFixture.select.read())).toBe('high');
  await page.evaluate(() => window.partsFieldsFixture.mounted.destroy());
});

test('a cold catalog keeps its native control identity through enhancement and complete destruction', async ({page}) => {
  const result = await page.evaluate(async () => {
    const path = '/src/parts/index.ts';
    const {createSelectPart, mountParts} = await import(path);
    const changes: string[] = [];
    const select = createSelectPart({label: 'Provider', catalog: 'loading', disabled: true, options: [{value: '', label: 'Loading providers…'}], onChange(value: string) {changes.push(value);}});
    const mount = document.body.appendChild(document.createElement('div'));
    const mounted = mountParts(mount, select);
    const native = mount.querySelector('select')!;
    const cold = {native: native === mount.firstElementChild, disabled: native.disabled, text: native.textContent, triggers: mount.querySelectorAll('[role=combobox]').length};
    select.update({catalog: 'ready', disabled: false, options: [{value: 'one', label: 'One'}, {value: 'two', label: 'Two'}]});
    select.reset('two');
    const ready = {sameNative: native === mount.querySelector('select'), triggers: mount.querySelectorAll('[role=combobox]').length, value: select.read()};
    native.dispatchEvent(new Event('change', {bubbles: true}));
    select.update({catalog: 'loading', disabled: true});
    const coldAgain = {sameNative: native === mount.firstElementChild, triggers: mount.querySelectorAll('[role=combobox]').length};
    select.update({catalog: 'ready', disabled: false});
    mounted.destroy();
    return {cold, ready, coldAgain, changes, remaining: mount.children.length};
  });
  expect(result).toEqual({cold: {native: true, disabled: true, text: 'Loading providers…', triggers: 0}, ready: {sameNative: true, triggers: 1, value: 'two'}, coldAgain: {sameNative: true, triggers: 0}, changes: ['two'], remaining: 0});
});
