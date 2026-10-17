import {assertOptions, createOwnedPart, isPartAlive, type Part} from './ownership.js';

export interface BadgePartState {text: string; hidden?: boolean}
export interface BadgePart extends Part {update(state: Readonly<BadgePartState>): void}
const badges = new WeakSet<Part>();
/** Internal genuine-handle check for bounded field-label suffixes. */
export function isBadgePart(part: Part): part is BadgePart {return badges.has(part) && isPartAlive(part);}
function validate(state: Readonly<BadgePartState>): void {
  assertOptions(state, ['text', 'hidden'], 'badge state');
  if (typeof state.text !== 'string') throw new TypeError('Badge content must be text.');
  if (state.hidden !== undefined && typeof state.hidden !== 'boolean') throw new TypeError('Badge hidden must be boolean.');
}
/** A small text badge. Its border, spacing and type are fixed by the library. */
export function createBadgePart(options: BadgePartState): BadgePart {
  validate(options);
  const node = document.createElement('span'); node.className = 'pui-configured-badge';
  let part: BadgePart;
  const update = (state: Readonly<BadgePartState>) => {
    validate(state); if (!isPartAlive(part)) return;
    if (node.textContent !== state.text) node.textContent = state.text; node.hidden = !!state.hidden;
  };
  part = createOwnedPart<Omit<BadgePart, keyof Part>>(node, {update}); update(options); badges.add(part); return part;
}

export interface StatusPartState {message: string; tone?: 'neutral' | 'success' | 'error'; hidden?: boolean}
export interface StatusPartOptions extends StatusPartState {presentation?: 'inline' | 'paragraph'}
export interface StatusPart extends Part {update(state: Readonly<StatusPartState>): void}
function validateStatus(state: Readonly<StatusPartState>): void {
  assertOptions(state, ['message', 'tone', 'hidden'], 'status state');
  if (typeof state.message !== 'string') throw new TypeError('Status content must be text.');
  if (state.tone !== undefined && !['neutral', 'success', 'error'].includes(state.tone)) throw new TypeError('Unknown status tone.');
  if (state.hidden !== undefined && typeof state.hidden !== 'boolean') throw new TypeError('Status hidden must be boolean.');
}
/** A live inline result. Empty content takes no space; typography and tones are library-owned. */
export function createStatusPart(options: StatusPartOptions): StatusPart {
  assertOptions(options,['message','tone','hidden','presentation'],'status');
  const {presentation = 'inline',...initial} = options;validateStatus(initial);
  if (!['inline','paragraph'].includes(presentation)) throw new TypeError('Unknown status presentation.');
  const node = document.createElement(presentation === 'paragraph' ? 'p' : 'div'); node.setAttribute('role', 'status'); node.setAttribute('aria-live', 'polite');
  let part: StatusPart;
  const update = (state: Readonly<StatusPartState>) => {
    validateStatus(state); if (!isPartAlive(part)) return;
    node.className = presentation === 'paragraph'
      ? `pui-connection-status${state.tone === 'success' ? ' pui-test-success' : state.tone === 'error' ? ' pui-is-error' : ''}`
      : `pui-status-message${state.tone === 'success' ? ' pui-test-success' : state.tone === 'error' ? ' pui-form-error' : ''}`;
    if (node.textContent !== state.message) node.textContent = state.message; node.hidden = !!state.hidden;
  };
  part = createOwnedPart<Omit<StatusPart, keyof Part>>(node, {update}); update(initial); return part;
}
