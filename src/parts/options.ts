import type {UIAction} from '../core.js';
import {iconElement} from '../dom.js';
import {adoptAction} from '../foundations.js';
import type {LayoutPart} from './layout.js';
import {assertOptions,createOwnedPart,isPartAlive,replacePartChildren,type Part} from './ownership.js';
import {assertIconName,type IconName} from './text.js';

export interface OptionActionState {label: string;description: string;icon: IconName;disabled?: boolean;pending?: boolean}
export interface OptionActionOptions extends OptionActionState {onAction?: UIAction;onError?(message: string): void}
declare const optionActionRole: unique symbol;
export interface OptionActionPart extends Part {readonly [optionActionRole]: true;update(state: Readonly<OptionActionState>): void;invalidate(): void;focus(): void}
const optionActions = new WeakSet<Part>();
function validateOption(state: Readonly<OptionActionState>): void {
  assertOptions(state,['label','description','icon','disabled','pending'],'option action state');
  if (typeof state.label !== 'string' || typeof state.description !== 'string') throw new TypeError('Option labels and descriptions must be text.');assertIconName(state.icon);
  for (const key of ['disabled','pending'] as const) if (state[key] !== undefined && typeof state[key] !== 'boolean') throw new TypeError(`Option ${key} must be boolean.`);
}
/** One native action with an icon, literal title/description and fixed chevron. */
export function createOptionActionPart(options: OptionActionOptions): OptionActionPart {
  assertOptions(options,['label','description','icon','disabled','pending','onAction','onError'],'option action');
  const {onAction,onError,...initial} = options;validateOption(initial);
  for (const callback of [onAction,onError]) if (callback !== undefined && typeof callback !== 'function') throw new TypeError('Option actions require callbacks.');
  const node = document.createElement('button');node.type = 'button';node.className = 'pui-modal-workspace';
  let icon = options.icon,glyph = iconElement(icon);
  const caption = document.createElement('span'),title = document.createElement('strong'),description = document.createElement('small');caption.append(title,description);node.append(glyph,caption,iconElement('chevron'));
  const action = adoptAction(node,{onAction,onError});let part: OptionActionPart;
  const update = (state: Readonly<OptionActionState>) => {
    validateOption(state);if (!isPartAlive(part)) return;
    if (icon !== state.icon) {icon = state.icon;const next = iconElement(icon);glyph.replaceWith(next);glyph = next;}
    if (title.textContent !== state.label) title.textContent = state.label;if (description.textContent !== state.description) description.textContent = state.description;
    action.update({disabled: !!state.disabled,pending: !!state.pending});
  };
  part = createOwnedPart<Omit<OptionActionPart,keyof Part|typeof optionActionRole>>(node,{update,invalidate() {if (isPartAlive(part)) action.invalidate();},focus() {if (isPartAlive(part)) node.focus();}},{dispose: action.destroy}) as OptionActionPart;
  optionActions.add(part);update(initial);return part;
}

export interface OptionGroupPart extends Part {replace(children: readonly OptionActionPart[]): void}
function validateActions(children: readonly OptionActionPart[]): void {
  if (!Array.isArray(children) || children.some(part => !optionActions.has(part) || !isPartAlive(part))) throw new TypeError('Option groups accept only genuine live option action parts.');
}
/** Fixed direct column. The local assembly owns keys and option ordering. */
export function createOptionGroupPart(options: {children: readonly OptionActionPart[]}): OptionGroupPart {
  assertOptions(options,['children'],'option group');validateActions(options.children);
  const node = document.createElement('div');node.className = 'pui-modal-workspaces';let part: OptionGroupPart;
  part = createOwnedPart<Omit<OptionGroupPart,keyof Part>>(node,{replace(children: readonly OptionActionPart[]) {validateActions(children);if (isPartAlive(part)) replacePartChildren(part,children);}},{children: options.children});return part;
}

export interface LabelledDividerPart extends Part {update(state: {label: string}): void}
/** A labelled horizontal divider with library-owned spacing and rules. */
export function createLabelledDividerPart(options: {label: string}): LabelledDividerPart {
  const validate = (state: {label: string}) => {assertOptions(state,['label'],'labelled divider');if (typeof state.label !== 'string') throw new TypeError('Divider label must be text.');};validate(options);
  const node = document.createElement('div');node.className = 'pui-path-divider';const caption = document.createElement('span');node.append(caption);let part: LabelledDividerPart;
  part = createOwnedPart<Omit<LabelledDividerPart,keyof Part>>(node,{update(state: {label: string}) {validate(state);if (isPartAlive(part) && caption.textContent !== state.label) caption.textContent = state.label;}});part.update(options);return part;
}

/** One native block separated from preceding content by a fixed section gap. */
export function createSeparatedGroupPart(options: {children: readonly Part[]}): LayoutPart {
  assertOptions(options,['children'],'separated group');const node = document.createElement('div');node.className = 'pui-workspace-add';let part: LayoutPart;
  part = createOwnedPart<Omit<LayoutPart,keyof Part>>(node,{replace(children: readonly Part[]) {if (isPartAlive(part)) replacePartChildren(part,children);}},{children: options.children});return part;
}
