import {test,expect,type Page} from '@playwright/test';

interface Approval {id: string;toolName: string;warning?: string;canAlwaysAllow: boolean;argsText: string;preview?: {kind: string;path: string;error?: string;diff?: string;truncated?: boolean}}
interface State {approval: Approval|null;disabled?: boolean}
interface Harness {session: {update(state: State): void;destroy(): void};initial: State;region: HTMLElement;actions: Array<{id: string;action: string}>;argsBody?: HTMLElement;argsPre?: HTMLElement;oldAction?: HTMLButtonElement;shared?: {setAppearance(value: 'light'|'dark'): void;destroy(): void}}
declare global {interface Window {approvalPartsHarness: Harness}}
const args: Approval = {id: 'approval-a',toolName: 'run_command',warning: 'This command uses your normal computer permissions.',canAlwaysAllow: false,argsText: '{\n  "command": "git status --short"\n}'};
const file: Approval = {id: 'approval-a',toolName: 'edit_file',canAlwaysAllow: true,argsText: '{\n  "path": "README.md",\n  "replacement": "New text"\n}',preview: {kind: 'edit',path: 'docs/README.md',diff: '--- before\n+++ after\n@@ -1 +1 @@\n-Old text\n+New text'}};

async function openApproval(page: Page,old: boolean,state: State = {approval: file},appearance: 'light'|'dark' = 'light'): Promise<void> {
  await page.goto('/tests/fixture.html');await page.evaluate(async ({old,state,appearance}) => {
    document.body.dataset.appearance = appearance;const mount = document.body.appendChild(document.createElement('div')),h = {initial: state,actions: []} as unknown as Harness;
    const callbacks = {onAction(id: string,action: string) {h.actions.push({id,action});}};
    const appPath = '/src/app/index.ts',{createApplication} = await import(appPath),app = createApplication(mount,{appearance,workspace: {onApproval: callbacks.onAction}});app.workspace.updateApproval(state);
    if (old) {h.session = {update: app.workspace.updateApproval,destroy: app.destroy};h.region = mount.querySelector('[id$="approval"]')!;}
    else {
      const clone = mount.firstElementChild!.cloneNode(true);app.destroy();mount.replaceChildren(clone);
      const oldRegion = mount.querySelector('[id$="approval"]')!,parent = oldRegion.parentElement!,siblings = [...parent.childNodes],position = siblings.indexOf(oldRegion);
      const recipePath = '/examples/assemblies/approval.ts',partsPath = '/src/parts/index.ts',{composeApproval} = await import(recipePath),p = await import(partsPath),session = composeApproval(state,callbacks);
      h.session = session;h.shared = p.mountParts(parent,session.part,{appearance});parent.prepend(...siblings.slice(0,position));parent.append(...siblings.slice(position+1));h.region = parent.firstElementChild as HTMLElement;
    }
    window.approvalPartsHarness = h;
  },{old,state,appearance});
}

async function presentation(page: Page): Promise<unknown> {
  return page.evaluate(async () => {
    await document.fonts.ready;for (const animation of document.getAnimations()) if (animation.effect?.getTiming().iterations !== Infinity) animation.finish();
    const region = window.approvalPartsHarness.region,origin = region.getBoundingClientRect();
    const inspect = (node: Element) => {const box = node.getBoundingClientRect(),style = getComputedStyle(node);return {tag: node.localName,text: [...node.childNodes].filter(child => child.nodeType === Node.TEXT_NODE).map(child => child.textContent).join('').trim(),role: node.getAttribute('role'),label: node.getAttribute('aria-label'),
      box: [box.x-origin.x,box.y-origin.y,box.width,box.height].map(value => Math.round(value*100)/100),styles: ['display','font-family','font-size','font-weight','line-height','color','background-color','border-top-width','border-top-color','border-radius','padding-top','padding-right','padding-bottom','padding-left','margin-top','margin-right','margin-bottom','margin-left','gap','align-items','justify-content','flex-wrap','white-space','overflow-wrap','overflow-x','overflow-y','max-width','max-height','opacity'].map(key => style.getPropertyValue(key)),
      ...(node instanceof HTMLButtonElement ? {disabled: node.disabled,type: node.type} : {}),...(node instanceof HTMLDetailsElement ? {open: node.open} : {})};};
    return {region: inspect(region),nodes: [...region.querySelectorAll('section,div,p,strong,span,code,pre,details,summary,button,svg')].filter(node => !node.closest('[hidden]')).map(inspect),svg: [...region.querySelectorAll('svg')].map(node => node.innerHTML)};
  });
}

test('small review parts compose literal headings, code badges, locations, feedback and actions with no DOM escape',async ({page}) => {
  await page.goto('/tests/fixture.html');const value = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path),badge = p.createBadgePart({purpose: 'code',text: 'write_file'});
    const heading = p.createCalloutHeadingPart({children: [p.createIconPart({name: 'shield'}),p.createStackPart({children: [p.createTextPart({role: 'strong',text: 'Permission required'}),p.createTextPart({text: 'Review this action.'})]}),badge]});
    const warning = p.createTextPart({role: 'warning-paragraph',text: 'Literal <warning>'}),scope = p.createTextPart({role: 'scope-note',text: 'Workspace scope'}),location = p.createCodePropertyPart({purpose: 'location',label: 'Modify file',value: 'docs/a.md'}),feedback = p.createFeedbackPart({presentation: 'note',message: 'Preview unavailable',tone: 'info'});
    const actions = p.createCalloutActionsPart({children: [p.createButtonPart({label: 'Deny',variant: 'secondary'}),p.createButtonPart({label: 'Always allow',variant: 'caution'}),p.createButtonPart({label: 'Allow',variant: 'primary',icon: 'check'})]});
    const root = p.createCalloutPart({tone: 'warning',label: 'Review required',children: [heading,warning,location,feedback,scope,actions]}),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,root),reference = mount.querySelector('code')!,status = mount.querySelector('[role=status]')!;
    const result = {heading: mount.querySelector('.pui-approval-heading')!.localName,badge: mount.querySelector('.pui-approval-badge')!.localName,location: [reference.parentElement!.localName,reference.previousElementSibling!.localName,reference.localName],status: status.localName,scope: mount.querySelector('.pui-approval-scope')!.textContent,buttons: [...mount.querySelectorAll('.pui-approval-actions > button')].map(node => node.textContent),literal: mount.querySelector('.pui-approval-warning')!.textContent,leaks: [root,heading,badge,warning,scope,location,feedback,actions].some(part => Object.values(part).some(value => value instanceof Node))};tree.destroy();return result;
  });expect(value).toEqual({heading: 'div',badge: 'span',location: ['div','strong','code'],status: 'p',scope: 'Workspace scope',buttons: ['Deny','Always allow','Allow'],literal: 'Literal <warning>',leaks: false});
});

test('a folding part owns one unchanged native body, validates atomically and preserves selection without moving that body',async ({page}) => {
  await page.goto('/tests/fixture.html');const value = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path),rejects = (action: () => unknown) => {try {action();return false;} catch {return true;}};
    const body = p.createStackPart({children: [p.createPreformattedPart({text: 'Alpha body text\nSecond line'})]}),badConstructor = rejects(() => p.createFoldingPart({title: 'Invalid',body,collapsible: 'invalid'}));
    const fold = p.createFoldingPart({purpose: 'review',title: 'Tool arguments',body,collapsible: true,open: true}),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,p.createStackPart({children: [fold]})),details = mount.querySelector('details')!,node = details.querySelector('div')!,pre = node.querySelector('pre')!;
    const range = document.createRange();range.setStart(pre.firstChild!,2);range.setEnd(pre.firstChild!,9);const selection = getSelection()!;selection.removeAllRanges();selection.addRange(range);const selected = selection.toString(),before = mount.innerHTML;
    const badUpdates = [rejects(() => fold.update({title: 'Changed',collapsible: 'invalid'})),rejects(() => fold.update({title: 'Changed',collapsible: true,style: {padding: 50}}))],unchanged = mount.innerHTML === before;
    fold.update({title: 'Updated arguments',collapsible: true});const metadataSelection = selection.toString();fold.update({title: 'Updated arguments',collapsible: false});const flat = mount.firstElementChild!.firstElementChild === node,flatSelection = selection.toString();fold.update({title: 'Updated arguments',collapsible: true});
    const result = {badConstructor,badUpdates,unchanged,selected,metadataSelection,flat,flatSelection,sameBody: mount.querySelector('details > div') === node,samePre: mount.querySelector('pre') === pre,open: fold.isOpen()};tree.destroy();return result;
  });expect(value).toEqual({badConstructor: true,badUpdates: [true,true],unchanged: true,selected: 'pha bod',metadataSelection: 'pha bod',flat: true,flatSelection: '',sameBody: true,samePre: true,open: true});
});

test('empty stack teardown is terminal, precedes child disposal and body destruction retires its folding owner',async ({page}) => {
  await page.goto('/tests/fixture.html');const value = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path),rejects = (action: () => unknown) => {try {action();return false;} catch {return true;}};
    const secret = p.createInputPart({label: 'Secret',kind: 'password',value: 'Before disposal'}),bad = rejects(() => p.createStackPart({children: [secret],onDispose: 'invalid'}));let count = 0,inside = '';
    const root = p.createStackPart({children: [secret],onDispose() {count++;inside = secret.read();}}),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,root);tree.destroy();root.destroy();
    const body = p.createStackPart({children: [p.createTextPart({text: 'Body'})]}),fold = p.createFoldingPart({title: 'Details',body,collapsible: true}),foldMount = document.body.appendChild(document.createElement('div')),foldTree = p.mountParts(foldMount,p.createStackPart({children: [fold]}));
    body.destroy();fold.update({title: 'Late',collapsible: true});fold.setOpen(true);const retired = !foldMount.querySelector('details');foldTree.destroy();
    let emptyCount = 0;const empty = p.createStackPart({children: [],onDispose() {emptyCount++;}}),emptyMount = document.body.appendChild(document.createElement('div')),emptyTree = p.mountParts(emptyMount,empty);emptyTree.destroy();empty.destroy();return {bad,count,inside,after: secret.read(),retired,open: fold.isOpen(),emptyCount};
  });expect(value).toEqual({bad: true,count: 1,inside: 'Before disposal',after: '',retired: true,open: false,emptyCount: 1});
});

const states: Record<string,State> = {none: {approval: null},arguments: {approval: args},create: {approval: {...file,toolName: 'write_file',preview: {...file.preview!,kind: 'create'}}},modify: {approval: file},warning: {approval: {...file,warning: 'Review workspace file changes carefully.'}},previewError: {approval: {...file,preview: {...file.preview!,error: 'Preview could not be loaded.'}}},emptyDiff: {approval: {...file,preview: {...file.preview!,diff: ''}}},shortened: {approval: {...file,preview: {...file.preview!,truncated: true}}},disabled: {approval: file,disabled: true},literal: {approval: {...args,toolName: '<tool>',warning: '<img src=x onerror=alert(1)>',argsText: '{"literal":"<script>"}'}},long: {approval: {...file,toolName: 'long_tool_identifier_'.repeat(8),warning: 'This action may modify files. '.repeat(8),preview: {...file.preview!,path: 'long-directory-name/'.repeat(14)+'file.md'}}}};
for (const appearance of ['light','dark'] as const) for (const [name,state] of Object.entries(states)) test(`${appearance} approval ${name} retains the actual workspace review`,async ({page}) => {
  await page.emulateMedia({colorScheme: appearance === 'dark' ? 'light' : 'dark'});await openApproval(page,true,state,appearance);const old = await presentation(page);await openApproval(page,false,state,appearance);expect(await presentation(page)).toEqual(old);
});
for (const viewport of [{width: 390,height: 844},{width: 900,height: 568}]) test(`approval ${viewport.width} preserves warning, file paths and action wrapping`,async ({page}) => {
  await page.setViewportSize(viewport);await openApproval(page,true,states.long);const old = await presentation(page);await openApproval(page,false,states.long);expect(await presentation(page)).toEqual(old);
});

test('review arguments are lazy, while a fresh preview error opens them and plain arguments render immediately',async ({page}) => {
  await openApproval(page,false);await expect(page.locator('.pui-approval-arguments')).not.toHaveAttribute('open');await expect(page.locator('.pui-approval-arguments pre')).toHaveCount(0);await page.getByText('Tool arguments',{exact: true}).click();await expect(page.locator('.pui-approval-arguments pre')).toHaveText(file.argsText);
  await page.getByText('Tool arguments',{exact: true}).click();await page.evaluate(state => window.approvalPartsHarness.session.update(state),states.previewError);await expect(page.locator('.pui-approval-arguments')).not.toHaveAttribute('open');
  await page.evaluate(state => window.approvalPartsHarness.session.update(state),{approval: {...states.previewError.approval!,id: 'new-error'}});await expect(page.locator('.pui-approval-arguments')).toHaveAttribute('open','');await expect(page.locator('.pui-approval-arguments pre')).toHaveText(file.argsText);
  await page.evaluate(state => window.approvalPartsHarness.session.update(state),{approval: {...args,id: 'plain'}});await expect(page.locator('.pui-approval-arguments')).toHaveCount(0);await expect(page.locator('.pui-approval-card > div > .pui-file-preview-text')).toHaveText(args.argsText);
});

for (const old of [true,false]) test(`${old ? 'actual old' : 'parts'} same-id reviews retain pages/body and metadata selection, with native selection reset when reparented`,async ({page}) => {
  await openApproval(page,old);await page.evaluate(() => {const h = window.approvalPartsHarness,a = h.initial.approval!;h.initial = {approval: {...a,argsText: 'Argument🙂 payload record with Unicode and a complete line.\n'.repeat(14000),preview: {...a.preview!,diff: '+Diff🙂 payload record with Unicode and a complete line.\n'.repeat(14000)}}};h.session.update(h.initial);});
  const diff = page.locator('.pui-approval-diff').locator('..');await diff.getByRole('button',{name: 'Next',exact: true}).click();await page.getByText('Tool arguments',{exact: true}).click();const review = page.locator('.pui-approval-arguments');await review.getByRole('button',{name: 'Next',exact: true}).click();
  const before = await review.evaluate(node => {const h = window.approvalPartsHarness;h.argsBody = node.querySelector('div')!;h.argsPre = node.querySelector('pre')!;const text = h.argsPre.firstChild!,range = document.createRange();range.setStart(text,2);range.setEnd(text,12);getSelection()!.removeAllRanges();getSelection()!.addRange(range);return {selection: getSelection()!.toString(),page: node.querySelector('[aria-live]')!.textContent};});
  await page.evaluate(() => {const h = window.approvalPartsHarness;h.session.update({approval: {...h.initial.approval!,warning: 'Metadata changed'},disabled: true});});expect(await review.evaluate(node => ({sameBody: node.querySelector('div') === window.approvalPartsHarness.argsBody,samePre: node.querySelector('pre') === window.approvalPartsHarness.argsPre,selection: getSelection()!.toString(),page: node.querySelector('[aria-live]')!.textContent}))).toEqual({sameBody: true,samePre: true,...before});
  await expect(review.getByRole('button',{name: 'Next',exact: true})).toBeEnabled();
  await page.evaluate(() => {const h = window.approvalPartsHarness;h.session.update({approval: {...h.initial.approval!,preview: undefined}});});expect(await page.evaluate(() => {const h = window.approvalPartsHarness;return {samePre: h.region.querySelector('.pui-file-preview-text') === h.argsPre,flat: h.argsBody!.parentElement?.classList.contains('pui-approval-card'),selection: getSelection()!.toString(),page: h.argsBody!.querySelector('[aria-live]')!.textContent};})).toEqual({samePre: true,flat: true,selection: '',page: before.page});
  await page.evaluate(() => {const h = window.approvalPartsHarness;h.session.update(h.initial);});expect(await review.evaluate(node => ({sameBody: node.querySelector('div') === window.approvalPartsHarness.argsBody,samePre: node.querySelector('pre') === window.approvalPartsHarness.argsPre,page: node.querySelector('[aria-live]')!.textContent,open: (node as HTMLDetailsElement).open}))).toEqual({sameBody: true,samePre: true,page: before.page,open: true});await expect(diff.locator('[aria-live]')).toHaveText(/^1 \/ /);
});

test('changed arguments reset only their page and a new target retires old actions and disclosure state',async ({page}) => {
  await openApproval(page,false);await page.getByText('Tool arguments',{exact: true}).click();await page.getByRole('button',{name: 'Allow this action',exact: true}).evaluate(node => {window.approvalPartsHarness.oldAction = node as HTMLButtonElement;});
  await page.evaluate(() => {const h = window.approvalPartsHarness;h.session.update({approval: {...h.initial.approval!,argsText: 'Replacement arguments'}});});await expect(page.locator('.pui-approval-arguments pre')).toHaveText('Replacement arguments');
  await page.evaluate(() => {const h = window.approvalPartsHarness;h.session.update({approval: {...h.initial.approval!,id: 'approval-b'}});h.oldAction!.click();});await expect(page.locator('.pui-approval-arguments pre')).toHaveCount(0);await expect(page.locator('.pui-approval-arguments')).not.toHaveAttribute('open');expect(await page.evaluate(() => window.approvalPartsHarness.actions)).toEqual([]);await page.getByRole('button',{name: 'Allow this action',exact: true}).click();expect(await page.evaluate(() => window.approvalPartsHarness.actions)).toEqual([{id: 'approval-b',action: 'allow'}]);
});

test('Deny, Always and Allow deliver current IDs once and disabled snapshots leave argument review available',async ({page}) => {
  await openApproval(page,false);await page.getByRole('button',{name: 'Deny',exact: true}).click();await page.getByRole('button',{name: 'Always allow workspace changes',exact: true}).click();await page.getByRole('button',{name: 'Allow this action',exact: true}).click();expect(await page.evaluate(() => window.approvalPartsHarness.actions)).toEqual([{id: 'approval-a',action: 'deny'},{id: 'approval-a',action: 'always'},{id: 'approval-a',action: 'allow'}]);
  await page.evaluate(() => {const h = window.approvalPartsHarness;h.session.update({...h.initial,disabled: true});});for (const name of ['Deny','Always allow workspace changes','Allow this action']) await expect(page.getByRole('button',{name,exact: true})).toBeDisabled();await page.getByText('Tool arguments',{exact: true}).click();await expect(page.locator('.pui-approval-arguments pre')).toHaveText(file.argsText);
  await page.evaluate(() => window.approvalPartsHarness.session.update({approval: null}));await expect(page.locator('.pui-approval-card')).toHaveCount(0);
});

test('empty and populated approval parents retire late snapshots without creating an orphaned review',async ({page}) => {
  for (const populated of [false,true]) {
    await page.goto('/tests/fixture.html');const value = await page.evaluate(async ({populated,file}) => {
      const recipePath = '/examples/assemblies/approval.ts',partsPath = '/src/parts/index.ts',{composeApproval} = await import(recipePath),p = await import(partsPath),actions: string[] = [],session = composeApproval({approval: populated ? file : null},{onAction(id: string,action: string) {actions.push(`${id}:${action}`);}}),mount = document.body.appendChild(document.createElement('div'));
      const tree = p.mountParts(mount,p.createStackPart({children: [session.part]}));tree.setAppearance('dark');const retained = mount.querySelector<HTMLButtonElement>('.pui-approval-actions button');tree.destroy();session.update({approval: file});retained?.click();session.destroy();return {actions,children: mount.childElementCount,orphans: document.querySelectorAll('.pui-approval-card,details').length};
    },{populated,file});expect(value).toEqual({actions: [],children: 0,orphans: 0});
  }
});
