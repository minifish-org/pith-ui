import {test,expect} from '@playwright/test';

test('rename composes below one appearance owner and parent disposal retires its pending write',async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const path = '/src/parts/index.ts',recipe = '/examples/assemblies/rename.ts'; const p = await import(path),r = await import(recipe);
    let release: ((result: {ok: false;error: string}) => void) | undefined,closed = 0;
    const editor = r.composeRename({id: 'a',title: 'Shared original'},{onSubmit() {return new Promise(resolve => {release = resolve;});},onClose() {closed++;}});
    editor.open(); if (document.querySelector('dialog')) throw new Error('An unmounted recipe must not append itself.');
    const root = p.createStackPart({children: [editor.part]}),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,root,{appearance: 'light'});
    editor.open(); (window as unknown as {sharedNavigation: unknown}).sharedNavigation = {editor,tree,mount,get release() {return release;},get closed() {return closed;}};
  });
  const input = page.getByRole('textbox',{name: 'Title',exact: true}); await input.fill('Shared live draft');
  await input.evaluate(element => {const node = element as HTMLInputElement; node.setSelectionRange(2,8); (window as unknown as {sharedInput: Element}).sharedInput = node;});
  const value = await page.evaluate(async () => {
    const h = (window as unknown as {sharedNavigation: {editor: {read(): unknown;update(value: unknown): void;reset(value: unknown): void;destroy(): void;isOpen(): boolean};tree: {setAppearance(value: string): void;destroy(): void};mount: HTMLElement;release(result: unknown): void;closed: number}}).sharedNavigation;
    const input = h.mount.querySelector('input')!; h.tree.setAppearance('dark');
    const themed = {color: getComputedStyle(h.mount.querySelector('dialog')!).backgroundColor,same: input === (window as unknown as {sharedInput: Element}).sharedInput,focus: input === document.activeElement,selection: [input.selectionStart,input.selectionEnd],direct: h.mount.querySelector('div')?.firstElementChild?.localName,scopes: h.mount.querySelectorAll('[data-appearance]').length};
    h.mount.querySelector<HTMLButtonElement>('button[type=submit]')!.click(); h.tree.destroy();
    h.release({ok: false,error: 'Retired failure'}); h.editor.update({id: 'late',title: 'Late'}); h.editor.reset({id: 'late',title: 'Late'}); h.editor.destroy(); await new Promise(resolve => setTimeout(resolve,0));
    return {themed,draft: h.editor.read(),closed: h.closed,open: h.editor.isOpen(),children: h.mount.childElementCount};
  });
  expect(value).toEqual({themed: {color: 'rgb(34, 37, 42)',same: true,focus: true,selection: [2,8],direct: 'dialog',scopes: 0},draft: {id: 'a',title: 'Shared live draft'},closed: 1,open: false,children: 0});
});

test('full access composes without a nested theme scope and shared disposal retires outcomes once',async ({page}) => {
  await page.goto('/tests/fixture.html');
  const value = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',recipe = '/examples/assemblies/full-access.ts'; const p = await import(path),r = await import(recipe);
    let release: ((result: {ok: false;error: string}) => void) | undefined,closed = 0;
    const editor = r.composeFullAccess({title: 'Shared target'},{onConfirm() {return new Promise(resolve => {release = resolve;});},onClose() {closed++;}});
    const root = p.createStackPart({children: [editor.part]}),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,root,{appearance: 'light'});
    editor.open(); const target = [...mount.querySelectorAll('strong')].find(node => node.textContent === 'Shared target')!;
    tree.setAppearance('dark'); const themed = {color: getComputedStyle(mount.querySelector('dialog')!).backgroundColor,retained: target.isConnected,scopes: mount.querySelectorAll('[data-appearance]').length};
    mount.querySelector<HTMLButtonElement>('.pui-warning-button')!.click(); tree.destroy();
    release!({ok: false,error: 'Retired failure'}); editor.update({error: 'Late snapshot'}); editor.destroy(); await new Promise(resolve => setTimeout(resolve,0));
    return {themed,closed,open: editor.isOpen(),children: mount.childElementCount};
  });
  expect(value).toEqual({themed: {color: 'rgb(34, 37, 42)',retained: true,scopes: 0},closed: 1,open: false,children: 0});
});

test('unopened navigation compositions release silently when the parent is destroyed',async ({page}) => {
  await page.goto('/tests/fixture.html');
  const value = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',rename = '/examples/assemblies/rename.ts',access = '/examples/assemblies/full-access.ts'; const p = await import(path),r = await import(rename),a = await import(access); let closed = 0;
    const first = r.composeRename({id: 'a',title: 'Draft'},{onClose() {closed++;}}),second = a.composeFullAccess({},{onConfirm() {return {ok: true};},onClose() {closed++;}});
    const root = p.createStackPart({children: [first.part,second.part]}); root.destroy(); first.destroy(); second.destroy(); first.open(); second.open();
    return {closed,dialogs: document.querySelectorAll('dialog').length,open: first.isOpen() || second.isOpen()};
  });
  expect(value).toEqual({closed: 0,dialogs: 0,open: false});
});
