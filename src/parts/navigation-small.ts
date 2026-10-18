import {iconElement, uniqueId} from '../dom.js';
import {adoptAction} from '../foundations.js';
import {historyStatusMarkup} from '../files/systems.js';
import {isButtonPart, type ButtonPart} from './button.js';
import type {LayoutPart} from './layout.js';
import {assertOptions, assertUnownedParts, createOwnedPart, isPartAlive, replacePartChildren, type Part} from './ownership.js';

function booleans(value: object, keys: readonly string[]): void {
  for (const key of keys) {const state = value as Record<string, unknown>; if (state[key] !== undefined && typeof state[key] !== 'boolean') throw new TypeError(`${key} must be boolean.`);}
}
function actions(value: readonly ButtonPart[]): void {
  if (!Array.isArray(value) || value.some(part => !isButtonPart(part))) throw new TypeError('Tree actions must be live Pith UI buttons.');
}
export interface TreePartState {label: string; hidden?: boolean}
export interface TreePart extends LayoutPart {update(state: Readonly<TreePartState>): void}
/** A navigation landmark with direct caller-owned branches, rows and empty text. */
export function createTreePart(options: TreePartState & {children: readonly Part[]}): TreePart {
  assertOptions(options, ['label', 'hidden', 'children'], 'tree');
  if (typeof options.label !== 'string' || !Array.isArray(options.children)) throw new TypeError('A tree requires a label and child parts.'); booleans(options, ['hidden']);
  const node = document.createElement('nav'); node.className = 'pui-history-list pui-tree';
  let part: TreePart;
  const update = (state: Readonly<TreePartState>) => {assertOptions(state, ['label', 'hidden'], 'tree state'); if (typeof state.label !== 'string') throw new TypeError('Tree label must be text.'); booleans(state, ['hidden']); if (!isPartAlive(part)) return; node.setAttribute('aria-label', state.label); node.hidden = !!state.hidden;};
  part = createOwnedPart<Omit<TreePart, keyof Part>>(node, {update, replace(children: readonly Part[]) {replacePartChildren(part, children);}}, {children: options.children}); update({label: options.label, hidden: options.hidden}); return part;
}

export interface TreeBranchPartState {label: string; path?: string; selected?: boolean; hidden?: boolean}
export interface TreeBranchPart extends LayoutPart {update(state: Readonly<TreeBranchPartState>): void; setExpanded(expanded: boolean): void; isExpanded(): boolean}
/** One collapsible native branch; keys, filtering and business actions remain with its caller. */
export function createTreeBranchPart(options: TreeBranchPartState & {expanded?: boolean; actions: readonly ButtonPart[]; children: readonly Part[]; onToggle?(expanded: boolean): void}): TreeBranchPart {
  assertOptions(options, ['label', 'path', 'selected', 'hidden', 'expanded', 'actions', 'children', 'onToggle'], 'tree branch');
  const validate = (state: Readonly<TreeBranchPartState>) => {if (typeof state.label !== 'string' || state.path !== undefined && typeof state.path !== 'string') throw new TypeError('Branch wording must be text.'); booleans(state, ['selected', 'hidden']);};
  validate(options); booleans(options, ['expanded']); actions(options.actions);
  if (options.onToggle !== undefined && typeof options.onToggle !== 'function') throw new TypeError('Branch toggle must be a callback.');
  if (!Array.isArray(options.children)) throw new TypeError('Branch children must be Pith UI parts.'); assertUnownedParts([...options.actions, ...options.children]);
  const node = document.createElement('section'); node.className = 'pui-workspace-group';
  const heading = document.createElement('div'); heading.className = 'pui-workspace-heading pui-tree-branch-heading';
  const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'pui-workspace-toggle';
  const chevron = iconElement('chevron'); chevron.classList.add('pui-workspace-chevron'); const title = document.createElement('span'); toggle.append(chevron, iconElement('folder'), title);
  const children = document.createElement('div'); children.className = 'pui-workspace-children pui-tree-children'; children.id = uniqueId('pui-tree-children'); toggle.setAttribute('aria-controls', children.id);
  let expanded = !!options.expanded, part: TreeBranchPart;
  const setExpanded = (next: boolean) => {if (typeof next !== 'boolean') throw new TypeError('Branch expansion must be boolean.'); if (!isPartAlive(part)) return; expanded = next; toggle.setAttribute('aria-expanded', String(expanded)); children.hidden = !expanded;};
  const click = (event: Event) => {event.stopPropagation(); setExpanded(!expanded); options.onToggle?.(expanded);}; toggle.addEventListener('click', click);
  const togglePart = createOwnedPart(toggle, {}, {dispose() {toggle.removeEventListener('click', click);}}), headingPart = createOwnedPart(heading, {}, {children: [togglePart, ...options.actions]}), childrenPart = createOwnedPart(children, {}, {children: options.children});
  const update = (state: Readonly<TreeBranchPartState>) => {
    assertOptions(state, ['label', 'path', 'selected', 'hidden'], 'tree branch state'); validate(state); if (!isPartAlive(part)) return;
    node.setAttribute('aria-label', state.label); node.hidden = !!state.hidden; heading.classList.toggle('pui-selected', !!state.selected);
    if (title.textContent !== state.label) title.textContent = state.label;
    if (state.path !== undefined) toggle.title = state.path; else toggle.removeAttribute('title');
  };
  part = createOwnedPart<Omit<TreeBranchPart, keyof Part>>(node, {update, setExpanded, isExpanded: () => isPartAlive(part) && expanded, replace(next: readonly Part[]) {replacePartChildren(childrenPart, next);}}, {children: [headingPart, childrenPart]});
  update({label: options.label, path: options.path, selected: options.selected, hidden: options.hidden}); setExpanded(expanded); return part;
}

export interface ActivityPartState {kind: 'approval'|'running'|'unread'|'idle'}
export interface ActivityPart extends Part {update(state: Readonly<ActivityPartState>): void}
const activityParts = new WeakSet<Part>();
function isActivity(part: Part): part is ActivityPart {return activityParts.has(part) && isPartAlive(part);}
/** One bounded activity mark; its glyph, color and motion are fixed by the library. */
export function createActivityPart(options: ActivityPartState): ActivityPart {
  const node = document.createElement('span'); let kind: ActivityPartState['kind'] | undefined, part: ActivityPart;
  const update = (state: Readonly<ActivityPartState>) => {
    assertOptions(state, ['kind'], 'activity state'); if (!['approval', 'running', 'unread', 'idle'].includes(state.kind)) throw new TypeError('Unknown activity state.'); if (!isPartAlive(part) || kind === state.kind) return;
    kind = state.kind; const template = document.createElement('template'); template.innerHTML = historyStatusMarkup(kind); const next = template.content.firstElementChild!;
    for (const key of ['class', 'role', 'aria-label', 'aria-hidden', 'title']) {const value = next.getAttribute(key); if (value === null) node.removeAttribute(key); else node.setAttribute(key, value);}
    node.replaceChildren(...next.childNodes);
  };
  assertOptions(options, ['kind'], 'activity'); if (!['approval', 'running', 'unread', 'idle'].includes(options.kind)) throw new TypeError('Unknown activity state.');
  part = createOwnedPart<Omit<ActivityPart, keyof Part>>(node, {update}); update(options); activityParts.add(part); return part;
}

export interface TreeItemPartState {label: string; current?: boolean; disabled?: boolean; hidden?: boolean}
export interface TreeItemPart extends Part {update(state: Readonly<TreeItemPartState>): void; setStatus(status?: ActivityPart): void}
/** One selectable leaf. Supplied activity/action parts keep their own identity. */
export function createTreeItemPart(options: TreeItemPartState & {status?: ActivityPart; actions: readonly ButtonPart[]; onSelect?(): void}): TreeItemPart {
  assertOptions(options, ['label', 'current', 'disabled', 'hidden', 'status', 'actions', 'onSelect'], 'tree item');
  const validate = (state: Readonly<TreeItemPartState>) => {if (typeof state.label !== 'string') throw new TypeError('Tree item label must be text.'); booleans(state, ['current', 'disabled', 'hidden']);};
  validate(options); actions(options.actions); if (options.status !== undefined && !isActivity(options.status)) throw new TypeError('A tree item status must be a live Pith UI activity mark.');
  if (options.onSelect !== undefined && typeof options.onSelect !== 'function') throw new TypeError('Tree selection must be a callback.'); assertUnownedParts([...options.status ? [options.status] : [], ...options.actions]);
  const node = document.createElement('div'); node.className = 'pui-history-row pui-tree-item';
  const button = document.createElement('button'); button.type = 'button'; button.className = 'pui-history-item';
  const caption = document.createElement('span'), captionPart = createOwnedPart(caption, {});
  const action = adoptAction(button), click = (event: Event) => {if (!button.disabled && options.onSelect) {event.stopPropagation(); options.onSelect();}}; button.addEventListener('click', click);
  const selectPart = createOwnedPart(button, {}, {children: [captionPart, ...options.status ? [options.status] : []], dispose() {button.removeEventListener('click', click); action.destroy();}});
  let part: TreeItemPart;
  const update = (state: Readonly<TreeItemPartState>) => {
    assertOptions(state, ['label', 'current', 'disabled', 'hidden'], 'tree item state'); validate(state); if (!isPartAlive(part)) return;
    if (caption.textContent !== state.label) caption.textContent = state.label; node.classList.toggle('pui-active', !!state.current); node.hidden = !!state.hidden;
    if (state.current) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current'); action.update({title: state.label, disabled: !!state.disabled});
  };
  part = createOwnedPart<Omit<TreeItemPart, keyof Part>>(node, {update, setStatus(status?: ActivityPart) {if (status !== undefined && !isActivity(status)) throw new TypeError('A tree item status must be a live Pith UI activity mark.'); if (isPartAlive(part)) replacePartChildren(selectPart, [captionPart, ...status ? [status] : []]);}}, {children: [selectPart, ...options.actions]});
  update({label: options.label, current: options.current, disabled: options.disabled, hidden: options.hidden}); return part;
}

export interface BreadcrumbPartState {ancestor: string; current: string}
export interface BreadcrumbPart extends Part {update(state: Readonly<BreadcrumbPartState>): void}
export function createBreadcrumbPart(options: BreadcrumbPartState): BreadcrumbPart {
  const node = document.createElement('div'); node.className = 'pui-breadcrumb';
  const ancestor = document.createElement('span'), current = document.createElement('span'); current.className = 'pui-breadcrumb-current';
  const chevron = iconElement('chevron'); chevron.classList.add('pui-breadcrumb-chevron'); node.append(iconElement('folder'), ancestor, chevron, current);
  let part: BreadcrumbPart;
  const update = (state: Readonly<BreadcrumbPartState>) => {assertOptions(state, ['ancestor', 'current'], 'breadcrumb state'); if (typeof state.ancestor !== 'string' || typeof state.current !== 'string') throw new TypeError('Breadcrumbs must be text.'); if (!isPartAlive(part)) return; if (ancestor.textContent !== state.ancestor) ancestor.textContent = state.ancestor; if (current.textContent !== state.current) current.textContent = state.current;ancestor.title = state.ancestor;current.title = state.current;};
  assertOptions(options, ['ancestor', 'current'], 'breadcrumb'); if (typeof options.ancestor !== 'string' || typeof options.current !== 'string') throw new TypeError('Breadcrumbs must be text.');
  part = createOwnedPart<Omit<BreadcrumbPart, keyof Part>>(node, {update}); update(options); return part;
}

export interface ConnectionIndicatorPartState {message: string; hidden?: boolean}
export interface ConnectionIndicatorPart extends Part {update(state: Readonly<ConnectionIndicatorPartState>): void}
/** A compact waiting indicator, with a fixed warning dot and live message. */
export function createConnectionIndicatorPart(options: ConnectionIndicatorPartState): ConnectionIndicatorPart {
  const node = document.createElement('div'); node.className = 'pui-local-status'; node.setAttribute('role', 'status');
  const dot = document.createElement('span'); dot.className = 'pui-status-dot pui-reconnecting'; dot.setAttribute('aria-hidden', 'true'); const caption = document.createElement('span'); node.append(dot, caption);
  let part: ConnectionIndicatorPart;
  const update = (state: Readonly<ConnectionIndicatorPartState>) => {assertOptions(state, ['message', 'hidden'], 'connection indicator state'); if (typeof state.message !== 'string') throw new TypeError('Connection indicator message must be text.'); booleans(state, ['hidden']); if (!isPartAlive(part)) return; if (caption.textContent !== state.message) caption.textContent = state.message; node.hidden = !!state.hidden;};
  assertOptions(options, ['message', 'hidden'], 'connection indicator'); if (typeof options.message !== 'string') throw new TypeError('Connection indicator message must be text.'); booleans(options, ['hidden']);
  part = createOwnedPart<Omit<ConnectionIndicatorPart, keyof Part>>(node, {update}); update(options); return part;
}
