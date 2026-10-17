import type {LayoutPart} from './layout.js';
import {assertOptions,createOwnedPart,isPartAlive,replacePartChildren,type Part} from './ownership.js';

export interface StatusActionsPart extends LayoutPart {update(state: {hidden?: boolean}): void}
/** One inline status/action row. The caller supplies its text and action parts. */
export function createStatusActionsPart(options: {children: readonly Part[];hidden?: boolean}): StatusActionsPart {
  assertOptions(options,['children','hidden'],'status actions');
  const validate = (state: {hidden?: boolean}) => {assertOptions(state,['hidden'],'status actions state');if (state.hidden !== undefined && typeof state.hidden !== 'boolean') throw new TypeError('Status actions hidden must be boolean.');};
  validate({hidden: options.hidden});
  const node = document.createElement('div');node.className = 'pui-workspace-busy';node.hidden = !!options.hidden;
  const part = createOwnedPart(node,{update(state: {hidden?: boolean}) {validate(state);if (isPartAlive(part)) node.hidden = !!state.hidden;},replace(children: readonly Part[]) {if (isPartAlive(part)) replacePartChildren(part,children);}},{children: options.children});
  return part;
}
