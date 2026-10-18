import {test, expect, type Page} from '@playwright/test';

interface ArtifactState {ownerId: string; files: {name: string;path: string}[];loading: boolean;error: string;copyMode: 'file' | 'path';disabled?: boolean}
interface ArtifactTarget {owner: {kind: 'artifact';id: string};name: string;path: string}
interface ArtifactSession {update(state: ArtifactState): void;close(): void;isOpen(): boolean;destroy(): void}
interface ArtifactHarness {
  session: ArtifactSession;state: ArtifactState;tree: {destroy(): void};related: {open(): void;close(): void};
  calls: {action: string;target: ArtifactTarget;frozen: boolean;argc: number}[];resolve?: (result: {ok: true} | {ok: false;error: string}) => void;
  row?: Element;button?: Element;selection?: string;
}
declare global {interface Window {artifactsHarness: ArtifactHarness}}

async function setup(page: Page, appearance: 'light' | 'dark' = 'light', variant: 'files' | 'loading' | 'error' | 'many' = 'files'): Promise<void> {
  await page.goto('/tests/fixture.html');await page.emulateMedia({colorScheme: appearance === 'light' ? 'dark' : 'light'});
  await page.evaluate(async ({appearance,variant}) => {
    document.documentElement.classList.add('pui');document.documentElement.dataset.appearance = appearance;document.body.dataset.appearance = appearance;
    const state: ArtifactState = {ownerId: 'original-owner',files: variant === 'error' ? [] : variant === 'many' ? Array.from({length: 24},(_,index) => ({name: `Result ${index}.md`,path: `/workspace/reports/result-${index}.md`})) : [{name: 'Report 中文.md',path: '/workspace/reports/Report 中文.md'},{name: 'Diagram.png',path: '/workspace/diagrams/Diagram.png'}],loading: variant === 'loading',error: variant === 'error' ? 'Files unavailable 中文' : '',copyMode: 'file'};
    const h = {state,calls: []} as unknown as ArtifactHarness;
    const record = (...args: [string,ArtifactTarget]) => {const [action,target] = args;h.calls.push({action,target,frozen: Object.isFrozen(target) && Object.isFrozen(target.owner),argc: args.length});return new Promise<{ok: true} | {ok: false;error: string}>(resolve => {h.resolve = resolve;});};
    const callbacks = {onPreview(target: ArtifactTarget) {return record('preview',target);},onFileAction: record};
const mount=document.body.appendChild(document.createElement('div'));
    const contextPath = '/tests/region-context.ts', {mountRegion} = await import(contextPath);
    const path='/tests/recipes-fixture.ts',{parts:p,recipes:r}=await import(path),announcement=p.createAnnouncementPart({message:''}),related=p.createDialogPart({purpose:'preview',title:'Related preview',children:[p.createTextPart({text:'Related content'})]});
    h.related=related;const artifacts=r.composeArtifacts(state,callbacks,{announcement,relatedDialogs:[related]});h.session=artifacts;h.tree=mountRegion(mount,artifacts.part,'topbar',appearance,[announcement],[related]);
        window.artifactsHarness = h;
  },{appearance,variant});
}
async function open(page: Page): Promise<void> {await page.locator('.pui-artifacts-toggle').click();await expect(page.locator('.pui-artifacts-panel')).toBeVisible();await page.mouse.move(0,0);}
async function settleNativeFocus(page: Page): Promise<void> {await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));}

test('small inspector parts transfer genuine slots atomically and expose no native or positioning port', async ({page}) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path);let counter = false,foreignHeading = false,duplicate = false,foreignSurface = false,position = false;
    try {p.createButtonPart({variant: 'counter',icon: 'file',count: 2,label: 'Files'});} catch {counter = true;}
    const close = p.createButtonPart({variant: 'quiet-icon',icon: 'close',label: 'Close files'}),heading = p.createInspectorHeadingPart({title: 'Files',count: '2 files',action: close});
    try {p.createInspectorPart({heading,children: [heading]});} catch {duplicate = true;}
    try {p.createInspectorPart({heading: {},children: []});} catch {foreignHeading = true;}
    const surface = p.createInspectorPart({heading,children: [p.createContentViewportPart({purpose: 'inspector',content: 'Literal <b>text</b>'})]});
    const trigger = p.createButtonPart({variant: 'counter',icon: 'file',count: '2',label: 'Files'});
    try {p.createAnchoredGroupPart({trigger,surface: {}});} catch {foreignSurface = true;}
    try {p.createInspectorPart({heading: p.createInspectorHeadingPart({title: 'Free',count: '',action: p.createButtonPart({variant: 'quiet-icon',icon: 'close',label: 'Close'})}),children: [],position: {top: 20}});} catch {position = true;}
    const group = p.createAnchoredGroupPart({trigger,surface}),mount = document.body.appendChild(document.createElement('div'));p.mountParts(mount,group);surface.open(trigger);
    const shape = {root: mount.firstElementChild!.localName,children: [...mount.firstElementChild!.children].map(node => node.localName),count: mount.querySelector('.pui-artifacts-count')!.getAttribute('aria-hidden'),panel: mount.querySelector('section')!.getAttribute('tabindex'),literal: mount.querySelector('.pui-artifacts-content')!.textContent};
    group.update({hidden: true});const closed = !surface.isOpen();
    const feedback = p.createFeedbackPart({presentation: 'paragraph',tone: 'error',message: '',hidden: true});const feedbackMount = document.body.appendChild(document.createElement('div'));p.mountParts(feedbackMount,feedback);let invalidHidden = false;try {feedback.update({message: 'Changed',hidden: 'false'});} catch {invalidHidden = true;}
    const errorRetained = feedbackMount.querySelector('p')!.hidden && !feedbackMount.textContent;feedback.update({message: 'Shown',tone: 'error'});const omittedHiddenVisible = !feedbackMount.querySelector('p')!.hidden;
    return {counter,foreignHeading,duplicate,foreignSurface,position,shape,closed,invalidHidden,errorRetained,omittedHiddenVisible,leaks: Object.values(group).some(value => value instanceof Node)};
  });expect(result).toEqual({counter: true,foreignHeading: true,duplicate: true,foreignSurface: true,position: true,shape: {root: 'div',children: ['button','section'],count: 'true',panel: '-1',literal: 'Literal <b>text</b>'},closed: true,invalidHidden: true,errorRetained: true,omittedHiddenVisible: true,leaks: false});
});

test('anchored group disposal validates callbacks before ownership and notifies before child disposal once', async ({page}) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path),trigger = p.createButtonPart({variant: 'counter',icon: 'file',count: '2',label: 'Files'});
    const heading = p.createInspectorHeadingPart({title: 'Files',count: '2 files',action: p.createButtonPart({variant: 'quiet-icon',icon: 'close',label: 'Close'})}),surface = p.createInspectorPart({heading,children: []});let invalid = false,calls = 0,beforeChildren = false;
    try {p.createAnchoredGroupPart({trigger,surface,onDispose: 'invalid'});} catch {invalid = true;}
    const mount = document.body.appendChild(document.createElement('div')),group = p.createAnchoredGroupPart({trigger,surface,onDispose() {calls++;trigger.update({variant: 'counter',icon: 'file',count: '3',label: 'Still alive'});beforeChildren = mount.querySelector('.pui-artifacts-count')!.textContent === '3';}}),tree = p.mountParts(mount,group);
    tree.destroy();group.destroy();tree.destroy();return {invalid,calls,beforeChildren,remaining: mount.childElementCount};
  });expect(result).toEqual({invalid: true,calls: 1,beforeChildren: true,remaining: 0});
});

test('artifacts visibility, Escape, outside focus and related dialog exclusions follow the old surface', async ({page}) => {

    await setup(page);await open(page);await expect(page.locator('.pui-artifacts-panel')).toBeFocused();await page.keyboard.press('Escape');await expect(page.locator('.pui-artifacts-panel')).toBeHidden();await expect(page.locator('.pui-artifacts-toggle')).toBeFocused();
    await open(page);await page.getByRole('button',{name: 'Close files',exact: true}).click();await expect(page.locator('.pui-artifacts-toggle')).toBeFocused();
    await open(page);await page.evaluate(() => window.artifactsHarness.related.open());await expect(page.locator('.pui-artifacts-panel')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('.pui-artifacts-panel')).toBeVisible();await expect(page.locator('dialog[open]')).toHaveCount(0);
    await page.locator('.pui-artifacts-panel').focus();await page.keyboard.press('Escape');await expect(page.locator('.pui-artifacts-panel')).toBeHidden();
    await open(page);await page.evaluate(() => {const button = document.body.appendChild(document.createElement('button'));button.textContent = 'Outside';button.focus();});await expect(page.locator('.pui-artifacts-panel')).toBeHidden();
    await page.evaluate(() => {const h = window.artifactsHarness;h.state = {...h.state,files: [],loading: true,error: ''};h.session.update(h.state);});await expect(page.locator('.pui-artifacts-control')).toBeHidden();
    await page.evaluate(() => {const h = window.artifactsHarness;h.state = {...h.state,error: 'Unavailable'};h.session.update(h.state);});await expect(page.locator('.pui-artifacts-toggle')).toHaveAttribute('aria-label','Conversation files unavailable');await expect(page.locator('.pui-artifacts-count')).toHaveText('!');
});

test('keyed artifact metadata preserves native rows, text selection, scroll and busy action ownership', async ({page}) => {
  const pendingVisibility: Array<{open: boolean;focusInside: boolean}> = [];

    await setup(page,'light','many');await open(page);
    await page.evaluate(() => {const h = window.artifactsHarness,row = document.querySelector('.pui-file-card')!,path = row.querySelector('.pui-file-path')!,range = document.createRange();range.setStart(path.firstChild!,0);range.setEnd(path.firstChild!,10);getSelection()!.removeAllRanges();getSelection()!.addRange(range);h.selection = getSelection()!.toString();h.row = row;document.querySelector('.pui-artifacts-content')!.scrollTop = 140;h.state = {...h.state,loading: true,files: h.state.files.map((file,index) => index ? file : {...file,name: 'Updated result.md'}),disabled: true};h.session.update(h.state);});
    expect(await page.evaluate(() => ({row: window.artifactsHarness.row === document.querySelector('.pui-file-card'),selection: window.artifactsHarness.selection === getSelection()!.toString(),scroll: document.querySelector('.pui-artifacts-content')!.scrollTop}))).toEqual({row: true,selection: true,scroll: 140});
    for (const button of await page.locator('.pui-file-card').first().getByRole('button').all()) await expect(button).toBeDisabled();await expect(page.locator('.pui-artifacts-toggle')).toBeEnabled();
    await page.evaluate(() => {const h = window.artifactsHarness;h.state = {...h.state,disabled: false};h.session.update(h.state);document.querySelector('.pui-artifacts-content')!.scrollTop = 0;});
    const row = page.locator('.pui-file-card').first();await row.getByRole('button',{name: 'Open',exact: true}).click();
    // Native focus after disabling a button varies by platform. The inspector
    // follows the actual focus boundary; its controls retain their state while hidden.
    await expect(row.locator('button').nth(1)).toBeDisabled();await expect(row.locator('button').nth(2)).toBeEnabled();await settleNativeFocus(page);pendingVisibility.push(await page.evaluate(() => ({open: window.artifactsHarness.session.isOpen(),focusInside: !!document.querySelector('.pui-artifacts-control')?.contains(document.activeElement)})));
    await page.evaluate(() => {const h = window.artifactsHarness;h.state = {...h.state,disabled: false};h.session.update(h.state);});await expect(row.locator('button').nth(1)).toBeDisabled();
    await page.evaluate(() => window.artifactsHarness.resolve!({ok: true}));await expect(row.locator('button').nth(1)).toBeEnabled();
    expect(await page.evaluate(() => window.artifactsHarness.calls)).toEqual([{action: 'open',target: {owner: {kind: 'artifact',id: 'original-owner'},name: 'Updated result.md',path: '/workspace/reports/result-0.md'},frozen: true,argc: 2}]);
  expect(pendingVisibility[0]!.open).toBe(pendingVisibility[0]!.focusInside);
});

test('copy mode snapshots keep a pending native button and capture the original action and announcement', async ({page}) => {
  const pendingVisibility: Array<{open: boolean;focusInside: boolean}> = [];

    await setup(page);await open(page);const row = page.locator('.pui-file-card').first();await row.getByRole('button',{name: 'Copy file',exact: true}).click();await expect(row.locator('button').nth(2)).toBeEnabled();await settleNativeFocus(page);pendingVisibility.push(await page.evaluate(() => ({open: window.artifactsHarness.session.isOpen(),focusInside: !!document.querySelector('.pui-artifacts-control')?.contains(document.activeElement)})));
    await page.evaluate(() => {const h = window.artifactsHarness;h.button = document.querySelector('.pui-file-card')!.querySelectorAll('button')[3];h.state = {...h.state,copyMode: 'path'};h.session.update(h.state);});
    expect(await page.evaluate(() => window.artifactsHarness.button === document.querySelector('.pui-file-card')!.querySelectorAll('button')[3])).toBe(true);
    await page.evaluate(() => window.artifactsHarness.resolve!({ok: true}));await expect(row.locator('button').nth(3)).toHaveText('Copied');await expect(row.locator('button').nth(3)).toHaveAttribute('aria-label','File copied.');
    await page.evaluate(() => {const h = window.artifactsHarness;h.state = {...h.state,loading: true};h.session.update(h.state);});await expect(row.locator('button').nth(3)).toHaveText('Copied');await expect(row.locator('button').nth(3)).toHaveAttribute('aria-label','File copied.');
    expect(await page.evaluate(() => window.artifactsHarness.calls.map(call => call.action))).toEqual(['copy']);
  expect(pendingVisibility[0]!.open).toBe(pendingVisibility[0]!.focusInside);
});

test('owner switches, row removal and parent disposal retire pending artifact outcomes', async ({page}) => {

    await setup(page);await open(page);await page.locator('.pui-file-card').first().getByRole('button',{name: 'Preview',exact: true}).click();
    await page.evaluate(() => {const h = window.artifactsHarness;h.state = {...h.state,ownerId: 'next-owner',files: [{name: 'Next.md',path: '/next.md'}]};h.session.update(h.state);h.resolve!({ok: false,error: 'Retired old error'});});await expect(page.locator('.pui-artifacts-panel')).toBeHidden();await open(page);await expect(page.locator('.pui-artifacts-panel')).not.toContainText('Retired old error');
    await page.getByRole('button',{name: 'Open',exact: true}).click();await page.evaluate(() => {const h = window.artifactsHarness;h.state = {...h.state,files: []};h.session.update(h.state);h.resolve!({ok: false,error: 'Removed row error'});});await expect(page.locator('.pui-artifacts-control')).toBeHidden();
    await page.evaluate(() => {const h = window.artifactsHarness;h.state = {...h.state,files: [{name: 'Final.md',path: '/final.md'}]};h.session.update(h.state);});await open(page);await page.getByRole('button',{name: 'Reveal',exact: true}).click();
    await page.evaluate(() => {const h = window.artifactsHarness;h.tree.destroy();h.tree.destroy();h.resolve!({ok: false,error: 'Disposed error'});h.session.update({...h.state,files: [{name: 'Late.md',path: '/late.md'}]});h.session.close();h.session.destroy();});await expect(page.locator('.pui-artifacts-panel')).toHaveCount(0);expect(await page.evaluate(() => window.artifactsHarness.session.isOpen())).toBe(false);
});

test('removed copy results cannot revive the artifact control after row disposal', async ({page}) => {

    await setup(page);await open(page);await page.locator('.pui-file-card').first().getByRole('button',{name: 'Copy file',exact: true}).click();
    await page.evaluate(() => {const h = window.artifactsHarness;h.state = {...h.state,files: []};h.session.update(h.state);});await expect(page.locator('.pui-artifacts-control')).toBeHidden();
    await page.evaluate(() => window.artifactsHarness.resolve!({ok: false,error: 'Removed copy row error'}));

      // This is the recorded correctness exception: destroying the genuine
      // copy button retires its pending result, as the formal Part contract says.
      await expect(page.locator('.pui-artifacts-control')).toBeHidden();await expect(page.locator('.pui-artifacts-content .pui-form-error')).toBeEmpty();
    expect(await page.evaluate(() => window.artifactsHarness.session.isOpen())).toBe(false);await page.evaluate(() => window.artifactsHarness.tree.destroy());
});

test('related dialog updates preflight every borrowed handle without retiring the previous valid relationship',async ({page}) => {
  await page.goto('/tests/fixture.html');const value = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path),dialog = p.createDialogPart({title: 'Related preview',children: []}),trigger = p.createButtonPart({variant: 'counter',icon: 'file',label: 'Files',count: '1'});
    const heading = p.createInspectorHeadingPart({title: 'Files',count: '1',action: p.createButtonPart({variant: 'quiet-icon',icon: 'close',label: 'Close files'})});
    const inspector = p.createInspectorPart({heading,children: []}),group = p.createAnchoredGroupPart({trigger,surface: inspector}),free = p.createTextPart({text: 'Unchanged'});
    inspector.setRelatedDialogs([dialog]);let rejected = false;try {inspector.setRelatedDialogs([dialog,free]);} catch {rejected = true;}
    const mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,p.createFramePart({children: [group,dialog]}));inspector.open(trigger);dialog.open();await Promise.resolve();
    const retained = inspector.isOpen(),independent = document.body.appendChild(document.createElement('div')),freeTree = p.mountParts(independent,free),unowned = independent.textContent === 'Unchanged';
    tree.destroy();freeTree.destroy();inspector.setRelatedDialogs([]);return {rejected,retained,unowned,closed: !inspector.isOpen()};
  });expect(value).toEqual({rejected: true,retained: true,unowned: true,closed: true});
});
