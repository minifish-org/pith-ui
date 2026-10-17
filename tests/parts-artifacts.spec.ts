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

async function setup(page: Page, old: boolean, appearance: 'light' | 'dark' = 'light', variant: 'files' | 'loading' | 'error' | 'many' = 'files'): Promise<void> {
  await page.goto('/tests/fixture.html');await page.emulateMedia({colorScheme: appearance === 'light' ? 'dark' : 'light'});
  await page.evaluate(async ({old,appearance,variant}) => {
    document.documentElement.classList.add('pui');document.documentElement.dataset.appearance = appearance;document.body.dataset.appearance = appearance;
    const state: ArtifactState = {ownerId: 'original-owner',files: variant === 'error' ? [] : variant === 'many' ? Array.from({length: 24},(_,index) => ({name: `Result ${index}.md`,path: `/workspace/reports/result-${index}.md`})) : [{name: 'Report 中文.md',path: '/workspace/reports/Report 中文.md'},{name: 'Diagram.png',path: '/workspace/diagrams/Diagram.png'}],loading: variant === 'loading',error: variant === 'error' ? 'Files unavailable 中文' : '',copyMode: 'file'};
    const h = {state,calls: []} as unknown as ArtifactHarness;
    const record = (...args: [string,ArtifactTarget]) => {const [action,target] = args;h.calls.push({action,target,frozen: Object.isFrozen(target) && Object.isFrozen(target.owner),argc: args.length});return new Promise<{ok: true} | {ok: false;error: string}>(resolve => {h.resolve = resolve;});};
    const callbacks = {onPreview(target: ArtifactTarget) {return record('preview',target);},onFileAction: record};
    const mount = document.body.appendChild(document.createElement('div')),appPath = '/src/app/index.ts',{createApplication} = await import(appPath),app = createApplication(mount,{appearance});app.files.updateArtifacts(state,callbacks);
    if (old) {
      h.session = {update: next => app.files.updateArtifacts(next),close: () => app.files.closeArtifacts(),isOpen: () => app.files.areArtifactsOpen(),destroy: app.destroy};h.tree = app;
      let preview: {close(): void} | undefined;h.related = {open() {preview = app.files.openPreview({owner: {kind: 'artifact',id: state.ownerId},name: 'Related preview',path: '/demo',capabilities: {open: false,reveal: false,copyMode: 'none'},content: {kind: 'text',text: 'Related content'}});},close() {preview?.close();}};
    } else {
      // Retain only a cloned baseline shell context. Destroy the original app
      // so no old event listener can help the composed parts pass behavior.
      const shell = mount.querySelector('.pui-app')!.cloneNode(true) as HTMLElement;app.destroy();mount.replaceChildren(shell);
      const oldControl = shell.querySelector('.pui-artifacts-control')!,slot = document.createElement('div');oldControl.replaceWith(slot);
      const path = '/src/parts/index.ts',recipePath = '/examples/assemblies/artifacts.ts',p = await import(path),{composeArtifacts} = await import(recipePath);
      const announcement = p.createAnnouncementPart({message: ''}),announcerMount = document.body.appendChild(document.createElement('div')),announcerTree = p.mountParts(announcerMount,announcement,{appearance});
      const related = p.createDialogPart({purpose: 'preview',title: 'Related preview',children: [p.createTextPart({text: 'Related content'})]}),dialogMount = shell.appendChild(document.createElement('div')),dialogTree = p.mountParts(dialogMount,related,{appearance});h.related = related;
      const artifacts = composeArtifacts(state,callbacks,{announcement,relatedDialogs: [related]});h.session = artifacts;const tree = p.mountParts(slot,artifacts.part,{appearance});h.tree = {destroy() {tree.destroy();dialogTree.destroy();announcerTree.destroy();}};
    }
    window.artifactsHarness = h;
  },{old,appearance,variant});
}
async function open(page: Page): Promise<void> {await page.locator('.pui-artifacts-toggle').click();await expect(page.locator('.pui-artifacts-panel')).toBeVisible();await page.mouse.move(0,0);}
async function presentation(page: Page): Promise<unknown> {
  return page.evaluate(async () => {
    await document.fonts.ready;for (const animation of document.getAnimations()) if (animation.effect?.getTiming().iterations !== Infinity) animation.finish();
    const root = document.querySelector('.pui-artifacts-control')!,panel = root.querySelector('.pui-artifacts-panel')!,origin = root.getBoundingClientRect();
    const inspect = (node: Element) => {const rect = node.getBoundingClientRect(),style = getComputedStyle(node);return {
      tag: node.localName,text: [...node.childNodes].filter(child => child.nodeType === Node.TEXT_NODE).map(child => child.textContent).join('').trim(),hidden: node.hasAttribute('hidden'),
      box: [rect.x - origin.x,rect.y - origin.y,rect.width,rect.height].map(value => Math.round(value * 100) / 100),
      styles: ['display','position','font-family','font-size','font-weight','line-height','color','background-color','margin-top','margin-bottom','margin-left','padding-top','padding-right','padding-bottom','padding-left','border-top-width','border-top-color','border-radius','gap','overflow-x','overflow-y','min-height','max-height','max-width','overflow-wrap','flex','align-items','justify-content'].map(key => style.getPropertyValue(key)),
      ...(node instanceof HTMLButtonElement ? {label: node.getAttribute('aria-label'),title: node.title,disabled: node.disabled} : {}),
      ...(node.hasAttribute('role') ? {role: node.getAttribute('role')} : {}),
    };};
    return {root: inspect(root),nodes: [...root.querySelectorAll('.pui-artifacts-toggle,.pui-artifacts-count,.pui-artifacts-panel,.pui-artifacts-heading,h2,h2 > span,.pui-artifacts-status,.pui-artifacts-content,.pui-file-card,.pui-file-info,strong,.pui-file-path,.pui-file-actions,button,p.pui-form-error')].map(inspect),svg: [...root.querySelectorAll('svg')].map(node => node.innerHTML),labelled: panel.getAttribute('aria-labelledby') === panel.querySelector('h2')!.id,controlled: root.querySelector('.pui-artifacts-toggle')!.getAttribute('aria-controls') === panel.id,focused: document.activeElement === panel};
  });
}

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

for (const appearance of ['light','dark'] as const) for (const variant of ['files','loading','error','many'] as const) test(`${appearance} ${variant} artifacts assembly preserves the actual topbar control, anchored panel and cards`, async ({page}) => {
  await setup(page,true,appearance,variant);await open(page);const old = await presentation(page);await setup(page,false,appearance,variant);await open(page);expect(await presentation(page)).toEqual(old);
});
for (const viewport of [{width: 900,height: 568},{width: 390,height: 844}]) test(`artifacts ${viewport.width} preserves anchor bounds and wrapping actions`, async ({page}) => {
  await page.setViewportSize(viewport);await setup(page,true);await open(page);const old = await presentation(page);await setup(page,false);await open(page);expect(await presentation(page)).toEqual(old);
});

test('artifacts visibility, Escape, outside focus and related dialog exclusions follow the old surface', async ({page}) => {
  for (const old of [true,false]) {
    await setup(page,old);await open(page);await expect(page.locator('.pui-artifacts-panel')).toBeFocused();await page.keyboard.press('Escape');await expect(page.locator('.pui-artifacts-panel')).toBeHidden();await expect(page.locator('.pui-artifacts-toggle')).toBeFocused();
    await open(page);await page.getByRole('button',{name: 'Close files',exact: true}).click();await expect(page.locator('.pui-artifacts-toggle')).toBeFocused();
    await open(page);await page.evaluate(() => window.artifactsHarness.related.open());await expect(page.locator('.pui-artifacts-panel')).toBeVisible();await page.keyboard.press('Escape');await expect(page.locator('.pui-artifacts-panel')).toBeVisible();await expect(page.locator('dialog[open]')).toHaveCount(0);
    await page.locator('.pui-artifacts-panel').focus();await page.keyboard.press('Escape');await expect(page.locator('.pui-artifacts-panel')).toBeHidden();
    await open(page);await page.evaluate(() => {const button = document.body.appendChild(document.createElement('button'));button.textContent = 'Outside';button.focus();});await expect(page.locator('.pui-artifacts-panel')).toBeHidden();
    await page.evaluate(() => {const h = window.artifactsHarness;h.state = {...h.state,files: [],loading: true,error: ''};h.session.update(h.state);});await expect(page.locator('.pui-artifacts-control')).toBeHidden();
    await page.evaluate(() => {const h = window.artifactsHarness;h.state = {...h.state,error: 'Unavailable'};h.session.update(h.state);});await expect(page.locator('.pui-artifacts-toggle')).toHaveAttribute('aria-label','Conversation files unavailable');await expect(page.locator('.pui-artifacts-count')).toHaveText('!');
  }
});

test('keyed artifact metadata preserves native rows, text selection, scroll and busy action ownership', async ({page}) => {
  for (const old of [true,false]) {
    await setup(page,old,'light','many');await open(page);
    await page.evaluate(() => {const h = window.artifactsHarness,row = document.querySelector('.pui-file-card')!,path = row.querySelector('.pui-file-path')!,range = document.createRange();range.setStart(path.firstChild!,0);range.setEnd(path.firstChild!,10);getSelection()!.removeAllRanges();getSelection()!.addRange(range);h.selection = getSelection()!.toString();h.row = row;document.querySelector('.pui-artifacts-content')!.scrollTop = 140;h.state = {...h.state,loading: true,files: h.state.files.map((file,index) => index ? file : {...file,name: 'Updated result.md'}),disabled: true};h.session.update(h.state);});
    expect(await page.evaluate(() => ({row: window.artifactsHarness.row === document.querySelector('.pui-file-card'),selection: window.artifactsHarness.selection === getSelection()!.toString(),scroll: document.querySelector('.pui-artifacts-content')!.scrollTop}))).toEqual({row: true,selection: true,scroll: 140});
    for (const button of await page.locator('.pui-file-card').first().getByRole('button').all()) await expect(button).toBeDisabled();await expect(page.locator('.pui-artifacts-toggle')).toBeEnabled();
    await page.evaluate(() => {const h = window.artifactsHarness;h.state = {...h.state,disabled: false};h.session.update(h.state);document.querySelector('.pui-artifacts-content')!.scrollTop = 0;});
    const row = page.locator('.pui-file-card').first();await row.getByRole('button',{name: 'Open',exact: true}).click();await expect(row.getByRole('button',{name: 'Open',exact: true})).toBeDisabled();await expect(row.getByRole('button',{name: 'Reveal',exact: true})).toBeEnabled();
    await page.evaluate(() => {const h = window.artifactsHarness;h.state = {...h.state,disabled: false};h.session.update(h.state);});await expect(row.getByRole('button',{name: 'Open',exact: true})).toBeDisabled();
    await page.evaluate(() => window.artifactsHarness.resolve!({ok: true}));await expect(row.getByRole('button',{name: 'Open',exact: true})).toBeEnabled();
    expect(await page.evaluate(() => window.artifactsHarness.calls)).toEqual([{action: 'open',target: {owner: {kind: 'artifact',id: 'original-owner'},name: 'Updated result.md',path: '/workspace/reports/result-0.md'},frozen: true,argc: 2}]);
  }
});

test('copy mode snapshots keep a pending native button and capture the original action and announcement', async ({page}) => {
  for (const old of [true,false]) {
    await setup(page,old);await open(page);const row = page.locator('.pui-file-card').first();await row.getByRole('button',{name: 'Copy file',exact: true}).click();await expect(row.getByRole('button',{name: 'Reveal',exact: true})).toBeEnabled();
    await page.evaluate(() => {const h = window.artifactsHarness;h.button = document.querySelector('.pui-file-card')!.querySelectorAll('button')[3];h.state = {...h.state,copyMode: 'path'};h.session.update(h.state);});
    expect(await page.evaluate(() => window.artifactsHarness.button === document.querySelector('.pui-file-card')!.querySelectorAll('button')[3])).toBe(true);
    await page.evaluate(() => window.artifactsHarness.resolve!({ok: true}));await expect(row.getByRole('button',{name: 'File copied.',exact: true})).toHaveText('Copied');
    await page.evaluate(() => {const h = window.artifactsHarness;h.state = {...h.state,loading: true};h.session.update(h.state);});await expect(row.getByRole('button',{name: 'File copied.',exact: true})).toHaveText('Copied');
    expect(await page.evaluate(() => window.artifactsHarness.calls.map(call => call.action))).toEqual(['copy']);
  }
});

test('owner switches, row removal and parent disposal retire pending artifact outcomes', async ({page}) => {
  for (const old of [true,false]) {
    await setup(page,old);await open(page);await page.locator('.pui-file-card').first().getByRole('button',{name: 'Preview',exact: true}).click();
    await page.evaluate(() => {const h = window.artifactsHarness;h.state = {...h.state,ownerId: 'next-owner',files: [{name: 'Next.md',path: '/next.md'}]};h.session.update(h.state);h.resolve!({ok: false,error: 'Retired old error'});});await expect(page.locator('.pui-artifacts-panel')).toBeHidden();await open(page);await expect(page.locator('.pui-artifacts-panel')).not.toContainText('Retired old error');
    await page.getByRole('button',{name: 'Copy file',exact: true}).click();await page.evaluate(() => {const h = window.artifactsHarness;h.state = {...h.state,files: []};h.session.update(h.state);h.resolve!({ok: false,error: 'Removed row error'});});await expect(page.locator('.pui-artifacts-control')).toBeHidden();
    await page.evaluate(() => {const h = window.artifactsHarness;h.state = {...h.state,files: [{name: 'Final.md',path: '/final.md'}]};h.session.update(h.state);});await open(page);await page.getByRole('button',{name: 'Reveal',exact: true}).click();
    await page.evaluate(() => {const h = window.artifactsHarness;h.tree.destroy();h.tree.destroy();h.resolve!({ok: false,error: 'Disposed error'});});await expect(page.locator('.pui-artifacts-panel')).toHaveCount(0);
  }
});
