import {test, expect} from '@playwright/test';

test.beforeEach(async ({page}) => {await page.goto('/tests/fixture.html');});

test('native disclosures keep direct content, browser toggling and local open state through updates', async ({page}) => {
  await page.evaluate(async () => {
    const path = '/src/parts/disclosure.ts', partsPath = '/src/parts/index.ts';
    const {createDisclosurePart} = await import(path), {createInputPart, mountParts} = await import(partsPath);
    const field = createInputPart({label: 'Advanced value', value: 'Kept draft'});
    const disclosure = createDisclosurePart({title: 'Advanced options', purpose: 'advanced', children: [field]});
    const mount = document.createElement('div'); mount.id = 'native-mount'; document.body.append(mount); mountParts(mount, disclosure);
    (window as unknown as {nativeDisclosure: typeof disclosure}).nativeDisclosure = disclosure;
  });
  const summary = page.locator('#native-mount details > summary');
  await summary.click();
  await expect(page.getByRole('textbox', {name: 'Advanced value'})).toBeVisible();
  await page.evaluate(() => (window as unknown as {nativeDisclosure: {update(state: unknown): void}}).nativeDisclosure.update({title: 'Updated options'}));
  await expect(page.locator('#native-mount details')).toHaveAttribute('open');
  await expect(page.getByRole('textbox', {name: 'Advanced value'})).toHaveValue('Kept draft');
  expect(await page.locator('#native-mount details').evaluate(node => [...node.children].map(child => child.tagName))).toEqual(['SUMMARY', 'INPUT']);
  await page.evaluate(() => (window as unknown as {nativeDisclosure: {update(state: unknown): void}}).nativeDisclosure.update({title: 'Updated options', disabled: true}));
  await summary.click(); await expect(page.locator('#native-mount details')).toHaveAttribute('open');
  await page.evaluate(() => (window as unknown as {nativeDisclosure: {setOpen(open: boolean): void}}).nativeDisclosure.setOpen(false));
  await expect(page.locator('#native-mount details')).not.toHaveAttribute('open');
});

test('plain disclosure and fixed form grid use only their finite native structure', async ({page}) => {
  const result = await page.evaluate(async () => {
    const disclosurePath = '/src/parts/disclosure.ts', structurePath = '/src/parts/structure.ts', partsPath = '/src/parts/index.ts';
    const {createDisclosurePart} = await import(disclosurePath), {createFieldGridPart} = await import(structurePath), {createTextPart, mountParts} = await import(partsPath);
    const grid = createFieldGridPart({children: [createTextPart({text: 'First'}), createTextPart({text: 'Second'})]});
    const disclosure = createDisclosurePart({title: 'Rates', children: [grid], open: true});
    const mount = document.createElement('div'); document.body.append(mount); const tree = mountParts(mount, disclosure);
    const node = mount.querySelector('details')!, columns = getComputedStyle(mount.querySelector('.pui-sdk-grid')!).gridTemplateColumns.split(' ').map(Number.parseFloat);
    const result = {classes: node.className, children: [...node.children].map(child => child.tagName), open: node.open, columns, gap: getComputedStyle(mount.querySelector('.pui-sdk-grid')!).gap};
    tree.destroy(); return result;
  });
  expect(result.classes).toBe(''); expect(result.children).toEqual(['SUMMARY', 'DIV']); expect(result.open).toBe(true);
  expect(result.columns).toHaveLength(2); expect(result.columns[0]).toBe(result.columns[1]); expect(result.gap).toBe('12px');
});

test('native fieldset inherits disabling into a live popup select and retains its draft on enable', async ({page}) => {
  await page.evaluate(async () => {
    const path = '/src/parts/structure.ts', partsPath = '/src/parts/index.ts';
    const {createFieldsetPart} = await import(path), {createSelectPart, mountParts} = await import(partsPath);
    const choice = createSelectPart({label: 'Protocol', value: 'second', options: [{value: 'first', label: 'First'}, {value: 'second', label: 'Second'}]});
    const group = createFieldsetPart({legend: 'Endpoint', children: [choice]}); const mount = document.createElement('div'); mount.id = 'native-mount'; document.body.append(mount); mountParts(mount, group);
    (window as unknown as {nativeFieldset: typeof group}).nativeFieldset = group;
  });
  const choice = page.getByRole('combobox', {name: 'Protocol'});
  await choice.click(); await expect(choice).toHaveAttribute('aria-expanded', 'true');
  await page.evaluate(() => (window as unknown as {nativeFieldset: {update(state: unknown): void}}).nativeFieldset.update({legend: 'Endpoint', disabled: true}));
  await expect(choice).toBeDisabled(); await expect(choice).toHaveAttribute('aria-expanded', 'false');
  await page.evaluate(() => (window as unknown as {nativeFieldset: {update(state: unknown): void}}).nativeFieldset.update({legend: 'Renamed endpoint', disabled: false}));
  await expect(choice).toBeEnabled(); await expect(choice).toHaveText('Second'); await expect(page.locator('legend')).toHaveText('Renamed endpoint');
});

test('input adornment adds only its real icon container and transfers control lifetime atomically', async ({page}) => {
  const result = await page.evaluate(async () => {
    const path = '/src/parts/structure.ts', partsPath = '/src/parts/index.ts';
    const {createInputAdornmentPart} = await import(path), {createInputPart, mountParts} = await import(partsPath);
    const input = createInputPart({label: 'Endpoint URL', kind: 'url', value: 'https://example.test'});
    const reject = (action: () => void) => {try {action(); return false;} catch {return true;}};
    const rejected = [reject(() => createInputAdornmentPart({control: input, icon: 'invented'})), reject(() => createInputAdornmentPart({control: input, icon: 'globe', style: {padding: 20}}))];
    const decorated = createInputAdornmentPart({control: input, icon: 'globe'}); const mount = document.createElement('div'); document.body.append(mount); const tree = mountParts(mount, decorated);
    const root = mount.firstElementChild!, control = root.querySelector('input')!;
    const shape = {root: root.tagName, className: root.className, children: [...root.children].map(child => child.tagName.toLowerCase()), value: control.value, padding: getComputedStyle(control).paddingLeft};
    tree.destroy(); const disposed = reject(() => mountParts(mount, input)); return {rejected, shape, disposed};
  });
  expect(result).toEqual({rejected: [true, true], shape: {root: 'DIV', className: 'pui-input-with-icon', children: ['svg', 'input'], value: 'https://example.test', padding: '24px'}, disposed: true});
});

test('badge text is literal, updates without wrapping, and exposes only state and lifecycle', async ({page}) => {
  const result = await page.evaluate(async () => {
    const path = '/src/parts/status.ts', partsPath = '/src/parts/index.ts';
    const {createBadgePart} = await import(path), {mountParts} = await import(partsPath);
    const badge = createBadgePart({text: '<Configured>'}); const mount = document.createElement('div'); document.body.append(mount); const tree = mountParts(mount, badge);
    const root = mount.firstElementChild!; const before = {tag: root.tagName, className: root.className, text: root.textContent, children: root.children.length};
    badge.update({text: 'Saved key'}); const same = root === mount.firstElementChild; const keys = Object.keys(badge); tree.destroy(); return {before, same, keys};
  });
  expect(result).toEqual({before: {tag: 'SPAN', className: 'pui-configured-badge', text: '<Configured>', children: 0}, same: true, keys: ['update', 'destroy']});
});
