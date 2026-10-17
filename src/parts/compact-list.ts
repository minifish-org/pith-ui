import {patchChildren} from '../content/views.js';
import type {LayoutPart} from './layout.js';
import {assertOptions,createOwnedPart,isPartAlive,onPartDestroy,replacePartChildren,type Part} from './ownership.js';

export interface ScrollListPart extends LayoutPart {update(state: {hidden: boolean}): void}
/** A bounded native list surface. Heading, rows, badges and actions are all
 * independently composed; this part interprets no item data. */
export function createScrollListPart(options: {label: string;children: readonly Part[];hidden?: boolean;onDispose?(): void}): ScrollListPart {
  assertOptions(options,['label','children','hidden','onDispose'],'scroll list');
  if (typeof options.label !== 'string') throw new TypeError('A list label must be text.');
  if (options.hidden !== undefined && typeof options.hidden !== 'boolean') throw new TypeError('List visibility must be boolean.');
  if (options.onDispose !== undefined && typeof options.onDispose !== 'function') throw new TypeError('List disposal must be a callback.');
  const node = document.createElement('section');node.className = 'pui-queued-messages';node.setAttribute('aria-label',options.label);node.setAttribute('aria-live','polite');node.hidden = !!options.hidden;
  const part = createOwnedPart(node,{replace(children: readonly Part[]) {if (isPartAlive(part)) replacePartChildren(part,children);},update(state: {hidden: boolean}) {assertOptions(state,['hidden'],'scroll list state');if (typeof state.hidden !== 'boolean') throw new TypeError('List visibility must be boolean.');if (isPartAlive(part)) node.hidden = state.hidden;}},{children: options.children});
  if (options.onDispose) onPartDestroy(part,options.onDispose);return part;
}
function layout(options: {children: readonly Part[]},className: string): LayoutPart {
  assertOptions(options,['children'],'compact row layout');const node = document.createElement('div');node.className = className;
  const part = createOwnedPart(node,{replace(children: readonly Part[]) {if (isPartAlive(part)) replacePartChildren(part,children);}},{children: options.children});return part;
}
export function createCompactRowPart(options: {children: readonly Part[]}): LayoutPart {return layout(options,'pui-queued-message');}
export function createCompactRowBodyPart(options: {children: readonly Part[]}): LayoutPart {return layout(options,'pui-queued-message-content');}
export function createCompactRowActionsPart(options: {children: readonly Part[]}): LayoutPart {return layout(options,'pui-queued-message-actions');}

export interface RowTextPartState {text: string;title?: string;hidden?: boolean}
export interface RowTextPart extends Part {update(state: Readonly<RowTextPartState>): void}
/** A two-line literal preview or one small count. Library rules fix truncation
 * and typography; callers cannot choose a line count or presentation size. */
export function createRowTextPart(options: RowTextPartState & {purpose: 'preview'|'count'}): RowTextPart {
  assertOptions(options,['purpose','text','title','hidden'],'row text');
  if (!['preview','count'].includes(options.purpose)) throw new TypeError('Unknown row text purpose.');
  const validate = (state: Readonly<RowTextPartState>) => {assertOptions(state,['text','title','hidden'],'row text state');if (typeof state.text !== 'string' || state.title !== undefined && typeof state.title !== 'string') throw new TypeError('Row text content must be text.');if (state.hidden !== undefined && typeof state.hidden !== 'boolean') throw new TypeError('Row text visibility must be boolean.');};
  const initial = {text: options.text,title: options.title,hidden: options.hidden};validate(initial);
  const node = document.createElement(options.purpose === 'preview' ? 'span' : 'small');node.className = options.purpose === 'preview' ? 'pui-queued-message-text' : 'pui-queue-image-count';
  const part = createOwnedPart(node,{update(state: Readonly<RowTextPartState>) {validate(state);if (!isPartAlive(part)) return;
    if (node.textContent !== state.text) {const source = document.createDocumentFragment();source.append(document.createTextNode(state.text));patchChildren(node,source);}
    node.hidden = !!state.hidden;if (state.title === undefined) node.removeAttribute('title');else node.title = state.title;
  }});part.update(initial);return part;
}
