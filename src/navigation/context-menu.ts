import type { UIBlock } from '../core.js';
export interface ContextMenuItem {
  label: string; action?: string; sdkAction?: string; danger?: boolean; disabled?: boolean;
  idle?: {conversationId?: string; workspaceId?: string};
}
export interface ContextMenuState {label: string; items: readonly ContextMenuItem[]}
export function createContextMenu(options: {element?: HTMLElement; onDismiss?: (restoreFocus: boolean) => void; onAction?: (item: ContextMenuItem) => void} = {}): UIBlock<ContextMenuState> & {open(trigger: HTMLElement, state: ContextMenuState): void; close(restoreFocus?: boolean): void} {
  const element = options.element || document.createElement('div');
  if (!options.element) {element.className = 'pui-sidebar-conversation-menu pui-context-menu'; element.setAttribute('role', 'menu'); element.hidden = true;}
  const abort = new AbortController(); let trigger: HTMLElement | null = null; let destroyed = false;
  const close = (restoreFocus = false) => {element.hidden = true; trigger?.setAttribute('aria-expanded', 'false'); if (restoreFocus) trigger?.focus(); trigger = null;};
  const update = (state: Readonly<ContextMenuState>) => {
    if (destroyed) return; element.setAttribute('aria-label', state.label); element.replaceChildren();
    for (const item of state.items) {
      const button = document.createElement('button'); button.type = 'button'; button.setAttribute('role', 'menuitem'); button.textContent = item.label; button.disabled = !!item.disabled;
      if (item.danger) button.className = 'pui-destructive-menu-item';
      if (item.action) button.dataset.action = item.action;
      if (item.sdkAction) button.dataset.sdk = item.sdkAction;
      if (item.idle) {button.dataset.idleAction = ''; if (item.idle.conversationId) button.dataset.idleConversation = item.idle.conversationId; if (item.idle.workspaceId) button.dataset.idleWorkspace = item.idle.workspaceId;}
      if (options.onAction) button.addEventListener('click', () => options.onAction!(item), {signal:abort.signal});
      element.append(button);
    }
  };
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {event.preventDefault(); event.stopPropagation(); options.onDismiss ? options.onDismiss(true) : close(true); return;}
    if (event.key === 'Tab') {options.onDismiss ? options.onDismiss(false) : close(false); return;}
    const buttons = [...element.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); event.stopPropagation(); const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next]?.focus();
    }
  }, {signal:abort.signal});
  return {element, update, close, open(source, state) {if (destroyed) return; close(); trigger = source; trigger.setAttribute('aria-expanded', 'true'); update(state); element.hidden = false; const rect = source.getBoundingClientRect(); element.style.left = `${Math.max(8, Math.min(rect.right, window.innerWidth - element.offsetWidth - 8))}px`; element.style.top = `${Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - element.offsetHeight - 8))}px`; element.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();}, destroy() {if (destroyed) return; destroyed = true; close(); abort.abort(); if (!options.element) element.remove();}};
}
