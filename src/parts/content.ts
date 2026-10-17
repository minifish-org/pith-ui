import type {ActionResult} from '../core.js';
import {adoptAction, type ActionController} from '../foundations.js';
import {uniqueId} from '../dom.js';
import {renderMarkdown, renderDiff, type LocalContentLink} from '../content/markdown.js';
import {patchChildren} from '../content/views.js';
import {createCopyFeedback} from '../files/systems.js';
import {assertOptions, createOwnedPart, isPartAlive, type Part} from './ownership.js';

export type ContentActionResult = void | ActionResult | Promise<void | ActionResult>;
export type {LocalContentLink};
export interface MarkdownPartState {text: string; disabled?: boolean; hidden?: boolean}
export interface MarkdownPartOptions extends MarkdownPartState {
  resolveLocalLink?(href: string): LocalContentLink | null;
  onLocalFile?(target: Readonly<LocalContentLink>): ContentActionResult;
  onCopyCode?(text: string): ContentActionResult;
  onError?(message: string): void;
}
export interface MarkdownPart extends Part {update(state: Readonly<MarkdownPartState>): void}
const markdownKeys = ['text', 'disabled', 'hidden'];
function validateContent(state: {text: string; hidden?: boolean; disabled?: boolean}): void {
  if (typeof state.text !== 'string') throw new TypeError('Content must be text.');
  for (const key of ['hidden', 'disabled'] as const) if (state[key] !== undefined && typeof state[key] !== 'boolean') throw new TypeError(`Content ${key} must be boolean.`);
}

/** Sanitized content flow. Copy/link callbacks receive data, never rendered nodes. */
export function createMarkdownPart(options: MarkdownPartOptions): MarkdownPart {
  assertOptions(options, [...markdownKeys, 'resolveLocalLink', 'onLocalFile', 'onCopyCode', 'onError'], 'Markdown'); validateContent(options);
  for (const key of ['resolveLocalLink', 'onLocalFile', 'onCopyCode', 'onError'] as const) if (options[key] !== undefined && typeof options[key] !== 'function') throw new TypeError(`Markdown ${key} must be a callback.`);
  const node = document.createElement('div'); node.className = 'pui-markdown';
  const status = document.createElement('span'); status.className = 'pui-sr-only'; status.id = uniqueId('pui-copy-status'); status.setAttribute('role', 'status');
  node.append(status);
  let text: string | undefined, disabled = !!options.disabled;
  const actions = new Map<HTMLButtonElement, ActionController>();
  const report = (error: unknown) => {if (isPartAlive(part)) options.onError?.(error instanceof Error ? error.message : String(error));};
  const copy = createCopyFeedback({status, isDisabled: () => disabled, onError: report});
  const syncActions = () => {
    for (const [button, action] of actions) if (!node.contains(button)) {action.destroy(); actions.delete(button);}
    for (const button of node.querySelectorAll<HTMLButtonElement>('[data-copy-code]')) {
      let action = actions.get(button);
      if (!action) {action = adoptAction(button); actions.set(button, action);}
      action.update({disabled});
    }
    for (const link of node.querySelectorAll<HTMLAnchorElement>('[data-download-path]')) {
      if (disabled) link.setAttribute('aria-disabled', 'true'); else link.removeAttribute('aria-disabled');
    }
  };
  const update = (state: Readonly<MarkdownPartState>) => {
    assertOptions(state, markdownKeys, 'Markdown state'); validateContent(state);
    if (!isPartAlive(part)) return;
    disabled = !!state.disabled; node.hidden = !!state.hidden;
    if (text !== state.text) {
      const next = document.createElement('div');
      next.innerHTML = renderMarkdown(state.text, {resolveLocalLink: options.resolveLocalLink});
      next.append(status.cloneNode(true));
      patchChildren(node, next);
      text = state.text;
    }
    syncActions();
  };
  const click = (event: MouseEvent) => {
    if (!isPartAlive(part) || !(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('[data-copy-code]');
    if (button && node.contains(button)) {
      event.preventDefault(); event.stopPropagation();
      if (disabled || button.disabled) return;
      const value = button.closest('.pui-code-block')?.querySelector('code')?.textContent ?? '';
      void copy.copy(button, async () => {
        const result = options.onCopyCode ? await options.onCopyCode(value) : await navigator.clipboard.writeText(value);
        if (result && !result.ok) throw new Error(result.error);
      }, 'Code copied');
      return;
    }
    const link = event.target.closest<HTMLAnchorElement>('[data-download-path]');
    if (!link || !node.contains(link)) return;
    event.preventDefault(); event.stopPropagation();
    if (disabled || !options.onLocalFile) return;
    const target = Object.freeze({path: link.dataset.downloadPath ?? '', conversationId: link.dataset.downloadConversation ?? ''});
    try {void Promise.resolve(options.onLocalFile(target)).then(result => {if (result && !result.ok) report(result.error);}, report);} catch (error) {report(error);}
  };
  node.addEventListener('click', click);
  const part = createOwnedPart(node, {update}, {dispose() {
    node.removeEventListener('click', click); copy.destroy();
    for (const action of actions.values()) action.destroy(); actions.clear();
  }});
  try {update({text: options.text, disabled: options.disabled, hidden: options.hidden});}
  catch (error) {part.destroy(); throw error;}
  return part;
}

export interface PreformattedPartState {text: string; label?: string; hidden?: boolean}
export interface PreformattedPart extends Part {update(state: Readonly<PreformattedPartState>): void}
export interface PreformattedPartOptions extends PreformattedPartState {kind?: 'text' | 'diff'}
/** Literal text or a line-oriented diff with the library's semantic colors. */
export function createPreformattedPart(options: PreformattedPartOptions): PreformattedPart {
  assertOptions(options, ['text', 'label', 'hidden', 'kind'], 'preformatted content'); validateContent(options);
  const kind = options.kind ?? 'text';
  if (!['text', 'diff'].includes(kind)) throw new TypeError('Unsupported preformatted content kind.');
  if (options.label !== undefined && typeof options.label !== 'string') throw new TypeError('Content label must be text.');
  const node = document.createElement('pre'); node.className = kind === 'diff' ? 'pui-approval-diff' : 'pui-file-preview-text';
  let text: string | undefined;
  const update = (state: Readonly<PreformattedPartState>) => {
    assertOptions(state, ['text', 'label', 'hidden'], 'preformatted state'); validateContent(state);
    if (state.label !== undefined && typeof state.label !== 'string') throw new TypeError('Content label must be text.');
    if (!isPartAlive(part)) return;
    node.hidden = !!state.hidden;
    if (state.label) node.setAttribute('aria-label', state.label); else node.removeAttribute('aria-label');
    if (text !== state.text) {
      const next = document.createElement('pre');
      if (kind === 'diff') next.innerHTML = renderDiff(state.text); else next.textContent = state.text;
      patchChildren(node, next); text = state.text;
    }
  };
  const part = createOwnedPart(node, {update}); update({text: options.text, label: options.label, hidden: options.hidden});
  return part;
}
