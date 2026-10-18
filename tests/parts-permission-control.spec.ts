import {test,expect,type Page} from '@playwright/test';

interface State {mode: string;description: string;disabled?: boolean}
interface Session {update(state: State): void;destroy(): void}
interface Harness {session: Session;initial: State;changes: string[];control?: HTMLSelectElement;trigger?: HTMLButtonElement;tree?: {setAppearance(value: 'light'|'dark'): void;destroy(): void}}
declare global {interface Window {permissionPartsHarness: Harness}}
const initial: State = {mode: 'ask',description: 'Pith can read workspace files. Changes and commands require your approval.'};

async function openPermission(page: Page,state: State = initial,appearance: 'light'|'dark' = 'light'): Promise<void> {
  await page.goto('/tests/fixture.html');await page.evaluate(async ({state,appearance}) => {
    document.documentElement.classList.add('pui');document.documentElement.dataset.appearance = appearance;document.body.dataset.appearance = appearance;
const mount=document.body.appendChild(document.createElement('div')),h={initial:state,changes:[]} as unknown as Harness;
    const contextPath = '/tests/region-context.ts', {mountRegion} = await import(contextPath);
    const path='/examples/assemblies/composer.ts',{composeComposer}=await import(path),composer=composeComposer({},{onPermissionChange(value:string){h.changes.push(value);}});composer.updatePermission(state);
    h.tree=mountRegion(mount,composer.part,'composer',appearance);h.session={update:composer.updatePermission,destroy:composer.destroy};
        window.permissionPartsHarness = h;
  },{state,appearance});
}


test('compact select and context note expose bounded semantic state, genuine descriptions and one native label',async ({page}) => {
  await page.goto('/tests/fixture.html');const value = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path),rejects = (action: () => unknown) => {try {action();return false;} catch {return true;}};
    const note = p.createContextNotePart({text: 'Bounded description',tone: 'warning'}),choice = p.createCompactSelectPart({label: 'Compact choice',icon: 'shield',tone: 'warning',describedBy: [note],options: [{value: 'a',label: 'First'},{value: 'b',label: 'Second'}],value: 'b'});
    const mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,p.createStackPart({children: [choice,note]}));
    const label = mount.querySelector('label')!,select = mount.querySelector('select')!,before = label.innerHTML;
    const invalid = [rejects(() => choice.update({tone: 'magenta'})),rejects(() => choice.update({describedBy: [{destroy() {}}]})),rejects(() => choice.update({style: {width: 500}})),rejects(() => note.update({text: 'Changed',tone: 'magenta'})),rejects(() => p.createCompactSelectPart({label: 'Invalid',icon: 'unknown',options: []})),rejects(() => p.createContextNotePart({text: 'Invalid',className: 'other'}))];
    const result = {invalid,unchanged: before === label.innerHTML,value: choice.read(),label: label.localName,children: [...label.children].map(node => node.localName),description: mount.querySelector('p')!.textContent,reference: select.getAttribute('aria-describedby') === mount.querySelector('p')!.id,leaks: [note,choice].some(part => Object.values(part).some(value => value instanceof Node))};tree.destroy();return result;
  });expect(value).toEqual({invalid: [true,true,true,true,true,true],unchanged: true,value: 'b',label: 'label',children: ['svg','span','span','svg'],description: 'Bounded description',reference: true,leaks: false});
});

test('text and context notes reject invalid visibility before changing literal content',async ({page}) => {
  await page.goto('/tests/fixture.html');const value = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path),rejects = (action: () => unknown) => {try {action();return false;} catch {return true;}};
    const constructors = [rejects(() => p.createTextPart({text: 'Invalid',hidden: 'invalid'})),rejects(() => p.createContextNotePart({text: 'Invalid',hidden: 'invalid'}))];
    const text = p.createTextPart({role: 'paragraph',text: 'Kept text'}),note = p.createContextNotePart({text: 'Kept note'}),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,p.createStackPart({children: [text,note]})),before = mount.innerHTML;
    const updates = [rejects(() => text.update({text: 'Changed',hidden: 'invalid'})),rejects(() => note.update({text: 'Changed',hidden: 'invalid'}))];const unchanged = mount.innerHTML === before;tree.destroy();return {constructors,updates,unchanged};
  });expect(value).toEqual({constructors: [true,true],updates: [true,true],unchanged: true});
});

test('permission keyboard emits one value intent and snapshots explicitly project the authoritative mode',async ({page}) => {
  await openPermission(page);const trigger = page.getByRole('combobox',{name: 'Conversation permissions',exact: true});await trigger.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('End');await page.keyboard.press('Enter');expect(await page.evaluate(() => window.permissionPartsHarness.changes)).toEqual(['full-access']);
  await page.evaluate(() => {const h = window.permissionPartsHarness;h.session.update({...h.initial,mode: 'workspace-write',description: 'Workspace changes allowed.'});});await expect(trigger).toHaveText('Allow workspace changes');await expect(page.locator('.pui-composer-note:not(.pui-image-guidance)')).toHaveText('Workspace changes allowed.');
  await trigger.click();await page.getByRole('option',{name: 'Ask before changes',exact: true}).click();expect(await page.evaluate(() => window.permissionPartsHarness.changes)).toEqual(['full-access','ask']);
});

test('permission metadata and availability preserve the same native control, focus and popup lifetime',async ({page}) => {
  await openPermission(page);const trigger = page.getByRole('combobox',{name: 'Conversation permissions',exact: true});await trigger.focus();await page.evaluate(() => {const h = window.permissionPartsHarness;h.control = document.querySelector<HTMLSelectElement>('.pui-permission-control select')!;h.trigger = document.querySelector<HTMLButtonElement>('.pui-permission-control button')!;h.session.update({...h.initial,description: 'Updated description'});});
  expect(await trigger.evaluate(node => ({same: node === window.permissionPartsHarness.trigger,focus: node === document.activeElement,native: document.querySelector('select') === window.permissionPartsHarness.control}))).toEqual({same: true,focus: true,native: true});
  await trigger.click();await expect(page.getByRole('listbox')).toBeVisible();await page.evaluate(() => {const h = window.permissionPartsHarness;h.session.update({...h.initial,disabled: true});});await expect(trigger).toBeDisabled();await expect(page.getByRole('listbox')).toHaveCount(0);
  await page.evaluate(() => {const h = window.permissionPartsHarness;h.session.update({...h.initial,disabled: false});});await expect(trigger).toBeEnabled();await trigger.click();await page.getByRole('option',{name: 'Full access',exact: true}).click();expect(await page.evaluate(() => window.permissionPartsHarness.changes)).toEqual(['full-access']);
});

test('one shared owner changes permission tone and description appearance without replacing controls and destroys the popup',async ({page}) => {
  await page.goto('/tests/fixture.html');await page.evaluate(async initial => {
    const recipePath = '/examples/assemblies/permission-control.ts',partsPath = '/src/parts/index.ts';const {composePermissionControl} = await import(recipePath),p = await import(partsPath),h = {initial,changes: []} as unknown as Harness;
    const session = composePermissionControl(initial,{onChange(value: string) {h.changes.push(value);}}),mount = document.body.appendChild(document.createElement('div'));h.session = session;h.tree = p.mountParts(mount,p.createStackPart({children: [session.control,session.description]}),{appearance: 'light'});window.permissionPartsHarness = h;
  },initial);
  const trigger = page.getByRole('combobox',{name: 'Conversation permissions',exact: true});await trigger.focus();await page.evaluate(() => {const h = window.permissionPartsHarness;h.trigger = document.querySelector('button')!;h.control = document.querySelector('select')!;h.session.update({...h.initial,mode: 'full-access',description: 'Full access remains active.'});h.tree!.setAppearance('dark');});
  await expect(trigger).toBeFocused();expect(await trigger.evaluate(node => node === window.permissionPartsHarness.trigger)).toBe(true);await expect(page.locator('.pui-composer-note:not(.pui-image-guidance)')).toHaveCSS('color','rgb(233, 195, 123)');await trigger.click();await expect(page.getByRole('listbox')).toBeVisible();await page.evaluate(() => {const h = window.permissionPartsHarness;h.tree!.destroy();h.session.update({...h.initial,mode: 'ask'});h.session.destroy();});await expect(page.locator('label,select,[role=listbox]')).toHaveCount(0);expect(await page.evaluate(() => window.permissionPartsHarness.changes)).toEqual([]);
});
