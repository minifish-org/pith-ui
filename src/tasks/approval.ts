import {scopeIds, localField} from '../forms/identity.js';
import type { UIBlock } from '../core.js';
import {escape, icon, uniqueId} from '../dom.js';
import {createPagedPreview, type PagedPreviewState} from '../content/paged-preview.js';
export interface ApprovalView {id: string; toolName: string; warning?: string; canAlwaysAllow: boolean; argsText: string; preview?: {kind: string; path: string; error?: string; diff?: string; truncated?: boolean}}
export interface ApprovalPanelState {approval: ApprovalView | null; disabled?: boolean}
export function createApprovalPanel(initial: ApprovalPanelState, options: {element?: HTMLElement; idPrefix?: string; onAction?: (id: string, action: 'deny' | 'always' | 'allow') => void} = {}): UIBlock<ApprovalPanelState> {
 const element = options.element || document.createElement('div'); if (!options.element) element.className = 'pui-approval-panel';
 const prefix = options.idPrefix ?? uniqueId('pui-approval') + '-';
 const $ = <T extends HTMLElement = HTMLElement>(id: string) => localField<T>(element, prefix + id);
 const abort = new AbortController(); let contentAbort = new AbortController(); let signature = ''; let destroyed = false; let previews: UIBlock<PagedPreviewState>[] = [];
 const update = (state: Readonly<ApprovalPanelState>) => {
   if (destroyed) return; const approval = state.approval; const next = JSON.stringify(approval);
   if (next !== signature) {signature = next; contentAbort.abort(); contentAbort = new AbortController(); for (const preview of previews) preview.destroy(); previews = [];
   const warning = approval?.warning || ''; const canAlwaysAllow = !!approval?.canAlwaysAllow; const preview = approval?.preview;
        const previewBody = preview?.error ? `<p class="pui-preview-note" role="status">${escape(preview.error)}</p>` : preview ? `<div id="approval-diff-preview"></div>${preview.truncated ? '<p class="pui-preview-note">Preview shortened. Expand Tool arguments for the complete change.</p>' : ''}` : '';
        const previewMarkup = preview ? `<div class="pui-approval-file"><strong>${preview.kind === 'create' ? 'Create file' : 'Modify file'}</strong><code>${escape(preview.path)}</code></div>${previewBody}` : '';
        const args = `<div id="approval-args-preview"></div>`;

   element.innerHTML = approval ? `<section class="pui-approval-card" aria-label="Tool approval required"><div class="pui-approval-heading">${icon('shield')}<div><strong>Pith needs your permission</strong><span>Review this action before it runs.</span></div><span class="pui-approval-badge">${escape(approval.toolName)}</span></div>${warning ? `<p class="pui-approval-warning">${escape(warning)}</p>` : ''}${previewMarkup}${preview ? `<details class="pui-approval-arguments" ${preview.error ? 'open' : ''}><summary>Tool arguments</summary>${args}</details>` : args}${canAlwaysAllow ? '<p class="pui-approval-scope">Workspace permission applies to this conversation. Commands and external connection tools still need approval.</p>' : ''}<div class="pui-approval-actions"><button class="pui-secondary-button" data-approval="deny" ${state.disabled ? 'disabled' : ''}>Deny</button>${canAlwaysAllow ? `<button class="pui-secondary-button pui-always-allow-button" data-approval="always" ${state.disabled ? 'disabled' : ''}>Always allow workspace changes</button>` : ''}<button class="pui-primary-button" data-approval="allow" ${state.disabled ? 'disabled' : ''}>${icon('check')}Allow this action</button></div></section>` : ''; for (const child of element.children) scopeIds(child as HTMLElement, prefix);
   for (const button of element.querySelectorAll<HTMLButtonElement>('[data-approval]')) button.dataset.approvalId = approval?.id || '';
   if (preview && !preview.error) previews.push(createPagedPreview({container: $<HTMLElement>('approval-diff-preview'), text: preview.diff || 'No content changes.', kind: 'diff'}));
   if (approval) {const argsContainer = $<HTMLElement>('approval-args-preview'); const details = argsContainer.closest('details'); let loaded = false; const showArgs = () => {if (destroyed || loaded || (details && !details.open)) return; loaded = true; previews.push(createPagedPreview({container: argsContainer, text: approval.argsText, kind: 'text'}));}; details?.addEventListener('toggle', showArgs, {signal:contentAbort.signal}); showArgs();}
   }
   for (const button of element.querySelectorAll<HTMLButtonElement>('[data-approval]')) button.disabled = !!state.disabled;
 };
 element.addEventListener('click', (event) => {const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-approval]'); if (button && !button.disabled) options.onAction?.(button.dataset.approvalId!, button.dataset.approval as 'deny' | 'always' | 'allow');}, {signal:abort.signal});
 update(initial); return {element, update, destroy() {if (destroyed) return; destroyed = true; abort.abort(); contentAbort.abort(); for (const preview of previews) preview.destroy(); if (!options.element) element.remove();}};
}
