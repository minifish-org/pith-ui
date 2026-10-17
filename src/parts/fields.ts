import {adoptNativeControl, reconcileSelectOptions, type NativeControl} from '../foundations.js';
import {refreshSelect} from '../select.js';
import {uniqueId} from '../dom.js';
import {assertOptions, createOwnedPart, isPartAlive, nodeOf, retargetPart, type Part} from './ownership.js';
import {isTextPart, type TextPart} from './text.js';

export interface FieldState {
  label?: string;
  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  hidden?: boolean;
  describedBy?: readonly TextPart[];
}
export interface ValuePart extends Part {
  read(): string;
  reset(value: string): void;
  update(state: Readonly<FieldState>): void;
  focus(): void;
}
export type InputKind = 'text' | 'search' | 'password' | 'url' | 'number';
export type Autocomplete = 'off' | 'on' | 'url' | 'username' | 'current-password' | 'new-password' | 'one-time-code';
export interface InputOptions extends FieldState {
  kind?: InputKind;
  value?: string;
  name?: string;
  autocomplete?: Autocomplete;
  /** Native value validation, never a presentation dimension. */
  min?: number;
  max?: number;
  step?: number | 'any';
  pattern?: string;
  onInput?(value: string): void;
  onChange?(value: string): void;
}
const stateKeys = ['label', 'disabled', 'required', 'readOnly', 'placeholder', 'hidden', 'describedBy'] as const;
const inputKeys = [...stateKeys, 'kind', 'value', 'name', 'autocomplete', 'min', 'max', 'step', 'pattern', 'onInput', 'onChange'];
const controls = new WeakMap<Part, NativeControl>();

function validateState(state: Readonly<FieldState>): void {
  for (const key of ['label', 'placeholder'] as const) if (state[key] !== undefined && typeof state[key] !== 'string') throw new TypeError(`Field ${key} must be text.`);
  for (const key of ['disabled', 'required', 'readOnly', 'hidden'] as const) if (state[key] !== undefined && typeof state[key] !== 'boolean') throw new TypeError(`Field ${key} must be boolean.`);
  if (state.describedBy !== undefined) {
    if (!Array.isArray(state.describedBy) || state.describedBy.some(part => !isTextPart(part) || !isPartAlive(part))) throw new TypeError('Field descriptions must be live Pith UI text parts.');
  }
}
function applyReferences(control: NativeControl, state: Readonly<FieldState>): void {
  if (state.hidden !== undefined) control.hidden = state.hidden;
  if (state.describedBy !== undefined) {
    const ids = state.describedBy.map(part => {const node = nodeOf(part); if (!node.id) node.id = uniqueId('pui-description'); return node.id;});
    if (ids.length) control.setAttribute('aria-describedby', ids.join(' ')); else control.removeAttribute('aria-describedby');
  }
}
function validateTextOptions(options: InputOptions): void {
  validateState(options);
  for (const key of ['value', 'name', 'pattern'] as const) if (options[key] !== undefined && typeof options[key] !== 'string') throw new TypeError(`Field ${key} must be text.`);
  for (const key of ['min', 'max'] as const) if (options[key] !== undefined && !Number.isFinite(options[key])) throw new TypeError(`Field ${key} must be finite.`);
  if (options.step !== undefined && options.step !== 'any' && (typeof options.step !== 'number' || !Number.isFinite(options.step) || options.step <= 0)) throw new TypeError('Field step must be positive or any.');
  if (options.autocomplete !== undefined && !['off', 'on', 'url', 'username', 'current-password', 'new-password', 'one-time-code'].includes(options.autocomplete)) throw new TypeError('Unsupported autocomplete purpose.');
  for (const key of ['onInput', 'onChange'] as const) if (options[key] !== undefined && typeof options[key] !== 'function') throw new TypeError(`Field ${key} must be a callback.`);
}

function valuePart(control: HTMLInputElement | HTMLTextAreaElement, options: InputOptions, secret = false): ValuePart {
  control.id = uniqueId('pui-field');
  control.defaultValue = options.value ?? '';
  control.value = options.value ?? '';
  if (options.name !== undefined) control.name = options.name;
  if (options.autocomplete) control.setAttribute('autocomplete', options.autocomplete);
  const native = adoptNativeControl(control, {onInput: options.onInput ? value => options.onInput!(value) : undefined, onChange: options.onChange ? value => options.onChange!(value) : undefined});
  let part: ValuePart;
  const update = (state: Readonly<FieldState>): void => {
    assertOptions(state, stateKeys, 'field state'); validateState(state);
    if (!isPartAlive(part)) return;
    if (state.label !== undefined) control.setAttribute('aria-label', state.label);
    applyReferences(control, state);
    native.update(state);
  };
  part = createOwnedPart<Omit<ValuePart, keyof Part>>(control, {read: native.getValue, reset(value: string) {
    if (typeof value !== 'string') throw new TypeError('Field reset must be text.');
    native.reset(value);
  }, update, focus: native.focus}, {dispose() {
    native.destroy();
    if (secret || control instanceof HTMLInputElement && control.type === 'password') {control.value = ''; control.defaultValue = '';}
  }});
  controls.set(part, control);
  update(Object.fromEntries(stateKeys.filter(key => options[key] !== undefined).map(key => [key, options[key]])));
  return part;
}

/** One native input. Labels and feedback are separate parts, without a field wrapper. */
export function createInputPart(options: InputOptions): ValuePart {
  assertOptions(options, inputKeys, 'input'); validateTextOptions(options);
  const kind = options.kind ?? 'text';
  if (!['text', 'search', 'password', 'url', 'number'].includes(kind)) throw new TypeError('Unsupported input kind.');
  const control = document.createElement('input'); control.type = kind;
  control.className = 'pui-control';
  if (options.min !== undefined) control.min = String(options.min);
  if (options.max !== undefined) control.max = String(options.max);
  if (options.step !== undefined) control.step = String(options.step);
  if (options.pattern !== undefined) control.pattern = options.pattern;
  return valuePart(control, options);
}

export interface TextareaOptions extends Omit<InputOptions, 'kind' | 'min' | 'max' | 'step' | 'pattern'> {
  purpose?: 'text' | 'markdown' | 'secret' | 'message' | 'queue-message';
}
export function createTextareaPart(options: TextareaOptions): ValuePart {
  assertOptions(options, [...stateKeys, 'value', 'name', 'autocomplete', 'onInput', 'onChange', 'purpose'], 'textarea'); validateTextOptions(options);
  if (options.purpose !== undefined && !['text', 'markdown', 'secret', 'message', 'queue-message'].includes(options.purpose)) throw new TypeError('Unsupported textarea purpose.');
  const control = document.createElement('textarea');
  control.className = 'pui-control';
  if (options.purpose === 'markdown') control.classList.add('pui-resource-editor');
  if (options.purpose === 'secret') control.classList.add('pui-secret-field');
  if (options.purpose === 'message' || options.purpose === 'queue-message') {
    control.className = 'pui-control'; control.rows = options.purpose === 'message' ? 8 : 5;
  }
  const part = valuePart(control, options, options.purpose === 'secret');
  return part;
}

export interface ChoiceOption {value: string; label: string; disabled?: boolean}
export interface ChoiceState extends Omit<FieldState, 'readOnly' | 'placeholder'> {
  options?: readonly ChoiceOption[];
  catalog?: 'loading' | 'ready';
}
export interface ChoiceOptions extends ChoiceState {options: readonly ChoiceOption[]; value?: string; name?: string; onChange?(value: string): void}
export interface ChoicePart extends Part {read(): string; reset(value: string): void; update(state: Readonly<ChoiceState>): void; focus(): void}
const choiceStateKeys = ['label', 'disabled', 'required', 'hidden', 'describedBy', 'options', 'catalog'];
function validateChoices(options: readonly ChoiceOption[]): void {
  if (!Array.isArray(options)) throw new TypeError('Choices must be an array.');
  const values = new Set<string>();
  for (const option of options) {
    assertOptions(option, ['value', 'label', 'disabled'], 'choice');
    if (typeof option.value !== 'string' || typeof option.label !== 'string' || option.disabled !== undefined && typeof option.disabled !== 'boolean') throw new TypeError('Choices require text values and labels.');
    if (values.has(option.value)) throw new TypeError('Choice values must be unique.');
    values.add(option.value);
  }
}
function choicePart(options: ChoiceOptions, list: boolean): ChoicePart {
  assertOptions(options, [...choiceStateKeys, 'value', 'name', 'onChange'], 'choice field'); validateState(options); validateChoices(options.options);
  if (options.value !== undefined && typeof options.value !== 'string' || options.name !== undefined && typeof options.name !== 'string') throw new TypeError('Choice value and name must be text.');
  if (options.onChange !== undefined && typeof options.onChange !== 'function') throw new TypeError('Choice onChange must be a callback.');
  if (options.catalog !== undefined && !['loading', 'ready'].includes(options.catalog)) throw new TypeError('Unsupported choice catalog state.');
  let catalog = options.catalog ?? 'ready', disabled = !!options.disabled;
  const control = document.createElement('select');
  control.id = uniqueId('pui-choice'); control.className = list ? 'pui-model-list pui-control' : 'pui-feature-select pui-control';
  if (list) control.size = 6;
  if (options.name !== undefined) control.name = options.name;
  if (options.label !== undefined) control.setAttribute('aria-label', options.label);
  reconcileSelectOptions(control, options.options, options.value ?? options.options.find(option => !option.disabled)?.value ?? '');
  for (const option of control.options) option.defaultSelected = option.selected;
  // The shared select controller adds exactly its existing popup wrapper. A
  // temporary fragment supplies a parent while constructing an unmounted part.
  const fragment = document.createDocumentFragment(); fragment.append(control);
  const onChange = options.onChange ? (value: string) => {if (catalog === 'ready' && !disabled) options.onChange!(value);} : undefined;
  let native = adoptNativeControl(control, {onChange, enhanceSelect: catalog === 'ready'});
  const root = list || catalog === 'loading' ? control : control.parentElement!;
  let part: ChoicePart;
  const update = (state: Readonly<ChoiceState>): void => {
    assertOptions(state, choiceStateKeys, 'choice state'); validateState(state);
    if (state.options !== undefined) validateChoices(state.options);
    if (state.catalog !== undefined && !['loading', 'ready'].includes(state.catalog)) throw new TypeError('Unsupported choice catalog state.');
    if (!isPartAlive(part)) return;
    if (state.catalog !== undefined && state.catalog !== catalog) {
      native.destroy(); catalog = state.catalog;
      native = adoptNativeControl(control, {onChange, enhanceSelect: catalog === 'ready'});
      retargetPart(part, list || catalog === 'loading' ? control : control.parentElement!);
    }
    if (state.disabled !== undefined) disabled = state.disabled;
    if (state.label !== undefined) control.setAttribute('aria-label', state.label);
    applyReferences(control, state);
    if (state.options !== undefined) reconcileSelectOptions(control, state.options);
    native.update({...state, disabled});
  };
  part = createOwnedPart<Omit<ChoicePart, keyof Part>>(root, {read: () => native.getValue(), reset(value: string) {
    if (typeof value !== 'string') throw new TypeError('Choice reset must be text.');
    native.reset(value);
  }, update, focus() {native.focus();}}, {dispose() {
    // The shared controller restores its borrowed native control by unwrapping
    // it. This part owns that control too, so remove the restored node as well.
    native.destroy(); control.remove();
  }});
  controls.set(part, control);
  update({...(options.label !== undefined ? {label: options.label} : {}), disabled: !!options.disabled, required: !!options.required,
    hidden: !!options.hidden, ...(options.describedBy !== undefined ? {describedBy: options.describedBy} : {})});
  return part;
}
export function createSelectPart(options: ChoiceOptions): ChoicePart {return choicePart(options, false);}
/** Native six-row choice list; its geometry and keyboard behavior belong to the library. */
export function createChoiceListPart(options: ChoiceOptions): ChoicePart {return choicePart(options, true);}

export interface FieldLabelState {label: string; hidden?: boolean}
export interface FieldLabelPart extends Part {update(state: FieldLabelState): void}
/** A separate native label associated with a previously created field. */
export function createFieldLabelPart(options: FieldLabelState & {control: ValuePart | ChoicePart; screenReaderOnly?: boolean}): FieldLabelPart {
  assertOptions(options, ['label', 'control', 'hidden', 'screenReaderOnly'], 'field label');
  validateState(options);
  if (options.screenReaderOnly !== undefined && typeof options.screenReaderOnly !== 'boolean') throw new TypeError('Label screen-reader state must be boolean.');
  if (typeof options.label !== 'string') throw new TypeError('Field label must be text.');
  nodeOf(options.control);
  const control = controls.get(options.control);
  if (!control) throw new TypeError('A field label requires a Pith UI field.');
  const label = document.createElement('label'); label.className = 'pui-field-label'; label.htmlFor = control.id; label.textContent = options.label;
  if (options.screenReaderOnly) label.className = 'pui-sr-only';
  label.hidden = !!options.hidden;
  control.setAttribute('aria-label', options.label);
  if (control instanceof HTMLSelectElement) refreshSelect(control);
  const click = (event: Event) => {
    if (!isPartAlive(options.control) || control.hidden || control.matches(':disabled')) return;
    // The backing control is deliberately outside Tab traversal. Keep a label
    // activation on its visible choice control rather than a hidden adapter.
    event.preventDefault(); options.control.focus();
  };
  label.addEventListener('click', click);
  const part = createOwnedPart(label, {update(state: FieldLabelState) {
    assertOptions(state, ['label', 'hidden'], 'field label state'); validateState(state);
    if (typeof state.label !== 'string') throw new TypeError('Field label must be text.');
    if (!isPartAlive(part)) return;
    label.textContent = state.label;
    if (state.hidden !== undefined) label.hidden = state.hidden;
    if (isPartAlive(options.control)) {
      control.setAttribute('aria-label', state.label);
      if (control instanceof HTMLSelectElement) refreshSelect(control);
    }
  }}, {dispose() {label.removeEventListener('click', click);}});
  return part;
}

export interface CheckboxOptions {label: string; checked?: boolean; disabled?: boolean; name?: string; onChange?(value: boolean): void}
export interface CheckboxPart extends Part {read(): boolean; reset(value: boolean): void; update(state: {disabled?: boolean; label?: string}): void; focus(): void}
export function createCheckboxPart(options: CheckboxOptions): CheckboxPart {
  assertOptions(options, ['label', 'checked', 'disabled', 'name', 'onChange'], 'checkbox');
  if (typeof options.label !== 'string' || options.name !== undefined && typeof options.name !== 'string') throw new TypeError('Checkbox label and name must be text.');
  if (options.checked !== undefined && typeof options.checked !== 'boolean' || options.disabled !== undefined && typeof options.disabled !== 'boolean') throw new TypeError('Checkbox states must be boolean.');
  if (options.onChange !== undefined && typeof options.onChange !== 'function') throw new TypeError('Checkbox onChange must be a callback.');
  const label = document.createElement('label'); label.className = 'pui-checkbox-field';
  const control = document.createElement('input'); control.type = 'checkbox';
  control.defaultChecked = !!options.checked; control.checked = !!options.checked; control.disabled = !!options.disabled;
  if (options.name !== undefined) control.name = options.name;
  const text = document.createTextNode(options.label); label.append(control, text);
  const change = () => options.onChange?.(control.checked);
  control.addEventListener('change', change);
  const part = createOwnedPart(label, {read: () => control.checked,
    reset(value: boolean) {if (typeof value !== 'boolean') throw new TypeError('Checkbox reset must be boolean.'); if (isPartAlive(part)) control.checked = value;},
    update(state: {disabled?: boolean; label?: string}) {
      assertOptions(state, ['disabled', 'label'], 'checkbox state'); validateState(state);
      if (!isPartAlive(part)) return;
      if (state.disabled !== undefined) control.disabled = state.disabled;
      if (state.label !== undefined) text.textContent = state.label;
    }, focus() {if (isPartAlive(part)) control.focus();}}, {dispose() {control.removeEventListener('change', change);}});
  return part;
}
