import {expect,test} from '@playwright/test';

for (const kind of ['model','text','confirmation'] as const) test(`${kind} local composition shares the frame mount, theme and parent disposal`,async ({page}) => {
  await page.goto('/tests/fixture.html');
  const before = await page.evaluate(async kind => {
    document.documentElement.className = '';document.documentElement.removeAttribute('data-appearance');document.body.className = '';
    const paths = {parts: '/src/parts/index.ts',model: '/examples/assemblies/model-picker.ts',text: '/examples/assemblies/text-edit.ts',confirmation: '/examples/assemblies/confirmation.ts'};
    const p = await import(paths.parts),recipe = await import(paths[kind]);
    let closed = 0,resolve!: (value: {ok: true}|{ok: false;error: string}) => void;
    const pending = () => new Promise(done => {resolve = done;});
    const selection = {provider: 'alpha',model: 'one',thinkingLevel: 'off'};
    const modelState = {editor: {selection,providers: [{id: 'alpha',name: 'Alpha'}],models: [{id: 'one',name: 'One',provider: 'alpha',thinkingLevels: ['off'],supportsImages: false,contextWindow: 1000,maxTokens: 100}]}};
    const textState = {title: 'Edit original',value: 'Retained unsaved draft'},confirmationState = {title: 'Remove original',message: {before: 'Remove ',subject: 'Original','after': '?'}};
    const local = kind === 'model' ? recipe.composeModelPicker(modelState,{onSubmit: pending,onClose() {closed++;}})
      : kind === 'text' ? recipe.composeTextEditor(textState,{onSubmit: pending,onClose() {closed++;}})
        : recipe.composeConfirmation(confirmationState,{onConfirm: pending,onClose() {closed++;}});
    const open = () => kind === 'text' ? local.open({value: textState.value}) : local.open();
    open();const before = {open: local.isOpen(),dialogs: document.querySelectorAll('dialog').length,closed};
    const root = p.createFramePart({children: [local.part]}),mount = document.body.appendChild(document.createElement('div'));mount.id = 'shared-composition';
    const tree = p.mountParts(mount,root,{appearance: 'dark'});open();
    const dialog = mount.querySelector('dialog')!,mounted = {parent: dialog.parentElement === mount.firstElementChild,scopes: mount.querySelectorAll('.pui').length,color: getComputedStyle(dialog).backgroundColor,open: local.isOpen()};
    tree.setAppearance('light');const light = getComputedStyle(dialog).backgroundColor;
    (window as unknown as {ownedComposition: {submit(): void;dispose(): Promise<unknown>}}).ownedComposition = {
      submit() {(dialog.querySelector('button[type=submit]') as HTMLButtonElement).click();},
      async dispose() {
        tree.destroy();const saved = kind === 'confirmation' ? undefined : local.read();
        resolve({ok: false,error: 'Retired operation'});await new Promise(done => setTimeout(done,0));
        const quiet: boolean[] = [];for (const operation of [() => local.update(kind === 'model' ? {...modelState,error: 'Late snapshot'} : kind === 'text' ? {...textState,error: 'Late snapshot'} : {...confirmationState,error: 'Late snapshot'}),
          () => kind === 'model' ? local.reset(selection) : kind === 'text' ? local.reset('Late draft') : local.open(),open,() => local.close(),() => local.destroy()]) {
          try {operation();quiet.push(true);} catch {quiet.push(false);}
        }
        return {closed,open: local.isOpen(),empty: !mount.firstChild,saved,quiet,html: document.documentElement.getAttribute('data-appearance'),scopeRestored: !mount.classList.contains('pui')};
      },
    };
    return {before,mounted,light};
  },kind);
  expect(before).toEqual({before: {open: false,dialogs: 0,closed: 0},mounted: {parent: true,scopes: 0,color: 'rgb(34, 37, 42)',open: true},light: 'rgb(255, 255, 255)'});
  await page.evaluate(() => (window as unknown as {ownedComposition: {submit(): void}}).ownedComposition.submit());await expect(page.locator('dialog button[type=submit]')).toBeDisabled();
  const result = await page.evaluate(() => (window as unknown as {ownedComposition: {dispose(): Promise<unknown>}}).ownedComposition.dispose());
  expect(result).toMatchObject({closed: 1,open: false,empty: true,quiet: [true,true,true,true,true],html: null,scopeRestored: true});
  if (kind === 'text') expect(result).toMatchObject({saved: 'Retained unsaved draft'});
  if (kind === 'model') expect(result).toMatchObject({saved: {provider: 'alpha',model: 'one',thinkingLevel: 'off'}});
});

test('frame disposal callback retires local owners before child teardown and rejected callbacks preserve ownership',async ({page}) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path),events: string[] = [];
    const child = p.createDialogPart({title: 'Child',children: [],onDispose() {events.push('child');}});
    const root = p.createFramePart({children: [child],onDispose() {events.push('frame:'+child.isOpen());}}),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,root);
    child.open();tree.destroy();root.destroy();root.replace([]);
    const free = p.createTextPart({text: 'Reusable'});let rejected = false;
    try {p.createFramePart({children: [free],onDispose: 'not callback'});} catch {rejected = true;}
    const other = document.body.appendChild(document.createElement('div')),owned = p.mountParts(other,free),reusable = other.textContent === 'Reusable';owned.destroy();
    return {events,empty: !mount.firstChild,rejected,reusable};
  });
  expect(result).toEqual({events: ['frame:true','child'],empty: true,rejected: true,reusable: true});
});

for (const teardown of ['mount','replace'] as const) test(`ancestor ${teardown} makes a composed frame terminal before late actions and snapshots`,async ({page}) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async teardown => {
    const partsPath = '/src/parts/index.ts',framePath = '/examples/assemblies/frame.ts',p = await import(partsPath),{composeFrame} = await import(framePath);
    let resolve!: (value: {ok: false;error: string}) => void,actions = 0,searches = 0,errors = 0;
    const state = {compactDisabled: false,navigation: {empty: null,groups: []}};
    const frame = composeFrame(state,{onAction() {actions++;return new Promise(done => {resolve = done;});},onSearch() {searches++;},onError() {errors++;}});
    const mount = document.body.appendChild(document.createElement('div')),owner = p.createStackPart({children: [frame.part]}),tree = p.mountParts(mount,owner);
    (mount.querySelector('button[aria-label="Compress context"]') as HTMLButtonElement).click();if (teardown === 'mount') tree.destroy();else owner.replace([]);
    resolve({ok: false,error: 'Retired'});await new Promise(done => setTimeout(done,0));
    const quiet: boolean[] = [];for (const operation of [() => frame.update(state),() => frame.search('late'),() => frame.closeNavigationMenu(),() => frame.setSidebarOpen(true),() => frame.destroy()]) {
      try {operation();quiet.push(true);} catch {quiet.push(false);}
    }
    const retired = !mount.querySelector('.pui-app');tree.destroy();return {quiet,actions,searches,errors,open: frame.isSidebarOpen(),retired,empty: !mount.firstChild};
  },teardown);
  expect(result).toEqual({quiet: [true,true,true,true,true],actions: 1,searches: 0,errors: 0,open: false,retired: true,empty: true});
});
