import type { UIBlock } from '../core.js';
import { installAnchoredSurface, installMenuNavigation } from '../surface.js';
import { adoptProductParts } from '../foundations.js';
import { reconcileKeyed } from '../reconcile.js';
export interface ContextMenuItem {
  id?: string; label: string; action?: string; sdkAction?: string; danger?: boolean; disabled?: boolean;
  idle?: {conversationId?: string; workspaceId?: string};
}
export interface ContextMenuState {label: string; items: readonly ContextMenuItem[]}
export interface ContextMenuOpenOptions {point?: {x: number; y: number}}
export function createContextMenu(options: {element?: HTMLElement; onDismiss?: (restoreFocus: boolean) => void; onAction?: (item: ContextMenuItem) => void} = {}): UIBlock<ContextMenuState> & {open(trigger: HTMLElement, state: ContextMenuState, options?: ContextMenuOpenOptions): void; close(restoreFocus?: boolean): void} {
  const element = options.element || document.createElement('div');
  if (!options.element) {element.className = 'pui-sidebar-conversation-menu pui-context-menu'; element.setAttribute('role', 'menu'); element.hidden = true;}
  element.setAttribute('role', 'menu'); element.tabIndex = -1;
  const abort = new AbortController(); let destroyed = false, programmaticClose = false;
  let surface: ReturnType<typeof installAnchoredSurface> | undefined;
  const parts = adoptProductParts(element);
  const rows = new Map<string, HTMLButtonElement>();
  const actions = new Map<HTMLButtonElement, ContextMenuItem>();
  const close = (restoreFocus = false) => {
    programmaticClose = true;
    surface?.close(restoreFocus); surface?.destroy(); surface = undefined;
    element.hidden = true; programmaticClose = false;
  };
  const dismiss = (restoreFocus: boolean) => {close(restoreFocus); options.onDismiss?.(restoreFocus);};
  const navigation = installMenuNavigation(element, {onDismiss: dismiss, isOpen: () => surface?.isOpen() ?? false});
  const update = (state: Readonly<ContextMenuState>) => {
    if (destroyed) return; element.setAttribute('aria-label', state.label);
    const entries = state.items.map((item, index) => ({item, key: item.id ?? `${item.action || ''}/${item.sdkAction || ''}/${index}`}));
    reconcileKeyed(element, rows, entries, {key: entry => entry.key, element: button => button,
      create() {const button = document.createElement('button'); button.type = 'button'; button.setAttribute('role', 'menuitem'); return button;},
      update(button, {item}) {
      parts.action(button).update({label: item.label, disabled: !!item.disabled});
      button.classList.toggle('pui-destructive-menu-item', !!item.danger);
      if (item.action) button.dataset.action = item.action; else delete button.dataset.action;
      if (item.sdkAction) button.dataset.sdk = item.sdkAction; else delete button.dataset.sdk;
      for (const name of ['idleAction', 'idleConversation', 'idleWorkspace']) delete button.dataset[name];
      if (item.idle) {button.dataset.idleAction = ''; if (item.idle.conversationId) button.dataset.idleConversation = item.idle.conversationId; if (item.idle.workspaceId) button.dataset.idleWorkspace = item.idle.workspaceId;}
      actions.set(button, item);
      }, destroy(button) {actions.delete(button);},
    });
    parts.update();
  };
  if (options.onAction) element.addEventListener('click', event => {const button = (event.target as Element).closest<HTMLButtonElement>('button'); const item = button ? actions.get(button) : undefined; if (item && !button!.disabled) {event.stopPropagation();options.onAction!(item);}}, {signal: abort.signal});
  return {element, update, close, open(source, state, anchor = {}) {
    if (destroyed) return;
    close(); update(state); source.focus({preventScroll: true});
    surface = installAnchoredSurface({trigger: source, panel: element, dismissOnMove: true,
      ...(anchor.point ? {getAnchor: () => ({left: anchor.point!.x, right: anchor.point!.x, top: anchor.point!.y, bottom: anchor.point!.y, width: 0, height: 0})} : {}),
      onToggle(open, restoreFocus) {if (!open && !programmaticClose) options.onDismiss?.(!!restoreFocus);},
    });
    surface.open(); navigation.focus();
    if (surface.isOpen() && !element.contains(document.activeElement)) element.focus({preventScroll: true});
  }, destroy() {if (destroyed) return; destroyed = true; close(); navigation.destroy(); abort.abort(); parts.destroy(); rows.clear(); actions.clear(); if (!options.element) element.remove();}};
}
