import {test,expect,type Page} from '@playwright/test';

interface State {visible: boolean;summary: string;duration: string;speed: string;provider?: string;thinkingLevel?: string;inputTokens: string;outputTokens: string;cacheRead: string;cacheWrite: string;contextTokens: string;contextWindow: string;compactions: string;toolFailures: string;recordedCost: string;latestCost: string}
interface Session {update(state: State): void;updateTiming(state: {summary: string;duration: string;speed: string}): void;updateCostsVisible(visible: boolean): void;readCosts(): {open: boolean;runtimeOpen: boolean};resetCosts(): void;destroy(): void}
interface Harness {session: Session;initial: State;changes: number;root: HTMLDetailsElement;duration?: Element;selected?: Element;shared?: {setAppearance(mode: 'light'|'dark'): void;destroy(): void}}
declare global {interface Window {runtimePartsHarness: Harness}}
const initial: State = {visible: true,summary: 'Working · example-model · 1,200 tokens',duration: '1m 12s',speed: '18.5',inputTokens: '900',outputTokens: '300',cacheRead: '100',cacheWrite: '20',contextTokens: '1,100',contextWindow: '128,000',compactions: '2',toolFailures: '1',recordedCost: '~$0.001234 (partial)',latestCost: 'Unknown'};

async function openRuntime(page: Page,state: State = initial,appearance: 'light'|'dark' = 'light',open = true,costs = false): Promise<void> {
  await page.goto('/tests/fixture.html');await page.evaluate(async ({state,appearance,open,costs}) => {
    document.body.dataset.appearance = appearance;const mount = document.body.appendChild(document.createElement('div')),h = {initial: state,changes: 0} as unknown as Harness;
const contextPath = '/tests/region-context.ts', {mountRegion} = await import(contextPath);
    const recipePath = '/examples/assemblies/runtime.ts',{composeRuntime} = await import(recipePath),session = composeRuntime(state,{onCostsChange() {h.changes++;}});
    h.session = session;h.shared = mountRegion(mount,session.part,'panels',appearance);session.updateCostsVisible(costs);
        h.root = mount.querySelector('.pui-run-status')!;h.root.open = open;window.runtimePartsHarness = h;
  },{state,appearance,open,costs});
}

test('native description pairs and the fixed metrics scroll area are content-only parts',async ({page}) => {
  await page.goto('/tests/fixture.html');const value = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path),rejects = (action: () => unknown) => {try {action();return false;} catch {return true;}};
    const list = p.createDescriptionListPart({entries: [{key: 'one',label: 'First',value: 'One'},{key: 'two',label: 'Second',value: 'Two'}]}),bad = [rejects(() => p.createScrollAreaPart({purpose: 'pixels',children: [list]})),rejects(() => p.createScrollAreaPart({purpose: 'metrics',height: 300,children: [list]}))];
    const scroll = p.createScrollAreaPart({purpose: 'metrics',children: [list]}),root = p.createDisclosurePart({purpose: 'status',title: 'Runtime',open: true,children: [scroll]}),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,root),before = mount.innerHTML;
    const invalid = [rejects(() => list.update([{key: 'one',label: 'Changed',value: 'One'},{key: 'one',label: 'Duplicate',value: 'Other'}])),rejects(() => list.update([{key: 'one',label: 'Changed',value: 10}]))],unchanged = mount.innerHTML === before;
    const result = {bad,invalid,unchanged,tags: [...mount.querySelector('dl')!.children].map(node => node.localName),scroll: mount.querySelector('[id$="run-status-details"]')!.localName,leaks: [list,scroll].some(part => Object.values(part).some(value => value instanceof Node))};tree.destroy();return result;
  });expect(value).toEqual({bad: [true,true],invalid: [true,true],unchanged: true,tags: ['dt','dd','dt','dd'],scroll: 'div',leaks: false});
});

const states: Record<string,State> = {basic: initial,optional: {...initial,provider: 'Example provider',thinkingLevel: 'High'},empty: {...initial,summary: 'Not recorded',duration: '',speed: '',inputTokens: '',outputTokens: '',cacheRead: '',cacheWrite: '',contextTokens: '',contextWindow: '',compactions: '',toolFailures: '',recordedCost: '',latestCost: ''},long: {...initial,provider: 'A long provider identifier '.repeat(10),thinkingLevel: 'A detailed thinking level '.repeat(5),summary: 'A long task status summary '.repeat(8)},hidden: {...initial,visible: false}};

test('timing updates retain definition nodes, selection and disclosure state across optional metric changes',async ({page}) => {
  await openRuntime(page,states.optional);await page.evaluate(() => {
    const h = window.runtimePartsHarness,terms = [...h.root.querySelectorAll('dt')];h.duration = terms.find(node => node.textContent === 'Latest task duration')!.nextElementSibling!;h.selected = terms.find(node => node.textContent === 'Provider')!.nextElementSibling!;
    const range = document.createRange();range.selectNodeContents(h.selected);getSelection()!.removeAllRanges();getSelection()!.addRange(range);h.session.updateTiming({summary: 'Updated timing',duration: '1m 13s',speed: '18.7'});
  });expect(await page.evaluate(() => {const h = window.runtimePartsHarness;return {summary: h.root.querySelector('summary')!.textContent,duration: h.duration!.textContent,selection: getSelection()!.toString(),same: [...h.root.querySelectorAll('dt')].find(node => node.textContent === 'Latest task duration')!.nextElementSibling === h.duration,open: h.root.open};})).toEqual({summary: 'Updated timing',duration: '1m 13s',selection: 'Example provider',same: true,open: true});
  await page.evaluate(() => {const h = window.runtimePartsHarness;h.session.update(h.initial);h.session.update({...h.initial,thinkingLevel: undefined});});expect(await page.evaluate(() => {const h = window.runtimePartsHarness;return [...h.root.querySelectorAll('dt')].find(node => node.textContent === 'Latest task duration')!.nextElementSibling === h.duration;})).toBe(true);
});

test(`${'parts'} disclosures emit lazy cost intent and hiding does not implicitly close them`,async ({page}) => {
  await openRuntime(page,initial,'light',false,true);await page.locator('.pui-run-status > summary').click();await expect.poll(() => page.evaluate(() => window.runtimePartsHarness.changes)).toBe(1);await page.locator('.pui-cost-requests > summary').click();await expect.poll(() => page.evaluate(() => window.runtimePartsHarness.changes)).toBe(2);
  expect(await page.evaluate(() => window.runtimePartsHarness.session.readCosts())).toEqual({open: true,runtimeOpen: true});await page.evaluate(() => window.runtimePartsHarness.session.updateCostsVisible(false));expect(await page.evaluate(() => window.runtimePartsHarness.session.readCosts())).toEqual({open: true,runtimeOpen: true});await page.evaluate(() => window.runtimePartsHarness.session.resetCosts());expect(await page.evaluate(() => window.runtimePartsHarness.session.readCosts())).toEqual({open: false,runtimeOpen: true});
});

test('a shared runtime owner preserves metrics through appearance changes and retires hidden initial state on disposal',async ({page}) => {
  for (const visible of [false,true]) {
    await page.goto('/tests/fixture.html');const value = await page.evaluate(async ({initial,visible}) => {
      const recipePath = '/examples/assemblies/runtime.ts',partsPath = '/src/parts/index.ts',{composeRuntime} = await import(recipePath),p = await import(partsPath);let changes = 0;const session = composeRuntime({...initial,visible},{onCostsChange() {changes++;}}),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,p.createStackPart({children: [session.part]}));tree.setAppearance('dark');session.update(initial);const node = mount.querySelector('dd');tree.destroy();session.update(initial);session.updateTiming({summary: 'Late',duration: 'Late',speed: 'Late'});session.updateCostsVisible(true);session.resetCosts();session.destroy();return {children: mount.childElementCount,changes,detached: !node?.isConnected,costs: session.readCosts()};
    },{initial,visible});expect(value).toEqual({children: 0,changes: 0,detached: true,costs: {open: false,runtimeOpen: false}});
  }
});
