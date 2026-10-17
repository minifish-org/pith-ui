import {test,expect,type Page} from '@playwright/test';

interface Request {id: string;purpose: string;status: string;provider: string;providerName?: string;model: string;modelName?: string;time: string;source: string;price: unknown;known: boolean;usage: {input: number;output: number;cacheRead: number;cacheWrite: number;reasoning?: number;cost: {total: number}}}
interface Report {unknownRequests: number;requests: readonly Request[]|null}
interface Ledger {update(report: Report): void;loading(): void;setError(message: string): void;clear(): void;destroy(): void}
interface Harness {ledger: Ledger;root: HTMLElement;report: Report;row?: Element;details?: HTMLDetailsElement;selected?: Element;owner?: {setAppearance(mode: 'light'|'dark'): void;destroy(): void}}
declare global {interface Window {costPartsHarness: Harness}}
const request: Request = {id: 'request-1',purpose: 'Conversation',status: 'completed',provider: 'example',providerName: 'Example provider',model: 'example-model',modelName: 'Example model',time: '10:24:36',source: 'Saved provider price',price: {input: 2,output: 8,cacheRead: 0.2},known: true,usage: {input: 1234,output: 567,cacheRead: 120,cacheWrite: 40,reasoning: 80,cost: {total: 0.007004}}};
const report: Report = {unknownRequests: 0,requests: [request]};
type Mode = 'report'|'loading'|'error'|'clear';
async function openLedger(page: Page,old: boolean,value: Report = report,appearance: 'light'|'dark' = 'light',mode: Mode = 'report',expanded = false): Promise<void> {
  await page.goto('/tests/fixture.html');await page.evaluate(async ({old,value,appearance,mode,expanded}) => {
    document.body.dataset.appearance = appearance;const mount = document.body.appendChild(document.createElement('div')),appPath = '/src/app/index.ts',{createApplication} = await import(appPath),app = createApplication(mount,{appearance});
    app.workspace.updateRuntime({visible: true,summary: 'Recorded task',duration: '',speed: '',inputTokens: '',outputTokens: '',cacheRead: '',cacheWrite: '',contextTokens: '',contextWindow: '',compactions: '',toolFailures: '',recordedCost: '',latestCost: ''});app.workspace.updateCosts({visible: true});
    let root = mount.querySelector<HTMLElement>('.pui-cost-requests > div')!,ledger: Ledger,owner: Harness['owner'];
    if (old) ledger = {update: report => app.workspace.updateCosts({visible: true,report}),loading: () => app.workspace.updateCosts({visible: true,loading: true}),setError: error => app.workspace.updateCosts({visible: true,error}),clear: app.workspace.resetCosts,destroy: app.destroy};
    else {
      const clone = mount.firstElementChild!.cloneNode(true);app.destroy();mount.replaceChildren(clone);root = mount.querySelector<HTMLElement>('.pui-cost-requests > div')!;
      const recipePath = '/examples/assemblies/cost-ledger.ts',partsPath = '/src/parts/index.ts',{composeCostLedger} = await import(recipePath),p = await import(partsPath),session = composeCostLedger(),holder = document.createElement('div');owner = p.mountParts(holder,session.part,{appearance});const native = holder.firstElementChild as HTMLElement;root.replaceWith(native);root = native;ledger = session;
    }
    if (mode === 'report') ledger.update(value);else if (mode === 'loading') ledger.loading();else if (mode === 'error') ledger.setError('Unable to load <request> prices');else ledger.clear();
    mount.querySelector<HTMLDetailsElement>('.pui-run-status')!.open = true;mount.querySelector<HTMLDetailsElement>('.pui-cost-requests')!.open = true;if (expanded) for (const node of root.querySelectorAll('details')) node.open = true;
    window.costPartsHarness = {ledger,root,report: value,owner};
  },{old,value,appearance,mode,expanded});
}
async function presentation(page: Page): Promise<unknown> {return page.evaluate(async () => {
  await document.fonts.ready;for (const animation of document.getAnimations()) if (animation.effect?.getTiming().iterations !== Infinity) animation.finish();const root = window.costPartsHarness.root,origin = root.getBoundingClientRect();
  const inspect = (node: Element) => {const style = getComputedStyle(node),box = node.getBoundingClientRect();return {tag: node.localName,text: [...node.childNodes].filter(child => child.nodeType === Node.TEXT_NODE).map(child => child.textContent).join(''),hidden: node.hasAttribute('hidden'),open: node instanceof HTMLDetailsElement ? node.open : undefined,colSpan: node instanceof HTMLTableCellElement ? node.colSpan : undefined,box: [box.x-origin.x,box.y-origin.y,box.width,box.height].map(value => Math.round(value*100)/100),styles: ['display','font-family','font-size','font-weight','line-height','color','background-color','margin-top','margin-right','margin-bottom','margin-left','padding-top','padding-right','padding-bottom','padding-left','border-top-width','border-bottom-width','border-bottom-color','text-align','vertical-align','white-space','overflow-x','overflow-y','min-width','max-width','border-collapse'].map(key => style.getPropertyValue(key))};};return [root,...root.querySelectorAll('*')].map(inspect);
});}

test('native table rows, literal cells, plain prices and line breaks expose no presentation escape',async ({page}) => {
  await page.goto('/tests/fixture.html');const result = await page.evaluate(async () => {
    const path = '/src/parts/index.ts',p = await import(path),rejects = (fn: () => unknown) => {try {fn();return false;} catch {return true;}},content = p.createTextPart({role: 'strong',text: 'Request'});
    const rejected = [rejects(() => p.createTableRowPart({cells: [[content]],style: {padding: 9}})),rejects(() => p.createTableRowPart({cells: [[content],document.createElement('td')]}))];
    const row = p.createTableRowPart({cells: [[content,p.createLineBreakPart(),p.createTextPart({role: 'small',text: 'Time'}),p.createPreformattedPart({kind: 'plain',text: '{"price":1}'})],'1']}),table = p.createTablePart({headers: ['Request','Input'],rows: [row],emptyLabel: 'No recorded requests yet.'}),root = p.createContentViewportPart({purpose: 'plain',content: [table]}),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,root),before = mount.innerHTML;
    const invalid = [rejects(() => row.update({cells: ['Overwrite opaque','2']})),rejects(() => row.update({cells: [undefined,'2','3']})),rejects(() => table.replaceRows([p.createStackPart({children: []})])),rejects(() => table.replaceRows([p.createTableRowPart({cells: ['short']})]))],unchanged = before === mount.innerHTML;
    row.update({cells: [undefined,'2']});const tags = [...mount.querySelector('tbody tr')!.children].map(node => node.localName),firstTags = [...mount.querySelector('tbody td')!.children].map(node => node.localName),value = mount.querySelector('tbody tr')!.lastElementChild!.textContent,leaks = [row,table,root].some(part => Object.values(part).some(value => value instanceof Node));tree.destroy();return {rejected,invalid,unchanged,tags,firstTags,value,leaks};
  });expect(result).toEqual({rejected: [true,true],invalid: [true,true,true,true],unchanged: true,tags: ['td','td'],firstTags: ['strong','br','small','pre'],value: '2',leaks: false});
});

const states: Record<string,Report> = {known: report,empty: {unknownRequests: 0,requests: []},null: {unknownRequests: 0,requests: null},unknown: {unknownRequests: 1,requests: [{...request,known: false,providerName: undefined,modelName: undefined,usage: {...request.usage,reasoning: undefined}}]},multiple: {unknownRequests: 2,requests: [request,{...request,id: 'request-2',purpose: '<Context summary>',status: 'retrying',source: 'Unpriced local model <source>',price: null,known: false,usage: {...request.usage,input: 0,reasoning: 0}},{...request,id: 'request-3',providerName: 'Long provider '.repeat(12),modelName: 'Long model '.repeat(15),source: 'A long saved source '.repeat(15)}]}};
for (const appearance of ['light','dark'] as const) for (const [name,value] of Object.entries(states)) test(`${appearance} request ledger ${name} preserves the actual table and price disclosure`,async ({page}) => {
  await page.emulateMedia({colorScheme: appearance === 'dark' ? 'light' : 'dark'});await openLedger(page,true,value,appearance,'report',true);const old = await presentation(page);await openLedger(page,false,value,appearance,'report',true);expect(await presentation(page)).toEqual(old);
});
for (const mode of ['loading','error','clear'] as const) test(`${mode} is the original direct literal ledger state`,async ({page}) => {await openLedger(page,true,report,'light',mode);const old = await presentation(page);await openLedger(page,false,report,'light',mode);expect(await presentation(page)).toEqual(old);});
test('narrow ledger retains its native horizontal viewport',async ({page}) => {await page.setViewportSize({width: 390,height: 844});await openLedger(page,true,states.multiple,'dark','report',true);const old = await presentation(page);await openLedger(page,false,states.multiple,'dark','report',true);expect(await presentation(page)).toEqual(old);});

for (const old of [true,false]) test(`${old ? 'actual old' : 'parts'} row updates retain disclosure, native selection and loading reports`,async ({page}) => {
  await openLedger(page,old);const result = await page.evaluate(({request}) => {
    const h = window.costPartsHarness;h.row = h.root.querySelector('tbody tr')!;h.details = h.row.querySelector('details')!;h.details.open = true;h.selected = h.row.querySelector('strong')!;const range = document.createRange();range.selectNodeContents(h.selected);getSelection()!.removeAllRanges();getSelection()!.addRange(range);h.ledger.update({unknownRequests: 1,requests: [{...request,usage: {...request.usage,input: 4321}}]});const selection = getSelection()!.toString(),same = h.root.querySelector('tbody tr') === h.row,open = h.details.open;h.ledger.loading();const retained = h.root.contains(h.row);h.ledger.update({unknownRequests: 0,requests: []});h.ledger.loading();const emptyRetained = !!h.root.querySelector('td[colspan="5"]');h.ledger.setError('Error');h.ledger.loading();const loading = h.root.textContent;h.ledger.clear();return {same,open,selection,retained,emptyRetained,loading,cleared: h.root.childNodes.length};
  },{request});expect(result).toEqual({same: true,open: true,selection: 'Conversation · completed',retained: true,emptyRetained: true,loading: 'Loading request breakdown…',cleared: 0});
});
test('ledger parent disposal retires empty and populated compositions before late reports',async ({page}) => {
  await page.goto('/tests/fixture.html');const result = await page.evaluate(async report => {
    const recipePath = '/examples/assemblies/cost-ledger.ts',partsPath = '/src/parts/index.ts',{composeCostLedger} = await import(recipePath),p = await import(partsPath),results = [];
    for (const populated of [false,true]) {const ledger = composeCostLedger(),mount = document.body.appendChild(document.createElement('div')),tree = p.mountParts(mount,p.createStackPart({children: [ledger.part]}));if (populated) ledger.update(report);tree.setAppearance('dark');tree.destroy();ledger.update(report);ledger.loading();ledger.setError('Late');ledger.clear();ledger.destroy();results.push(mount.childNodes.length);}return results;
  },report);expect(result).toEqual([0,0]);
});
