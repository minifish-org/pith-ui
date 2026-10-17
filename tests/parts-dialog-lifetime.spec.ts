import {test,expect} from '@playwright/test';

test('parent-owned dialog disposal notifies once before descendants release private drafts',async ({page}) => {
  await page.goto('/tests/fixture.html');
  const value = await page.evaluate(async () => {
    const path = '/src/parts/index.ts'; const p = await import(path);
    const input = p.createInputPart({kind: 'password',value: 'private draft'}); const seen: string[] = [];
    const dialog = p.createDialogPart({title: 'Owned dialog',children: [input],onDispose() {seen.push(input.read());}});
    const root = p.createStackPart({children: [dialog]}),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,root);
    dialog.open(); tree.destroy(); dialog.destroy(); tree.destroy();
    return {seen,value: input.read(),connected: mount.querySelectorAll('dialog,input').length};
  });
  expect(value).toEqual({seen: ['private draft'],value: '',connected: 0});
});

test('a rejected dialog disposal callback preserves caller ownership and can still compose successfully',async ({page}) => {
  await page.goto('/tests/fixture.html');
  const value = await page.evaluate(async () => {
    const path = '/src/parts/index.ts'; const p = await import(path),input = p.createInputPart({value: 'Keep draft'});
    let rejected = false; try {p.createDialogPart({title: 'Invalid',children: [input],onDispose: 'invalid'});} catch {rejected = true;}
    const root = p.createStackPart({children: [input]}),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,root);
    const result = {rejected,value: input.read(),inputs: mount.querySelectorAll('input').length}; tree.destroy(); return result;
  });
  expect(value).toEqual({rejected: true,value: 'Keep draft',inputs: 1});
});
