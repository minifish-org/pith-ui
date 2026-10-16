import { Lifetime } from './core.js';

export interface DialogLifecycleOptions {
  closeOnBackdrop?: boolean;
  canClose?: () => boolean;
  onOpen?: () => void;
  onClose?: () => void;
  returnFocus?: () => HTMLElement | null;
  closeButtonSelector?: string;
}
export interface DialogLifecycle {
  open(): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
}
type DialogSession = {
  listeners: Lifetime;
  subscribers: Set<DialogLifecycleOptions>;
  active: boolean;
  previousFocus: HTMLElement | null;
};
const dialogSessions = new WeakMap<HTMLDialogElement, DialogSession>();
type Activation = {owners: number; target: HTMLElement | null; listener: EventListener; timer?: ReturnType<typeof setTimeout>};
const activations = new WeakMap<Document, Activation>();
function retainActivation(document: Document): {destroy(): void} {
  let activation = activations.get(document);
  if (!activation) {
    const current: Activation = {owners: 0, target: null, listener: () => {}};
    current.listener = event => {
      current.target = event.target instanceof Element ? event.target.closest<HTMLElement>('button, a[href], input, textarea, select, summary, [tabindex]') : null;
      if (current.timer !== undefined) clearTimeout(current.timer);
      current.timer = setTimeout(() => {current.target = null; current.timer = undefined;}, 0);
    };
    document.addEventListener('click', current.listener, true);
    activations.set(document, current); activation = current;
  }
  activation.owners++;
  const current = activation;
  return {destroy() {if (--current.owners === 0) {document.removeEventListener('click', current.listener, true); if (current.timer !== undefined) clearTimeout(current.timer); activations.delete(document);}}};
}

/** One native lifecycle per dialog, including dialogs supplied by a host shell. */
export function installDialogLifecycle(dialog: HTMLDialogElement, options: DialogLifecycleOptions = {}): DialogLifecycle {
  const subscription = {...options};
  let session = dialogSessions.get(dialog);
  if (!session) {
    session = { listeners: new Lifetime(), subscribers: new Set(), active: dialog.open, previousFocus: null };
    dialogSessions.set(dialog, session);
    const current = session;
    const activation = retainActivation(dialog.ownerDocument);
    current.listeners.add(activation.destroy);
    const canClose = () => [...current.subscribers].every(subscriber => subscriber.canClose?.() !== false);
    current.listeners.listen(dialog, 'cancel', (event => { if (!canClose()) event.preventDefault(); }) as EventListener);
    current.listeners.listen(dialog, 'focusin', (() => { if (dialog.open) current.active = true; }) as EventListener);
    current.listeners.listen(dialog, 'click', (event => {
      if (!dialog.open || !canClose()) return;
      const target = event.target;
      if (target instanceof Element) {
        for (const subscriber of current.subscribers) {
          const close = target.closest<HTMLElement>(subscriber.closeButtonSelector ?? '[data-close]');
          if (close && dialog.contains(close) && (!close.dataset.close || close.dataset.close === dialog.id)) {
            dialog.close();
            return;
          }
        }
      }
      if (target !== dialog || ![...current.subscribers].every(subscriber => subscriber.closeOnBackdrop !== false)) return;
      const pointer = event as MouseEvent;
      const rect = dialog.getBoundingClientRect();
      if (pointer.clientX < rect.left || pointer.clientX > rect.right || pointer.clientY < rect.top || pointer.clientY > rect.bottom) dialog.close();
    }) as EventListener);
    current.listeners.listen(dialog, 'close', (() => {
      // A native close event may arrive after the same element has reopened.
      if (dialog.open || !current.active) return;
      current.active = false;
      const returnFocus = [...current.subscribers].reverse().find(subscriber => subscriber.returnFocus)?.returnFocus;
      const previous = returnFocus ? returnFocus() : current.previousFocus;
      current.previousFocus = null;
      const beforeCallbacks = dialog.ownerDocument.activeElement;
      for (const subscriber of [...current.subscribers]) subscriber.onClose?.();
      const afterCallbacks = dialog.ownerDocument.activeElement;
      const deliberatelyFocused = afterCallbacks !== beforeCallbacks && afterCallbacks instanceof HTMLElement && afterCallbacks !== dialog.ownerDocument.body && !dialog.contains(afterCallbacks);
      if (!dialog.open && !deliberatelyFocused && previous?.isConnected) previous.focus({ preventScroll: true });
    }) as EventListener);
  }
  const current = session;
  current.subscribers.add(subscription);
  let destroyed = false;
  return {
    open() {
      if (destroyed || dialog.open) return;
      // Safari does not focus pointer-clicked buttons. Remember this event's
      // actual opener instead of relying solely on activeElement.
      const active = activations.get(dialog.ownerDocument)?.target ?? dialog.ownerDocument.activeElement;
      current.previousFocus = active instanceof HTMLElement && !dialog.contains(active) ? active : null;
      current.active = true;
      if (!dialog.isConnected) document.body.append(dialog);
      dialog.showModal();
      for (const subscriber of [...current.subscribers]) subscriber.onOpen?.();
    },
    close() { if (!destroyed && dialog.open) dialog.close(); },
    isOpen: () => !destroyed && dialog.open,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      const returnFocus = [...current.subscribers].reverse().find(subscriber => subscriber.returnFocus)?.returnFocus;
      const previous = returnFocus ? returnFocus() : current.previousFocus;
      current.subscribers.delete(subscription);
      if (!current.subscribers.size) {
        current.listeners.destroy();
        if (!dialog.open && previous?.isConnected) previous.focus({ preventScroll: true });
        current.previousFocus = null;
        dialogSessions.delete(dialog);
      }
    },
  };
}

export interface MenuNavigationOptions {
  trigger?: HTMLElement;
  onDismiss: (restoreFocus: boolean) => void;
  isOpen?: () => boolean;
  closeOnOutside?: boolean;
  contains?: (target: Node) => boolean;
}

/** Shared keyboard behavior; each menu retains its own presentation and actions. */
export function installMenuNavigation(menu: HTMLElement, options: MenuNavigationOptions): { focus(edge?: 'first' | 'last'): void; destroy(): void } {
  const life = new Lifetime();
  const open = () => options.isOpen?.() ?? !menu.hidden;
  const targets = () => [...menu.querySelectorAll<HTMLElement>('[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], button')]
    .filter(target => !(target instanceof HTMLButtonElement && target.disabled) && target.getAttribute('aria-disabled') !== 'true' && !target.closest('[hidden]'));
  life.listen(menu, 'keydown', (event => {
    if (!open()) return;
    const keyboard = event as KeyboardEvent;
    if (keyboard.key === 'Escape') { keyboard.preventDefault(); keyboard.stopPropagation(); options.onDismiss(true); return; }
    if (keyboard.key === 'Tab') { options.onDismiss(false); return; }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(keyboard.key)) return;
    keyboard.preventDefault(); keyboard.stopPropagation();
    const items = targets();
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = keyboard.key === 'Home' ? 0 : keyboard.key === 'End' ? items.length - 1 : index < 0 ? (keyboard.key === 'ArrowUp' ? items.length - 1 : 0) : (index + (keyboard.key === 'ArrowUp' ? -1 : 1) + items.length) % items.length;
    items[next]?.focus();
  }) as EventListener);
  if (options.closeOnOutside) life.listen(document, 'pointerdown', (event => {
    const target = event.target;
    if (open() && target instanceof Node && !menu.contains(target) && !options.trigger?.contains(target) && !options.contains?.(target)) options.onDismiss(false);
  }) as EventListener);
  return { focus(edge = 'first') { const items = targets(); (edge === 'last' ? items.at(-1) : items[0])?.focus(); }, destroy() { life.destroy(); } };
}
