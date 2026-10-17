import type {LayoutPart} from './layout.js';
import {assertOptions,createOwnedPart,isPartAlive,replacePartChildren,type Part} from './ownership.js';

export interface SearchToolbarPartState {hidden?: boolean}
export interface SearchToolbarPart extends LayoutPart {update(state: Readonly<SearchToolbarPartState>): void}
/** A native search row. Caller parts supply its field, count and actions. */
export function createSearchToolbarPart(options: SearchToolbarPartState & {children: readonly Part[]}): SearchToolbarPart {
  assertOptions(options,['children','hidden'],'search toolbar');
  const validate = (state: Readonly<SearchToolbarPartState>) => {assertOptions(state,['hidden'],'search toolbar state');if (state.hidden !== undefined && typeof state.hidden !== 'boolean') throw new TypeError('Search visibility must be boolean.');};validate({hidden: options.hidden});
  const node = document.createElement('section');node.className = 'pui-conversation-find';node.setAttribute('aria-label','Find in conversation');
  const part = createOwnedPart(node,{update(state: Readonly<SearchToolbarPartState>) {validate(state);if (isPartAlive(part)) node.hidden = !!state.hidden;},replace(children: readonly Part[]) {if (isPartAlive(part)) replacePartChildren(part,children);}},{children: options.children});part.update({hidden: options.hidden});return part;
}
/** One flex reading region; the caller supplies viewport and floating action. */
export function createReadingRegionPart(options: {children: readonly Part[]}): LayoutPart {
  assertOptions(options,['children'],'reading region');const node = document.createElement('div');node.className = 'pui-conversation-region';
  const part = createOwnedPart(node,{replace(children: readonly Part[]) {if (isPartAlive(part)) replacePartChildren(part,children);}},{children: options.children});return part;
}
