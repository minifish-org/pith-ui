import { Lifetime } from './core.js';

interface AnchoredSurfaceOptions {
  trigger: HTMLElement;
  panel: HTMLElement;
  closeOnFocusOut?: boolean;
  exclusions?: readonly Node[];
  onToggle?: (open: boolean, restoreFocus?: boolean) => void;
  position?: boolean;
  canOpen?: () => boolean;
  canEscape?: () => boolean;
  getAnchor?: () => Pick<DOMRect, 'left' | 'right' | 'top' | 'bottom' | 'width' | 'height'>;
  anchorElement?: HTMLElement;
  dismissOnMove?: boolean;
  /** Retained inspector content may open a dialog owned by the same mount. */
  retainDuringModal?: boolean;
}
interface AnchoredSurface {
  open(): void;
  close(restoreFocus?: boolean): void;
  isOpen(): boolean;
  destroy(): void;
}
const floatingStacks = new WeakMap<Document, AnchoredSurface[]>();

/** Shared nonmodal surface ownership. Retained panels can keep their own layout;
 * anchored panels use the native top layer to escape scroll/overflow containers.
 */
export function installAnchoredSurface(options: AnchoredSurfaceOptions): AnchoredSurface {
  const { trigger, panel } = options;
  const doc = trigger.ownerDocument, view = doc.defaultView!;
  const position = options.position !== false;
  const originalPopover = panel.getAttribute('popover');
  const originalStyle = panel.getAttribute('style');
  const topLayer = position && typeof panel.showPopover === 'function';
  if (topLayer) panel.setAttribute('popover', 'manual');
  if (position) panel.dataset.puiFloating = '';
  let opened = false, disposed = false, events: Lifetime | undefined;
  const stack = floatingStacks.get(doc) ?? [];
  floatingStacks.set(doc, stack);
  panel.hidden = true;
  trigger.setAttribute('aria-expanded', 'false');
  const contains = (target: EventTarget | null) => {
    if (!(target instanceof Node)) return false;
    if (trigger.contains(target) || panel.contains(target) || options.exclusions?.some(node => node.contains(target))) return true;
    if (!options.retainDuringModal) return false;
    const scope = trigger.closest('.pui');
    return !!scope && [...scope.querySelectorAll<HTMLDialogElement>('dialog[open]')].some(dialog =>
      dialog.closest('.pui') === scope && dialog.contains(target));
  };
  const style = (name: string, value: string) => { if (panel.style.getPropertyValue(name) !== value) panel.style.setProperty(name, value); };
  const place = () => {
    if (!opened || !position) return;
    if (!trigger.isConnected || !trigger.getClientRects().length) { close(); return; }
    const anchor = options.getAnchor?.() ?? options.anchorElement?.getBoundingClientRect() ?? trigger.getBoundingClientRect();
    const viewport = view.visualViewport;
    const left = viewport?.offsetLeft ?? 0, top = viewport?.offsetTop ?? 0;
    const width = viewport?.width ?? doc.documentElement.clientWidth;
    const height = viewport?.height ?? doc.documentElement.clientHeight;
    const gap = parseFloat(view.getComputedStyle(panel).getPropertyValue('--pui-space-sm')) || 8;
    const margin = gap;
    style('max-width', `${Math.max(0, width - margin * 2)}px`);
    style('min-width', `${Math.min(anchor.width, Math.max(0, width - margin * 2))}px`);
    // scrollHeight measures the content without expanding the viewport first.
    // Expanding a scrolled list would clamp scrollTop and hide its active item.
    const scrollTop = panel.scrollTop, scrollLeft = panel.scrollLeft;
    const desired = Math.min(panel.scrollHeight + 2, 320);
    const below = top + height - anchor.bottom - margin - gap;
    const above = anchor.top - top - margin - gap;
    const upwards = below < desired && above > below;
    const available = Math.max(0, upwards ? above : below);
    style('max-height', `${Math.min(320, available)}px`);
    const bounds = panel.getBoundingClientRect();
    const horizontal = anchor.left + bounds.width > left + width - margin ? anchor.right - bounds.width : anchor.left;
    style('left', `${Math.max(left + margin, Math.min(horizontal, left + width - margin - bounds.width))}px`);
    style('top', `${upwards ? Math.max(top + margin, anchor.top - gap - bounds.height) : anchor.bottom + gap}px`);
    panel.scrollTop = scrollTop; panel.scrollLeft = scrollLeft;
  };
  function close(restoreFocus = false): void {
    if (!opened) return;
    opened = false;
    events?.destroy(); events = undefined;
    const index = stack.indexOf(handle); if (index >= 0) stack.splice(index, 1);
    if (topLayer && panel.matches(':popover-open')) panel.hidePopover();
    panel.hidden = true; trigger.setAttribute('aria-expanded', 'false');
    options.onToggle?.(false, restoreFocus);
    if (restoreFocus && trigger.isConnected && !trigger.matches(':disabled')) trigger.focus({ preventScroll: true });
  }
  const handle: AnchoredSurface = {
    open() {
      if (disposed || opened || options.canOpen?.() === false || !trigger.isConnected || !trigger.getClientRects().length) return;
      opened = true; panel.hidden = false; trigger.setAttribute('aria-expanded', 'true');
      stack.push(handle);
      if (topLayer) panel.showPopover();
      place();
      if (!opened) return;
      events = new Lifetime();
      const outside = (event: Event) => { if (!contains(event.target)) close(); };
      events.listen(doc, 'pointerdown', outside, { capture: true });
      events.listen(doc, 'click', outside, { capture: true });
      if (options.closeOnFocusOut !== false) {
        events.listen(doc, 'focusin', outside, { capture: true });
        const blur = (event: Event) => {
          // Native pointer focus can briefly expose body between focusout and
          // focusin. Its related target already identifies an internal move.
          if (contains((event as FocusEvent).relatedTarget)) return;
          queueMicrotask(() => { if (opened && !contains(doc.activeElement)) close(); });
        };
        events.listen(trigger, 'focusout', blur); events.listen(panel, 'focusout', blur);
      }
      events.listen(doc, 'keydown', (event => {
        const key = event as KeyboardEvent;
        if (key.key !== 'Escape' || stack.at(-1) !== handle || options.canEscape?.() === false) return;
        const modal = [...doc.querySelectorAll<HTMLDialogElement>('dialog[open]')].at(-1);
        if (modal && !modal.contains(trigger)) return;
        key.preventDefault(); key.stopPropagation(); close(true);
      }) as EventListener, { capture: true });
      if (position) {
        const move = () => { if (options.dismissOnMove) close(); else place(); };
        events.listen(view, 'resize', move);
        events.listen(doc, 'scroll', event => { if (!(event.target instanceof Node) || !panel.contains(event.target)) move(); }, { capture: true });
        if (view.visualViewport) { events.listen(view.visualViewport, 'resize', move); events.listen(view.visualViewport, 'scroll', move); }
        const observer = new ResizeObserver(place); observer.observe(trigger); observer.observe(panel);
        if (options.anchorElement && options.anchorElement !== trigger) observer.observe(options.anchorElement);
        events.add(() => observer.disconnect());
      }
      options.onToggle?.(true);
    },
    close,
    isOpen: () => opened,
    destroy() {
      if (disposed) return;
      close(); disposed = true;
      if (position) {
        delete panel.dataset.puiFloating;
        if (originalStyle === null) panel.removeAttribute('style'); else panel.setAttribute('style', originalStyle);
      }
      if (topLayer) { if (originalPopover === null) panel.removeAttribute('popover'); else panel.setAttribute('popover', originalPopover); }
    },
  };
  return handle;
}

function belongsToCloseScope(owner: HTMLElement, close: HTMLElement, dialogId?: string): boolean {
  if (!owner.contains(close) || close.matches(':disabled') || close.getAttribute('aria-disabled') === 'true') return false;
  const dialog = owner.closest('dialog');
  if (close.closest('dialog') !== dialog) return false;
  return close.hasAttribute('data-pui-close') || !close.dataset.close || close.dataset.close === (dialogId ?? dialog?.id ?? owner.id);
}

/** A content block can request closure without guessing its eventual frame ID. */
export function bindContentClose(owner: HTMLElement, options: { dialogId?: string; onClose?: () => void } = {}): { destroy(): void } {
  const life = new Lifetime();
  life.listen(owner, 'click', (event => {
    if (event.defaultPrevented || !(event.target instanceof Element)) return;
    const close = event.target.closest<HTMLElement>('[data-pui-close], [data-close]');
    if (!close || !belongsToCloseScope(owner, close, options.dialogId)) return;
    const dialog = owner.closest('dialog');
    if (dialog && ![...(dialogSessions.get(dialog)?.subscribers ?? [])].every(subscriber => subscriber.canClose?.() !== false)) return;
    event.preventDefault();
    if (options.onClose) options.onClose();
    else if (dialog?.open) dialog.close();
    else owner.hidden = true;
  }) as EventListener);
  return { destroy: () => life.destroy() };
}

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
      if (!dialog.open || !canClose() || event.defaultPrevented) return;
      const target = event.target;
      if (target instanceof Element) {
        for (const subscriber of current.subscribers) {
          const close = target.closest<HTMLElement>(subscriber.closeButtonSelector ?? '[data-pui-close], [data-close]');
          if (close && belongsToCloseScope(dialog, close, dialog.id)) {
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
