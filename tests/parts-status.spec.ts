import {test, expect} from '@playwright/test';

test.beforeEach(async ({page}) => {await page.goto('/tests/fixture.html');});

test('status message tones match the retained settings result without caller identifiers', async ({page}) => {
  const result = await page.evaluate(async () => {
    const statusPath = '/src/parts/status.ts', partsPath = '/src/parts/index.ts', oldPath = '/src/forms/panels.ts';
    const {createStatusPart} = await import(statusPath), {mountParts} = await import(partsPath), {createSettingsPanel} = await import(oldPath);
    const old = createSettingsPanel({baseUrl: '', hasApiKey: false, ready: true}); document.body.append(old.element);
    const status = createStatusPart({message: ''}), mount = document.body.appendChild(document.createElement('div')), tree = mountParts(mount, status);
    const node = mount.firstElementChild!, oldNode = old.field('connection-test-result');
    const inspect = (element: Element) => {const style = getComputedStyle(element); return {tag: element.localName, role: element.getAttribute('role'), live: element.getAttribute('aria-live'), text: element.textContent,
      styles: ['display', 'color', 'font-size', 'font-weight', 'line-height', 'margin-top', 'margin-bottom', 'white-space', 'overflow-wrap'].map(key => style.getPropertyValue(key))};};
    const pairs = [];
    for (const value of [{message: '', tone: 'neutral'}, {message: 'Testing connection…', tone: 'neutral'}, {message: 'Connected', tone: 'success'}, {message: 'Try again\nUnavailable', tone: 'error'}]) {
      old.update({baseUrl: '', hasApiKey: false, ready: true, testResult: {message: value.message, ok: value.tone === 'neutral' ? undefined : value.tone === 'success'}});
      status.update(value); pairs.push({old: inspect(oldNode), current: inspect(node), sameNode: mount.firstElementChild === node, generatedId: node.hasAttribute('id')});
    }
    tree.destroy(); old.destroy(); return pairs;
  });
  for (const pair of result) {expect(pair.current).toEqual(pair.old); expect(pair.sameNode).toBe(true); expect(pair.generatedId).toBe(false);}
});

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
    const layoutPath = '/src/parts/layout.ts', partsPath = '/src/parts/index.ts', oldPath = '/src/forms/actions.ts';
    const {createToolbarPart} = await import(layoutPath), {createButtonPart, createStackPart, mountParts} = await import(partsPath), {createProviderActions} = await import(oldPath);
    const action = createButtonPart({label: 'Sign in with provider', variant: 'secondary'});
    const rejects = (action: () => void) => {try {action(); return false;} catch {return true;}};
    const rejected = rejects(() => createToolbarPart({purpose: 'custom', label: 'Provider actions', children: [action]}));
    const toolbar = createToolbarPart({purpose: 'feature', label: 'Provider actions', children: [action]}), tools = createToolbarPart({purpose: 'tools', label: 'Tools', children: []});
    const mount = document.body.appendChild(document.createElement('div')), tree = mountParts(mount, createStackPart({children: [toolbar, tools]}));
    const node = mount.querySelector('.pui-feature-toolbar')!, button = node.firstElementChild!;
    const old = createProviderActions({id: 'example', oauth: true, signedIn: false, custom: false}); document.body.append(old.element);
    const inspect = (element: Element) => {const style = getComputedStyle(element); return ['display', 'align-items', 'flex-wrap', 'gap', 'margin-top', 'margin-bottom'].map(key => style.getPropertyValue(key));};
    const before = inspect(old.element.firstElementChild!), after = inspect(node);
    toolbar.update({label: 'Renamed actions', hidden: true}); const hidden = (node as HTMLElement).hidden;
    toolbar.update({label: 'Renamed actions'}); const direct = node.firstElementChild === button && node.children.length === 1;
    const role = node.getAttribute('role'), label = node.getAttribute('aria-label'), toolsClass = mount.querySelector('.pui-toolbar')?.className;
    tree.destroy(); old.destroy(); return {rejected, before, after, hidden, direct, role, label, toolsClass, empty: !mount.firstChild};
  });
  expect(result).toMatchObject({rejected: true, hidden: true, direct: true, role: 'group', label: 'Renamed actions', toolsClass: 'pui-toolbar', empty: true}); expect(result.after).toEqual(result.before);
});
