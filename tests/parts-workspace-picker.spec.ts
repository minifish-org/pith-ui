import {expect,test,type Page} from '@playwright/test';

interface Workspace {id: string;name: string;path: string}
interface PickerState {workspaces: Workspace[];error?: string;disabled?: boolean}
interface PickerSession {read(): {path: string};update(state: PickerState): void;reset(path?: string): void;focus(): void;close(): void;destroy(): void;isOpen(): boolean}
interface PickerHarness {session: PickerSession;calls: string[];picks: number;closed: number;resolvePick?: (value: {path?: string;error?: string}) => void;rejectPick?: (error: Error) => void;resolveSubmit?: (value: {ok: true}|{ok: false;error: string}) => void;retained?: {row: Element;input: Element}}
declare global {interface Window {workspacePartsHarness: PickerHarness}}
const populated: PickerState = {workspaces: [{id: 'one',name: 'Original project',path: '/original/project'},{id: 'two',name: 'Other project',path: '/other/project'}]};

async function openPicker(page: Page,old: boolean,state: PickerState = populated,appearance: 'light'|'dark' = 'light'): Promise<void> {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async ({old,state,appearance}) => {
    document.documentElement.className = 'pui';document.documentElement.dataset.appearance = appearance;document.body.dataset.appearance = appearance;
    const mount = document.body.appendChild(document.createElement('div')),h = {calls: [],picks: 0,closed: 0} as unknown as PickerHarness;
    const callbacks = {onSubmit(path: string) {h.calls.push('submit:'+path);return new Promise<{ok: true}|{ok: false;error: string}>(resolve => {h.resolveSubmit = resolve;});},
      onPick() {h.picks++;return new Promise<{path?: string;error?: string}>((resolve,reject) => {h.resolvePick = resolve;h.rejectPick = reject;});},onSelect(id: string) {h.calls.push('select:'+id);},onClose() {h.closed++;}};
    if (old) {const path = '/src/app/index.ts',{createApplication} = await import(path);h.session = createApplication(mount,{appearance}).workspace.openWorkspacePicker(state,callbacks);}
    else {const path = '/examples/assemblies/workspace-picker.ts',{mountWorkspacePicker} = await import(path);h.session = mountWorkspacePicker(mount,state,callbacks,{appearance});}
    window.workspacePartsHarness = h;
  },{old,state,appearance});
  await expect(page.getByRole('dialog',{name: 'Workspaces',exact: true})).toBeVisible();
}

async function presentation(page: Page): Promise<unknown> {
  return page.getByRole('dialog',{name: 'Workspaces',exact: true}).evaluate(async node => {
    await document.fonts.ready;const origin = node.getBoundingClientRect();
    const inspect = (element: Element) => {const box = element.getBoundingClientRect(),style = getComputedStyle(element);return {tag: element.localName,
      text: [...element.childNodes].filter(child => child.nodeType === Node.TEXT_NODE).map(child => child.textContent).join(''),
      box: [box.x-origin.x,box.y-origin.y,box.width,box.height].map(value => Math.round(value*100)/100),role: element.getAttribute('role'),
      styles: ['display','font-family','font-size','font-weight','line-height','color','background-color','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-bottom','border-top-width','border-top-style','border-top-color','border-radius','gap','white-space','overflow-x','overflow-y','text-overflow'].map(key => style.getPropertyValue(key)),
      ...(element instanceof HTMLButtonElement ? {disabled: element.disabled,label: element.getAttribute('aria-label'),title: element.getAttribute('title')} : {}),
      ...(element instanceof HTMLInputElement ? {type: element.type,spellcheck: element.spellcheck,required: element.required,disabled: element.disabled,autocomplete: element.autocomplete,placeholder: element.placeholder,value: element.value} : {})};};
    // The fixed old content/picker DIVs are unstyled ownership containers.
    // Inspect every meaningful native layout/control and all visible text.
    const selector = '.pui-dialog-heading,h2,.pui-eyebrow,button,.pui-modal-description,.pui-modal-workspaces,.pui-modal-workspace span,.pui-modal-workspace strong,.pui-modal-workspace small,.pui-workspace-add,.pui-path-divider,.pui-path-divider span,form,label,input,.pui-field-hint,.pui-form-error,.pui-modal-footer';
    return {box: [origin.width,origin.height],nodes: [node,...node.querySelectorAll(selector)].filter(element => element.getClientRects().length && !element.closest('[hidden]')).map(inspect),svg: [...node.querySelectorAll('svg')].map(svg => svg.innerHTML)};
  });
}

test('option actions, option groups, labelled dividers and separated groups keep native opaque trees',async ({page}) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path);let selected = 0;
    const option = p.createOptionActionPart({label: 'Original',description: '/original',icon: 'folder',onAction() {selected++;}}),options = p.createOptionGroupPart({children: [option]});
    const divider = p.createLabelledDividerPart({label: 'or enter a folder path'}),picker = p.createButtonPart({variant: 'picker',icon: 'folder',label: 'Choose a folder…'}),group = p.createSeparatedGroupPart({children: [picker,divider]});
    const mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,p.createStackPart({children: [options,group]})),button = mount.querySelector('button')!;button.click();
    const initial = {root: options ? mount.firstElementChild!.children[0].localName : '',option: [...button.children].map(node => node.localName),caption: [...button.querySelector('span')!.children].map(node => node.localName),
      picker: [...mount.querySelector('.pui-picker-button')!.childNodes].map(node => node.nodeType === Node.TEXT_NODE ? '#text' : (node as Element).localName),divider: [...mount.querySelector('.pui-path-divider')!.children].map(node => node.localName),selected};
    const rejects = (operation: () => unknown) => {try {operation();return false;} catch {return true;}};
    const invalid = [rejects(() => option.update({label: 'Bad',description: 'Bad',icon: 'custom'})),rejects(() => p.createButtonPart({variant: 'picker',label: 'Missing icon'})),rejects(() => p.createSeparatedGroupPart({children: [],gap: 24}))];
    const free = p.createOptionActionPart({label: 'Free',description: '/free',icon: 'folder'}),atomic = rejects(() => p.createOptionGroupPart({children: [free,{}]})),other = document.body.appendChild(document.createElement('div')),owned = p.mountParts(other,free),reusable = other.textContent === 'Free/free';owned.destroy();
    const leaks = [option,options,divider,picker,group].some(part => Object.values(part).some(value => value instanceof Node));tree.destroy();return {...initial,invalid,atomic,reusable,leaks,empty: !mount.firstChild};
  });
  expect(result).toEqual({root: 'div',option: ['svg','span','svg'],caption: ['strong','small'],picker: ['svg','#text'],divider: ['span'],selected: 1,invalid: [true,true,true],atomic: true,reusable: true,leaks: false,empty: true});
});

test('path input is a semantic native text field with spellchecking disabled',async ({page}) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path),input = p.createInputPart({purpose: 'path',label: 'Absolute folder path',name: 'path',autocomplete: 'off',required: true}),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,input),node = mount.querySelector('input')!;
    const result = {type: node.type,spellcheck: node.spellcheck,required: node.required,autocomplete: node.autocomplete,name: node.name};tree.destroy();return result;
  });
  expect(result).toEqual({type: 'text',spellcheck: false,required: true,autocomplete: 'off',name: 'path'});
});

const scenarios: Array<[string,PickerState]> = [['populated',populated],['empty',{workspaces: []}],['disabled',{...populated,disabled: true}],['long-error',{workspaces: [{id: 'long',name: '<Original & unsafe> '+ 'very long '.repeat(8),path: '/a/'.repeat(60)}],error: '<Could not add workspace>'}]];
for (const [name,state] of scenarios) for (const appearance of ['light','dark'] as const) for (const width of [1280,390]) test(`${name} ${appearance} ${width} workspace picker preserves the actual old scene`,async ({page}) => {
  await page.setViewportSize({width,height: 844});await openPicker(page,true,state,appearance);const old = await presentation(page);await openPicker(page,false,state,appearance);expect(await presentation(page)).toEqual(old);
});

test('workspace selection, native picker and trimmed path submit remain separate intents',async ({page}) => {
  for (const old of [true,false]) {
    await openPicker(page,old);await page.getByRole('button',{name: 'Original project /original/project',exact: true}).click();expect(await page.evaluate(() => window.workspacePartsHarness.calls)).toEqual(['select:one']);
    const input = page.getByRole('textbox',{name: 'Absolute folder path',exact: true});await input.fill('  /entered/workspace  ');await page.getByRole('button',{name: 'Add workspace',exact: true}).click();
    await expect(page.getByRole('button',{name: 'Choose a folder…',exact: true})).toBeDisabled();await expect(input).toHaveValue('  /entered/workspace  ');await expect(input).toBeEnabled();
    expect(await page.evaluate(() => ({calls: window.workspacePartsHarness.calls,picks: window.workspacePartsHarness.picks}))).toEqual({calls: ['select:one','submit:/entered/workspace'],picks: 0});
    await page.evaluate(() => window.workspacePartsHarness.resolveSubmit!({ok: false,error: 'Try again'}));await expect(page.getByRole('alert')).toHaveText('Try again');
    await page.getByRole('button',{name: 'Choose a folder…',exact: true}).click();await expect(page.getByRole('button',{name: 'Add workspace',exact: true})).toBeDisabled();
    await page.evaluate(() => window.workspacePartsHarness.resolvePick!({path: '/picked/workspace'}));await expect(input).toHaveValue('/picked/workspace');
    await expect.poll(() => page.evaluate(() => window.workspacePartsHarness.calls)).toEqual(['select:one','submit:/entered/workspace','submit:/picked/workspace']);
    await page.evaluate(() => window.workspacePartsHarness.resolveSubmit!({ok: true}));await expect(page.getByRole('dialog',{name: 'Workspaces',exact: true})).not.toBeVisible();expect(await page.evaluate(() => window.workspacePartsHarness.closed)).toBe(1);
  }
});

test('picker cancellation, explicit error and rejection preserve the live path and permit retry',async ({page}) => {
  for (const old of [true,false]) {
    await openPicker(page,old);const input = page.getByRole('textbox',{name: 'Absolute folder path',exact: true}),pick = page.getByRole('button',{name: 'Choose a folder…',exact: true});await input.fill('/retained/draft');
    await pick.click();await page.evaluate(() => window.workspacePartsHarness.resolvePick!({}));await expect(pick).toBeEnabled();await expect(input).toHaveValue('/retained/draft');expect(await page.evaluate(() => window.workspacePartsHarness.calls)).toEqual([]);
    await pick.click();await page.evaluate(() => window.workspacePartsHarness.resolvePick!({error: '<Picker denied>'}));await expect(page.getByRole('alert')).toHaveText('<Picker denied>');await expect(input).toBeFocused();
    await pick.click();await page.evaluate(() => window.workspacePartsHarness.rejectPick!(new Error('Native unavailable')));await expect(page.getByRole('alert')).toHaveText('Native unavailable You can enter the path below.');await expect(input).toHaveValue('/retained/draft');await expect(input).toBeFocused();
  }
});

test('workspace metadata preserves row/input identity, selection and local pending',async ({page}) => {
  for (const old of [true,false]) {
    await openPicker(page,old);const input = page.getByRole('textbox',{name: 'Absolute folder path',exact: true});await input.fill('/retained/path');await input.evaluate((node: HTMLInputElement) => node.setSelectionRange(2,7));
    await page.evaluate(() => {const h = window.workspacePartsHarness;h.retained = {input: document.querySelector('dialog[open] input')!,row: document.querySelector('dialog[open] .pui-modal-workspace')!};h.session.update({workspaces: [{id: 'one',name: 'Renamed project',path: '/renamed/project'},{id: 'two',name: 'Other project',path: '/other/project'}],error: 'Metadata notice'});});
    expect(await input.evaluate((node: HTMLInputElement) => ({value: node.value,start: node.selectionStart,end: node.selectionEnd}))).toEqual({value: '/retained/path',start: 2,end: 7});
    expect(await page.evaluate(() => {const h = window.workspacePartsHarness;return {input: h.retained!.input === document.querySelector('dialog[open] input'),row: h.retained!.row === document.querySelector('dialog[open] .pui-modal-workspace')};})).toEqual({input: true,row: true});
    await page.getByRole('button',{name: 'Choose a folder…',exact: true}).click();await page.evaluate(state => window.workspacePartsHarness.session.update(state),populated);await expect(page.getByRole('button',{name: 'Choose a folder…',exact: true})).toBeDisabled();expect(await page.evaluate(() => window.workspacePartsHarness.picks)).toBe(1);
  }
});

test('availability change releases native picker ownership and refuses its now-disabled write',async ({page}) => {
  for (const old of [true,false]) {
    await openPicker(page,old);const pick = page.getByRole('button',{name: 'Choose a folder…',exact: true});await pick.click();await page.evaluate(state => window.workspacePartsHarness.session.update({...state,disabled: true}),populated);
    await page.evaluate(() => window.workspacePartsHarness.resolvePick!({path: '/picked/while-disabled'}));await expect(page.getByRole('textbox',{name: 'Absolute folder path',exact: true})).toHaveValue('/picked/while-disabled');expect(await page.evaluate(() => window.workspacePartsHarness.calls)).toEqual([]);
    await page.evaluate(state => window.workspacePartsHarness.session.update(state),populated);await expect(pick).toBeEnabled();await expect(page.getByRole('button',{name: 'Add workspace',exact: true})).toBeEnabled();
  }
});

test('closing and explicit reset retire old picker results before they can change a target or submit',async ({page}) => {
  for (const old of [true,false]) {
    await openPicker(page,old);const input = page.getByRole('textbox',{name: 'Absolute folder path',exact: true}),pick = page.getByRole('button',{name: 'Choose a folder…',exact: true});await pick.click();
    await page.evaluate(() => {const h = window.workspacePartsHarness;h.session.reset('/new/target');h.resolvePick!({path: '/retired/path'});});await expect(input).toHaveValue('/new/target');await expect(pick).toBeEnabled();expect(await page.evaluate(() => window.workspacePartsHarness.calls)).toEqual([]);
    await pick.click();await page.getByRole('button',{name: 'Cancel',exact: true}).click();await page.evaluate(() => window.workspacePartsHarness.resolvePick!({path: '/after-close'}));await expect(page.getByRole('dialog',{name: 'Workspaces',exact: true})).not.toBeVisible();expect(await page.evaluate(() => ({calls: window.workspacePartsHarness.calls,closed: window.workspacePartsHarness.closed}))).toEqual({calls: [],closed: 1});
  }
});

test('a composed picker shares one frame theme and retires on parent destruction',async ({page}) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async state => {
    document.documentElement.className = '';document.documentElement.removeAttribute('data-appearance');document.body.className = '';
    const partsPath = '/src/parts/index.ts',recipePath = '/examples/assemblies/workspace-picker.ts',p = await import(partsPath),{composeWorkspacePicker} = await import(recipePath);
    let resolve!: (value: {path: string}) => void,closed = 0,writes = 0;
    const picker = composeWorkspacePicker(state,{onPick() {return new Promise(done => {resolve = done;});},onSubmit() {writes++;return {ok: true};},onClose() {closed++;}});
    picker.open();const before = picker.isOpen(),mount = document.body.appendChild(document.createElement('div')),root = p.createFramePart({children: [picker.part]}),tree = p.mountParts(mount,root,{appearance: 'dark'});picker.open();
    const shared = mount.querySelector('dialog')!.parentElement === mount.firstElementChild;(mount.querySelector('.pui-picker-button') as HTMLButtonElement).click();tree.destroy();resolve({path: '/retired/path'});await new Promise(done => setTimeout(done,0));picker.update(state);picker.reset('/retired');picker.open();picker.destroy();
    return {before,shared,closed,writes,open: picker.isOpen(),empty: !mount.firstChild,scope: !mount.classList.contains('pui'),global: document.documentElement.getAttribute('data-appearance')};
  },populated);
  expect(result).toEqual({before: false,shared: true,closed: 1,writes: 0,open: false,empty: true,scope: true,global: null});
});
