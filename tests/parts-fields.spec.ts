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
    const path = '/src/parts/fields.ts';
    const {createInputPart, createFieldLabelPart} = await import(path);
    const ownership = '/src/parts/ownership.ts', layouts = '/src/parts/layout.ts';
    const {mountParts} = await import(ownership), {createStackPart} = await import(layouts);
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
    const path = '/src/parts/fields.ts', ownership = '/src/parts/ownership.ts';
    const {createTextareaPart} = await import(path), {mountParts} = await import(ownership);
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
    const path = '/src/parts/fields.ts', ownership = '/src/parts/ownership.ts';
    const {createSelectPart} = await import(path), {mountParts} = await import(ownership);
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
});

test('opaque choice list retains the native multirow interaction and owns its row count', async ({page}) => {
  await page.evaluate(async () => {
    const path = '/src/parts/fields.ts', ownership = '/src/parts/ownership.ts';
    const {createChoiceListPart} = await import(path), {mountParts} = await import(ownership);
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
    const path = '/src/parts/fields.ts', ownership = '/src/parts/ownership.ts';
    const {createCheckboxPart} = await import(path), {mountParts} = await import(ownership);
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
    const path = '/src/parts/fields.ts';
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
