import {scopeIds} from '../forms/identity.js';
import type { ActionResult, UIBlock } from '../core.js';
import { escape, icon, uniqueId, setText } from '../dom.js';
import {adoptAction,adoptFeedback,adoptProductParts} from '../foundations.js';
import {permissionControlElement} from './permission-element.js';
import {reconcileKeyed} from '../reconcile.js';
export interface FullAccessState {title?: string; error?: string; disabled?: boolean}
export interface FullAccessOptions {idPrefix?: string; onConfirm?: () => ActionResult | Promise<ActionResult>}
export function createFullAccessConfirmation(initial: FullAccessState, options: FullAccessOptions = {}): UIBlock<FullAccessState> & {readonly confirmButton: HTMLButtonElement} {
 const state = initial; const element = document.createElement('div'); element.className = 'pui-full-access-confirmation'; element.innerHTML = `<div class="pui-modal-heading"><div><span class="pui-eyebrow">CONVERSATION PERMISSIONS</span><h2 id="full-access-title">Enable full access?</h2></div><button type="button" class="pui-quiet-icon" data-pui-close data-close="permissions-dialog" aria-label="Cancel full access">${icon('close')}</button></div><p class="pui-modal-description">Give Pith permission to run <strong>all enabled tools, including external MCP connections,</strong> without asking in <strong data-permission-target>${escape(state.title || 'this conversation')}</strong>.</p><div class="pui-full-access-explanation">${icon('shield')}<div><strong>This is access to your computer account and connected services.</strong><p>Commands can read, change, or delete files outside the workspace and access the network. External tools can act on their connected services. There is no OS sandbox.</p></div></div><p class="pui-permission-revoke-note">This applies only to the current conversation and stays enabled across app restarts until you revoke it. To revoke it, choose “Ask before changes” or “Allow workspace changes” in the composer. Workspace permission alone never grants external MCP tools access.</p><div id="permissions-error" class="pui-form-error" role="alert"></div><div class="pui-modal-footer"><button class="pui-secondary-button" type="button" data-pui-close data-close="permissions-dialog">Cancel</button><button class="pui-primary-button pui-full-access-confirm" id="enable-full-access" type="button">Enable full access</button></div>`;
 let destroyed = false; const confirmButton = element.querySelector<HTMLButtonElement>('#enable-full-access')!; const error = element.querySelector<HTMLElement>('#permissions-error')!;
 let current = initial;
 const feedback = adoptFeedback(error,{presentation:'inline',autoHide:false});
 const action = adoptAction(confirmButton,{onAction:options.onConfirm ? () => {update({...current,error:''}); return options.onConfirm!();} : undefined,onError:message => {update({...current,error:message});}});
 const update = (state: Readonly<FullAccessState>) => {if (destroyed) return; current = state; setText(element.querySelector<HTMLElement>('[data-permission-target]')!,state.title || 'this conversation'); action.update({disabled: !!state.disabled}); if (state.error !== undefined) feedback.update({message:state.error,tone:'error'});}; update(initial); scopeIds(element, options.idPrefix ?? uniqueId('pui-full-access') + '-');
 return {element, confirmButton, update, destroy() {if (destroyed) return; destroyed = true; action.destroy(); feedback.destroy(); element.remove();}};
}
export interface TaskFailureState {visible: boolean; message: string; advice: string; canContinue: boolean; workspaceId?: string}
export function createTaskFailure(initial: TaskFailureState, options: {element?: HTMLElement; onContinue?: () => void; onSettings?: () => void; onDiagnostics?: () => void} = {}): UIBlock<TaskFailureState> {
 const element = options.element || document.createElement('section'); if (!options.element) element.className = 'pui-task-failure';
 const message = document.createElement('strong'), advice = document.createElement('p'), actions = document.createElement('div');
 type Action = 'continue' | 'settings' | 'diagnostics';
 type Row = {element: HTMLButtonElement; handle: ReturnType<typeof adoptAction>; stop?: (event: Event) => void};
 const rows = new Map<Action,Row>(); let destroyed = false;
 const release = (row: Row) => {if (row.stop) row.element.removeEventListener('click',row.stop); row.handle.destroy();};
 const update = (state: Readonly<TaskFailureState>) => {
   if (destroyed) return; element.hidden = !state.visible; if (!state.visible) return;
   if (message.parentElement !== element) element.replaceChildren(message,advice,actions);
   setText(message,state.message); setText(advice,state.advice);
   const views: Array<{action: Action; label: string; callback?: () => void}> = [{action:state.canContinue ? 'continue' : 'settings',label:state.canContinue ? 'Review and continue' : 'Check model settings',callback:state.canContinue ? options.onContinue : options.onSettings},{action:'diagnostics',label:'Save diagnostics',callback:options.onDiagnostics}];
   reconcileKeyed(actions,rows,views,{key:view=>view.action,element:row=>row.element,create(view) {
     const button = document.createElement('button'); button.type = 'button'; button.className = 'pui-secondary-button'; button.dataset.action = view.action;
     const stop = view.callback ? (event: Event) => event.stopPropagation() : undefined; if (stop) button.addEventListener('click',stop);
     return {element:button,handle:adoptAction(button,{onAction:view.callback}),stop};
   },update(row,view) {row.handle.update({label:view.label}); if (view.action === 'continue') {row.element.dataset.idleAction = ''; row.element.dataset.idleWorkspace = state.workspaceId || '';}},destroy:release});
 };
 update(initial); return {element,update,destroy() {if (destroyed) return; destroyed = true; for (const row of rows.values()) release(row); rows.clear(); if (!options.element) element.remove();}};
}
export interface PermissionControlState {mode: string; description: string; disabled?: boolean}
export function createPermissionControl(initial: PermissionControlState, options: {element?: HTMLElement; descriptionElement?: HTMLElement; onChange?: (value: string) => void} = {}): UIBlock<PermissionControlState> {
 const element = options.element || permissionControlElement();
 const selector = element.querySelector<HTMLSelectElement>('select')!; const abort = new AbortController(); let destroyed = false;
 if (options.descriptionElement) {if (!options.descriptionElement.id) options.descriptionElement.id = uniqueId('pui-permission-description'); selector.setAttribute('aria-describedby', options.descriptionElement.id);} else selector.removeAttribute('aria-describedby');
 const parts = adoptProductParts(element); const control = parts.control(selector);
 const update = (state: Readonly<PermissionControlState>) => {if (destroyed) return; control.reset(state.mode); control.update({disabled:!!state.disabled}); element.classList.toggle('pui-full-access', state.mode === 'full-access'); if (options.descriptionElement) {options.descriptionElement.textContent = state.description; options.descriptionElement.classList.toggle('pui-full-access-note', state.mode === 'full-access');} else selector.title = state.description;};
 selector.addEventListener('change', () => options.onChange?.(selector.value), {signal:abort.signal}); update(initial);
 return {element, update, destroy() {if (destroyed) return; destroyed = true; parts.destroy(); abort.abort(); if (!options.element) element.remove();}};
}
