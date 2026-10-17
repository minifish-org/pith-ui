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

/** Natural block flow. No spacing, dimensions, CSS classes or layout DSL. */
export function createStackPart(options: {children: readonly Part[]}): LayoutPart {
  assertOptions(options, ['children'], 'stack');
  const node = document.createElement('div');
  const part = createOwnedPart(node, {replace(children: readonly Part[]) {replacePartChildren(part, children);}}, {children: options.children});
  return part;
}
