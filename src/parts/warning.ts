import type {LayoutPart} from './layout.js';
import {assertOptions, createOwnedPart, replacePartChildren, type Part} from './ownership.js';

/** A bounded warning surface. Its icon, literal text and actions are composed
 * separately, and it introduces no content or additional wrapper. */
export function createWarningPart(options: {children: readonly Part[]}): LayoutPart {
  assertOptions(options, ['children'], 'warning');
  const node = document.createElement('div'); node.className = 'pui-warning-callout';
  const part = createOwnedPart(node, {replace(children: readonly Part[]) {replacePartChildren(part, children);}}, {children: options.children});
  return part;
}
