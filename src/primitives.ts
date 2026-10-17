import { Generation, Lifetime } from './core.js';
import type { ActionResult, Density, Intent, UIAction, UIBlock } from './core.js';
import { element, iconElement, setText, uniqueId } from './dom.js';
import { adoptAction, adoptActionLayout, adoptFeedback, adoptNativeControl, reconcileSelectOptions } from './foundations.js';
import { installAnchoredSurface, installDialogLifecycle, installMenuNavigation } from './surface.js';
import { reconcileKeyed } from './reconcile.js';
import { createOperation } from './operation.js';

export interface ButtonState {
  label: string;
  intent?: Intent;
  density?: Density;
  disabled?: boolean;
  pending?: boolean;
  icon?: string;
  title?: string;
  /** Secondary product action, including the accepted compact application style. */
  appearance?: 'standard' | 'secondary';
}
export interface ButtonOptions extends ButtonState {
  type?: 'button' | 'submit' | 'reset';
  onAction?: UIAction;
  onError?: (message: string) => void;
}
export interface ButtonBlock extends UIBlock<ButtonState> { readonly element: HTMLButtonElement; invalidate():void; }

export function createButton(options: ButtonOptions): ButtonBlock {
  const node = element('button', 'pui-button');
  node.type = options.type ?? 'button';
  const caption = element('span');
  node.append(caption);
  const action = adoptAction(node, { caption, onAction: options.onAction, onError: options.onError });
  const update = (next: Readonly<ButtonState>): void => {
    action.update({ ...next, intent: next.intent ?? 'neutral', density: next.density ?? 'normal',
      disabled: !!next.disabled, pending: !!next.pending, title: next.title ?? '', icon: next.icon ?? '',
      appearance: next.appearance ?? 'standard' });
  };
  update(options);
  return { element: node, update, invalidate:action.invalidate, destroy() { action.destroy(); } };
}

export function createIconButton(options: ButtonOptions & { icon: string }): ButtonBlock {
  const block = createButton(options);
  const update = block.update;
  block.update = state => {
    update(state);
    block.element.classList.add('pui-icon-button');
    block.element.setAttribute('aria-label', state.label);
    block.element.querySelector('span')?.classList.add('pui-sr-only');
  };
  block.update(options);
  return block;
}

export function createTextAction(options: ButtonOptions): ButtonBlock {
  const block = createButton(options);
  const update = block.update;
  block.update = state => { update(state); block.element.classList.add('pui-text-action'); };
  block.update(options);
  return block;
}

export interface IconState { name: string; label?: string; size?: 'small' | 'normal'; }
export function createIcon(state: IconState): UIBlock<IconState> {
  const root = element('span', 'pui-icon-display'); let currentName = '';
  const update = (next: Readonly<IconState>): void => {
    if (next.name !== currentName) { currentName = next.name; root.replaceChildren(iconElement(next.name)); }
    root.classList.toggle('pui-icon-small', next.size === 'small');
    if (next.label) { root.setAttribute('role', 'img'); root.setAttribute('aria-label', next.label); root.removeAttribute('aria-hidden'); }
    else { root.removeAttribute('role'); root.removeAttribute('aria-label'); root.setAttribute('aria-hidden', 'true'); }
  };
  update(state); return { element: root, update, destroy() {} };
}

export function createDivider(state: { label?: string } = {}): UIBlock<{ label?: string }> {
  const root = element('div', 'pui-divider'); root.setAttribute('role', 'separator');
  const update = (next: Readonly<{ label?: string }>): void => { setText(root, next.label); if (next.label) root.setAttribute('aria-label', next.label); else root.removeAttribute('aria-label'); };
  update(state); return { element: root, update, destroy() {} };
}

export interface KeyValueState { items: readonly { key: string; label: string; value: string }[]; }
export function createKeyValue(options: KeyValueState): UIBlock<KeyValueState> {
  const root = element('dl', 'pui-key-value'); const rows = new Map<string, { node: HTMLElement; label: HTMLElement; value: HTMLElement }>();
  const update = (state: Readonly<KeyValueState>): void => {
    reconcileKeyed(root, rows, state.items, { key: item => item.key, element: row => row.node,
      create() { const label = element('dt'), value = element('dd'); return { node: element('div', '', label, value), label, value }; },
      update(row, item) { setText(row.label, item.label); setText(row.value, item.value); }, destroy() {},
    });
  };
  update(options); return { element: root, update, destroy() { rows.clear(); } };
}

export interface ToolbarState { label: string; density?: Density; }
export function createToolbar(options: ToolbarState & { children?: readonly Node[] }): UIBlock<ToolbarState> {
  const root = element('div', 'pui-toolbar'); root.append(...(options.children ?? []));
  const layout = adoptActionLayout(root, 'toolbar');
  const update = (state: Readonly<ToolbarState>): void => { layout.update({ ...state, density: state.density ?? 'normal' }); };
  update(options); return { element: root, update, destroy() { layout.destroy(); } };
}

export interface ScrollAreaState { label: string; size?: 'small' | 'medium' | 'fill'; }
export function createScrollArea(options: ScrollAreaState & { content: Node }): UIBlock<ScrollAreaState> {
  const root = element('div', 'pui-scroll-area', options.content); root.tabIndex = 0; root.setAttribute('role', 'region');
  const update = (state: Readonly<ScrollAreaState>): void => { root.setAttribute('aria-label', state.label); root.dataset.size = state.size ?? 'medium'; };
  update(options); return { element: root, update, destroy() {} };
}

export interface FieldState {
  selectAnchor?:boolean;
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}
export interface FieldBlock extends UIBlock<FieldState> {
  readonly control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
}

export function createField(options: FieldState & { control: FieldBlock['control'] }): FieldBlock {
  const root = element('div', 'pui-field');if(options.selectAnchor)root.dataset.puiSelectAnchor='';
  const label = element('label', 'pui-field-label'), requiredMark=element('span','pui-required-mark',' *');
  const description = element('div', 'pui-field-description');
  const error = element('div', 'pui-field-error');
  const control = options.control;
  description.id = uniqueId('pui-description');
  error.id = uniqueId('pui-error');
  control.classList.add('pui-control');
  root.append(label, control, description, error);
  const field = adoptNativeControl(control, { label, description, error });
  const update = (state: Readonly<FieldState>): void => {
    field.update({ ...state, label: state.label,
      description: state.description ?? '', error: state.error ?? '', disabled: !!state.disabled, required: !!state.required });
    if(state.required)label.append(requiredMark);else requiredMark.remove();
    label.hidden = !state.label;
    root.classList.toggle('pui-invalid', !!state.error);
  };
  update(options);
  return { element: root, control, update, destroy() { field.destroy(); } };
}

export interface InputState extends FieldState {
  placeholder?: string;
  readOnly?: boolean;
  density?: Density;
}
export interface InputOptions extends InputState {
  value?: string;
  onInput?: (value: string, event: Event) => void;
  onChange?: (value: string, event: Event) => void;
  autocomplete?: string;
  min?: number;
  max?: number;
  step?: number | 'any';
}
export interface InputBlock extends UIBlock<InputState> {
  readonly control: HTMLInputElement | HTMLTextAreaElement;
  getValue(): string;
  reset(value: string): void;
  focus(): void;
}

function textControl(options: InputOptions, type: 'text' | 'search' | 'password' | 'number' | 'textarea'): InputBlock {
  const control = type === 'textarea' ? element('textarea') : element('input');
  if (control instanceof HTMLInputElement) {
    control.type = type === 'textarea' ? 'text' : type;
    if (options.min != null) control.min = String(options.min);
    if (options.max != null) control.max = String(options.max);
    if (options.step != null) control.step = String(options.step);
  }
  if (options.autocomplete) control.setAttribute('autocomplete', options.autocomplete);
  control.defaultValue = options.value ?? ''; control.value = options.value ?? '';
  const field = createField({ ...options, control });
  const input = adoptNativeControl(control, { onInput: options.onInput, onChange: options.onChange });
  const update = (state: Readonly<InputState>): void => {
    field.update(state);
    input.update({ placeholder: state.placeholder ?? '', readOnly: !!state.readOnly });
    control.classList.toggle('pui-compact', state.density === 'compact');
  };
  update(options);
  return { element: field.element, control, update, getValue: input.getValue,
    reset: input.reset, focus: input.focus,
    destroy() { input.destroy(); field.destroy(); } };
}
export const createTextInput = (options: InputOptions): InputBlock => textControl(options, 'text');
export const createSearchInput = (options: InputOptions): InputBlock => textControl(options, 'search');
export const createNumberInput = (options: InputOptions): InputBlock => textControl(options, 'number');
export const createTextArea = (options: InputOptions): InputBlock => textControl(options, 'textarea');

export function createSecretInput(options: InputOptions): InputBlock {
  const block = textControl({ ...options, autocomplete: options.autocomplete ?? 'off' }, 'password');
  const control = block.control as HTMLInputElement;
  const toggle = createTextAction({ label: 'Show', onAction() {
    const show = control.type === 'password';
    control.type = show ? 'text' : 'password';
    toggle.update({ label: show ? 'Hide' : 'Show', disabled: control.disabled });
    toggle.element.setAttribute('aria-pressed', String(show));
  } });
  toggle.element.setAttribute('aria-controls', control.id);
  toggle.element.setAttribute('aria-pressed', 'false');
  block.element.append(toggle.element);
  const update = block.update;
  block.update = state => { update(state); toggle.update({ label: control.type === 'password' ? 'Show' : 'Hide', disabled: state.disabled }); };
  const reset=block.reset;
  block.reset=value=>{reset(value);control.type='password';toggle.update({label:'Show',disabled:control.disabled});toggle.element.setAttribute('aria-pressed','false');};
  const destroy = block.destroy;
  block.destroy = () => { block.reset('');destroy(); toggle.destroy(); };
  block.update(options);
  return block;
}

export interface SelectOption { value: string; label: string; disabled?: boolean; }
export interface SelectState extends FieldState { options: readonly SelectOption[]; density?: Density; }
export interface SelectOptions extends SelectState {
  value?: string;
  values?: readonly string[];
  onChange?: (value: string) => void;
  onValuesChange?: (values: readonly string[]) => void;
  multiple?: boolean;
  size?: number;
}
export interface SelectBlock extends UIBlock<SelectState> {
  readonly control: HTMLSelectElement;
  getValue(): string;
  getValues(): string[];
  reset(value: string): void;
  resetValues(values: readonly string[]): void;
  focus(): void;
}
export function createSelect(options: SelectOptions): SelectBlock {
  const control = element('select');
  control.multiple = !!options.multiple;
  if (options.size) control.size = options.size;
  const field = createField({ ...options, control });
  let disposed = false;
  const getValues = (): string[] => [...control.selectedOptions].map(option => option.value);
  const input = adoptNativeControl(control, { onChange: () => { options.onChange?.(control.value); options.onValuesChange?.(getValues()); } });
  const resetValues = (values: readonly string[]): void => {
    if (disposed) return;
    if (!control.multiple) { input.reset(values[0] ?? ''); return; }
    const selected = new Set(values);
    for (const option of control.options) option.selected = selected.has(option.value);
    input.update({});
  };
  let signature = '';
  const update = (state: Readonly<SelectState>): void => {
    if (disposed) return;
    field.update(state);
    control.classList.toggle('pui-compact', state.density === 'compact');
    const next = JSON.stringify(state.options);
    if (next !== signature) {
      signature = next;
      reconcileSelectOptions(control, state.options);
      if (!control.multiple && control.selectedIndex < 0) control.selectedIndex = [...control.options].findIndex(option => !option.disabled);
    }
    input.update({});
  };
  update(options);
  const initial = options.values ?? (options.value == null ? undefined : [options.value]);
  if (initial) {
    const selected = new Set(control.multiple ? initial : initial.slice(0, 1));
    for (const option of control.options) option.defaultSelected = selected.has(option.value);
    resetValues(initial);
  }
  return { element: field.element, control, update, getValue: input.getValue, getValues,
    reset: input.reset, resetValues, focus: input.focus, destroy() { if (disposed) return; disposed = true; input.destroy(); field.destroy(); } };
}

export interface CheckboxState { label: string; description?: string; disabled?: boolean; }
export interface CheckboxBlock extends UIBlock<CheckboxState> {
  readonly control: HTMLInputElement;
  getValue(): boolean;
  reset(value: boolean): void;
  focus(): void;
}
export function createCheckbox(options: CheckboxState & { checked?: boolean; onChange?: (value: boolean) => void }): CheckboxBlock {
  const control = element('input'); control.type = 'checkbox'; control.defaultChecked = !!options.checked; control.checked = !!options.checked;
  const caption = element('span'); const description = element('small');
  const root = element('label', 'pui-checkbox', control, element('span', '', caption, description));
  const input = adoptNativeControl(control, { onChange: () => options.onChange?.(control.checked) });
  const update = (state: Readonly<CheckboxState>): void => {
    setText(caption, state.label); setText(description, state.description); description.hidden = !state.description;
    input.update({ disabled: !!state.disabled });
  };
  update(options);
  return { element: root, control, update, getValue: input.getChecked,
    reset: input.reset, focus: input.focus, destroy() { input.destroy(); } };
}

export interface NoticeState { message: string; tone?: 'info' | 'success' | 'warning' | 'error'; }
export function createNotice(state: NoticeState): UIBlock<NoticeState> {
  const root = element('div', 'pui-notice');
  const notice = adoptFeedback(root, { presentation: 'notice' });
  notice.update(state); return notice;
}
export interface StatusState { label: string; tone?: 'neutral' | 'success' | 'warning' | 'error'; }
export function createStatus(state: StatusState): UIBlock<StatusState> {
  const root = element('span', 'pui-status');
  const status = adoptFeedback(root, { presentation: 'status', autoHide: false });
  const update = (next: Readonly<StatusState>): void => { status.update({ message: next.label, tone: next.tone }); };
  update(state); return { element: root, update, destroy() { status.destroy(); } };
}
export interface ProgressState { label: string; value?: number; max?: number; }
export function createProgress(state: ProgressState): UIBlock<ProgressState> {
  const control = element('progress'); const label = element('span');
  const root = element('label', 'pui-progress', label, control);
  const update = (next: Readonly<ProgressState>): void => {
    setText(label, next.label); control.max = next.max && next.max > 0 ? next.max : 100;
    if (next.value == null) control.removeAttribute('value'); else control.value = Math.max(0, Math.min(next.value, control.max));
  };
  update(state); return { element: root, update, destroy() {} };
}

export interface FormSectionState { title: string; description?: string; }
export function createFormSection(options: FormSectionState & { content?: Node }): UIBlock<FormSectionState> {
  const title = element('h3'); const description = element('p', 'pui-muted');
  const root = element('section', 'pui-form-section', title, description);
  if (options.content) root.append(options.content);
  const update = (state: Readonly<FormSectionState>): void => { setText(title, state.title); setText(description, state.description); description.hidden = !state.description; };
  update(options); return { element: root, update, destroy() {} };
}
export interface ActionsState { align?: 'start' | 'end' | 'between'; }
export function createActions(options: ActionsState & { children?: readonly Node[] } = {}): UIBlock<ActionsState> {
  const root = element('div', 'pui-actions'); root.append(...(options.children ?? []));
  const layout = adoptActionLayout(root, 'actions');
  const update = (state: Readonly<ActionsState>): void => { layout.update({ align: state.align ?? 'end' }); };
  update(options); return { element: root, update, destroy() { layout.destroy(); } };
}
export interface DisclosureState { title: string; description?: string; disabled?: boolean; }
export interface DisclosureBlock extends UIBlock<DisclosureState> { setOpen(open: boolean): void; isOpen(): boolean; }
export function createDisclosure(options: DisclosureState & { content: Node; open?: boolean; onToggle?: (open: boolean) => void }): DisclosureBlock {
  const root = element('details', 'pui-disclosure'); const summary = element('summary'); const title = element('span');
  const description = element('small', 'pui-muted'); summary.append(title, description); root.append(summary, element('div', 'pui-disclosure-content', options.content));
  root.open = !!options.open; let disabled = !!options.disabled; const life = new Lifetime();
  life.listen(root, 'toggle', (() => options.onToggle?.(root.open)) as EventListener);
  life.listen(summary, 'click', (event => { if (disabled) event.preventDefault(); }) as EventListener);
  const update = (state: Readonly<DisclosureState>): void => {
    setText(title, state.title); setText(description, state.description); description.hidden = !state.description;
    disabled = !!state.disabled; summary.setAttribute('aria-disabled', String(disabled));
  };
  update(options);
  return { element: root, update, setOpen(open) { root.open = open; }, isOpen: () => root.open, destroy() { life.destroy(); } };
}
export interface ListRowState { title: string; description?: string; meta?: string; selected?: boolean; icon?: string; }
export function createListRow(options: ListRowState & { actions?: Node;titleContent?:Node }): UIBlock<ListRowState> {
  const title = element('div', 'pui-list-row-title'); const description = element('div', 'pui-muted'); const meta = element('small', 'pui-muted');
  if(options.titleContent)title.append(options.titleContent);
  const glyph = element('span', 'pui-list-row-icon');
  const root = element('div', 'pui-list-row', glyph, element('div', 'pui-list-row-body', title, description), meta);
  if (options.actions) root.append(options.actions);
  let iconName = '';
  const update = (state: Readonly<ListRowState>): void => {
    if(!options.titleContent)setText(title, state.title); setText(description, state.description); description.hidden = !state.description;
    setText(meta, state.meta); meta.hidden = !state.meta; root.classList.toggle('pui-selected', !!state.selected);
    if (iconName !== (state.icon ?? '')) { iconName = state.icon ?? ''; glyph.replaceChildren(...(state.icon ? [iconElement(state.icon)] : [])); }
    glyph.hidden = !state.icon;
  };
  update(options); return { element: root, update, destroy() {} };
}
export interface CollectionState { status: 'ready' | 'loading' | 'empty' | 'error'; message?: string; retryLabel?: string; }
export function createCollectionState(options: CollectionState & { content?: Node; onRetry?: UIAction }): UIBlock<CollectionState> {
  const message = createNotice({ message: '' }); const content = element('div', 'pui-collection-content');
  if (options.content) content.append(options.content);
  const retry = createButton({ label: options.retryLabel ?? 'Retry', onAction: options.onRetry });
  const root = element('section', 'pui-collection', message.element, retry.element, content);
  const update = (state: Readonly<CollectionState>): void => {
    root.dataset.state = state.status; root.setAttribute('aria-busy', String(state.status === 'loading'));
    message.update({ message: state.message ?? ({ ready: '', loading: 'Loading…', empty: 'Nothing here yet.', error: 'Could not load this content.' }[state.status]), tone: state.status === 'error' ? 'error' : 'info' });
    content.hidden = state.status !== 'ready'; retry.element.hidden = state.status !== 'error' || !options.onRetry;
    retry.update({ label: state.retryLabel ?? 'Retry' });
  };
  update(options); return { element: root, update, destroy() { retry.destroy(); message.destroy(); } };
}

export interface DialogState { title: string; description?: string; eyebrow?: string; closeDisabled?: boolean; }
export interface DialogOptions extends DialogState { dialog?: HTMLDialogElement; content?: Node; actions?: Node; closeOnBackdrop?: boolean; onClose?: () => void; }
export interface DialogBlock extends UIBlock<DialogState> {
  readonly element: HTMLDialogElement;
  readonly body: HTMLElement;
  open(): void;
  close(): void;
}
export function createDialog(options: DialogOptions): DialogBlock {
  const root = options.dialog ?? element('dialog'); root.classList.add('pui-dialog');
  const title = element('h2'); title.id = uniqueId('pui-dialog-title'); root.setAttribute('aria-labelledby', title.id);
  const description = element('p', 'pui-muted'); description.id = uniqueId('pui-dialog-description');
  const eyebrow = element('span', 'pui-eyebrow');
  const close = createIconButton({ label: `Close ${options.title}`, icon: 'close', onAction() { if (!state.closeDisabled) root.close(); } });
  const heading = element('header', 'pui-dialog-heading', element('div', '', eyebrow, title, description), close.element);
  const body = element('div', 'pui-dialog-body'); if (options.content) body.append(options.content);
  root.replaceChildren(heading, body); if (options.actions) root.append(options.actions);
  let state: DialogState = options; let disposed = false;
  const update = (next: Readonly<DialogState>): void => {
    state = next; setText(title, next.title); setText(description, next.description); description.hidden = !next.description; setText(eyebrow, next.eyebrow); eyebrow.hidden = !next.eyebrow;
    if (next.description) root.setAttribute('aria-describedby', description.id); else root.removeAttribute('aria-describedby');
    close.update({ label: `Close ${next.title}`, icon: 'close', disabled: next.closeDisabled });
  };
  const surface = installDialogLifecycle(root, { closeOnBackdrop: options.closeOnBackdrop ?? !!options.dialog,
    canClose: () => !state.closeDisabled, onClose: options.onClose });
  update(options);
  return { element: root, body, update,
    open() { if (!disposed) surface.open(); }, close() { surface.close(); },
    destroy() { if (disposed) return; disposed = true; surface.close(); surface.destroy(); close.destroy(); root.remove(); } };
}

export interface TextEditState extends DialogState { error?: string; disabled?: boolean; pending?: boolean; inputDisabled?: boolean; note?: string; submitLabel?: string; }
export interface TextEditInput { value: string; title?: string; description?: string; note?: string; }
export interface TextEditOptions extends Partial<TextEditState> {
  dialog?: HTMLDialogElement;
  ids?: { form?: string; control?: string; submit?: string; error?: string; title?: string; cancel?: string };
  label?: string;
  onInput?: (value: string) => void;
  onSubmit?: (text: string) => Promise<ActionResult> | ActionResult;
  onClose?: () => void;
}
export interface TextEditBlock extends Omit<UIBlock<TextEditState>, 'element'> {
  readonly element: HTMLDialogElement;
  readonly control: HTMLTextAreaElement;
  readonly submitButton: HTMLButtonElement;
  open(input: TextEditInput): void;
  close(): void;
  getValue(): string;
  focus(): void;
}
export function createTextEditDialog(options: TextEditOptions = {}): TextEditBlock {
  // The editor has one form-level error, so it does not need the general field's
  // description/error/number/secret machinery. Both paths use the same control CSS.
  const control = element('textarea', 'pui-control'); control.rows = 8;
  control.id = options.ids?.control ?? uniqueId('pui-input');
  const label = element('label', 'pui-field-label', options.label ?? 'Message'); label.htmlFor = control.id;
  const input = adoptNativeControl(control, { label, onInput: value => options.onInput?.(value) });
  const field = element('div', 'pui-field', label, control);
  const note = element('p', 'pui-muted'); const error = createNotice({ message: '', tone: 'error' });
  const cancel = createButton({ label: 'Cancel', onAction() { if (!state.closeDisabled) dialog.close(); } });
  const submit = createButton({ label: options.submitLabel ?? 'Save', intent: 'primary', type: 'submit' });
  const actions = createActions({ children: [cancel.element, submit.element] });
  const form = element('form', 'pui-text-edit', field, note, error.element, actions.element);
  const ids = options.ids;
  if (ids?.form) form.id = ids.form;
  if (ids?.submit) submit.element.id = ids.submit;
  if (ids?.error) error.element.id = ids.error;
  if (ids?.cancel) cancel.element.id = ids.cancel;
  const life = new Lifetime(); let pending = false;
  let state: TextEditState = { title: options.title ?? 'Edit message', ...options };
  const dialog = createDialog({ ...state, dialog: options.dialog, content: form, onClose() { operation.invalidate(); options.onClose?.(); } });
  if (ids?.title) { dialog.element.querySelector('h2')!.id = ids.title; dialog.element.setAttribute('aria-labelledby', ids.title); }
  const update = (next: Readonly<TextEditState>): void => {
    state = next; dialog.update(next); setText(note, next.note); note.hidden = !next.note;
    cancel.update({ label: 'Cancel', disabled: !!next.closeDisabled });
    error.update({ message: next.error ?? '', tone: 'error' });
    submit.update({ label: next.submitLabel ?? options.submitLabel ?? 'Save', intent: 'primary', disabled: next.disabled, pending: !!(next.pending || pending) });
    input.update({ disabled: !!next.inputDisabled });
  };
  const operation = createOperation({
    unavailable: () => !!(state.pending || state.disabled || submit.element.disabled || !dialog.element.open),
    onPending(value) { pending = value; update(state); },
    onError(error) { if (dialog.element.open) update({ ...state, error }); },
  });
  life.listen(form, 'submit', (event => {
    event.preventDefault();
    if (!options.onSubmit) return;
    const value = control.value;
    operation.run(() => options.onSubmit!(value), result => { if (dialog.element.open) { if (result.ok) dialog.close(); else update({ ...state, error: result.error }); } });
  }) as EventListener);
  update(state);
  return { element: dialog.element, control, submitButton: submit.element, update,
    open(target) {
      operation.invalidate();
      update({ ...state, error: '', title: target.title ?? options.title ?? 'Edit message', description: target.description ?? options.description, note: target.note ?? options.note });
      input.reset(target.value); dialog.open(); input.focus();
    }, close() { operation.invalidate(); dialog.close(); }, getValue: input.getValue, focus: input.focus,
    destroy() { operation.destroy(); life.destroy(); input.destroy(); dialog.destroy(); cancel.destroy(); submit.destroy(); } };
}

export interface ConfirmState extends DialogState { message?: string | Node; hint?: string; error?: string; disabled?: boolean; pending?: boolean; confirmLabel?: string; }
export interface ConfirmBlock extends UIBlock<ConfirmState> { readonly element: HTMLDialogElement; readonly confirmButton: HTMLButtonElement; readonly cancelButton: HTMLButtonElement; open(state?: ConfirmState): void; close(): void; refreshAvailability(): void; }
export function createConfirmDialog(options: ConfirmState & { content?: Node; tone?: 'warning'; dialog?: HTMLDialogElement; ids?: { form?: string; error?: string; title?: string; cancel?: string }; unavailable?: () => boolean; onConfirm: () => Promise<ActionResult> | ActionResult; onClose?: () => void }): ConfirmBlock {
  const message = element('p', 'pui-modal-description'); const hint = element('p', 'pui-field-hint'); const error = createNotice({ message: '', tone: 'error' });
  let state: ConfirmState = options; let pending = false;
  const cancel = createButton({ label: 'Cancel', onAction() { if (!state.closeDisabled) dialog.close(); } });
  const intent = options.tone === 'warning' ? 'primary' : 'danger';
  const confirm = createButton({ label: options.confirmLabel ?? 'Remove', intent, type: 'submit' });
  if (options.tone === 'warning') confirm.element.classList.add('pui-warning-confirm');
  const life = new Lifetime();
  const actions = createActions({ children: [cancel.element, confirm.element] });
  const form = element('form', 'pui-confirm', options.content ?? message, hint, error.element, actions.element);
  if (options.ids?.form) form.id = options.ids.form;
  if (options.ids?.error) error.element.id = options.ids.error;
  if (options.ids?.cancel) cancel.element.id = options.ids.cancel;
  const dialog = createDialog({ ...options, content: form,
    onClose() { operation.invalidate(); options.onClose?.(); } });
  if (options.ids?.title) { dialog.element.querySelector('h2')!.id = options.ids.title; dialog.element.setAttribute('aria-labelledby', options.ids.title); }
  let currentMessage: string | Node | undefined;
  const update = (next: Readonly<ConfirmState>): void => {
    state = next; dialog.update(next);
    cancel.update({ label: 'Cancel', disabled: !!next.closeDisabled });
    if (next.message !== currentMessage) { currentMessage = next.message; if (next.message instanceof Node) message.replaceChildren(next.message); else setText(message, next.message); }
    setText(hint, next.hint); hint.hidden = !next.hint;
    error.update({ message: next.error ?? '', tone: 'error' });
    confirm.update({ label: next.confirmLabel ?? 'Remove', intent, disabled: !!(next.disabled || options.unavailable?.()), pending: !!(next.pending || pending) });
  };
  const operation = createOperation({
    unavailable: () => !!(state.disabled || state.pending || confirm.element.disabled || options.unavailable?.() || !dialog.element.open),
    onPending(value) { pending = value; update(state); },
    onError(error) { if (dialog.element.open) update({ ...state, error }); },
  });
  life.listen(form, 'submit', (event => { event.preventDefault(); operation.run(options.onConfirm, result => { if (dialog.element.open) { if (result.ok) dialog.close(); else update({ ...state, error: result.error }); } }); }) as EventListener);
  update(options);
  return { element: dialog.element, confirmButton: confirm.element, cancelButton: cancel.element, update, open(next) { operation.invalidate(); update({ ...(next ?? state), error: '' }); dialog.open(); cancel.element.focus(); },
    close() { operation.invalidate(); dialog.close(); }, refreshAvailability() { update(state); }, destroy() { operation.destroy(); life.destroy(); dialog.destroy(); confirm.destroy(); cancel.destroy(); } };
}

export interface PopoverState { label: string; disabled?: boolean; }
export interface PopoverBlock extends UIBlock<PopoverState> {
  readonly trigger: HTMLButtonElement;
  readonly panel: HTMLElement;
  open(): void;
  close(): void;
  isOpen(): boolean;
}
export function createPopover(options: PopoverState & { content: Node; position?:boolean; retainDuringModal?:boolean; titleFromLabel?:boolean; onToggle?: (open: boolean) => void }): PopoverBlock {
  let state: PopoverState = options;
  const trigger = createButton({ label: options.label, onAction() { if (surface.isOpen()) surface.close(); else surface.open(); } });
  const panel = element('div', 'pui-popover-panel', options.content); panel.hidden = true; panel.id = uniqueId('pui-popover');
  panel.setAttribute('role', 'region'); panel.setAttribute('aria-label', options.label);
  trigger.element.setAttribute('aria-controls', panel.id); trigger.element.setAttribute('aria-expanded', 'false');
  const root = element('div', 'pui-popover', trigger.element, panel);
  const surface = installAnchoredSurface({ trigger: trigger.element, panel,position:options.position,retainDuringModal:options.retainDuringModal, canOpen: () => !state.disabled, onToggle: options.onToggle });
  const update = (next: Readonly<PopoverState>): void => { state = next; trigger.update({...next,title:options.titleFromLabel?next.label:undefined}); panel.setAttribute('aria-label', next.label); if (next.disabled) surface.close(); };
  update(options);
  return { element: root, trigger: trigger.element, panel, update, open: surface.open, close: surface.close, isOpen: surface.isOpen,
    destroy() { surface.destroy(); trigger.destroy(); } };
}

export interface MenuItem { id: string; label: string; disabled?: boolean; intent?: Intent; checked?: boolean; onAction: UIAction; }
export interface MenuState extends PopoverState { items: readonly MenuItem[]; }
export interface MenuOptions extends MenuState { onError?: (message: string) => void; }
export function createMenu(options: MenuOptions): PopoverBlock & UIBlock<MenuState> {
  const content = element('div', 'pui-menu'); content.setAttribute('role', 'menu'); content.tabIndex = -1;
  const blocks = new Map<string, ButtonBlock>(); let items: readonly MenuItem[] = options.items;
  const session = new Generation();
  const feedback = createNotice({ message: '', tone: 'error' });
  const menuBody = element('div', '', content, feedback.element);
  const popover = createPopover({ label: options.label, content: menuBody, disabled: options.disabled, onToggle() { session.invalidate(); feedback.update({ message: '', tone: 'error' }); } });
  popover.trigger.setAttribute('aria-haspopup', 'menu'); const life = new Lifetime();
  const update = (state: Readonly<MenuState>): void => {
    items = state.items; popover.update(state);
    reconcileKeyed(content, blocks, state.items, { key: item => item.id, element: block => block.element,
      create(item) {
        let sequence = 0;
        return createButton({ ...item, onAction: async () => {
          const current = items.find(candidate => candidate.id === item.id); if (!current || current.disabled || !popover.isOpen()) return;
          // Pending disables the action button. Keep focus inside its menu so
          // focus-out dismissal cannot discard the eventual result feedback.
          content.focus({ preventScroll: true });
          sequence = session.next(); feedback.update({ message: '', tone: 'error' });
          const result = await current.onAction();
          if (session.current(sequence) && blocks.has(item.id) && popover.isOpen() && (!result || result.ok)) popover.close();
          return result;
        }, onError(message) { if (session.current(sequence) && popover.isOpen()) { feedback.update({ message, tone: 'error' }); options.onError?.(message); } } });
      },
      update(block, item) { block.update(item); block.element.setAttribute('role', item.checked == null ? 'menuitem' : 'menuitemcheckbox');
        if (item.checked != null) block.element.setAttribute('aria-checked', String(item.checked)); else block.element.removeAttribute('aria-checked');
      }, destroy: block => block.destroy(),
    });
  };
  life.listen(popover.trigger, 'keydown', (event => {
    const key = (event as KeyboardEvent).key;
    if (key === 'ArrowDown' || key === 'ArrowUp') { event.preventDefault(); popover.open(); navigation.focus(key === 'ArrowUp' ? 'last' : 'first'); }
  }) as EventListener);
  const navigation = installMenuNavigation(content, { trigger: popover.trigger, isOpen: popover.isOpen,
    onDismiss(restoreFocus) { popover.close(); if (restoreFocus) popover.trigger.focus(); } });
  update(options);
  return { ...popover, update, destroy() { session.destroy(); navigation.destroy(); life.destroy(); popover.destroy(); feedback.destroy(); for (const block of blocks.values()) block.destroy(); blocks.clear(); } };
}
