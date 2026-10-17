import {test, expect} from '@playwright/test';

// Source contracts: 0.3.1 files/panels.ts + styles.css file-preview-*;
// content/conversation-view.ts + styles.css tool-group/tool-message/command-*.
// These examples compose the public small controls; no application scene is used.
test('a document preview retains source path spacing and small file actions', async ({page}) => {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const u = await import('../src/index.js');
    const body = u.createSlot({content: u.createDocument({format: 'markdown', text: '# Layout report\n\nThis is a simulated file preview.\n\n- Preserve positions\n- Preserve icons'})});
    const actions = u.createActions({align: 'end', children: [u.createButton({label: 'Open'}), u.createButton({label: 'Reveal'}), u.createCopyButton({label: 'Copy path', value: 'output/layout-report.md', onCopy: () => ({ok: true})})]});
    const content = u.createStack({context: 'flow', children: [u.createText({role: 'caption', text: 'output/layout-report.md'}), body, u.createSlot({hidden: true}), actions]});
    const dialog = u.createDialog({purpose: 'document', title: 'layout-report.md', eyebrow: 'File preview', content});
    const owner = u.mount(document.body, u.createText({text: 'Host'})); owner.attach(dialog); dialog.open();
  });
  const dialog = page.getByRole('dialog'), path = dialog.getByText('output/layout-report.md', {exact: true}), body = dialog.locator('.pui-document');
  await expect(path).toHaveCSS('font-size', '12px');
  const pathBox = (await path.boundingBox())!, bodyBox = (await body.boundingBox())!;
  expect(bodyBox.y - pathBox.y - pathBox.height).toBe(16);
  await expect(body).toHaveCSS('padding', '16px');
  await expect(body).toHaveCSS('border-radius', '8px');
  const actions = dialog.locator('.pui-dialog-body .pui-actions');
  expect((await actions.boundingBox())!.y - bodyBox.y - bodyBox.height).toBe(16);
  await expect(actions).toHaveCSS('gap', '8px');
  for (const label of ['Open', 'Reveal', 'Copy path']) {
    const button = dialog.getByRole('button', {name: label, exact: true});
    expect((await button.boundingBox())!.height).toBe(30);
    await expect(button).toHaveCSS('font-size', '12px');
    await expect(button).toHaveCSS('line-height', '18px');
    await expect(button).toHaveCSS('padding', '4px 8px');
    await expect(button).toHaveCSS('font-weight', '600');
  }
});

async function installTools(page: import('@playwright/test').Page) {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async () => {
    const u = await import('../src/index.js');
    const command = u.createText({role: 'code', text: 'printf "simulated layout check"'}), directory = u.createText({role: 'code', text: '/tmp/pith-review'}), output = u.createText({role: 'code', text: 'Fixture build ready\nAll layout checks passed.'});
    const commandGroup = u.createSlot({content: u.createStack({context: 'flow', children: [u.createText({role: 'caption', text: 'Command'}), command, u.createStack({context: 'flow', children: [u.createText({role: 'caption', text: 'Directory'}), directory]})]})});
    const body = u.createStack({context: 'flow', children: [commandGroup, u.createStack({context: 'flow', children: [u.createSlot({content: u.createText({role: 'caption', text: 'Output'})}), output]}), u.createSlot({hidden: true})]});
    const commandFold = u.createDisclosure({context: 'output', icon: 'terminal', title: 'Command', status: u.createSlot({content: u.createStatus({presentation: 'inline', label: 'Completed · Exit 0'})}), content: body, open: true});
    const ordinary = (title: string) => u.createDisclosure({context: 'output', icon: 'terminal', title, status: u.createSlot({content: u.createStatus({presentation: 'inline', label: 'done'})}), content: u.createStack({context: 'flow', children: [u.createSlot({hidden: true}), u.createStack({context: 'flow', children: [u.createSlot({hidden: true}), u.createText({role: 'code', text: 'Simulated file output'})]}), u.createSlot({hidden: true})]})});
    const list = u.createList({items: [{key: 'read', content: ordinary('read_file')}, {key: 'edit', content: ordinary('edit_file')}, {key: 'command', content: commandFold}]});
    const group = u.createDisclosure({context: 'inline', icon: 'terminal', title: 'Used tools', status: u.createActions({children: [u.createText({role: 'caption', text: '3 calls'}), u.createSlot({hidden: true}), u.createSlot({hidden: true})]}), content: list, open: true});
    const answer = u.createMessage({role: 'assistant', content: u.createMarkdown({text: 'The simulated tool outputs retain their original folds and layout.'})});
    const reader = u.createReadingArea({label: 'Source reading', identity: 'tools', column: 'reading', items: [{key: 'group', revision: '1', content: group}, {key: 'answer', revision: '1', content: answer}]});
    const owner = u.mount(document.body, reader); Reflect.set(window, 'sourceTools', {owner, group, commandFold, command, directory, output, reader, answer});
  });
}

test('tool groups keep source flex summaries, bounded glyphs, card gaps and reading rhythm', async ({page}) => {
  await installTools(page);
  const group = page.locator('.pui-disclosure-inline'), summary = group.locator(':scope > summary'), folds = group.locator('.pui-disclosure-output');
  await expect(summary).toHaveCSS('display', 'flex');
  await expect(summary).toHaveCSS('list-style-type', 'none');
  await expect(summary).toHaveCSS('gap', '8px');
  await expect(group).toHaveCSS('margin', '-8px 0px 16px');
  await expect(group).toHaveCSS('position', 'static');
  const chevron = summary.locator('.pui-disclosure-chevron');
  await expect(chevron).toBeVisible();
  await expect(chevron).toHaveCSS('width', '12px');
  await expect(chevron.locator('path')).toHaveAttribute('d', 'm6 9 6 6 6-6');
  expect((await summary.boundingBox())!.height).toBe(37);
  expect((await folds.nth(1).boundingBox())!.y - (await folds.nth(0).boundingBox())!.y - (await folds.nth(0).boundingBox())!.height).toBe(8);
  expect((await folds.nth(0).boundingBox())!.height).toBe(44);
  for (const fold of await folds.all()) {
    const header = fold.locator(':scope > summary');
    expect((await header.boundingBox())!.height).toBe(42);
    await expect(header.locator('.pui-disclosure-chevron')).toHaveCSS('width', '10px');
    await expect(header.locator('.pui-disclosure-chevron path')).toHaveAttribute('d', 'm6 9 6 6 6-6');
    await expect(header.locator('.pui-status')).toHaveCSS('color', 'rgb(93, 103, 122)');
  }
  const answer = page.getByRole('article', {name: 'Agent response'});
  await expect(page.locator('.pui-reading-column')).toHaveCSS('gap', '0px');
  await expect(answer).toHaveCSS('margin-bottom', '24px');
  expect((await answer.boundingBox())!.y - (await group.boundingBox())!.y - (await group.boundingBox())!.height).toBe(16);
});

test('command fields and output retain source separators, typography and nested flow', async ({page}) => {
  await installTools(page);
  const fold = page.locator('.pui-disclosure-output').last(), content = fold.locator(':scope > .pui-disclosure-content');
  await expect(content).toHaveCSS('padding', '0px');
  const command = fold.getByText('printf "simulated layout check"', {exact: true}), directory = fold.getByText('/tmp/pith-review', {exact: true}), output = fold.getByText('Fixture build ready\nAll layout checks passed.', {exact: true});
  for (const text of [command, directory, output]) {
    await expect(text).toHaveCSS('font-size', '12px');
    await expect(text).toHaveCSS('line-height', '18px');
  }
  await expect(command).toHaveCSS('color', 'rgb(31, 37, 48)');
  for (const text of [directory, output]) await expect(text).toHaveCSS('color', 'rgb(93, 103, 122)');
  const commandGroup = content.locator(':scope > .pui-stack-flow > .pui-slot').first();
  await expect(commandGroup).toHaveCSS('border-top-width', '1px');
  await expect(commandGroup).toHaveCSS('padding', '12px');
  const outputGroup = content.locator(':scope > .pui-stack-flow > .pui-stack-flow');
  await expect(outputGroup).toHaveCSS('border-top-width', '1px');
  await expect(output).toHaveCSS('padding', '12px');
  expect((await fold.boundingBox())!.height).toBe(256);
  const commandLabel = commandGroup.getByText('Command', {exact: true}), directoryLabel = commandGroup.getByText('Directory', {exact: true}), outputLabel = outputGroup.getByText('Output', {exact: true});
  expect((await command.boundingBox())!.y - (await commandLabel.boundingBox())!.y - (await commandLabel.boundingBox())!.height).toBe(8);
  expect((await directoryLabel.boundingBox())!.y - (await command.boundingBox())!.y - (await command.boundingBox())!.height).toBe(12);
  expect((await directory.boundingBox())!.y - (await directoryLabel.boundingBox())!.y - (await directoryLabel.boundingBox())!.height).toBe(8);
  expect((await outputLabel.boundingBox())!.y - (await outputGroup.boundingBox())!.y).toBe(9);
  await page.evaluate(() => {const text = document.querySelectorAll('.pui-disclosure-output pre')[2]!, range = document.createRange(); range.selectNodeContents(text); getSelection()!.removeAllRanges(); getSelection()!.addRange(range); const state = Reflect.get(window, 'sourceTools'); state.commandFold.update({title: 'Command complete'}); state.group.update({title: 'Used tools'});});
  expect(await page.evaluate(() => getSelection()!.toString())).toBe('printf "simulated layout check"');
  await expect(fold).toHaveAttribute('open', '');
  await page.evaluate(() => Reflect.get(window, 'sourceTools').owner.destroy());
  await expect(page.locator('.pui-reading-area')).toHaveCount(0);
});

test('the source reading column keeps the narrow message rhythm without changing ordinary controls', async ({page}) => {
  await page.setViewportSize({width: 640, height: 800});
  await installTools(page);
  await expect(page.locator('.pui-reading-column')).toHaveCSS('gap', '0px');
  await expect(page.getByRole('article', {name: 'Agent response'})).toHaveCSS('margin-bottom', '16px');
  await expect(page.locator('.pui-disclosure-inline > summary')).toHaveCSS('flex-wrap', 'wrap');
  await page.evaluate(async () => {
    const u = await import('../src/index.js');
    const host = document.createElement('div'); document.body.append(host);
    u.mount(host, u.createReadingArea({label: 'Ordinary reading', identity: 'ordinary', items: [{key: 'frame', revision: '1', content: u.createMessage({role: 'assistant', content: u.createText({text: 'Independent frame'})})}]}));
  });
  const ordinary = page.getByRole('region', {name: 'Ordinary reading'});
  await expect(ordinary.locator('.pui-control-list')).toHaveCSS('gap', '12px');
  await expect(ordinary.getByRole('article', {name: 'Agent response'})).toHaveCSS('margin-bottom', '0px');
});
