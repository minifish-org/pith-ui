import {iconElement} from '../dom.js';
import {assertOptions, createOwnedPart, isPartAlive, type Part} from './ownership.js';

export const iconNames = ['steer', 'edit', 'trash', 'branch', 'compress', 'image', 'plus', 'chat', 'folder', 'settings', 'arrow', 'stop', 'chevron', 'down', 'close', 'check', 'shield', 'file', 'terminal', 'copy', 'menu', 'globe', 'search', 'more', 'compose', 'plug'] as const;
export type IconName = typeof iconNames[number];
export function assertIconName(name: unknown): asserts name is IconName {
  if (!iconNames.includes(name as IconName)) throw new TypeError('Unknown Pith UI icon.');
}

export interface TextPartState {text: string; hidden?: boolean; announce?: 'none' | 'polite'}
export type TextRole = 'text' | 'paragraph' | 'muted' | 'muted-paragraph' | 'hint' | 'description' | 'eyebrow' | 'heading' | 'strong' | 'screenreader';
export interface TextPart extends Part {update(state: Readonly<TextPartState>): void}
const textParts = new WeakSet<Part>();
/** Internal capability check for text-only semantic references. */
export function isTextPart(part: Part): part is TextPart {return textParts.has(part) && isPartAlive(part);}
const textRoles = {
  text: ['span', ''], paragraph: ['p', ''], muted: ['span', 'pui-muted'], 'muted-paragraph': ['p', 'pui-muted'], hint: ['p', 'pui-field-hint'],
  description: ['p', 'pui-modal-description'], eyebrow: ['span', 'pui-eyebrow'], heading: ['h3', ''], strong: ['strong', ''], screenreader: ['span', 'pui-sr-only'],
} as const;
function validateText(state: Readonly<TextPartState>): void {
  assertOptions(state, ['text', 'hidden', 'announce'], 'text state');
  if (typeof state.text !== 'string') throw new TypeError('Text content must be a string.');
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
  const update = (state: Readonly<TextPartState>) => {
    validateText(state);
    if (!isPartAlive(part)) return;
    if (node.textContent !== state.text) node.textContent = state.text;
    node.hidden = !!state.hidden;
    if (state.announce === 'polite') node.setAttribute('aria-live', 'polite'); else node.removeAttribute('aria-live');
  };
  const part = createOwnedPart(node, {update});
  update(initial); textParts.add(part);
  return part;
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
