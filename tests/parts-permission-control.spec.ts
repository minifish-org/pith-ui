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
    const path='/examples/assemblies/composer.ts',{composeComposer}=await import(path),composer=composeComposer({model:{label:'GPT-6.1 Sol',description:'Selected model'},thinking:{options:[{value:'off',label:'Off'},{value:'high',label:'High'}],value:'high'}},{onPermissionChange(value:string){h.changes.push(value);}});composer.updatePermission(state);
    h.tree=mountRegion(mount,composer.part,'composer',appearance);h.session={update:composer.updatePermission,destroy:composer.destroy};
        window.permissionPartsHarness = h;
  },{state,appearance});
}

test('narrow permission icons keep a full click target and align with the unchanged composer actions',async ({page}) => {
  for (const width of [640,590,480,390]) {
    await page.setViewportSize({width,height:700});await openPermission(page);
    const trigger=page.getByRole('combobox',{name:'Conversation permissions',exact:true});
    const permission=page.locator('.pui-permission-control');
    const geometry=await permission.evaluate(node=>{
      const rect=node.getBoundingClientRect(),caption=node.querySelector('.pui-select-value')!.getBoundingClientRect();
      const controls=[node,document.querySelector('[aria-label="Attach images"]')!,document.querySelector('[aria-label="Choose model"]')!,document.querySelector('.pui-composer-thinking button')!,document.querySelector('.pui-send-button')!];
      return {width:rect.width,height:rect.height,captionWidth:caption.width,centers:controls.map(control=>{const r=control.getBoundingClientRect();return r.top+r.height/2;})};
    });
    expect(geometry.width).toBeGreaterThanOrEqual(40);expect(geometry.width).toBeLessThanOrEqual(44);
    expect(geometry.height).toBeGreaterThanOrEqual(40);expect(geometry.captionWidth).toBeLessThanOrEqual(1);
    expect(Math.max(...geometry.centers)-Math.min(...geometry.centers)).toBeLessThanOrEqual(1);
    await expect(permission.locator(':scope > svg').last()).not.toBeVisible();
    await trigger.click({position:{x:2,y:2}});
    for (const name of ['Ask before changes','Allow workspace changes','Full access']) await expect(page.getByRole('option',{name,exact:true})).toBeVisible();
    await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
    expect(await page.evaluate(()=>window.permissionPartsHarness.changes)).toEqual([]);
    await page.evaluate(()=>{const h=window.permissionPartsHarness;h.session.update({...h.initial,disabled:true});});
    await expect(trigger).toBeDisabled();await expect(permission.locator(':scope > svg').first()).toHaveCSS('opacity','0.45');
    await page.evaluate(()=>{const h=window.permissionPartsHarness;h.session.update({...h.initial,disabled:false});});
    await expect(trigger).toBeEnabled();await expect(permission.locator(':scope > svg').first()).toHaveCSS('opacity','1');
  }
});

test('all three permission modes have distinct symbols and expose their complete current names',async ({page})=>{
  await page.setViewportSize({width:480,height:600});await openPermission(page,initial,'dark');
  const trigger=page.getByRole('combobox',{name:'Conversation permissions',exact:true}),icons:string[]=[],colors:string[]=[];
  for (const [mode,name] of [['ask','Ask before changes'],['workspace-write','Allow workspace changes'],['full-access','Full access']]) {
    await page.evaluate(mode=>{const h=window.permissionPartsHarness;h.session.update({...h.initial,mode});},mode!);
    await expect(trigger).toHaveAttribute('title',name!);
    const icon=page.locator('.pui-permission-control > svg').first();icons.push(await icon.innerHTML());colors.push(await icon.evaluate(node=>getComputedStyle(node).color));
    await trigger.click();await expect(page.getByRole('option',{name:name!,exact:true})).toHaveAttribute('aria-selected','true');await page.keyboard.press('Escape');
  }
  expect(new Set(icons).size).toBe(3);expect(colors[0]).toBe(colors[1]);expect(colors[2]).not.toBe(colors[0]);
  expect(await page.evaluate(()=>window.permissionPartsHarness.changes)).toEqual([]);
});

test('permission collapse follows composer space and preserves the same focused control and draft across resizing',async ({page})=>{
  await page.setViewportSize({width:1280,height:800});await openPermission(page);
  const trigger=page.getByRole('combobox',{name:'Conversation permissions',exact:true}),caption=page.locator('.pui-permission-control .pui-select-value'),field=page.getByRole('textbox',{name:'Message Pith',exact:true});
  await field.fill('Keep this draft 中文');await expect(caption).toBeVisible();
  expect((await trigger.boundingBox())!.width).toBeGreaterThan(44);
  await trigger.focus();await page.evaluate(()=>{window.permissionPartsHarness.trigger=document.querySelector<HTMLButtonElement>('.pui-permission-control button')!;document.querySelector<HTMLElement>('.pui-composer-region')!.style.width='420px';});
  await expect.poll(async()=> (await trigger.boundingBox())!.width).toBeLessThanOrEqual(44);
  await expect(trigger).toBeFocused();expect(await trigger.evaluate(node=>node===window.permissionPartsHarness.trigger)).toBe(true);await expect(field).toHaveValue('Keep this draft 中文');
  await page.evaluate(()=>document.querySelector<HTMLElement>('.pui-composer-region')!.style.removeProperty('width'));
  await expect.poll(async()=> (await trigger.boundingBox())!.width).toBeGreaterThan(44);await expect(trigger).toBeFocused();await expect(field).toHaveValue('Keep this draft 中文');
});

test('disposing the composer releases its width observer',async ({page})=>{
  await page.goto('/tests/fixture.html');
  await page.evaluate(() => {
    const NativeObserver=window.ResizeObserver,active=new Set<ResizeObserver>();
    Object.assign(window,{permissionWidthObservers:active});
    window.ResizeObserver=class extends NativeObserver {
      override observe(target:Element,options?:ResizeObserverOptions):void {active.add(this);super.observe(target,options);}
      override disconnect():void {active.delete(this);super.disconnect();}
    };
  });
  // Mount without navigating, retaining the instrumented native observer.
  await page.evaluate(async initial => {
    const path='/examples/assemblies/composer.ts',parts='/src/parts/index.ts';
    const {composeComposer}=await import(path),{mountParts}=await import(parts),composer=composeComposer({});
    composer.updatePermission(initial);
    const mount=document.body.appendChild(document.createElement('div')),tree=mountParts(mount,composer.part);
    Object.assign(window,{disposePermissionWidth:()=>tree.destroy()});
  },initial);
  expect(await page.evaluate(()=>Reflect.get(window,'permissionWidthObservers').size)).toBe(1);
  await page.evaluate(()=>Reflect.get(window,'disposePermissionWidth')());
  expect(await page.evaluate(()=>Reflect.get(window,'permissionWidthObservers').size)).toBe(0);
  await page.setViewportSize({width:390,height:700});
  await expect(page.locator('.pui-composer-toolbar')).toHaveCount(0);
});


test('compact select and context note expose bounded semantic state, genuine descriptions and one native label',async ({page}) => {
  await page.goto('/tests/fixture.html');const value = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path),rejects = (action: () => unknown) => {try {action();return false;} catch {return true;}};
    const note = p.createContextNotePart({text: 'Bounded description',tone: 'warning'}),choice = p.createCompactSelectPart({label: 'Compact choice',icon: 'shield',tone: 'warning',describedBy: [note],options: [{value: 'a',label: 'First'},{value: 'b',label: 'Second'}],value: 'b'});
    const mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,p.createStackPart({children: [choice,note]}));
    const label = mount.querySelector('label')!,select = mount.querySelector('select')!,before = label.innerHTML;
    const invalid = [rejects(() => choice.update({tone: 'magenta'})),rejects(() => choice.update({describedBy: [{destroy() {}}]})),rejects(() => choice.update({style: {width: 500}})),rejects(() => note.update({text: 'Changed',tone: 'magenta'})),rejects(() => p.createCompactSelectPart({label: 'Invalid',icon: 'unknown',options: []})),rejects(() => p.createContextNotePart({text: 'Invalid',className: 'other'})),rejects(() => choice.update({label:'Changed',icon:'unknown'}))];
    const result = {invalid,unchanged: before === label.innerHTML,value: choice.read(),label: label.localName,children: [...label.children].map(node => node.localName),description: mount.querySelector('p')!.textContent,reference: select.getAttribute('aria-describedby') === mount.querySelector('p')!.id,leaks: [note,choice].some(part => Object.values(part).some(value => value instanceof Node))};tree.destroy();return result;
  });expect(value).toEqual({invalid: [true,true,true,true,true,true,true],unchanged: true,value: 'b',label: 'label',children: ['svg','span','span','svg'],description: 'Bounded description',reference: true,leaks: false});
});

test('inline choices reject icon updates before changing their caption or native value',async ({page})=>{
  await page.goto('/tests/fixture.html');const result=await page.evaluate(async()=>{
    const path='/src/parts/index.ts',p=await import(path),choice=p.createCompactSelectPart({purpose:'inline',label:'Thinking effort',options:[{value:'high',label:'High'}],value:'high'});
    const mount=document.body.appendChild(document.createElement('div')),tree=p.mountParts(mount,choice),before=mount.innerHTML;
    let rejected=false;try {choice.update({label:'Changed',icon:'shield-alert'});} catch {rejected=true;}
    const result={rejected,unchanged:before===mount.innerHTML,value:choice.read()};tree.destroy();return result;
  });expect(result).toEqual({rejected:true,unchanged:true,value:'high'});
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
