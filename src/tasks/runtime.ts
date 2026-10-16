import {scopeIds} from '../forms/identity.js';
import type { UIBlock } from '../core.js';
import { setText, uniqueId } from '../dom.js';
import {reconcileKeyed} from '../reconcile.js';
export interface RuntimePanelState {visible: boolean; summary: string; duration: string; speed: string; provider?: string; thinkingLevel?: string; inputTokens: string; outputTokens: string; cacheRead: string; cacheWrite: string; contextTokens: string; contextWindow: string; compactions: string; toolFailures: string; recordedCost: string; latestCost: string}
export function createRuntimePanel(initial: RuntimePanelState, options: {element?: HTMLElement; idPrefix?: string; costs?: Node} = {}): UIBlock<RuntimePanelState> & {updateTiming(value: {summary: string; duration: string; speed: string}): void} {
 const element = options.element || document.createElement('details');
 if (!options.element) {element.className = 'pui-run-status pui-runtime-panel'; element.innerHTML = '<summary id="run-status-summary"></summary><div id="run-status-details"><div id="runtime-values"></div></div>'; if (options.costs) element.querySelector('#run-status-details')!.append(options.costs);}
 const summary = element.querySelector<HTMLElement>('#run-status-summary')!; const values = element.querySelector<HTMLElement>('#runtime-values')!; const prefix = options.idPrefix ?? uniqueId('pui-runtime') + '-'; for (const child of element.children) scopeIds(child as HTMLElement, prefix); let destroyed = false;
 const list = document.createElement('dl'), note = document.createElement('p');
 note.textContent = 'Duration and average speed cover the latest task, including tools and waits. Speed uses reported output tokens, including reasoning, retries and summaries; input, cache and earlier tasks are excluded. An interrupted checkpoint shows only a lower bound for duration. Session token figures come from Pith records. Context excludes system instructions and tool schemas. Costs estimate recorded requests; unknown prices and older unrecorded requests are excluded. This is not a provider bill.';
 const rows = new Map<string,HTMLElement>();
 const updateTiming = (state: {summary: string; duration: string; speed: string}) => {if (destroyed) return; setText(summary,state.summary); const duration = rows.get('duration-value'), speed = rows.get('speed-value'); if (duration) setText(duration,state.duration); if (speed) setText(speed,state.speed);};
 const update = (state: Readonly<RuntimePanelState>) => {
   if (destroyed) return; element.hidden = !state.visible;
   if (state.visible) {
     if (list.parentElement !== values) values.replaceChildren(list,note);
     const fields: Array<[string,string,string]> = [];
     if (state.provider) fields.push(['provider','Provider',state.provider]);
     if (state.thinkingLevel) fields.push(['thinking','Thinking effort',state.thinkingLevel]);
     fields.push(['duration','Latest task duration',state.duration],['speed','Avg. output tokens/s',state.speed],['tokens','Session input / output',`${state.inputTokens} / ${state.outputTokens}`],['cache','Cache read / write',`${state.cacheRead} / ${state.cacheWrite}`],['context','Estimated conversation context',`~${state.contextTokens} / ${state.contextWindow} tokens`],['compactions','Context summaries',state.compactions],['failures','Tool failures recorded',state.toolFailures],['recorded','Recorded cost (USD)',state.recordedCost],['latest','Latest task (USD)',state.latestCost],['execution','Execution','Codemode enabled · durable local task journal']);
     const entries = fields.flatMap(([id,label,value]) => [{key:id+'-label',tag:'dt',text:label,id},{key:id+'-value',tag:'dd',text:value,id}]);
     reconcileKeyed(list,rows,entries,{key:row=>row.key,element:row=>row,create(row) {const node = document.createElement(row.tag); if (row.tag === 'dd' && (row.id === 'duration' || row.id === 'speed')) {node.id = prefix+'runtime-'+row.id; node.setAttribute('data-runtime-'+row.id,'');} return node;},update(node,row) {setText(node,row.text);},destroy() {}});
   }
   updateTiming(state);
 };
 update(initial); return {element, update, updateTiming, destroy() {if (destroyed) return; destroyed = true; rows.clear(); if (!options.element) element.remove();}};
}
