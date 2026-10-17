import type {LayoutPart} from './layout.js';
import {assertOptions, assertUnownedParts, createOwnedPart, isPartAlive, onPartDestroy, replacePartChildren, type Part} from './ownership.js';
import {patchChildren} from '../content/views.js';

function key(value: unknown): asserts value is string {if (typeof value !== 'string' || !value) throw new TypeError('A reading key must be nonempty text.');}
function layout(options: {children: readonly Part[]}, className: string): LayoutPart {
  assertOptions(options, ['children'], 'reading layout');
  const node = document.createElement('div'); node.className = className;
  const part = createOwnedPart(node, {replace(children: readonly Part[]) {if (isPartAlive(part)) replacePartChildren(part,children);}}, {children: options.children}); return part;
}
/** A bounded reading column. Every message and status remains caller-composed. */
export interface ReadingColumnPart extends LayoutPart {update(state: {hidden: boolean}): void}
export function createReadingColumnPart(options: {children: readonly Part[]; hidden?: boolean; onDispose?(): void}): ReadingColumnPart {
  assertOptions(options, ['children','hidden','onDispose'], 'reading column');
  if (options.onDispose !== undefined && typeof options.onDispose !== 'function') throw new TypeError('Reading disposal must be a callback.');
  if (options.hidden !== undefined && typeof options.hidden !== 'boolean') throw new TypeError('Reading visibility must be boolean.');
  const node = document.createElement('div'); node.className = 'pui-messages pui-conversation-messages'; node.setAttribute('aria-live','polite'); node.setAttribute('aria-relevant','additions text');
  node.hidden = !!options.hidden;
  const part = createOwnedPart(node, {update(state: {hidden: boolean}) {assertOptions(state,['hidden'],'reading column state');if (typeof state.hidden !== 'boolean') throw new TypeError('Reading visibility must be boolean.');if (isPartAlive(part)) node.hidden = state.hidden;},replace(children: readonly Part[]) {if (isPartAlive(part)) replacePartChildren(part,children);}}, {children: options.children});
  if (options.onDispose) onPartDestroy(part,options.onDispose); return part;
}
export interface BubblePartState {speaker: 'self'|'agent'}
export interface BubblePart extends LayoutPart {update(state: Readonly<BubblePartState>): void}
/** One article and its existing intrinsic body; no implicit text or actions. */
export function createBubblePart(options: BubblePartState & {key: string;children: readonly Part[]}): BubblePart {
  assertOptions(options, ['speaker','key','children'], 'bubble'); key(options.key);
  const validate = (state: Readonly<BubblePartState>) => {assertOptions(state,['speaker'],'bubble state');if (!['self','agent'].includes(state.speaker)) throw new TypeError('Unknown bubble speaker.');};
  validate({speaker: options.speaker}); assertUnownedParts(options.children);
  const node = document.createElement('article'); node.dataset.readingId = options.key;
  const body = layout({children: options.children},'pui-message-content'); let part: BubblePart;
  const update = (state: Readonly<BubblePartState>) => {validate(state);if (!isPartAlive(part)) return;node.className = `pui-message ${state.speaker === 'self' ? 'pui-user-message' : 'pui-assistant-message'}`;node.setAttribute('aria-label',state.speaker === 'self' ? 'Your message' : 'Agent response');};
  part = createOwnedPart<Omit<BubblePart,keyof Part>>(node,{update,replace(children: readonly Part[]) {if (isPartAlive(part)) body.replace(children);}}, {children: [body]});
  update({speaker: options.speaker});return part;
}
/** Metadata and actions stay separate from the reading bubble itself. */
export function createMessageFooterPart(options: {children: readonly Part[]}): LayoutPart {return layout(options,'pui-message-footer');}
export function createMessageActionsPart(options: {children: readonly Part[]}): LayoutPart {return layout(options,'pui-message-actions');}

export interface ReadingNotePart extends Part {update(state: {text: string}): void}
export function createReadingNotePart(options: {key: string;text: string}): ReadingNotePart {
  assertOptions(options,['key','text'],'reading note');key(options.key);
  const node = document.createElement('div');node.className = 'pui-system-message';node.dataset.readingId = options.key;
  let part: ReadingNotePart;
  const update = (state: {text: string}) => {assertOptions(state,['text'],'reading note state');if (typeof state.text !== 'string') throw new TypeError('Reading note must be text.');if (!isPartAlive(part)) return;
    if (node.textContent !== state.text) {const source = document.createDocumentFragment();source.append(document.createTextNode(state.text));patchChildren(node,source);}};
  if (typeof options.text !== 'string') throw new TypeError('Reading note must be text.');
  part = createOwnedPart(node,{update});update({text: options.text});return part;
}
export interface TimestampPart extends Part {update(state: {value: number}): void}
export function createTimestampPart(options: {value: number}): TimestampPart {
  const validate = (state: {value: number}) => {assertOptions(state,['value'],'timestamp');if (typeof state.value !== 'number' || !Number.isFinite(new Date(state.value).getTime())) throw new TypeError('Timestamp must be a valid numeric instant.');};validate(options);
  const node = document.createElement('time');node.className = 'pui-message-time';let part: TimestampPart;
  const update = (state: {value: number}) => {validate(state);if (!isPartAlive(part)) return;const date = new Date(state.value),iso = date.toISOString();if (node.dateTime === iso) return;node.dateTime = iso;node.title = date.toLocaleString();node.textContent = date.toLocaleTimeString([],{hour: 'numeric',minute: '2-digit'});};
  part = createOwnedPart(node,{update});update(options);return part;
}
export interface WorkingIndicatorPartState {label?: string;hidden?: boolean}
export interface WorkingIndicatorPart extends Part {update(state: Readonly<WorkingIndicatorPartState>): void}
export function createWorkingIndicatorPart(options: WorkingIndicatorPartState = {}): WorkingIndicatorPart {
  const validate = (state: Readonly<WorkingIndicatorPartState>) => {assertOptions(state,['label','hidden'],'working indicator');if (state.label !== undefined && typeof state.label !== 'string' || state.hidden !== undefined && typeof state.hidden !== 'boolean') throw new TypeError('Working indicator requires text and boolean states.');};validate(options);
  const node = document.createElement('div');node.className = 'pui-agent-working';node.setAttribute('role','status');
  const dots = document.createElement('span');dots.className = 'pui-working-dots';dots.setAttribute('aria-hidden','true');for (let index = 0;index < 3;index++) dots.append(document.createElement('i'));
  const caption = document.createElement('span');caption.textContent = options.label ?? 'Working…';node.append(dots,caption);let part: WorkingIndicatorPart;
  const update = (state: Readonly<WorkingIndicatorPartState>) => {validate(state);if (!isPartAlive(part)) return;if (state.label !== undefined && caption.textContent !== state.label) caption.textContent = state.label;if (state.hidden !== undefined) node.hidden = state.hidden;};
  part = createOwnedPart(node,{update});update(options);return part;
}
