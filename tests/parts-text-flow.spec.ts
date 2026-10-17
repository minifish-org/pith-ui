import {test, expect} from '@playwright/test';

test.beforeEach(async ({page}) => {await page.goto('/tests/fixture.html');});

test('literal and emphasized flow uses real text and strong nodes without markup or span wrappers', async ({page}) => {
  await page.evaluate(async () => {
    const path = '/src/parts/text-flow.ts', partsPath = '/src/parts/index.ts';
    const {createTextFlowPart} = await import(path), {mountParts} = await import(partsPath);
    const flow = createTextFlowPart({role: 'description', segments: [
      {text: 'Delete '}, {text: '<img src=x onerror=alert(1)> 中文', emphasis: 'strong'}, {text: ' and its history?'},
    ]});
    const mount = document.createElement('div'); mount.id = 'flow-mount'; document.body.append(mount); mountParts(mount, flow);
  });
  const paragraph = page.locator('#flow-mount > p');
  await expect(paragraph).toHaveAttribute('class', 'pui-modal-description');
  await expect(paragraph).toHaveText('Delete <img src=x onerror=alert(1)> 中文 and its history?');
  await expect(paragraph.locator('strong')).toHaveText('<img src=x onerror=alert(1)> 中文');
  await expect(paragraph.locator('span, img, script')).toHaveCount(0);
  expect(await paragraph.evaluate(node => [...node.childNodes].map(child => child.nodeName))).toEqual(['#text', 'STRONG', '#text']);
});

test('flow updates retain unchanged text nodes, selection and semantic emphasis', async ({page}) => {
  const retained = await page.evaluate(async () => {
    const path = '/src/parts/text-flow.ts', partsPath = '/src/parts/index.ts';
    const {createTextFlowPart} = await import(path), {mountParts} = await import(partsPath);
    const flow = createTextFlowPart({segments: [{text: 'Unchanged selected prefix '}, {text: 'Subject', emphasis: 'strong'}, {text: ' old suffix'}]});
    const mount = document.createElement('div'); document.body.append(mount); const tree = mountParts(mount, flow);
    const paragraph = mount.firstElementChild!, prefix = paragraph.firstChild!, strong = paragraph.querySelector('strong')!, subject = strong.firstChild!;
    const selection = document.getSelection()!, range = document.createRange(); range.setStart(prefix, 2); range.setEnd(prefix, 11); selection.removeAllRanges(); selection.addRange(range);
    flow.update({segments: [{text: 'Unchanged selected prefix '}, {text: 'Subject', emphasis: 'strong'}, {text: ' old suffix appended'}]});
    const result = {prefix: prefix === paragraph.firstChild, strong: strong === paragraph.querySelector('strong'), subject: subject === strong.firstChild,
      selected: selection.toString(), offsets: [selection.anchorOffset, selection.focusOffset], text: paragraph.textContent};
    tree.destroy(); return result;
  });
  expect(retained).toEqual({prefix: true, strong: true, subject: true, selected: 'changed s', offsets: [2, 11], text: 'Unchanged selected prefix Subject old suffix appended'});
});

test('each flow role and the muted paragraph remain finite library text presentations', async ({page}) => {
  const nodes = await page.evaluate(async () => {
    const path = '/src/parts/text-flow.ts', partsPath = '/src/parts/index.ts';
    const {createTextFlowPart} = await import(path), {createTextPart, createStackPart, mountParts} = await import(partsPath);
    const mount = document.createElement('div'); document.body.append(mount);
    const children = ['paragraph', 'description', 'hint'].map(role => createTextFlowPart({role, segments: [{text: role}]}));
    children.push(createTextPart({role: 'muted-paragraph', text: 'note'}));
    const tree = mountParts(mount, createStackPart({children}));
    const result = [...mount.firstElementChild!.children].map(node => ({tag: node.tagName, className: node.className, text: node.textContent})); tree.destroy(); return result;
  });
  expect(nodes).toEqual([
    {tag: 'P', className: '', text: 'paragraph'}, {tag: 'P', className: 'pui-modal-description', text: 'description'},
    {tag: 'P', className: 'pui-field-hint', text: 'hint'}, {tag: 'P', className: 'pui-muted', text: 'note'},
  ]);
});

test('invalid flow state rejects atomically; destroying the flow releases its mounted scope', async ({page}) => {
  const result = await page.evaluate(async () => {
    const path = '/src/parts/text-flow.ts', partsPath = '/src/parts/index.ts';
    const {createTextFlowPart} = await import(path), {mountParts, createTextPart} = await import(partsPath);
    const reject = (action: () => void) => {try {action(); return false;} catch {return true;}};
    const rejected = [
      reject(() => createTextFlowPart({segments: [{text: 'Unsafe', emphasis: 'arbitrary'}]})),
      reject(() => createTextFlowPart({segments: [{text: document.body}]})),
      reject(() => createTextFlowPart({segments: [], style: {color: 'red'}})),
    ];
    const flow = createTextFlowPart({segments: [{text: 'Kept'}]}); const mount = document.createElement('div'); const tree = mountParts(mount, flow);
    rejected.push(reject(() => flow.update({segments: [{text: 'Changed'}, {html: '<b>unsafe</b>'}]})));
    const unchanged = mount.textContent === 'Kept'; flow.destroy(); flow.destroy(); tree.destroy();
    const next = mountParts(mount, createTextPart({text: 'Next'})); next.destroy();
    return {rejected, unchanged, released: mount.childElementCount === 0 && !mount.classList.contains('pui')};
  });
  expect(result).toEqual({rejected: [true, true, true, true], unchanged: true, released: true});
});
