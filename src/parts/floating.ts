import {Generation, type UIAction} from '../core.js';
import {uniqueId} from '../dom.js';
import {adoptAction} from '../foundations.js';
import {installAnchoredSurface, installMenuNavigation} from '../surface.js';
import {isButtonAvailable, isButtonPart, type ButtonPart} from './button.js';
import type {DialogPart} from './dialog.js';
import {assertOptions, createOwnedPart, isPartAlive, nodeOf, onPartDestroy, replacePartChildren, type Part} from './ownership.js';

export interface FloatingPartState {label: string; disabled?: boolean}
export interface FloatingPart extends Part {
  update(state: Readonly<FloatingPartState>): void;
  open(trigger: ButtonPart): void;
  close(): void;
  isOpen(): boolean;
}
interface FloatingOptions extends FloatingPartState {relatedDialogs?: readonly DialogPart[]; onToggle?(open: boolean): void}
function validateFloating(state: Readonly<FloatingPartState>): void {
  if (typeof state.label !== 'string') throw new TypeError('A floating surface label must be text.');
  if (state.disabled !== undefined && typeof state.disabled !== 'boolean') throw new TypeError('Floating disabled must be boolean.');
}
function relatedNodes(options: FloatingOptions): HTMLDialogElement[] {
  if (options.onToggle !== undefined && typeof options.onToggle !== 'function') throw new TypeError('Floating onToggle must be a callback.');
  if (options.relatedDialogs !== undefined && !Array.isArray(options.relatedDialogs)) throw new TypeError('Related dialogs must be an array of dialog parts.');
  return (options.relatedDialogs ?? []).map(part => {
    const node = nodeOf(part);
    if (!(node instanceof HTMLDialogElement)) throw new TypeError('Related dialogs must be Pith UI dialog parts.');
    return node;
  });
}
function anchored(panel: HTMLElement, alive: () => boolean, canOpen: () => boolean, related: readonly HTMLDialogElement[], onToggle?: (open: boolean) => void, dismissOnMove: boolean|'anchor' = false) {
  let surface: ReturnType<typeof installAnchoredSurface> | undefined;
  let current: ButtonPart | undefined;
  let unsubscribe: (() => void) | undefined;
  const detach = (restore = false) => {
    const previous = surface; surface = undefined; current = undefined;
    const unwatch = unsubscribe; unsubscribe = undefined; unwatch?.();
    if (previous) {try {previous.close(restore);} finally {previous.destroy();}}
  };
  return {
    open(trigger: ButtonPart) {
      if (!isButtonPart(trigger)) throw new TypeError('A floating source must be a live Pith UI button.');
      if (!alive() || !canOpen() || !isButtonAvailable(trigger)) return;
      if (current === trigger && surface?.isOpen()) return;
      const source = nodeOf(trigger) as HTMLButtonElement;
      if (!source.isConnected) return;
      detach(); current = trigger;
      source.setAttribute('aria-controls', panel.id);
      const next = installAnchoredSurface({trigger: source, panel, exclusions: related, dismissOnMove,
        canOpen: () => alive() && canOpen() && isButtonAvailable(trigger),
        onToggle(open) {
          if (!open && surface === next) {
            surface = undefined; current = undefined;
            const unwatch = unsubscribe; unsubscribe = undefined; unwatch?.(); next.destroy();
          }
          onToggle?.(open);
        },
      });
      surface = next; unsubscribe = onPartDestroy(trigger, () => detach());
      next.open();
      if (!next.isOpen() && surface === next) detach();
    },
    close: detach,
    isOpen: () => !!surface?.isOpen(),
    destroy: detach,
  };
}

/** One small anchored region; content ownership and borrowed source are explicit. */
export function createPopoverPart(options: FloatingOptions & {content: Part}): FloatingPart {
  assertOptions(options, ['label', 'disabled', 'relatedDialogs', 'onToggle', 'content'], 'popover'); validateFloating(options);
  const related = relatedNodes(options);
  const node = document.createElement('div'); node.className = 'pui-popover-panel'; node.id = uniqueId('pui-popover'); node.hidden = true; node.setAttribute('role', 'region');
  let state: Readonly<FloatingPartState> = options;
  let part: FloatingPart;
  const surface = anchored(node, () => isPartAlive(part), () => !state.disabled, related, options.onToggle);
  const update = (next: Readonly<FloatingPartState>) => {
    assertOptions(next, ['label', 'disabled'], 'popover state'); validateFloating(next); if (!isPartAlive(part)) return;
    state = next; node.setAttribute('aria-label', next.label); if (next.disabled) surface.close();
  };
  part = createOwnedPart<Omit<FloatingPart, keyof Part>>(node, {update, open: surface.open, close() {surface.close();}, isOpen: surface.isOpen}, {children: [options.content], dispose: surface.destroy});
  update({label: options.label, disabled: options.disabled}); return part;
}

export interface MenuPartItem {key: string; label: string; disabled?: boolean; checked?: boolean; intent?: 'neutral' | 'danger'; onAction: UIAction}
export interface MenuPartState extends FloatingPartState {items: readonly MenuPartItem[]}
export interface MenuPart extends Omit<FloatingPart, 'update'> {update(state: Readonly<MenuPartState>): void}
interface MenuItemPart extends Part {update(item: MenuPartItem): void}
function validateItems(items: readonly MenuPartItem[]): void {
  if (!Array.isArray(items)) throw new TypeError('Menu items must be an array.');
  const keys = new Set<string>();
  for (const item of items) {
    assertOptions(item, ['key', 'label', 'disabled', 'checked', 'intent', 'onAction'], 'menu item');
    if (typeof item.key !== 'string' || !item.key || keys.has(item.key)) throw new TypeError('Menu keys must be unique nonempty text.');
    keys.add(item.key);
    if (typeof item.label !== 'string' || typeof item.onAction !== 'function') throw new TypeError('Menu items require a text label and action callback.');
    for (const key of ['disabled', 'checked'] as const) if (item[key] !== undefined && typeof item[key] !== 'boolean') throw new TypeError(`Menu item ${key} must be boolean.`);
    if (item.intent !== undefined && !['neutral', 'danger'].includes(item.intent)) throw new TypeError('Unknown menu intent.');
  }
}
/** A keyboard menu with the retained menu row markup and no coordinate input. */
export function createMenuPart(options: MenuPartState & {relatedDialogs?: readonly DialogPart[]; scrollBehavior?: 'dismiss'|'anchor'; onToggle?(open: boolean): void; onError?(message: string): void}): MenuPart {
  assertOptions(options, ['label', 'disabled', 'items', 'relatedDialogs', 'scrollBehavior', 'onToggle', 'onError'], 'menu'); validateFloating(options); validateItems(options.items);
  if (options.scrollBehavior !== undefined && !['dismiss','anchor'].includes(options.scrollBehavior)) throw new TypeError('Unknown menu scroll behavior.');
  if (options.onError !== undefined && typeof options.onError !== 'function') throw new TypeError('Menu onError must be a callback.');
  const related = relatedNodes(options);
  const node = document.createElement('div'); node.className = 'pui-sidebar-conversation-menu pui-context-menu'; node.id = uniqueId('pui-menu'); node.setAttribute('role', 'menu'); node.tabIndex = -1; node.hidden = true;
  let state: Readonly<MenuPartState> = options;
  let part: MenuPart;
  const entries = new Map<string, MenuItemPart>(), generation = new Generation();
  const surface = anchored(node, () => isPartAlive(part), () => !state.disabled, related, open => {generation.invalidate(); options.onToggle?.(open);}, options.scrollBehavior === 'anchor' ? 'anchor' : true);
  const navigation = installMenuNavigation(node, {isOpen: surface.isOpen, onDismiss(restore) {surface.close(restore);}});
  const makeItem = (item: MenuPartItem): MenuItemPart => {
    const button = document.createElement('button'); button.type = 'button';
    let current = item, revision = 0;
    let row: MenuItemPart;
    const action = adoptAction(button, {onAction: async () => {
      if (!surface.isOpen() || current.disabled) return;
      node.focus({preventScroll: true}); revision = generation.next();
      const target = current; const result = await target.onAction();
      if (generation.current(revision) && isPartAlive(row) && surface.isOpen() && (!result || result.ok)) surface.close();
      return result;
    }, onError(message) {if (generation.current(revision) && surface.isOpen()) options.onError?.(message);}});
    row = createOwnedPart<Omit<MenuItemPart, keyof Part>>(button, {update(next: MenuPartItem) {
      if (!isPartAlive(row)) return;
      current = next; action.update({label: next.label, disabled: !!next.disabled});
      button.className = next.intent === 'danger' ? 'pui-destructive-menu-item' : '';
      button.setAttribute('role', next.checked === undefined ? 'menuitem' : 'menuitemcheckbox');
      if (next.checked === undefined) button.removeAttribute('aria-checked'); else button.setAttribute('aria-checked', String(next.checked));
    }}, {dispose: action.destroy});
    row.update(item); return row;
  };
  const update = (next: Readonly<MenuPartState>) => {
    assertOptions(next, ['label', 'disabled', 'items'], 'menu state'); validateFloating(next); validateItems(next.items);
    if (!isPartAlive(part)) return;
    const nextEntries = new Map(next.items.map(item => [item.key, entries.get(item.key) ?? makeItem(item)]));
    replacePartChildren(part, [...nextEntries.values()]);
    entries.clear(); nextEntries.forEach((row, key) => entries.set(key, row));
    next.items.forEach(item => entries.get(item.key)!.update(item));
    state = next; node.setAttribute('aria-label', next.label); if (next.disabled) surface.close();
  };
  part = createOwnedPart<Omit<MenuPart, keyof Part>>(node, {update,
    open(trigger: ButtonPart) {surface.open(trigger); if (surface.isOpen()) {navigation.focus(); if (!node.contains(document.activeElement)) node.focus({preventScroll: true});}},
    close() {surface.close();}, isOpen: surface.isOpen,
  }, {dispose() {generation.destroy(); surface.destroy(); navigation.destroy(); entries.clear();}});
  try {update({label: options.label, disabled: options.disabled, items: options.items});} catch (error) {part.destroy(); throw error;}
  return part;
}
