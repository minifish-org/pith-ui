import {adoptActionLayout} from '../foundations.js';
import {assertOptions, createOwnedPart, isPartAlive, replacePartChildren, type Part} from './ownership.js';

export interface LayoutPart extends Part {replace(children: readonly Part[]): void}
export interface ActionsPartState {align?: 'start' | 'end' | 'between'; hidden?: boolean}
export interface ActionsPart extends LayoutPart {update(state: Readonly<ActionsPartState>): void}
function validateActions(state: Readonly<ActionsPartState>): void {
  assertOptions(state, ['align', 'hidden'], 'actions state');
  if (state.align !== undefined && !['start', 'end', 'between'].includes(state.align)) throw new TypeError('Unknown actions alignment.');
}
function actionRow(options: ActionsPartState & {children: readonly Part[]}, className: 'pui-actions' | 'pui-modal-footer'): ActionsPart {
  assertOptions(options, ['align', 'hidden', 'children'], 'actions');
  const initial = {align: options.align, hidden: options.hidden}; validateActions(initial);
  const node = document.createElement('div'); node.className = className;
  const layout = adoptActionLayout(node, 'actions');
  const update = (state: Readonly<ActionsPartState>) => {
    validateActions(state);
    if (!isPartAlive(part)) return;
    const align = state.align ?? 'end';
    layout.update({align}); node.hidden = !!state.hidden;
  };
  const part = createOwnedPart(node, {update, replace(children: readonly Part[]) {replacePartChildren(part, children);}}, {children: options.children, dispose: layout.destroy});
  update(initial);
  return part;
}
export function createActionsPart(options: ActionsPartState & {children: readonly Part[]}): ActionsPart {return actionRow(options, 'pui-actions');}
/** A small modal action row, with the library-owned border and spacing. */
export function createFooterPart(options: ActionsPartState & {children: readonly Part[]}): ActionsPart {return actionRow(options, 'pui-modal-footer');}

export interface ToolbarPartState {label: string; hidden?: boolean}
export type ToolbarPurpose = 'tools' | 'feature';
export interface ToolbarPart extends LayoutPart {update(state: Readonly<ToolbarPartState>): void}
function validateToolbar(state: Readonly<ToolbarPartState>): void {
  assertOptions(state, ['label', 'hidden'], 'toolbar state');
  if (typeof state.label !== 'string') throw new TypeError('A toolbar label must be a string.');
  if (state.hidden !== undefined && typeof state.hidden !== 'boolean') throw new TypeError('Toolbar hidden must be boolean.');
}
export function createToolbarPart(options: ToolbarPartState & {children: readonly Part[]; purpose?: ToolbarPurpose}): ToolbarPart {
  assertOptions(options, ['label', 'hidden', 'children', 'purpose'], 'toolbar');
  if (options.purpose !== undefined && !['tools', 'feature'].includes(options.purpose)) throw new TypeError('Unknown toolbar purpose.');
  const initial = {label: options.label, hidden: options.hidden}; validateToolbar(initial);
  const node = document.createElement('div'); node.className = options.purpose === 'feature' ? 'pui-feature-toolbar' : 'pui-toolbar';
  const layout = adoptActionLayout(node, 'toolbar');
  const update = (state: Readonly<ToolbarPartState>) => {
    validateToolbar(state);
    if (!isPartAlive(part)) return;
    layout.update({label: state.label}); node.hidden = !!state.hidden;
  };
  const part = createOwnedPart(node, {update, replace(children: readonly Part[]) {replacePartChildren(part, children);}}, {children: options.children, dispose: layout.destroy});
  update(initial);
  return part;
}

export interface StackPartState {hidden?: boolean}
export interface StackPart extends LayoutPart {update(state: Readonly<StackPartState>): void}
function validateStack(state: Readonly<StackPartState>): void {
  if (state.hidden !== undefined && typeof state.hidden !== 'boolean') throw new TypeError('Stack hidden must be boolean.');
}
/** Natural block flow. No spacing, dimensions, CSS classes or layout DSL. */
export function createStackPart(options: StackPartState & {children: readonly Part[]}): StackPart {
  assertOptions(options, ['children','hidden'], 'stack');validateStack(options);
  const node = document.createElement('div');
  let part: StackPart;
  const update = (state: Readonly<StackPartState>) => {assertOptions(state,['hidden'],'stack state');validateStack(state);if (isPartAlive(part)) node.hidden = !!state.hidden;};
  part = createOwnedPart<Omit<StackPart,keyof Part>>(node, {update,replace(children: readonly Part[]) {replacePartChildren(part, children);}}, {children: options.children});
  update({hidden: options.hidden});
  return part;
}

export interface InlineGroupPartState {hidden?: boolean}
export interface InlineGroupPart extends LayoutPart {update(state: Readonly<InlineGroupPartState>): void}
/** Native inline flow for adjacent controls or text; no additional layout rule. */
export function createInlineGroupPart(options: InlineGroupPartState & {children: readonly Part[]}): InlineGroupPart {
  assertOptions(options, ['children', 'hidden'], 'inline group');
  const validate = (state: Readonly<InlineGroupPartState>) => {
    assertOptions(state, ['hidden'], 'inline group state');
    if (state.hidden !== undefined && typeof state.hidden !== 'boolean') throw new TypeError('Inline group hidden must be boolean.');
  };
  const initial = {hidden: options.hidden}; validate(initial);
  const node = document.createElement('span'); node.className = 'pui-inline-group';
  let part: InlineGroupPart;
  const update = (state: Readonly<InlineGroupPartState>) => {validate(state);if (isPartAlive(part)) node.hidden = !!state.hidden;};
  part = createOwnedPart<Omit<InlineGroupPart,keyof Part>>(node, {update,replace(children: readonly Part[]) {if (isPartAlive(part)) replacePartChildren(part,children);}}, {children: options.children});
  update(initial); return part;
}
