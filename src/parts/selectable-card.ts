import type {LayoutPart} from './layout.js';
import {assertOptions,createOwnedPart,isPartAlive,replacePartChildren,type Part} from './ownership.js';

export interface SelectableCardState {selected?: boolean}
export interface SelectableCardPart extends LayoutPart {update(state: Readonly<SelectableCardState>): void}
/** One native outlined article. Its caller composes all content and actions. */
export function createSelectableCardPart(options: SelectableCardState & {children: readonly Part[]}): SelectableCardPart {
  assertOptions(options,['children','selected'],'selectable card');
  const validate = (state: Readonly<SelectableCardState>) => {
    assertOptions(state,['selected'],'selectable card state');
    if (state.selected !== undefined && typeof state.selected !== 'boolean') throw new TypeError('Card selection must be boolean.');
  };
  const initial = {selected: options.selected};validate(initial);
  const node = document.createElement('article');let part: SelectableCardPart;
  const update = (state: Readonly<SelectableCardState>) => {
    validate(state);if (isPartAlive(part)) node.className = `pui-branch-node${state.selected ? ' pui-current-branch' : ''}`;
  };
  part = createOwnedPart<Omit<SelectableCardPart,keyof Part>>(node,{update,replace(children: readonly Part[]) {if (isPartAlive(part)) replacePartChildren(part,children);}},{children: options.children});
  update(initial);return part;
}
