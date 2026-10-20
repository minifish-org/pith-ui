import {test,expect} from '@playwright/test';

test('keyboard-sized visual viewport keeps input, approval scrolling, drawer and dialog usable',async ({page}) => {
  await page.setViewportSize({width: 390,height: 844});await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async () => {
    const path = '/tests/recipes-fixture.ts', {parts: p, recipes: r} = await import(path);
    const viewport = Object.assign(new EventTarget(),{height: 844,width: 390,scale: 1,pageTop: 0,offsetTop: 0});
    Object.defineProperty(window,'visualViewport',{configurable: true,value: viewport});
    const composer = r.composeComposer({}),approval = r.composeApproval({approval: {id: 'review',toolName: 'write_file',canAlwaysAllow: true,argsText: 'arguments\n'.repeat(100),preview: {kind: 'create',path: '/srv/work/report.txt',diff: '+added line\n'.repeat(150)}}});
    composer.panels.replace([approval.part]);composer.resetDraft('Unsent text survives the keyboard');
    const dialog = p.createDialogPart({title: 'Small screen settings',children: [p.createInputPart({label: 'Endpoint',value: 'https://example.test'}),p.createTextPart({text: 'Settings content\n'.repeat(200)})]});
    const frame = r.composeFrame({navigation: {groups: [],empty: 'workspaces'}},{},{main: [composer.part],dialogs: [dialog]});
    const mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,frame.part);
    const tick = () => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    await tick();
    const input = mount.querySelector('textarea')!;input.focus();input.setSelectionRange(2,10);
    viewport.height = 330;viewport.offsetTop = 24;viewport.pageTop = 24;viewport.dispatchEvent(new Event('resize'));await tick();
    const root = mount.firstElementChild!.getBoundingClientRect(),field = input.getBoundingClientRect(),panels = mount.querySelector<HTMLElement>('.pui-composer-panels')!;
    panels.scrollTop = panels.scrollHeight;const scrolled = panels.scrollTop > 0;
    frame.setSidebarOpen(true);await tick();const rail = mount.querySelector('aside')!.getBoundingClientRect();frame.setSidebarOpen(false);
    dialog.open();await tick();const modal = mount.querySelector('dialog')!.getBoundingClientRect();dialog.close();
    const value = {root: {top: root.top,bottom: root.bottom},input: {top: field.top,bottom: field.bottom},scrolled,rail: {top: rail.top,bottom: rail.bottom},modal: {top: modal.top,bottom: modal.bottom},text: input.value,selection: [input.selectionStart,input.selectionEnd]};
    viewport.scale = 2;viewport.height = 180;viewport.dispatchEvent(new Event('resize'));await tick();
    const zoomHeight = mount.firstElementChild!.getBoundingClientRect().height;
    tree.destroy();viewport.dispatchEvent(new Event('resize'));return {...value,zoomHeight,empty: !mount.firstChild};
  });
  expect(result.root).toEqual({top: 24,bottom: 354});expect(result.input.top).toBeGreaterThanOrEqual(24);expect(result.input.bottom).toBeLessThanOrEqual(354);
  expect(result.scrolled).toBe(true);expect(result.rail).toEqual({top: 24,bottom: 354});
  expect(result.modal.top).toBeGreaterThanOrEqual(24);expect(result.modal.bottom).toBeLessThanOrEqual(354);
  expect(result.text).toBe('Unsent text survives the keyboard');expect(result.selection).toEqual([2,10]);expect(result.zoomHeight).toBe(844);expect(result.empty).toBe(true);
});
