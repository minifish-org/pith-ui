import {scopeIds} from './identity.js';
import type { UIBlock } from '../core.js';
import { dialogHeading, escape, showDialogError, uniqueId } from '../dom.js';

export interface DialogContent {element: HTMLElement; destroy(): void}
export interface FeatureDialogState {title: string; body: Node | DialogContent}
export interface FeatureDialogOptions {dialog?: HTMLDialogElement; content?: HTMLElement; dialogId?: string; titleId?: string; errorId?: string; eyebrow?: string}
export function createFeatureDialogFrame(options: FeatureDialogOptions = {}): UIBlock<FeatureDialogState> & {open(state: FeatureDialogState): void; close(): void; fail(message: string): void} {
  const dialog = options.dialog || document.createElement('dialog');
  const content = options.content || document.createElement('div');
  const dialogId = options.dialogId || uniqueId('pui-feature-dialog');
  const titleId = options.titleId || `${dialogId}-title`;
  const errorId = options.errorId || `${dialogId}-error`;
  if (!options.dialog) {dialog.id = dialogId; dialog.className = 'pui-modal pui-feature-modal pui-feature-dialog'; dialog.setAttribute('aria-labelledby', titleId); dialog.append(content);}
  let current: DialogContent | null = null; let destroyed = false;
  const clear = (keep?: DialogContent) => {if (current !== keep) current?.destroy(); current = null; content.replaceChildren(); content.onclick = null;};
  const update = (state: Readonly<FeatureDialogState>) => {
    if (destroyed) return;
    const active = document.activeElement;
    const restoreFocus = dialog.open && !!active && (content.contains(active) || active === dialog || active === document.body);
    const activeId = restoreFocus ? active?.id : '';
    clear(state.body instanceof Node ? undefined : state.body);
    content.innerHTML = dialogHeading(state.title, titleId, dialogId, options.eyebrow || '') + `<p id="${escape(errorId)}" data-dialog-error class="pui-form-error" role="alert"></p>`;
    const body = state.body instanceof Node ? state.body : state.body.element;
    content.insertBefore(body, content.querySelector('[data-dialog-error]'));
    if (!(state.body instanceof Node)) current = state.body;
    if (restoreFocus) {
      const previous = activeId ? Array.from(content.querySelectorAll<HTMLElement>('[id]')).find((node) => node.getAttribute('id') === activeId) : null;
      const target = previous || content.querySelector<HTMLElement>('[data-close]');
      target?.focus({preventScroll: true});
    }
  };
  const onClose = () => {if (!dialog.open) clear();};
  const onClick = (event: Event) => {const button = (event.target as HTMLElement).closest<HTMLElement>('[data-close]'); if (button?.dataset.close === dialogId && dialog.open) dialog.close();};
  dialog.addEventListener('close', onClose); dialog.addEventListener('click', onClick);
  return {element: dialog, update, open(state) {update(state); if (!destroyed && !dialog.open) dialog.showModal();}, close() {if (dialog.open) dialog.close();}, fail(message) {showDialogError(content, message);}, destroy() {if (destroyed) return; destroyed = true; dialog.removeEventListener('close', onClose); dialog.removeEventListener('click', onClick); clear(); if (!options.dialog) dialog.remove();}};
}
export function createFeatureStatus(state: {message: string; error?: boolean}): UIBlock<{message: string; error?: boolean}> {
  const element = document.createElement('p');
  const update = (state: {message: string; error?: boolean}) => {element.textContent = state.message; element.className = state.error ? 'pui-form-error' : 'pui-feature-hint'; element.setAttribute('role', state.error ? 'alert' : 'status');};
  update(state); return {element, update, destroy() {element.remove();}};
}
export function createSDKDialogElements(options: {idPrefix?: string} = {}): {dialog: HTMLDialogElement; content: HTMLElement; oauthDialog: HTMLDialogElement; oauthContent: HTMLElement; destroy(): void} {
  const dialog = document.createElement('dialog'); dialog.id = 'sdk-dialog'; dialog.className = 'pui-modal pui-feature-modal'; dialog.setAttribute('aria-labelledby', 'sdk-title');
  const content = document.createElement('div'); content.id = 'sdk-content'; dialog.append(content);
  const oauthDialog = document.createElement('dialog'); oauthDialog.id = 'oauth-dialog'; oauthDialog.className = 'pui-modal'; oauthDialog.setAttribute('aria-labelledby', 'oauth-title');
  const oauthContent = document.createElement('div'); oauthContent.id = 'oauth-content'; oauthDialog.append(oauthContent);
  const prefix = options.idPrefix ?? uniqueId('pui-sdk') + '-'; scopeIds(dialog, prefix); scopeIds(oauthDialog, prefix);
  return {dialog, content, oauthDialog, oauthContent, destroy() {dialog.remove(); oauthDialog.remove();}};
}
