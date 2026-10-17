import {iconElement, uniqueId} from '../dom.js';
import {installDialogLifecycle} from '../surface.js';
import {assertOptions, createOwnedPart, isPartAlive, replacePartChildren, type Part} from './ownership.js';

export interface DialogPartState {title: string; description?: string; eyebrow?: string; closeDisabled?: boolean}
export interface DialogPartOptions extends DialogPartState {
  purpose?: 'form' | 'prompt';
  children: readonly Part[];
  closeOnBackdrop?: boolean;
  onClose?(): void;
}
export interface DialogPart extends Part {
  update(state: Readonly<DialogPartState>): void;
  replace(children: readonly Part[]): void;
  open(): void;
  close(): void;
  isOpen(): boolean;
}

/** A standard native modal. Content and actions are independently composed parts. */
export function createDialogPart(options: DialogPartOptions): DialogPart {
  assertOptions(options, ['purpose', 'title', 'description', 'eyebrow', 'closeDisabled', 'children', 'closeOnBackdrop', 'onClose'], 'dialog');
  if (options.purpose !== undefined && !['form', 'prompt'].includes(options.purpose)) throw new TypeError('Unsupported dialog purpose.');
  const validate = (state: Readonly<DialogPartState>) => {
    if (typeof state.title !== 'string' || state.eyebrow !== undefined && typeof state.eyebrow !== 'string' || state.description !== undefined && typeof state.description !== 'string') throw new TypeError('Dialog heading must be text.');
    if (state.closeDisabled !== undefined && typeof state.closeDisabled !== 'boolean') throw new TypeError('Dialog closeDisabled must be boolean.');
  };
  validate(options);
  if (options.closeOnBackdrop !== undefined && typeof options.closeOnBackdrop !== 'boolean') throw new TypeError('Dialog closeOnBackdrop must be boolean.');
  if (options.onClose !== undefined && typeof options.onClose !== 'function') throw new TypeError('Dialog onClose must be a callback.');
  const prompt = options.purpose === 'prompt';
  const node = document.createElement('dialog'); node.className = prompt ? 'pui-dialog' : 'pui-modal'; node.id = uniqueId('pui-dialog');
  const heading = document.createElement(prompt ? 'header' : 'div'); heading.className = prompt ? 'pui-dialog-heading' : 'pui-dialog-heading pui-modal-heading';
  const content = document.createElement('div');
  const eyebrow = document.createElement('span'); eyebrow.className = 'pui-eyebrow';
  const title = document.createElement('h2'); title.id = uniqueId('pui-dialog-title');
  const description = document.createElement('p'); description.className = 'pui-muted'; description.id = uniqueId('pui-dialog-description');
  const close = document.createElement('button'); close.type = 'button'; close.className = prompt ? 'pui-button pui-neutral pui-normal pui-icon-button' : 'pui-icon-button pui-quiet-icon';
  close.dataset.close = node.id; close.append(iconElement('close'));
  const closeCaption = document.createElement('span'); closeCaption.className = 'pui-sr-only';
  if (prompt) close.append(closeCaption);
  content.append(eyebrow, title); if (prompt || options.description !== undefined) content.append(description);
  heading.append(content, close); node.setAttribute('aria-labelledby', title.id);
  const headingPart = createOwnedPart(heading, {});
  let bodyPart: Part | undefined;
  if (prompt) {const body = document.createElement('div'); body.className = 'pui-dialog-body'; bodyPart = createOwnedPart(body, {}, {children: options.children});}
  let state: Readonly<DialogPartState> = options;
  let part: DialogPart;
  const surface = installDialogLifecycle(node, {closeOnBackdrop: options.closeOnBackdrop ?? !prompt, canClose: () => !state.closeDisabled, onClose: options.onClose});
  const update = (next: Readonly<DialogPartState>) => {
    assertOptions(next, ['title', 'description', 'eyebrow', 'closeDisabled'], 'dialog state'); validate(next);
    if (!isPartAlive(part)) return;
    state = next;
    if (title.textContent !== next.title) title.textContent = next.title;
    if (eyebrow.textContent !== (next.eyebrow ?? '')) eyebrow.textContent = next.eyebrow ?? '';
    eyebrow.hidden = !next.eyebrow;
    if (description.textContent !== (next.description ?? '')) description.textContent = next.description ?? '';
    description.hidden = !next.description;
    if (next.description) {if (!description.parentNode) content.append(description); node.setAttribute('aria-describedby', description.id);} else node.removeAttribute('aria-describedby');
    const label = `Close ${prompt ? next.title : next.title.toLowerCase()}`;
    close.setAttribute('aria-label', label); closeCaption.textContent = label; close.disabled = !!next.closeDisabled;
  };
  try {
    part = createOwnedPart<Omit<DialogPart, keyof Part>>(node, {
      update,
      replace(children: readonly Part[]) {if (isPartAlive(part)) {if (bodyPart) replacePartChildren(bodyPart, children); else replacePartChildren(part, [headingPart, ...children]);}},
      open() {if (isPartAlive(part) && node.isConnected) surface.open();},
      close() {if (isPartAlive(part)) surface.close();},
      isOpen: () => isPartAlive(part) && surface.isOpen(),
    }, {children: bodyPart ? [headingPart, bodyPart] : [headingPart, ...options.children], dispose() {surface.close(); surface.destroy();}});
  } catch (error) {surface.destroy(); headingPart.destroy(); bodyPart?.destroy(); throw error;}
  update({title: options.title, description: options.description, eyebrow: options.eyebrow, closeDisabled: options.closeDisabled});
  return part;
}
