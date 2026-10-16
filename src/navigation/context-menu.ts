import type { UIBlock } from '../core.js';
import { installMenuNavigation } from '../surface.js';
import { adoptProductParts } from '../foundations.js';
export interface ContextMenuItem {
  id?: string; label: string; action?: string; sdkAction?: string; danger?: boolean; disabled?: boolean;
  idle?: {conversationId?: string; workspaceId?: string};
}
export interface ContextMenuState {label: string; items: readonly ContextMenuItem[]}
export function createContextMenu(options: {element?: HTMLElement; onDismiss?: (restoreFocus: boolean) => void; onAction?: (item: ContextMenuItem) => void} = {}): UIBlock<ContextMenuState> & {open(trigger: HTMLElement, state: ContextMenuState): void; close(restoreFocus?: boolean): void} {
  const element = options.element || document.createElement('div');
  if (!options.element) {element.className = 'pui-sidebar-conversation-menu pui-context-menu'; element.setAttribute('role', 'menu'); element.hidden = true;}
  const abort = new AbortController(); let trigger: HTMLElement | null = null; let destroyed = false;
  const parts = adoptProductParts(element);
  const rows = new Map<string, HTMLButtonElement>();
  const actions = new Map<HTMLButtonElement, ContextMenuItem>();
  const close = (restoreFocus = false) => {element.hidden = true; trigger?.setAttribute('aria-expanded', 'false'); if (restoreFocus) trigger?.focus(); trigger = null;};
  const dismiss = (restoreFocus: boolean) => {close(restoreFocus); options.onDismiss?.(restoreFocus);};
  const navigation = installMenuNavigation(element, {onDismiss: dismiss, isOpen: () => !element.hidden, closeOnOutside: true, contains: target => !!trigger?.contains(target)});
  const update = (state: Readonly<ContextMenuState>) => {
    if (destroyed) return; element.setAttribute('aria-label', state.label);
    const keep = new Set<string>(); let cursor = element.firstElementChild;
    for (const [index, item] of state.items.entries()) {
      const key = item.id ?? `${item.action || ''}/${item.sdkAction || ''}/${index}`; keep.add(key);
      let button = rows.get(key);
      if (!button) {button = document.createElement('button'); button.type = 'button'; button.setAttribute('role', 'menuitem'); rows.set(key, button);}
      parts.action(button).update({label: item.label, disabled: !!item.disabled});
      button.classList.toggle('pui-destructive-menu-item', !!item.danger);
      if (item.action) button.dataset.action = item.action; else delete button.dataset.action;
      if (item.sdkAction) button.dataset.sdk = item.sdkAction; else delete button.dataset.sdk;
      for (const name of ['idleAction', 'idleConversation', 'idleWorkspace']) delete button.dataset[name];
      if (item.idle) {button.dataset.idleAction = ''; if (item.idle.conversationId) button.dataset.idleConversation = item.idle.conversationId; if (item.idle.workspaceId) button.dataset.idleWorkspace = item.idle.workspaceId;}
      actions.set(button, item);
      if (cursor !== button) element.insertBefore(button, cursor); cursor = button.nextElementSibling;
    }
    for (const [key, button] of rows) if (!keep.has(key)) {button.remove(); rows.delete(key); actions.delete(button);}
    parts.update();
  };
  if (options.onAction) element.addEventListener('click', event => {const button = (event.target as Element).closest<HTMLButtonElement>('button'); const item = button ? actions.get(button) : undefined; if (item && !button!.disabled) options.onAction!(item);}, {signal: abort.signal});
  const onScroll = (event: Event) => {if (!element.hidden && event.target instanceof Node && !element.contains(event.target)) dismiss(false);};
  document.addEventListener('scroll', onScroll, {capture: true, passive: true, signal: abort.signal});
  window.addEventListener('resize', () => {if (!element.hidden) dismiss(false);}, {signal: abort.signal});
  return {element, update, close, open(source, state) {if (destroyed) return; close(); trigger = source; trigger.setAttribute('aria-expanded', 'true'); update(state); element.hidden = false; const rect = source.getBoundingClientRect(); element.style.left = `${Math.max(8, Math.min(rect.right, window.innerWidth - element.offsetWidth - 8))}px`; element.style.top = `${Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - element.offsetHeight - 8))}px`; navigation.focus();}, destroy() {if (destroyed) return; destroyed = true; close(); navigation.destroy(); abort.abort(); parts.destroy(); rows.clear(); actions.clear(); if (!options.element) element.remove();}};
}
