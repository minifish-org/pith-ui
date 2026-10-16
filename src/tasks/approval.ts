import {scopeIds} from '../forms/identity.js';
import type { UIBlock } from '../core.js';
import {icon, uniqueId, setText} from '../dom.js';
import {createPagedPreview, type PagedPreviewState} from '../content/paged-preview.js';
import {adoptProductParts} from '../foundations.js';
export interface ApprovalView {id: string; toolName: string; warning?: string; canAlwaysAllow: boolean; argsText: string; preview?: {kind: string; path: string; error?: string; diff?: string; truncated?: boolean}}
export interface ApprovalPanelState {approval: ApprovalView | null; disabled?: boolean}
export function createApprovalPanel(initial: ApprovalPanelState, options: {element?: HTMLElement; idPrefix?: string; onAction?: (id: string, action: 'deny' | 'always' | 'allow') => void} = {}): UIBlock<ApprovalPanelState> {
 const element = options.element || document.createElement('div'); if (!options.element) element.className = 'pui-approval-panel';
 const prefix = options.idPrefix ?? uniqueId('pui-approval') + '-', parts = adoptProductParts(element), abort = new AbortController();
 let destroyed = false, current: ApprovalView | null = null, contentAbort = new AbortController();
 let card: HTMLElement | undefined, warning: HTMLElement, badge: HTMLElement, file: HTMLElement, fileKind: HTMLElement, path: HTMLElement, previewError: HTMLElement, diff: HTMLElement, shortened: HTMLElement, details: HTMLDetailsElement, args: HTMLElement, scope: HTMLElement, always: HTMLButtonElement;
 let diffBlock: UIBlock<PagedPreviewState> | undefined, argsBlock: UIBlock<PagedPreviewState> | undefined;
 const clear = () => {contentAbort.abort(); contentAbort = new AbortController(); diffBlock?.destroy(); argsBlock?.destroy(); diffBlock = argsBlock = undefined; card = undefined; element.replaceChildren();};
 const showArgs = () => {if (destroyed || !current || argsBlock || (current.preview && !details.open)) return; argsBlock = createPagedPreview({container:args,text:current.argsText,kind:'text'});};
 function create(): void {
   element.innerHTML = `<section class="pui-approval-card" aria-label="Tool approval required"><div class="pui-approval-heading">${icon('shield')}<div><strong>Pith needs your permission</strong><span>Review this action before it runs.</span></div><span class="pui-approval-badge"></span></div><p class="pui-approval-warning" hidden></p><div class="pui-approval-file" hidden><strong></strong><code></code></div><p class="pui-preview-note" role="status" hidden></p><div id="approval-diff-preview" hidden></div><p class="pui-preview-note" data-shortened hidden>Preview shortened. Expand Tool arguments for the complete change.</p><details class="pui-approval-arguments"><summary>Tool arguments</summary><div id="approval-args-preview"></div></details><p class="pui-approval-scope" hidden>Workspace permission applies to this conversation. Commands and external connection tools still need approval.</p><div class="pui-approval-actions"><button type="button" class="pui-secondary-button" data-approval="deny">Deny</button><button type="button" class="pui-secondary-button pui-always-allow-button" data-approval="always">Always allow workspace changes</button><button type="button" class="pui-primary-button" data-approval="allow">${icon('check')}Allow this action</button></div></section>`;
   card = element.firstElementChild as HTMLElement; scopeIds(card,prefix);
   warning = card.querySelector('.pui-approval-warning')!; badge = card.querySelector('.pui-approval-badge')!; file = card.querySelector('.pui-approval-file')!; fileKind = file.querySelector('strong')!; path = file.querySelector('code')!;
   previewError = card.querySelector('[role="status"]')!; diff = card.querySelector('[id$="approval-diff-preview"]')!; shortened = card.querySelector('[data-shortened]')!; details = card.querySelector('details')!; args = details.querySelector('div')!; scope = card.querySelector('.pui-approval-scope')!; always = card.querySelector('[data-approval="always"]')!;
   details.addEventListener('toggle',showArgs,{signal:contentAbort.signal});
 }
 const update = (state: Readonly<ApprovalPanelState>) => {
   if (destroyed) return; const approval = state.approval, changed = approval?.id !== current?.id; if (changed || !approval) clear(); current = approval;
   if (!approval) {parts.update(); return;}
   const fresh = !card; if (fresh) create(); const preview = approval.preview;
   setText(badge,approval.toolName); setText(warning,approval.warning || ''); warning.hidden = !approval.warning;
   file.hidden = !preview; if (preview) {setText(fileKind,preview.kind === 'create' ? 'Create file' : 'Modify file'); setText(path,preview.path);}
   previewError.hidden = !preview?.error; setText(previewError,preview?.error || '');
   diff.hidden = !preview || !!preview.error; shortened.hidden = !preview || !!preview.error || !preview.truncated;
   if (preview && !preview.error) {const value = {text:preview.diff || 'No content changes.',kind:'diff' as const}; if (diffBlock) diffBlock.update(value); else diffBlock = createPagedPreview({container:diff,...value});}
   else if (diffBlock) {diffBlock.destroy(); diffBlock = undefined;}
   if (preview) {if (args.parentElement !== details) details.append(args); if (details.parentElement !== card) card!.insertBefore(details,scope); if (fresh) details.open = !!preview.error;}
   else {if (args.parentElement !== card) card!.insertBefore(args,scope); details.remove();}
   showArgs(); argsBlock?.update({text:approval.argsText,kind:'text'});
   scope.hidden = !approval.canAlwaysAllow; always.hidden = !approval.canAlwaysAllow;
   for (const button of element.querySelectorAll<HTMLButtonElement>('[data-approval]')) {button.dataset.approvalId = approval.id; parts.action(button).update({disabled:!!state.disabled});}
   parts.update();
 };
 element.addEventListener('click', event => {const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-approval]'); if (button && !button.disabled && !button.hidden) options.onAction?.(button.dataset.approvalId!,button.dataset.approval as 'deny' | 'always' | 'allow');}, {signal:abort.signal});
 update(initial); return {element,update,destroy() {if (destroyed) return; destroyed = true; clear(); parts.destroy(); abort.abort(); contentAbort.abort(); if (!options.element) element.remove();}};
}
