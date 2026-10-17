import {uniqueId} from '../dom.js';
import type {LayoutPart} from './layout.js';
import {assertOptions,createOwnedPart,isPartAlive,replacePartChildren,type Part} from './ownership.js';

/** A fixed metrics scroller. Its bounds and scrollbar rules stay in the library. */
export function createScrollAreaPart(options: {purpose: 'metrics';children: readonly Part[]}): LayoutPart {
  assertOptions(options,['purpose','children'],'scroll area');if (options.purpose !== 'metrics') throw new TypeError('Unsupported scroll area purpose.');
  const node = document.createElement('div');node.id = uniqueId('pui-metrics')+'-run-status-details';
  const part = createOwnedPart(node,{replace(children: readonly Part[]) {if (isPartAlive(part)) replacePartChildren(part,children);}},{children: options.children});return part;
}
