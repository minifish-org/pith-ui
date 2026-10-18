import {expect,test,type Page} from '@playwright/test';

interface HistoryNode {id: string;role: string;text: string;active: boolean}
interface HistoryState {nodes: HistoryNode[]|null;loading?: boolean;error?: string}
interface HistoryHarness {session: {update(state: HistoryState): void;fail(message: string): void;close(): void;destroy(): void;isOpen(): boolean};calls: string[];closed: number;resolve?: (result: {ok: true}|{ok: false;error: string}) => void;retained?: {card: Element;action: Element}}
declare global {interface Window {branchPartsHarness: HistoryHarness}}
const populated: HistoryState = {nodes: [{id: 'one',role: 'user',text: 'Original question\nSecond line',active: false},{id: 'two',role: 'assistant',text: 'Original response',active: true},{id: 'image',role: 'user',text: '',active: false}]};

async function openHistory(page: Page,state: HistoryState = populated,appearance: 'light'|'dark' = 'light'): Promise<void> {
  await page.goto('/tests/fixture.html');
  await page.evaluate(async ({state,appearance}) => {
    document.documentElement.className = 'pui';document.documentElement.dataset.appearance = appearance;document.body.dataset.appearance = appearance;
    const mount = document.body.appendChild(document.createElement('div')),h = {calls: [],closed: 0} as unknown as HistoryHarness;
    const callbacks = {onContinue(id: string) {h.calls.push(id);return new Promise<{ok: true}|{ok: false;error: string}>(resolve => {h.resolve = resolve;});},onClose() {h.closed++;}};
    const path = '/examples/assemblies/branch-history.ts',{mountBranchHistory} = await import(path);h.session = mountBranchHistory(mount,state,callbacks,{appearance});
    window.branchPartsHarness = h;
  },{state,appearance});
  await expect(page.getByRole('dialog',{name: 'Conversation branches',exact: true})).toBeVisible();
}


test('selectable cards are one native article with opaque children and bounded selection state',async ({page}) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path),child = p.createTextPart({role: 'paragraph',text: 'Native content'});
    const card = p.createSelectableCardPart({children: [child],selected: true}),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,card),node = mount.querySelector('article')!,paragraph = node.firstElementChild;
    const selected = node.classList.contains('pui-current-branch'),children = [...node.children].map(element => element.localName);card.update({selected: false});const retained = paragraph === node.firstElementChild;
    const rejects = (action: () => void) => {try {action();return false;} catch {return true;}};
    const bad = [rejects(() => card.update({selected: 'yes'})),rejects(() => card.update({selected: true,style: {padding: 20}}))];tree.destroy();
    const free = p.createTextPart({text: 'Reusable'}),constructorRejected = rejects(() => p.createSelectableCardPart({children: [free],selected: 'yes'}));
    const other = document.body.appendChild(document.createElement('div')),owned = p.mountParts(other,free),reusable = other.textContent === 'Reusable';owned.destroy();
    return {tag: node.localName,children,selected,unselected: !node.classList.contains('pui-current-branch'),retained,bad,constructorRejected,reusable,
      leak: Object.values(card).some(value => value instanceof Node),empty: !mount.firstChild};
  });
  expect(result).toEqual({tag: 'article',children: ['p'],selected: true,unselected: true,retained: true,bad: [true,true],constructorRejected: true,reusable: true,leak: false,empty: true});
});

test('plain feedback keeps native unadorned status text and collapses when empty',async ({page}) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path),feedback = p.createFeedbackPart({presentation: 'plain',message: 'Loading history…',tone: 'info'}),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,feedback),node = mount.firstElementChild!;
    const before = {tag: node.localName,classes: node.className,text: node.textContent,role: node.getAttribute('role'),hidden: node.hasAttribute('hidden'),font: getComputedStyle(node).fontSize,margin: getComputedStyle(node).margin};
    feedback.update({message: '<Failed safely>',tone: 'error'});const error = {classes: node.className,text: node.textContent,role: node.getAttribute('role')};
    feedback.update({message: '',tone: 'info'});const collapsed = node.hasAttribute('hidden');tree.destroy();return {before,error,collapsed};
  });
  expect(result).toEqual({before: {tag: 'div',classes: '',text: 'Loading history…',role: 'status',hidden: false,font: '14px',margin: '0px'},error: {classes: '',text: '<Failed safely>',role: 'alert'},collapsed: true});
});


test('branch updates retain keyed actions and current styles without a business write',async ({page}) => {

    await openHistory(page);const action = page.getByRole('button',{name: 'Continue here',exact: true}).nth(1);await action.focus();
    await page.evaluate(() => {const h = window.branchPartsHarness,action = document.activeElement!;h.retained = {action,card: action.closest('article')!};h.session.update({nodes: [{id: 'one',role: 'user',text: 'Original question\nSecond line',active: true},{id: 'two',role: 'assistant',text: 'Updated response',active: false},{id: 'image',role: 'user',text: '',active: false}]});});
    await expect(page.getByRole('button',{name: 'Continue here',exact: true}).nth(1)).toBeFocused();await expect(page.locator('article.pui-current-branch')).toHaveText('user · current branchContinue hereOriginal question\nSecond line');
    // The retained old factory moves rows with insertBefore, which can blur a
    // moved descendant. Its correct reorder contract is retained native row /
    // action identity; metadata-only focus above is checked independently.
    await page.evaluate(() => window.branchPartsHarness.session.update({nodes: [{id: 'two',role: 'assistant',text: 'Updated response',active: false},{id: 'one',role: 'user',text: 'Original question\nSecond line',active: true}]}));
    expect(await page.evaluate(() => {const r = window.branchPartsHarness.retained!,first = document.querySelector('dialog[open] article')!;return {card: r.card === first,action: first.querySelector('button') === r.action};})).toEqual({card: true,action: true});
    expect(await page.evaluate(() => window.branchPartsHarness.calls)).toEqual([]);
});

test('continue pending stays single across snapshots, failure retries, and success closes once',async ({page}) => {

    await openHistory(page);const first = page.getByRole('button',{name: 'Continue here',exact: true}).first();await first.click();await expect(first).toBeDisabled();
    await page.evaluate(state => window.branchPartsHarness.session.update(state),populated);await expect(first).toBeDisabled();expect(await page.evaluate(() => window.branchPartsHarness.calls)).toEqual(['one']);
    await page.evaluate(() => window.branchPartsHarness.resolve!({ok: false,error: '<Cannot continue>'}));await expect(page.getByRole('alert').filter({hasText: '<Cannot continue>'})).toBeVisible();await expect(first).toBeEnabled();
    await first.click();await page.evaluate(() => window.branchPartsHarness.resolve!({ok: true}));await expect(page.getByRole('dialog',{name: 'Conversation branches',exact: true})).not.toBeVisible();
    expect(await page.evaluate(() => ({calls: window.branchPartsHarness.calls,closed: window.branchPartsHarness.closed}))).toEqual({calls: ['one','one'],closed: 1});
});

test('branch text stays literal, truncates at the original bound, and loading rebuilds its view',async ({page}) => {

    await openHistory(page,{nodes: [{id: 'unsafe',role: '<b>role</b>',text: '<script>unsafe</script>'+ 'long '.repeat(100),active: true}]});
    await expect(page.locator('article strong')).toHaveText('<b>role</b> · current branch');expect(await page.locator('article p').textContent()).toHaveLength(360);await expect(page.locator('article script')).toHaveCount(0);
    await page.evaluate(() => window.branchPartsHarness.session.update({nodes: null,loading: true}));await expect(page.getByRole('dialog',{name: 'Conversation branches',exact: true}).getByRole('status')).toHaveText('Loading history…');await expect(page.getByRole('button',{name: 'Continue here',exact: true})).toHaveCount(0);
    await page.evaluate(() => window.branchPartsHarness.session.update({nodes: []}));await expect(page.getByText('No history yet.',{exact: true})).toBeVisible();
});

test('a composed history dialog retires with its shared owner during pending continuation',async ({page}) => {
  await page.goto('/tests/fixture.html');
  const result = await page.evaluate(async state => {
    const partsPath = '/src/parts/index.ts',recipePath = '/examples/assemblies/branch-history.ts',p = await import(partsPath),{composeBranchHistory} = await import(recipePath);
    let resolve!: (result: {ok: true}) => void,closed = 0;
    const history = composeBranchHistory(state,{onContinue() {return new Promise(done => {resolve = done;});},onClose() {closed++;}}),root = p.createFramePart({children: [history.part]}),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,root,{appearance: 'dark'});
    history.open();(mount.querySelector('article button') as HTMLButtonElement).click();tree.destroy();resolve({ok: true});await new Promise(done => setTimeout(done,0));
    history.update(state);history.fail('Retired');history.open();history.destroy();return {closed,open: history.isOpen(),empty: !mount.firstChild,theme: !mount.classList.contains('pui')};
  },populated);
  expect(result).toEqual({closed: 1,open: false,empty: true,theme: true});
});
