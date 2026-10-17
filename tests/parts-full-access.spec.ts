import {test, expect, type Page} from '@playwright/test';

type Result = {ok: true} | {ok: false; error: string};
interface AccessState {title?: string; error?: string; disabled?: boolean}
interface AccessHandle {update(state: AccessState): void; close(): void; isOpen(): boolean; destroy(): void}
declare global {interface Window {accessPartsHarness: {editor: AccessHandle; calls: number; closed: number; releases: Array<(value: Result) => void>; target?: Element}}}
async function openAccess(page: Page, old: boolean, state: AccessState = {}, appearance: 'light'|'dark' = 'light', applicationContext = true): Promise<void> {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async ({old,state,appearance,applicationContext}) => {
    document.documentElement.classList.add('pui'); document.documentElement.dataset.appearance = appearance; document.body.dataset.appearance = appearance;
    const opener = document.body.appendChild(document.createElement('button')); opener.id = 'access-opener'; opener.textContent = 'Access opener'; opener.focus();
    const mount = document.body.appendChild(document.createElement('div'));
    const h = {calls: 0,closed: 0,releases: []} as unknown as Window['accessPartsHarness'];
    const callbacks = {onConfirm(): Promise<Result> {h.calls++; return new Promise(resolve => h.releases.push(resolve));},onClose() {h.closed++;}};
    if (old) {const path = '/src/app/index.ts'; const {createApplication} = await import(path); h.editor = createApplication(mount,{appearance}).workspace.openFullAccess(state,callbacks);}
    else {
      let target: HTMLElement = mount;
      if (applicationContext) {const path = '/src/app/index.ts'; const {createApplication} = await import(path); createApplication(mount,{appearance}); target = mount.querySelector<HTMLElement>('.pui-app')!;}
      const path = '/examples/assemblies/full-access.ts'; const {mountFullAccess} = await import(path); h.editor = mountFullAccess(target,state,callbacks,{appearance});
    }
    window.accessPartsHarness = h;
  },{old,state,appearance,applicationContext});
  await expect(page.getByRole('dialog',{name: 'Enable full access?',exact: true})).toBeVisible();
}
async function presentation(page: Page): Promise<unknown> {
  return page.evaluate(async () => {
    await document.fonts.ready;
    for (const animation of document.getAnimations()) if (animation.effect?.getTiming().iterations !== Infinity) animation.finish();
    const dialog = document.querySelector('dialog[open]')!,origin = dialog.getBoundingClientRect();
    const inspect = (node: Element) => {
      const box = node.getBoundingClientRect(),style = getComputedStyle(node);
      return {tag: node.localName,text: [...node.childNodes].filter(child => child.nodeType === Node.TEXT_NODE).map(child => child.textContent).join('').trim(),
        box: [box.x-origin.x,box.y-origin.y,box.width,box.height].map(value => Math.round(value*100)/100),
        styles: ['display','font-family','font-size','font-weight','line-height','color','background-color','margin-top','margin-bottom','padding-top','padding-right','padding-bottom','padding-left','border-top-width','border-top-color','border-radius','gap','overflow-x','overflow-y','min-height','max-height'].map(key => style.getPropertyValue(key)),
        ...(node instanceof HTMLButtonElement ? {label: node.getAttribute('aria-label'),type: node.type,disabled: node.disabled} : {})};
    };
    return {dialog: inspect(dialog),nodes: [...dialog.querySelectorAll('h2,.pui-eyebrow,p,strong,button,[role=alert],.pui-modal-footer')].filter(node => !node.closest('[hidden]')).map(inspect),
      warning: inspect(dialog.querySelector('.pui-full-access-explanation,.pui-warning-callout')!),
      svg: [...dialog.querySelectorAll('svg')].map(svg => ({...inspect(svg),paths: svg.innerHTML})),
      overflow: [dialog.clientWidth,dialog.scrollWidth,dialog.clientHeight,dialog.scrollHeight]};
  });
}

test('warning surface and note compose native parts without a scene or presentation escape',async ({page}) => {
  await page.goto('/tests/fixture.html');
  const value = await page.evaluate(async () => {
    const path = '/src/parts/index.ts'; const p = await import(path);
    const icon = p.createIconPart({name: 'shield'}),text = p.createTextPart({role: 'strong',text: 'Warning'}),body = p.createStackPart({children: [text]});
    let rejected = false; try {p.createWarningPart({children: [icon,body],style: {padding: '999px'}});} catch {rejected = true;}
    const warning = p.createWarningPart({children: [icon,body]}),note = p.createTextPart({role: 'note',text: 'Applies to this target.'});
    const action = p.createButtonPart({variant: 'warning',label: 'Proceed'}),dialog = p.createDialogPart({title: 'Warning',closeLabel: 'Dismiss warning',children: [warning,note,action]});
    const mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,dialog); dialog.open();
    const result = {rejected,children: [...mount.querySelector('.pui-warning-callout')!.children].map(node => node.localName),label: mount.querySelector('button')!.getAttribute('aria-label'),
      leaks: [warning,note,action,dialog].some(part => Object.values(part).some(value => value instanceof Node))}; tree.destroy(); return result;
  });
  expect(value).toEqual({rejected: true,children: ['svg','div'],label: 'Dismiss warning',leaks: false});
});

for (const appearance of ['light','dark'] as const) for (const [name,state] of Object.entries({fallback: {},target: {title: 'Project notes 中文'},literal: {title: '<img onerror=alert(1)> '+ 'Long target '.repeat(15)},error: {title: 'Notes',error: 'Permission change failed.'},disabled: {title: 'Notes',disabled: true}})) {
  test(`${appearance} full access ${name} preserves warning text, palette, icons and controls`,async ({page}) => {
    await page.emulateMedia({colorScheme: appearance === 'light' ? 'dark' : 'light'});
    await openAccess(page,true,state,appearance); const old = await presentation(page);
    await openAccess(page,false,state,appearance); expect(await presentation(page)).toEqual(old);
    await expect(page.getByRole('button',{name: 'Cancel full access',exact: true})).toBeFocused();
    await expect(page.locator('dialog img,dialog script')).toHaveCount(0);
  });
}
for (const viewport of [{width: 390,height: 844},{width: 900,height: 568}]) test(`full access ${viewport.width} preserves scrolling and footer position`,async ({page}) => {
  await page.setViewportSize(viewport); await openAccess(page,true); const old = await presentation(page);
  await openAccess(page,false); expect(await presentation(page)).toEqual(old);
});

test('full access keeps one pending confirmation through metadata and reports failure before successful retry',async ({page}) => {
  await openAccess(page,false,{title: 'Owned target'},'light',false); const confirm = page.getByRole('button',{name: 'Enable full access',exact: true});
  await confirm.click(); await expect(confirm).toBeDisabled();
  await page.evaluate(() => {window.accessPartsHarness.editor.update({title: 'Updated target',disabled: false}); document.querySelector<HTMLButtonElement>('dialog .pui-warning-button')!.click();});
  await expect(confirm).toBeDisabled(); expect(await page.evaluate(() => window.accessPartsHarness.calls)).toBe(1);
  await page.evaluate(() => window.accessPartsHarness.releases[0]!({ok: false,error: 'Rejected change'}));
  await expect(page.locator('dialog [role=alert]')).toHaveText('Rejected change'); await expect(confirm).toBeEnabled();
  await confirm.click(); await page.evaluate(() => window.accessPartsHarness.releases[1]!({ok: true}));
  await expect(page.locator('dialog[open]')).toHaveCount(0); expect(await page.evaluate(() => window.accessPartsHarness.closed)).toBe(1);
});

test('full access literal target update retains the native emphasis node and external disabling',async ({page}) => {
  await openAccess(page,false,{title: 'Original target'},'dark',false);
  await page.evaluate(() => {const target = [...document.querySelectorAll('dialog strong')].find(node => node.textContent === 'Original target')!; window.accessPartsHarness.target = target; window.accessPartsHarness.editor.update({title: '<b>Literal target</b>',disabled: true});});
  expect(await page.evaluate(() => ({same: window.accessPartsHarness.target?.isConnected,text: window.accessPartsHarness.target?.textContent}))).toEqual({same: true,text: '<b>Literal target</b>'});
  await expect(page.getByRole('button',{name: 'Enable full access',exact: true})).toBeDisabled(); await expect(page.locator('dialog b')).toHaveCount(0);
  await page.getByRole('button',{name: 'Cancel',exact: true}).click(); await expect(page.locator('dialog[open]')).toHaveCount(0);
});

test('full access closing retires a rejected result and restores focus without granting access',async ({page}) => {
  await openAccess(page,false,{title: 'Original target'},'light',false); await page.getByRole('button',{name: 'Enable full access',exact: true}).click();
  await page.keyboard.press('Escape'); await expect(page.locator('#access-opener')).toBeFocused();
  await page.evaluate(() => {const h = window.accessPartsHarness; h.releases[0]!({ok: false,error: 'Late denial'}); h.editor.update({error: 'Late snapshot'}); h.editor.destroy(); h.editor.destroy();});
  expect(await page.evaluate(() => ({calls: window.accessPartsHarness.calls,closed: window.accessPartsHarness.closed,open: window.accessPartsHarness.editor.isOpen()}))).toEqual({calls: 1,closed: 1,open: false});
  await expect(page.locator('dialog')).toHaveCount(0);
});
