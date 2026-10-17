import { controlDisabled, Lifetime, setControlPending } from './core.js';
import type { ActionResult, Density, Intent, UIAction } from './core.js';
import { iconElement, setText, uniqueId } from './dom.js';
import { adoptSelect, refreshSelect } from './select.js';
import { createOperation } from './operation.js';

/** Private controllers shared by factories and the retained product templates.
 * Retained nodes keep their identity; single selects get one owned wrapper.
 */
export interface ActionState {
  label?: string;
  intent?: Intent;
  density?: Density;
  disabled?: boolean;
  pending?: boolean;
  icon?: string;
  title?: string;
  appearance?: 'standard' | 'secondary';
}
export interface ActionController {
  readonly element: HTMLButtonElement;
  invalidate(): void;
  update(state: Readonly<ActionState>): void;
  destroy(): void;
}
export function adoptAction(node: HTMLButtonElement, options: {
  caption?: HTMLElement;
  onAction?: UIAction;
  onError?: (message: string) => void;
} = {}): ActionController {
  let state: ActionState = { disabled: node.disabled };
  let localPending = false; let disposed = false;
  let glyph = node.querySelector<SVGSVGElement>(':scope > svg') ?? undefined;
  const caption = options.caption ?? [...node.children].find((child): child is HTMLElement => child instanceof HTMLElement && child.tagName === 'SPAN');
  const iconOnly = !caption && !!glyph && ![...node.childNodes].some(child => child.nodeType === Node.TEXT_NODE && child.textContent?.trim());
  let iconName: string | undefined;
  const update = (next: Readonly<ActionState>): void => {
    if (disposed) return;
    state = { ...state, ...next };
    if (next.label != null) {
      if (caption) setText(caption, next.label);
      else if (iconOnly) node.setAttribute('aria-label', next.label);
      else setText(node, next.label);
    }
    if (next.intent != null) {
      for (const intent of ['neutral', 'primary', 'danger']) node.classList.toggle(`pui-${intent}`, next.intent === intent);
    }
    if (next.density != null) {
      node.classList.toggle('pui-normal', next.density === 'normal');
      node.classList.toggle('pui-compact', next.density === 'compact');
    }
    if (next.appearance != null) node.classList.toggle('pui-secondary-button', next.appearance === 'secondary');
    // Adopted nodes keep their host-owned attributes unless explicitly updated.
    if (next.disabled != null || next.pending != null || localPending) {
      // A retained product action can also be pending in the application's
      // adapter or native-copy controller. Only clear pending that we own.
      if (state.pending != null || options.onAction) setControlPending(node, !!(state.pending || localPending));
      node.disabled = controlDisabled(node, !!(state.disabled || state.pending || localPending));
      node.setAttribute('aria-busy', String(!!(state.pending || localPending || node.dataset.controlPending || node.dataset.copyPending)));
    }
    if (next.title != null) node.title = next.title;
    if (next.icon != null && iconName !== next.icon) {
      glyph?.remove(); iconName = next.icon;
      glyph = next.icon ? iconElement(next.icon) : undefined;
      if (glyph) node.prepend(glyph);
    }
  };
  let operation: ReturnType<typeof createOperation> | undefined;
  // Most reading actions remain idle. Allocate their async gate on first use.
  const click = options.onAction ? (() => {
    if (node.disabled || localPending || disposed) return;
    operation ??= createOperation({
      unavailable: () => node.disabled || disposed,
      onPending(value) { localPending = value; update({ ...state, disabled: !!state.disabled, pending: !!state.pending }); },
      onError: options.onError,
    });
    operation.run(options.onAction!, (result: void | ActionResult) => { if (result && !result.ok) options.onError?.(result.error); });
  }) : undefined;
  if (click) node.addEventListener('click', click);
  return { element: node, update, invalidate() { if (disposed) return; operation?.invalidate(); localPending=false; update(state); }, destroy() { disposed = true; operation?.destroy(); if (click) node.removeEventListener('click',click); } };
}

export type NativeControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
export interface NativeSelectOption { value: string; label: string; disabled?: boolean; }
/** Reconcile native options by their stable value without replacing the select.
 * Callers decide the fallback when a preferred value has disappeared.
 */
export function reconcileSelectOptions(control: HTMLSelectElement, entries: readonly NativeSelectOption[], preferred?: string): void {
  const selected = new Set(preferred == null ? [...control.selectedOptions].map(option => option.value) : [preferred]);
  const existing = new Map<string, HTMLOptionElement[]>();
  for (const option of control.options) { const group = existing.get(option.value) ?? []; group.push(option); existing.set(option.value, group); }
  const keep = new Set<HTMLOptionElement>();
  entries.forEach((entry, index) => {
    const option = existing.get(entry.value)?.shift() ?? document.createElement('option');
    keep.add(option);
    if (option.value !== entry.value) option.value = entry.value;
    if (option.textContent !== entry.label) option.textContent = entry.label;
    if (option.disabled !== !!entry.disabled) option.disabled = !!entry.disabled;
    if (control.options[index] !== option) control.insertBefore(option, control.options[index] ?? null);
  });
  for (const option of [...control.options]) if (!keep.has(option)) option.remove();
  if (control.multiple) {
    for (const option of control.options) if (option.selected !== selected.has(option.value)) option.selected = selected.has(option.value);
  } else {
    const value = preferred ?? [...selected][0] ?? '';
    if (control.value !== value || !selected.size) control.value = value;
  }
  refreshSelect(control);
}
export interface NativeControlState {
  label?: string;
  description?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;
  placeholder?: string;
}
export interface NativeControlController {
  readonly element: NativeControl;
  update(state: Readonly<NativeControlState>): void;
  getValue(): string;
  getChecked(): boolean;
  reset(value: string | boolean): void;
  focus(): void;
  destroy(): void;
}
export function adoptNativeControl(control: NativeControl, options: {
  label?: HTMLLabelElement;
  description?: HTMLElement;
  error?: HTMLElement;
  onInput?: (value: string, event: Event) => void;
  onChange?: (value: string, event: Event) => void;
} = {}): NativeControlController {
  const life = options.onInput || options.onChange ? new Lifetime() : undefined; let disposed = false;
  const originalDescriptions = new Set((control.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean));
  const ownedDescriptions = new Set<string>();
  if (options.label) {
    if (!control.id) control.id = uniqueId('pui-input');
    options.label.htmlFor = control.id;
  }
  for (const node of [options.description, options.error]) if (node) {
    if (!node.id) node.id = uniqueId('pui-field-message');
    ownedDescriptions.add(node.id);
  }
  if (options.error) options.error.setAttribute('role', 'alert');
  const select = control instanceof HTMLSelectElement ? adoptSelect(control) : undefined;
  const update = (state: Readonly<NativeControlState>): void => {
    if (disposed) return;
    if (state.label != null && options.label) setText(options.label, state.label);
    if (state.disabled != null) control.disabled = state.disabled;
    if (state.required != null) control.required = state.required;
    if (state.readOnly != null && !(control instanceof HTMLSelectElement)) control.readOnly = state.readOnly;
    if (state.placeholder != null && !(control instanceof HTMLSelectElement)) control.placeholder = state.placeholder;
    if (state.description != null && options.description) {
      setText(options.description, state.description); options.description.hidden = !state.description;
    }
    if (state.error != null) {
      control.setAttribute('aria-invalid', String(!!state.error));
      if (options.error) { setText(options.error, state.error); options.error.hidden = !state.error; }
    }
    if (options.description || options.error) {
      // Preserve descriptions supplied by the host or another owned component.
      const ids = new Set([...originalDescriptions, ...(control.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean)]);
      for (const id of ownedDescriptions) ids.delete(id);
      if (options.description && !options.description.hidden && options.description.textContent) ids.add(options.description.id);
      if (options.error && !options.error.hidden && options.error.textContent) ids.add(options.error.id);
      if (ids.size) control.setAttribute('aria-describedby', [...ids].join(' ')); else control.removeAttribute('aria-describedby');
    }
    select?.refresh();
  };
  if (options.onInput) life!.listen(control, 'input', (event => options.onInput!(control.value, event)) as EventListener);
  if (options.onChange) life!.listen(control, 'change', (event => options.onChange!(control.value, event)) as EventListener);
  return { element: control, update, getValue: () => control.value,
    getChecked: () => control instanceof HTMLInputElement && control.checked,
    reset(value) { if (disposed) return; if (typeof value === 'boolean' && control instanceof HTMLInputElement) control.checked = value; else if (typeof value === 'string' && control.value !== value) control.value = value; select?.refresh(); },
    focus() { if (!disposed) { if (select) select.focus(); else control.focus(); } }, destroy() { if (disposed) return; disposed = true; life?.destroy(); select?.destroy(); } };
}

export interface FeedbackState { message: string; tone?: 'info' | 'neutral' | 'success' | 'warning' | 'error'; }
export interface FeedbackController {
  readonly element: HTMLElement;
  update(state: Readonly<FeedbackState>): void;
  destroy(): void;
}
export function adoptFeedback(node: HTMLElement, options: {
  presentation: 'notice' | 'inline' | 'status';
  autoHide?: boolean;
}): FeedbackController {
  let disposed = false;
  const update = (state: Readonly<FeedbackState>): void => {
    if (disposed) return;
    const tone = state.tone ?? (options.presentation === 'status' ? 'neutral' : 'info');
    if (options.presentation !== 'inline') {
      const prefix = options.presentation === 'notice' ? 'pui-notice' : 'pui-status';
      node.classList.add(prefix);
      for (const value of ['info', 'neutral', 'success', 'warning', 'error']) node.classList.toggle(`${prefix}-${value}`, tone === value);
    }
    if (options.presentation !== 'status') node.setAttribute('role', tone === 'error' || tone === 'warning' ? 'alert' : 'status');
    if (options.autoHide !== false) node.hidden = !state.message;
    setText(node, state.message);
  };
  return { element: node, update, destroy() { disposed = true; } };
}

export interface ActionLayoutState { align?: 'start' | 'end' | 'between'; density?: Density; label?: string; }
export function adoptActionLayout(node: HTMLElement, kind: 'actions' | 'toolbar'): {
  readonly element: HTMLElement;
  update(state: Readonly<ActionLayoutState>): void;
  destroy(): void;
} {
  let disposed = false;
  return { element: node, update(state) {
    if (disposed) return;
    if (state.align != null) node.dataset.align = state.align;
    if (state.density != null) node.classList.toggle('pui-compact', state.density === 'compact');
    if (state.label != null) { node.setAttribute('role', 'group'); node.setAttribute('aria-label', state.label); }
    node.dataset.puiActionLayout = kind;
  }, destroy() { disposed = true; } };
}

/** Owned controllers for existing product templates; not a renderer or observer.
 * Controllers are lazy. Reconciliation prunes owned handles without rescanning
 * long message histories or allocating a controller for every static button.
 */
export function adoptProductParts(owner: HTMLElement): {
  update(): void;
  action(node: HTMLButtonElement): ActionController;
  control(node: NativeControl): NativeControlController;
  feedback(node: HTMLElement): FeedbackController;
  layout(node: HTMLElement, kind: 'actions' | 'toolbar'): ReturnType<typeof adoptActionLayout>;
  destroy(): void;
} {
  const actions = new Map<HTMLButtonElement, ActionController>();
  const controls = new Map<NativeControl, NativeControlController>();
  const feedbacks = new Map<HTMLElement, FeedbackController>();
  const layouts = new Map<HTMLElement, ReturnType<typeof adoptActionLayout>>();
  let disposed = false;
  const action = (node: HTMLButtonElement): ActionController => {
    let handle = actions.get(node); if (!handle) { handle = adoptAction(node); if (disposed) handle.destroy(); else actions.set(node, handle); } return handle;
  };
  const control = (node: NativeControl): NativeControlController => {
    let handle = controls.get(node); if (!handle) { handle = adoptNativeControl(node); if (disposed) handle.destroy(); else controls.set(node, handle); } return handle;
  };
  const feedback = (node: HTMLElement): FeedbackController => {
    let handle = feedbacks.get(node); if (!handle) { handle = adoptFeedback(node, { presentation: 'inline', autoHide: false }); if (disposed) handle.destroy(); else feedbacks.set(node, handle); } return handle;
  };
  const layout = (node: HTMLElement, kind: 'actions' | 'toolbar'): ReturnType<typeof adoptActionLayout> => {
    let handle = layouts.get(node); if (!handle) { handle = adoptActionLayout(node, kind); if (disposed) handle.destroy(); else layouts.set(node, handle); } return handle;
  };
  const update = (): void => {
    if (disposed) return;
    for (const map of [actions, controls, feedbacks, layouts]) for (const [node, handle] of map) {
      if (!owner.contains(node) && node !== owner) { handle.destroy(); map.delete(node as never); }
    }
  };
  return { update, action, control, feedback, layout, destroy() {
    if (disposed) return; disposed = true;
    for (const map of [actions, controls, feedbacks, layouts]) { for (const handle of map.values()) handle.destroy(); map.clear(); }
  } };
}

