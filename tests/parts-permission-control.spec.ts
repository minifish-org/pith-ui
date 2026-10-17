import {test,expect,type Page} from '@playwright/test';

interface State {mode: string;description: string;disabled?: boolean}
interface Session {update(state: State): void;destroy(): void}
interface Harness {session: Session;initial: State;changes: string[];control?: HTMLSelectElement;trigger?: HTMLButtonElement;tree?: {setAppearance(value: 'light'|'dark'): void;destroy(): void}}
declare global {interface Window {permissionPartsHarness: Harness}}
const initial: State = {mode: 'ask',description: 'Pith can read workspace files. Changes and commands require your approval.'};

async function openPermission(page: Page,old: boolean,state: State = initial,appearance: 'light'|'dark' = 'light'): Promise<void> {
  await page.goto('/tests/fixture.html');await page.evaluate(async ({old,state,appearance}) => {
    document.documentElement.classList.add('pui');document.documentElement.dataset.appearance = appearance;
    const appPath = '/src/app/index.ts';const {createApplication} = await import(appPath),mount = document.body.appendChild(document.createElement('div'));
    const h = {initial: state,changes: []} as unknown as Harness;
    // Both sides use the real application width and native composer flex parent.
    const app = createApplication(mount,{appearance,workspace: {onPermissionChange(value: string) {h.changes.push(value);}}});
    app.workspace.updatePermission(state);
    if (old) h.session = {update: app.workspace.updatePermission,destroy: app.destroy};
    else {
      const recipePath = '/examples/assemblies/permission-control.ts',partsPath = '/src/parts/index.ts';
      const {composePermissionControl} = await import(recipePath),p = await import(partsPath);
      const oldControl = mount.querySelector('.pui-permission-control')!,parent = oldControl.parentElement!,oldNote = mount.querySelector('[id$="permission-description"]')!;
      const noteMount = document.createElement('div');oldNote.replaceWith(noteMount);
      const session = composePermissionControl(state,{onChange(value: string) {h.changes.push(value);}});
      const controlTree = p.mountParts(parent,session.control,{appearance}),noteTree = p.mountParts(noteMount,session.description,{appearance});
      h.session = session;h.tree = {setAppearance(value: 'light'|'dark') {controlTree.setAppearance(value);noteTree.setAppearance(value);},destroy() {controlTree.destroy();noteTree.destroy();}};
    }
    window.permissionPartsHarness = h;
  },{old,state,appearance});
}

async function presentation(page: Page): Promise<unknown> {
  return page.evaluate(async () => {
    await document.fonts.ready;const label = document.querySelector('.pui-permission-control')!,note = document.querySelector('.pui-composer-note:not(.pui-image-guidance)')!,origin = label.getBoundingClientRect();
    const inspect = (node: Element,description = false) => {
      const style = getComputedStyle(node),box = node.getBoundingClientRect();return {tag: node.localName,text: [...node.childNodes].filter(child => child.nodeType === Node.TEXT_NODE).map(child => child.textContent).join('').trim(),
        box: (description ? [box.width,box.height] : [box.x-origin.x,box.y-origin.y,box.width,box.height]).map(value => Math.round(value*100)/100),
        style: ['display','font-size','font-weight','line-height','color','background-color','border-top-color','border-top-width','border-radius','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left','gap','min-width','max-width','opacity','cursor'].map(key => style.getPropertyValue(key)),
        ...(node instanceof HTMLSelectElement ? {value: node.value,disabled: node.disabled,described: !!node.getAttribute('aria-describedby') && node.ownerDocument.getElementById(node.getAttribute('aria-describedby')!)?.textContent,options: [...node.options].map(option => [option.value,option.textContent])} : {}),
        ...(node instanceof HTMLButtonElement ? {name: node.getAttribute('aria-label'),disabled: node.disabled,expanded: node.getAttribute('aria-expanded')} : {})};
    };
    return {label: inspect(label),nodes: [...label.querySelectorAll('svg,span,select,button')].filter(node => !node.closest('[hidden]') && !node.matches('.pui-popover-panel *')).map(node => inspect(node)),note: inspect(note,true),svg: [...label.querySelectorAll('svg')].map(node => node.innerHTML)};
  });
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

for (const appearance of ['light','dark'] as const) for (const mode of ['ask','workspace-write','full-access']) for (const disabled of [false,true]) test(`${appearance} ${mode} ${disabled ? 'disabled' : 'enabled'} preserves actual composer permission choice`,async ({page}) => {
  await page.emulateMedia({colorScheme: appearance === 'dark' ? 'light' : 'dark'});const state = {...initial,mode,disabled,description: mode === 'full-access' ? 'All enabled tools may run without asking.' : initial.description};
  await openPermission(page,true,state,appearance);const old = await presentation(page);await openPermission(page,false,state,appearance);expect(await presentation(page)).toEqual(old);
});

for (const width of [340,480]) test(`permission choice at ${width} keeps the exact compact bounds and popup anchor`,async ({page}) => {
  await page.setViewportSize({width,height: 720});await openPermission(page,true,{...initial,mode: 'workspace-write'});const old = await presentation(page);
  await page.getByRole('combobox',{name: 'Conversation permissions',exact: true}).click();const before = await page.locator('[role=listbox]:visible').evaluate(node => {const box = node.getBoundingClientRect(),label = document.querySelector('.pui-permission-control')!.getBoundingClientRect();return [box.x-label.x,box.y-label.y,box.width,box.height].map(value => Math.round(value*100)/100);});
  await openPermission(page,false,{...initial,mode: 'workspace-write'});expect(await presentation(page)).toEqual(old);await page.getByRole('combobox',{name: 'Conversation permissions',exact: true}).click();expect(await page.locator('[role=listbox]:visible').evaluate(node => {const box = node.getBoundingClientRect(),label = document.querySelector('.pui-permission-control')!.getBoundingClientRect();return [box.x-label.x,box.y-label.y,box.width,box.height].map(value => Math.round(value*100)/100);})).toEqual(before);
});

test('permission keyboard emits one value intent and snapshots explicitly project the authoritative mode',async ({page}) => {
  await openPermission(page,false);const trigger = page.getByRole('combobox',{name: 'Conversation permissions',exact: true});await trigger.focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('End');await page.keyboard.press('Enter');expect(await page.evaluate(() => window.permissionPartsHarness.changes)).toEqual(['full-access']);
  await page.evaluate(() => {const h = window.permissionPartsHarness;h.session.update({...h.initial,mode: 'workspace-write',description: 'Workspace changes allowed.'});});await expect(trigger).toHaveText('Allow workspace changes');await expect(page.locator('.pui-composer-note:not(.pui-image-guidance)')).toHaveText('Workspace changes allowed.');
  await trigger.click();await page.getByRole('option',{name: 'Ask before changes',exact: true}).click();expect(await page.evaluate(() => window.permissionPartsHarness.changes)).toEqual(['full-access','ask']);
});

test('permission metadata and availability preserve the same native control, focus and popup lifetime',async ({page}) => {
  await openPermission(page,false);const trigger = page.getByRole('combobox',{name: 'Conversation permissions',exact: true});await trigger.focus();await page.evaluate(() => {const h = window.permissionPartsHarness;h.control = document.querySelector('.pui-permission-control select')!;h.trigger = document.querySelector('.pui-permission-control button')!;h.session.update({...h.initial,description: 'Updated description'});});
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
