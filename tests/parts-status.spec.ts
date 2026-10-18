import {test, expect} from '@playwright/test';

test.beforeEach(async ({page}) => {await page.goto('/tests/fixture.html');});

test('status accepts literal messages and finite state, with atomic rejected updates and shared disposal', async ({page}) => {
  const result = await page.evaluate(async () => {
    const statusPath = '/src/parts/status.ts', partsPath = '/src/parts/index.ts';
    const {createStatusPart} = await import(statusPath), {mountParts} = await import(partsPath);
    const rejects = (action: () => void) => {try {action(); return false;} catch {return true;}};
    const status = createStatusPart({message: '<b>literal</b>', tone: 'success'}), mount = document.body.appendChild(document.createElement('div')), tree = mountParts(mount, status);
    const node = mount.firstElementChild!;
    const rejected = [rejects(() => createStatusPart({message: 'bad', tone: 'warning'})), rejects(() => createStatusPart({message: 'bad', style: {color: 'red'}})),
      rejects(() => status.update({message: 'changed', hidden: 'yes'})), rejects(() => status.update({message: 'changed', tone: 'warning'}))];
    const retained = node.textContent; status.update({message: 'Hidden', hidden: true}); const hidden = (node as HTMLElement).hidden;
    status.update({message: 'Visible'}); const visible = !(node as HTMLElement).hidden && node.classList.length === 1;
    const leak = Object.values(status).some(value => value instanceof Node), literal = !node.querySelector('b');
    status.destroy(); tree.destroy(); status.update({message: 'Late'}); return {rejected, retained, hidden, visible, leak, literal, empty: !mount.firstChild};
  });
  expect(result).toEqual({rejected: [true, true, true, true], retained: '<b>literal</b>', hidden: true, visible: true, leak: false, literal: true, empty: true});
});

test('feature toolbar keeps direct owned actions and rejects unknown purposes before ownership changes', async ({page}) => {
  const result = await page.evaluate(async () => {
    const layoutPath = '/src/parts/layout.ts', partsPath = '/src/parts/index.ts';
    const {createToolbarPart} = await import(layoutPath), {createButtonPart, createStackPart, mountParts} = await import(partsPath);
    const action = createButtonPart({label: 'Sign in with provider', variant: 'secondary'});
    const rejects = (action: () => void) => {try {action(); return false;} catch {return true;}};
    const rejected = rejects(() => createToolbarPart({purpose: 'custom', label: 'Provider actions', children: [action]}));
    const toolbar = createToolbarPart({purpose: 'feature', label: 'Provider actions', children: [action]}), tools = createToolbarPart({purpose: 'tools', label: 'Tools', children: []});
    const mount = document.body.appendChild(document.createElement('div')), tree = mountParts(mount, createStackPart({children: [toolbar, tools]}));
    const node = mount.querySelector('.pui-feature-toolbar')!, button = node.firstElementChild!;
    toolbar.update({label: 'Renamed actions', hidden: true}); const hidden = (node as HTMLElement).hidden;
    toolbar.update({label: 'Renamed actions'}); const direct = node.firstElementChild === button && node.children.length === 1;
    const role = node.getAttribute('role'), label = node.getAttribute('aria-label'), toolsClass = mount.querySelector('.pui-toolbar')?.className;
    tree.destroy(); return {rejected, hidden, direct, role, label, toolsClass, empty: !mount.firstChild};
  });
  expect(result).toMatchObject({rejected: true, hidden: true, direct: true, role: 'group', label: 'Renamed actions', toolsClass: 'pui-toolbar', empty: true});
});
