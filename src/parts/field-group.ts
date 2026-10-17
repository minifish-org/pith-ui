import {assertOptions, createOwnedPart, isPartAlive, replacePartChildren, type Part} from './ownership.js';

export interface FieldGroupPart extends Part {replace(children: readonly Part[]): void}

/** One native label/control group using the library's fixed field spacing. */
export function createFieldGroupPart(options: {children: readonly Part[]}): FieldGroupPart {
  assertOptions(options, ['children'], 'field group');
  const node = document.createElement('div'); node.className = 'pui-field';
  const part = createOwnedPart(node, {replace(children: readonly Part[]) {if (isPartAlive(part)) replacePartChildren(part, children);}}, {children: options.children});
  return part;
}
