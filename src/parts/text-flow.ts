import {patchChildren} from '../content/views.js';
import {assertOptions, createOwnedPart, isPartAlive, type Part} from './ownership.js';

export interface TextFlowSegment {text: string; emphasis?: 'strong'}
export interface TextFlowPartState {segments: readonly TextFlowSegment[]; hidden?: boolean}
export type TextFlowRole = 'paragraph' | 'description' | 'hint';
export interface TextFlowPart extends Part {update(state: Readonly<TextFlowPartState>): void}
const roles: Record<TextFlowRole, string> = {paragraph: '', description: 'pui-modal-description', hint: 'pui-field-hint'};
function validate(state: Readonly<TextFlowPartState>): void {
  assertOptions(state, ['segments', 'hidden'], 'text flow state');
  if (!Array.isArray(state.segments)) throw new TypeError('Text flow segments must be an array.');
  if (state.hidden !== undefined && typeof state.hidden !== 'boolean') throw new TypeError('Text flow hidden must be boolean.');
  for (const segment of state.segments) {
    assertOptions(segment, ['text', 'emphasis'], 'text segment');
    if (typeof segment.text !== 'string') throw new TypeError('A text segment must contain text.');
    if (segment.emphasis !== undefined && segment.emphasis !== 'strong') throw new TypeError('Unknown text emphasis.');
  }
}
/** A literal text flow with native strong emphasis, never HTML or per-word spans. */
export function createTextFlowPart(options: TextFlowPartState & {role?: TextFlowRole}): TextFlowPart {
  assertOptions(options, ['segments', 'hidden', 'role'], 'text flow');
  const initial = {segments: options.segments, hidden: options.hidden}; validate(initial);
  const role = options.role ?? 'paragraph';
  if (!Object.hasOwn(roles, role)) throw new TypeError('Unknown text flow role.');
  const node = document.createElement('p');
  if (roles[role]) node.className = roles[role];
  let part: TextFlowPart;
  const update = (state: Readonly<TextFlowPartState>) => {
    validate(state); if (!isPartAlive(part)) return;
    const source = document.createDocumentFragment();
    for (const segment of state.segments) {
      if (segment.emphasis === 'strong') {const strong = document.createElement('strong'); strong.textContent = segment.text; source.append(strong);}
      else source.append(document.createTextNode(segment.text));
    }
    patchChildren(node, source); node.hidden = !!state.hidden;
  };
  part = createOwnedPart<Omit<TextFlowPart, keyof Part>>(node, {update}); update(initial); return part;
}
