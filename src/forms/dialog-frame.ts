import {scopeIds} from './identity.js';
import type { UIBlock } from '../core.js';
import { dialogHeading, uniqueId } from '../dom.js';
import { installDialogLifecycle } from '../surface.js';
import { adoptFeedback } from '../foundations.js';

export interface DialogContent {element: HTMLElement; destroy(): void}
export interface FeatureDialogState {title: string; body: Node | DialogContent}
export interface FeatureDialogOptions {dialog?: HTMLDialogElement; content?: HTMLElement; dialogId?: string; titleId?: string; errorId?: string; eyebrow?: string; onClose?: () => void}
export function createFeatureDialogFrame(options: FeatureDialogOptions = {}): UIBlock<FeatureDialogState> & {open(state: FeatureDialogState): void; close(): void; fail(message: string): void; isOpen(): boolean} {
  const dialog = options.dialog || document.createElement('dialog');
  const content = options.content || document.createElement('div');
  const dialogId = options.dialogId || dialog.id || uniqueId('pui-feature-dialog');
  const titleId = options.titleId || `${dialogId}-title`;
  const errorId = options.errorId || `${dialogId}-error`;
  dialog.id = dialogId;
  if (!options.dialog) dialog.className = 'pui-modal pui-feature-modal pui-feature-dialog';
  dialog.setAttribute('aria-labelledby', titleId);
  if (!dialog.contains(content)) dialog.append(content);
  const template = document.createElement('template');
  template.innerHTML = dialogHeading('', titleId, dialogId, options.eyebrow || '');
  const heading = template.content.firstElementChild as HTMLElement;
  const title = heading.querySelector('h2')!;
  const close = heading.querySelector<HTMLButtonElement>('[data-close]')!;
  const error = document.createElement('p'); error.id = errorId; error.dataset.dialogError = ''; error.className = 'pui-form-error'; error.setAttribute('role', 'alert');
  const feedback = adoptFeedback(error, {presentation: 'inline', autoHide: false});
  let current: DialogContent | null = null; let currentBody: Node | null = null; let destroyed = false;
  const clear = () => {current?.destroy(); current = null; currentBody = null; content.replaceChildren(); content.onclick = null;};
  const lifecycle = installDialogLifecycle(dialog, {onClose() { clear(); options.onClose?.(); }});
  const update = (state: Readonly<FeatureDialogState>) => {
    if (destroyed) return;
    const active = document.activeElement;
    const restoreFocus = dialog.open && !!active && (content.contains(active) || active === dialog || active === document.body);
    const activeId = restoreFocus ? active?.id : '';
    const body = state.body instanceof Node ? state.body : state.body.element;
    const next = state.body instanceof Node ? null : state.body;
    const changed = body !== currentBody;
    if (current !== next) current?.destroy();
    current = next;
    if (changed) {
      currentBody?.parentNode?.removeChild(currentBody);
      currentBody = body;
      content.replaceChildren(heading, body, error);
      content.onclick = null;
    } else if (heading.parentNode !== content) content.replaceChildren(heading, body, error);
    title.textContent = state.title;
    close.setAttribute('aria-label', `Close ${state.title.toLowerCase()}`);
    feedback.update({message: '', tone: 'error'});
    if (restoreFocus && changed) {
      const previous = activeId ? Array.from(content.querySelectorAll<HTMLElement>('[id]')).find((node) => node.getAttribute('id') === activeId) : null;
      const target = previous || content.querySelector<HTMLElement>('[data-close]');
      target?.focus({preventScroll: true});
    }
  };
  return {element: dialog, update, open(state) {update(state); if (!destroyed) lifecycle.open();}, close: lifecycle.close, isOpen: lifecycle.isOpen, fail(message) {if (!destroyed) feedback.update({message, tone: 'error'});}, destroy() {if (destroyed) return; destroyed = true; lifecycle.close(); lifecycle.destroy(); clear(); feedback.destroy(); if (!options.dialog) dialog.remove();}};
}
export function createFeatureStatus(state: {message: string; error?: boolean}): UIBlock<{message: string; error?: boolean}> {
  const element = document.createElement('p');
  const feedback = adoptFeedback(element, {presentation: 'inline', autoHide: false});
  const update = (state: {message: string; error?: boolean}) => {element.className = state.error ? 'pui-form-error' : 'pui-feature-hint'; feedback.update({message: state.message, tone: state.error ? 'error' : 'info'});};
  update(state); return {element, update, destroy() {feedback.destroy(); element.remove();}};
}
export function createSDKDialogElements(options: {idPrefix?: string} = {}): {dialog: HTMLDialogElement; content: HTMLElement; oauthDialog: HTMLDialogElement; oauthContent: HTMLElement; destroy(): void} {
  const dialog = document.createElement('dialog'); dialog.id = 'sdk-dialog'; dialog.className = 'pui-modal pui-feature-modal'; dialog.setAttribute('aria-labelledby', 'sdk-title');
  const content = document.createElement('div'); content.id = 'sdk-content'; dialog.append(content);
  const oauthDialog = document.createElement('dialog'); oauthDialog.id = 'oauth-dialog'; oauthDialog.className = 'pui-modal'; oauthDialog.setAttribute('aria-labelledby', 'oauth-title');
  const oauthContent = document.createElement('div'); oauthContent.id = 'oauth-content'; oauthDialog.append(oauthContent);
  const prefix = options.idPrefix ?? uniqueId('pui-sdk') + '-'; scopeIds(dialog, prefix); scopeIds(oauthDialog, prefix);
  return {dialog, content, oauthDialog, oauthContent, destroy() {dialog.remove(); oauthDialog.remove();}};
}
