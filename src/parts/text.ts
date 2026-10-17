import {iconElement} from '../dom.js';
import {patchChildren} from '../content/views.js';
import {assertOptions, createOwnedPart, isPartAlive, type Part} from './ownership.js';

export const iconNames = ['steer', 'edit', 'trash', 'branch', 'compress', 'image', 'plus', 'chat', 'folder', 'settings', 'arrow', 'stop', 'chevron', 'down', 'close', 'check', 'shield', 'file', 'terminal', 'copy', 'menu', 'globe', 'search', 'more', 'compose', 'plug'] as const;
export type IconName = typeof iconNames[number];
export function assertIconName(name: unknown): asserts name is IconName {
  if (!iconNames.includes(name as IconName)) throw new TypeError('Unknown Pith UI icon.');
}

export interface TextPartState {text: string; hidden?: boolean; announce?: 'none' | 'polite'}
export type TextRole = 'text' | 'paragraph' | 'muted' | 'muted-paragraph' | 'path' | 'path-paragraph' | 'location' | 'footnote' | 'warning-paragraph' | 'scope-note' | 'surface-status' | 'note' | 'caption' | 'hint' | 'description' | 'eyebrow' | 'eyebrow-paragraph' | 'heading' | 'display-heading' | 'strong' | 'screenreader' | 'bubble' | 'interrupted' | 'section-title';
export interface TextPart extends Part {update(state: Readonly<TextPartState>): void}
const textParts = new WeakSet<Part>();
/** Internal capability check for text-only semantic references. */
export function isTextPart(part: Part): part is TextPart {return textParts.has(part) && isPartAlive(part);}
const textRoles = {
  text: ['span', ''], paragraph: ['p', ''], muted: ['span', 'pui-muted'], 'muted-paragraph': ['p', 'pui-muted'], path: ['span', 'pui-file-path'], 'path-paragraph': ['p', 'pui-file-path'], location: ['p', 'pui-file-preview-path'], footnote: ['p', 'pui-preview-note'], 'warning-paragraph': ['p', 'pui-approval-warning'], 'scope-note': ['p', 'pui-approval-scope'], note: ['p', 'pui-note'], hint: ['p', 'pui-field-hint'],
  caption: ['p', 'pui-feature-hint'], description: ['p', 'pui-modal-description'], eyebrow: ['span', 'pui-eyebrow'], 'eyebrow-paragraph': ['p', 'pui-eyebrow'], heading: ['h3', ''], 'display-heading': ['h1', 'pui-display-heading'], strong: ['strong', ''], screenreader: ['span', 'pui-sr-only'], bubble: ['div', 'pui-user-text'], interrupted: ['span', 'pui-message-error-label'], 'surface-status': ['p', 'pui-artifacts-status'], 'section-title': ['div', 'pui-section-heading'],
} as const;
function validateText(state: Readonly<TextPartState>): void {
  assertOptions(state, ['text', 'hidden', 'announce'], 'text state');
  if (typeof state.text !== 'string') throw new TypeError('Text content must be a string.');
  if (state.hidden !== undefined && typeof state.hidden !== 'boolean') throw new TypeError('Text hidden must be boolean.');
  if (state.announce !== undefined && !['none', 'polite'].includes(state.announce)) throw new TypeError('Unknown text announcement mode.');
}

/** A single semantic text node; the library owns its tag and presentation. */
export function createTextPart(options: TextPartState & {role?: TextRole}): TextPart {
  assertOptions(options, ['text', 'hidden', 'role', 'announce'], 'text');
  const initial = {text: options.text, hidden: options.hidden, announce: options.announce}; validateText(initial);
  const role = options.role ?? 'text';
  if (!Object.hasOwn(textRoles, role)) throw new TypeError('Unknown text role.');
  const [tag, className] = textRoles[role];
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (role === 'surface-status') node.setAttribute('role','status');
  const update = (state: Readonly<TextPartState>) => {
    validateText(state);
    if (!isPartAlive(part)) return;
    if (node.textContent !== state.text) {const source = document.createDocumentFragment(); source.append(document.createTextNode(state.text)); patchChildren(node, source);}
    node.hidden = !!state.hidden;
    if (state.announce === 'polite') node.setAttribute('aria-live', 'polite'); else node.removeAttribute('aria-live');
  };
  const part = createOwnedPart(node, {update});
  update(initial); textParts.add(part);
  return part;
}

export interface ContextNotePartState extends TextPartState {tone?: 'neutral'|'warning'}
export interface ContextNotePart extends TextPart {update(state: Readonly<ContextNotePartState>): void}
/** A short centered context hint with one bounded warning state. It is a
 * genuine text part and can describe a separate control without a wrapper. */
export function createContextNotePart(options: ContextNotePartState & {purpose?: 'context'|'attachment-guidance'}): ContextNotePart {
  const validate = (state: Readonly<ContextNotePartState>) => {
    assertOptions(state,['text','hidden','announce','tone'],'context note');
    const {tone,...text} = state;validateText(text);
    if (tone !== undefined && !['neutral','warning'].includes(tone)) throw new TypeError('Unsupported context note tone.');
  };
  assertOptions(options,['text','hidden','announce','tone','purpose'],'context note');
  const {purpose = 'context',...initial} = options;validate(initial);
  if (!['context','attachment-guidance'].includes(purpose)) throw new TypeError('Unsupported context note purpose.');
  const node = document.createElement('p');let part: ContextNotePart;
  const update = (state: Readonly<ContextNotePartState>) => {
    validate(state);if (!isPartAlive(part)) return;
    node.className = `pui-composer-note${purpose === 'attachment-guidance' ? ' pui-image-guidance' : ''}${state.tone === 'warning' ? ' pui-full-access-note' : ''}`;
    if (node.textContent !== state.text) {const source = document.createDocumentFragment();source.append(document.createTextNode(state.text));patchChildren(node,source);}
    node.hidden = !!state.hidden;
    if (state.announce === 'polite') node.setAttribute('aria-live','polite');else node.removeAttribute('aria-live');
  };
  part = createOwnedPart<Omit<ContextNotePart,keyof Part>>(node,{update});textParts.add(part);update(initial);return part;
}

export interface IconPartState {name: IconName; label?: string; hidden?: boolean}
export interface IconPart extends Part {update(state: Readonly<IconPartState>): void}
/** SVG is the part root, so composing an icon never adds a span wrapper. */
export function createIconPart(options: IconPartState): IconPart {
  assertOptions(options, ['name', 'label', 'hidden'], 'icon');
  assertIconName(options.name);
  const node = iconElement(options.name);
  let name = options.name;
  const update = (state: Readonly<IconPartState>) => {
    assertOptions(state, ['name', 'label', 'hidden'], 'icon state');
    if (!isPartAlive(part)) return;
    assertIconName(state.name);
    if (name !== state.name) {
      name = state.name;
      node.replaceChildren(...iconElement(name).childNodes);
    }
    if (state.label) {node.setAttribute('role', 'img'); node.setAttribute('aria-label', state.label); node.removeAttribute('aria-hidden');}
    else {node.removeAttribute('role'); node.removeAttribute('aria-label'); node.setAttribute('aria-hidden', 'true');}
    if (state.hidden) node.setAttribute('hidden', ''); else node.removeAttribute('hidden');
  };
  const part = createOwnedPart(node, {update});
  update(options);
  return part;
}
