import * as primitive from './primitives.js';
import { element, iconElement, setText } from './dom.js';
import { createCopyFeedback } from './files/systems.js';
import { createOperation } from './operation.js';
import { setAppearance } from './theme.js';
import { createContextMenu as internalContextMenu } from './navigation/context-menu.js';
import type { Appearance } from './theme.js';
import type { ActionResult, UIAction, UIBlock } from './core.js';
export type { ActionResult } from './core.js';
export type { Appearance } from './theme.js';
export type Action = UIAction;
export type Intent = 'neutral' | 'primary' | 'danger';
export type IconName = 'steer' | 'edit' | 'trash' | 'branch' | 'compress' | 'image' | 'plus' | 'chat' | 'folder' | 'settings' | 'arrow' | 'stop' | 'chevron' | 'down' | 'close' | 'check' | 'shield' | 'file' | 'terminal' | 'copy' | 'menu' | 'globe' | 'search' | 'more' | 'compose' | 'plug';
const iconNames = new Set<IconName>(['steer', 'edit', 'trash', 'branch', 'compress', 'image', 'plus', 'chat', 'folder', 'settings', 'arrow', 'stop', 'chevron', 'down', 'close', 'check', 'shield', 'file', 'terminal', 'copy', 'menu', 'globe', 'search', 'more', 'compose', 'plug']);
declare const controlBrand: unique symbol;
/** An opaque, owned building block. Content and behavior are public; DOM is not. */
export interface Control<State = unknown> {
    readonly [controlBrand]: State;
    update(state: Readonly<State>): void;
    destroy(): void;
}
interface Entry {
    node: HTMLElement;
    owner?: object;
    destroyed: boolean;
    children: readonly Control[];
    invalidate?: () => void;
}
const entries = new WeakMap<Control, Entry>();
function entry(control: Control): Entry {
    const value = entries.get(control);
    if (!value || value.destroyed)
        throw new Error('Expected a live Pith UI control.');
    return value;
}
function nodes(children: readonly Control[] = []): HTMLElement[] {
    if (new Set(children).size !== children.length)
        throw new Error('A control cannot occur twice in a composition.');
    return children.map(child => { const value = entry(child); if (value.owner)
        throw new Error('A control already belongs to a composition or mount.'); return value.node; });
}
function own<State, Methods extends object = object>(block: UIBlock<State>, children: readonly Control[] = [], methods?: Methods, invalidate?: () => void): Control<State> & Methods {
    const value: Entry = { node: block.element, destroyed: false, children, invalidate };
    const control = Object.freeze({ ...methods, update(state: Readonly<State>) { if (!value.destroyed)
            block.update(state); }, destroy() {
            if (value.destroyed)
                return;
            value.destroyed = true;
            try {
                block.destroy();
            }
            finally {
                for (const child of children)
                    child.destroy();
                value.node.remove();
            }
        } }) as unknown as Control<State> & Methods;
    entries.set(control, value);
    for (const child of children)
        entry(child).owner = control;
    return control;
}
function invalidate(control: Control): void { const value = entries.get(control); if (!value || value.destroyed)
    return; value.invalidate?.(); value.children.forEach(invalidate); }
function check(value: object, allowed: readonly string[]): void {
    for (const key of Object.keys(value))
        if (!allowed.includes(key))
            throw new Error(`Unsupported Pith UI option: ${key}`);
}
function icon(name: IconName | undefined): void { if (name !== undefined && !iconNames.has(name))
    throw new Error(`Unknown Pith UI icon: ${name}`); }
function mounted(control: Control): void { if (!entry(control).node.isConnected)
    throw new Error('Mount the control before opening it.'); }
/** Private bridge for library compositions; deliberately absent from index.ts. */
export function assertModalControl(control: Control): void {
    if (!(entry(control).node instanceof HTMLDialogElement))
        throw new Error('Expected a modal dialog control.');
}
export interface MountOptions {
    readonly appearance?: Appearance;
}
export interface Mount {
    setAppearance(appearance: Appearance): void;
    destroy(): void;
}
const mounts = new WeakMap<HTMLElement, object>();
/** The only DOM handoff. A mount owns its complete child tree. */
export function mount(host: HTMLElement, control: Control, options: MountOptions = {}): Mount {
    check(options, ['appearance']);
    if (!(host instanceof HTMLElement))
        throw new Error('Expected an HTMLElement mount.');
    if (mounts.has(host))
        throw new Error('This host already owns a Pith UI mount.');
    const [node] = nodes([control]), owner = {};
    let destroyed = false;
    const previous = { scope: host.classList.contains('pui'), appearance: host.getAttribute('data-appearance') };
    entry(control).owner = owner;
    mounts.set(host, owner);
    host.append(node);
    setAppearance(host, options.appearance ?? 'system');
    return Object.freeze({ setAppearance(value: Appearance) { if (!destroyed)
            setAppearance(host, value); }, destroy() {
            if (destroyed)
                return;
            destroyed = true;
            try {
                control.destroy();
            }
            finally {
                mounts.delete(host);
                if (!previous.scope)
                    host.classList.remove('pui');
                if (previous.appearance === null)
                    host.removeAttribute('data-appearance');
                else
                    host.setAttribute('data-appearance', previous.appearance);
            }
        } });
}
export interface ButtonState {
    readonly label: string;
    readonly intent?: Intent;
    readonly icon?: IconName;
    readonly title?: string;
    readonly disabled?: boolean;
    readonly pending?: boolean;
}
export interface ButtonOptions extends ButtonState {
    readonly onAction?: Action;
    readonly onError?: (message: string) => void;
}
const buttonKeys = ['label', 'intent', 'icon', 'title', 'disabled', 'pending'];
function actionControl(options: ButtonOptions, kind: 'button' | 'icon' | 'text'): Control<ButtonState> {
    check(options, [...buttonKeys, 'onAction', 'onError']);
    icon(options.icon);
    if (kind === 'icon' && !options.icon)
        throw new Error('An icon button requires an icon.');
    const validate = (state: ButtonState) => { check(state, buttonKeys); icon(state.icon); if (kind === 'icon' && !state.icon)
        throw new Error('An icon button requires an icon.'); };
    const stateOf = (state: ButtonState): primitive.ButtonState => ({ label: state.label, intent: state.intent, icon: state.icon, title: state.title, disabled: state.disabled, pending: state.pending });
    const initial = stateOf(options);
    const block = kind === 'icon' ? primitive.createIconButton({ ...initial, icon: options.icon!, onAction: options.onAction, onError: options.onError }) : kind === 'text' ? primitive.createTextAction({ ...initial, onAction: options.onAction, onError: options.onError }) : primitive.createButton({ ...initial, onAction: options.onAction, onError: options.onError });
    return own({ ...block, update(state: Readonly<ButtonState>) { validate(state); block.update(stateOf(state)); } });
}
export function createButton(options: ButtonOptions): Control<ButtonState> { return actionControl(options, 'button'); }
export interface IconButtonState extends Omit<ButtonState, 'icon'> {
    readonly icon: IconName;
}
export function createIconButton(options: ButtonOptions & IconButtonState): Control<IconButtonState> { return actionControl(options, 'icon') as Control<IconButtonState>; }
export function createTextAction(options: ButtonOptions): Control<ButtonState> { return actionControl(options, 'text'); }
export interface TextState {
    readonly text: string;
    readonly role?: 'body' | 'description' | 'heading' | 'code';
}
export function createText(state: TextState): Control<TextState> {
    check(state, ['text', 'role']);
    const node = element('div', 'pui-control-text');
    const update = (next: Readonly<TextState>) => {
        check(next, ['text', 'role']);
        const tag = next.role === 'heading' ? 'h3' : next.role === 'code' ? 'pre' : 'p';
        let text = node.firstElementChild as HTMLElement | null;
        if (text?.tagName.toLowerCase() !== tag) {
            text = element(tag);
            node.replaceChildren(text);
        }
        text.classList.toggle('pui-muted', next.role === 'description');
        setText(text, next.text);
    };
    update(state);
    return own({ element: node, update, destroy() { } });
}
export interface IconState {
    readonly name: IconName;
    readonly label?: string;
}
export function createIcon(state: IconState): Control<IconState> {
    check(state, ['name', 'label']);
    icon(state.name);
    const block = primitive.createIcon(state);
    return own({ ...block, update(next: Readonly<IconState>) { check(next, ['name', 'label']); icon(next.name); block.update(next); } });
}
export interface FieldState {
    readonly label: string;
    readonly description?: string;
    readonly error?: string;
    readonly required?: boolean;
    readonly disabled?: boolean;
}
export interface InputState extends FieldState {
    readonly placeholder?: string;
    readonly readOnly?: boolean;
}
export interface InputOptions extends InputState {
    readonly value?: string;
    readonly autocomplete?: 'on' | 'off' | 'username' | 'email' | 'current-password' | 'new-password';
    readonly onInput?: (value: string) => void;
    readonly onChange?: (value: string) => void;
}
export interface NumberInputOptions extends InputOptions {
    readonly min?: number;
    readonly max?: number;
    readonly step?: number | 'any';
}
export interface Input extends Control<InputState> {
    read(): string;
    reset(value: string): void;
    focus(): void;
}
const fieldKeys = ['label', 'description', 'error', 'required', 'disabled'];
const inputKeys = [...fieldKeys, 'placeholder', 'readOnly'];
const inputOptionKeys = [...inputKeys, 'value', 'autocomplete', 'onInput', 'onChange'];
function inputControl(options: NumberInputOptions, kind: 'text' | 'search' | 'secret' | 'number' | 'textarea'): Input {
    check(options, [...inputOptionKeys, ...(kind === 'number' ? ['min', 'max', 'step'] : [])]);
    const factories = { text: primitive.createTextInput, search: primitive.createSearchInput, secret: primitive.createSecretInput, number: primitive.createNumberInput, textarea: primitive.createTextArea };
    const block = factories[kind](options);
    return own({ ...block, update(state: Readonly<InputState>) { check(state, inputKeys); block.update(state); } }, [], { read: block.getValue, reset: block.reset, focus: block.focus });
}
export function createTextInput(options: InputOptions): Input { return inputControl(options, 'text'); }
export function createSearchInput(options: InputOptions): Input { return inputControl(options, 'search'); }
export function createSecretInput(options: InputOptions): Input { return inputControl(options, 'secret'); }
export function createTextArea(options: InputOptions): Input { return inputControl(options, 'textarea'); }
export function createNumberInput(options: NumberInputOptions): Input { return inputControl(options, 'number'); }
export interface SelectOption {
    readonly value: string;
    readonly label: string;
    readonly disabled?: boolean;
}
export interface SelectState extends FieldState {
    readonly options: readonly SelectOption[];
}
export interface SelectOptions extends SelectState {
    readonly value?: string;
    readonly onChange?: (value: string) => void;
}
export interface Select extends Control<SelectState> {
    read(): string;
    reset(value: string): void;
    focus(): void;
}
export interface MultiSelectOptions extends SelectState {
    readonly multiple: true;
    readonly values?: readonly string[];
    readonly onChange?: (values: readonly string[]) => void;
}
export interface MultiSelect extends Control<SelectState> {
    read(): readonly string[];
    reset(values: readonly string[]): void;
    focus(): void;
}
const selectKeys = [...fieldKeys, 'options'];
function choice(options: SelectOptions | MultiSelectOptions, list: boolean): Select | MultiSelect {
    const multiple = 'multiple' in options && options.multiple;
    check(options, [...selectKeys, ...(multiple ? ['multiple', 'values', 'onChange'] : [...(list ? ['multiple'] : []), 'value', 'onChange'])]);
    for (const item of options.options)
        check(item, ['value', 'label', 'disabled']);
    const block = primitive.createSelect({ ...options, size: list ? 5 : undefined, multiple: !!multiple,
        onChange: multiple ? undefined : (options as SelectOptions).onChange,
        onValuesChange: multiple ? (options as MultiSelectOptions).onChange : undefined });
    const update = (state: Readonly<SelectState>) => { check(state, selectKeys); for (const item of state.options)
        check(item, ['value', 'label', 'disabled']); block.update(state); };
    return multiple ? own({ ...block, update }, [], { read: block.getValues, reset: block.resetValues, focus: block.focus }) : own({ ...block, update }, [], { read: block.getValue, reset: block.reset, focus: block.focus });
}
export function createSelect(options: SelectOptions): Select { return choice(options, false) as Select; }
/** A five-row native list. Multi-selection retains system modifier keys. */
export function createListSelect(options: MultiSelectOptions): MultiSelect;
export function createListSelect(options: SelectOptions & {
    readonly multiple?: false;
}): Select;
export function createListSelect(options: SelectOptions | MultiSelectOptions): Select | MultiSelect { return choice(options, true); }
export interface CheckboxState {
    readonly label: string;
    readonly description?: string;
    readonly disabled?: boolean;
}
export interface Checkbox extends Control<CheckboxState> {
    read(): boolean;
    reset(checked: boolean): void;
    focus(): void;
}
export function createCheckbox(options: CheckboxState & {
    readonly checked?: boolean;
    readonly onChange?: (checked: boolean) => void;
}): Checkbox {
    check(options, ['label', 'description', 'disabled', 'checked', 'onChange']);
    const block = primitive.createCheckbox(options);
    return own({ ...block, update(state: Readonly<CheckboxState>) { check(state, ['label', 'description', 'disabled']); block.update(state); } }, [], { read: block.getValue, reset: block.reset, focus: block.focus });
}
export interface ChildrenOptions {
    readonly children: readonly Control[];
}
export interface StackState {
    readonly label?: string;
}
export function createStack(options: ChildrenOptions & StackState): Control<StackState> {
    check(options, ['children', 'label']);
    const node = element('div', 'pui-control-stack', ...nodes(options.children));
    const update = (state: Readonly<StackState>) => { check(state, ['label']); if (state.label) {
        node.setAttribute('role', 'group');
        node.setAttribute('aria-label', state.label);
    }
    else {
        node.removeAttribute('role');
        node.removeAttribute('aria-label');
    } };
    update({ label: options.label });
    return own({ element: node, update, destroy() { } }, options.children);
}
export interface ActionsState {
    readonly align?: 'start' | 'end' | 'between';
}
export function createActions(options: ChildrenOptions & ActionsState): Control<ActionsState> {
    check(options, ['children', 'align']);
    const block = primitive.createActions({ children: nodes(options.children), align: options.align });
    return own({ ...block, update(state: Readonly<ActionsState>) { check(state, ['align']); block.update(state); } }, options.children);
}
export interface ToolbarState {
    readonly label: string;
}
export function createToolbar(options: ChildrenOptions & ToolbarState): Control<ToolbarState> {
    check(options, ['children', 'label']);
    const block = primitive.createToolbar({ label: options.label, children: nodes(options.children) });
    return own({ ...block, update(state: Readonly<ToolbarState>) { check(state, ['label']); block.update(state); } }, options.children);
}
export interface FormSectionState {
    readonly title: string;
    readonly description?: string;
}
export function createFormSection(options: ChildrenOptions & FormSectionState): Control<FormSectionState> {
    check(options, ['children', 'title', 'description']);
    const node = element('div', 'pui-control-stack', ...nodes(options.children));
    const block = primitive.createFormSection({ title: options.title, description: options.description, content: node });
    return own({ ...block, update(state: Readonly<FormSectionState>) { check(state, ['title', 'description']); block.update(state); } }, options.children);
}
export interface ScrollState {
    readonly label: string;
    readonly viewport?: 'bounded' | 'fill';
}
export function createScrollArea(options: ScrollState & {
    readonly content: Control;
}): Control<ScrollState> {
    check(options, ['label', 'viewport', 'content']);
    const [node] = nodes([options.content]);
    const block = primitive.createScrollArea({ label: options.label, size: options.viewport === 'fill' ? 'fill' : 'medium', content: node });
    return own({ element: block.element, update(state: Readonly<ScrollState>) { check(state, ['label', 'viewport']); block.update({ label: state.label, size: state.viewport === 'fill' ? 'fill' : 'medium' }); }, destroy: block.destroy }, [options.content]);
}
export interface DisclosureState {
    readonly title: string;
    readonly description?: string;
    readonly disabled?: boolean;
}
export interface Disclosure extends Control<DisclosureState> {
    setOpen(open: boolean): void;
    isOpen(): boolean;
}
export function createDisclosure(options: DisclosureState & {
    readonly content: Control;
    readonly open?: boolean;
    readonly onToggle?: (open: boolean) => void;
}): Disclosure {
    check(options, ['title', 'description', 'disabled', 'content', 'open', 'onToggle']);
    const [node] = nodes([options.content]);
    const block = primitive.createDisclosure({ ...options, content: node });
    return own({ ...block, update(state: Readonly<DisclosureState>) { check(state, ['title', 'description', 'disabled']); block.update(state); } }, [options.content], { setOpen: block.setOpen, isOpen: block.isOpen });
}
export interface ListRowState {
    readonly title: string;
    readonly description?: string;
    readonly meta?: string;
    readonly selected?: boolean;
    readonly icon?: IconName;
}
export function createListRow(options: ListRowState & {
    readonly actions?: Control;
}): Control<ListRowState> {
    check(options, ['title', 'description', 'meta', 'selected', 'icon', 'actions']);
    icon(options.icon);
    const children = options.actions ? [options.actions] : [], [node] = nodes(children);
    const block = primitive.createListRow({ ...options, actions: node });
    return own({ ...block, update(state: Readonly<ListRowState>) { check(state, ['title', 'description', 'meta', 'selected', 'icon']); icon(state.icon); block.update(state); } }, children);
}
export interface CollectionState {
    readonly status: 'ready' | 'loading' | 'empty' | 'error';
    readonly message?: string;
    readonly retryLabel?: string;
}
export function createCollectionState(options: CollectionState & {
    readonly content?: Control;
    readonly onRetry?: Action;
}): Control<CollectionState> {
    check(options, ['status', 'message', 'retryLabel', 'content', 'onRetry']);
    const children = options.content ? [options.content] : [], [node] = nodes(children);
    const block = primitive.createCollectionState({ ...options, content: node });
    return own({ ...block, update(state: Readonly<CollectionState>) { check(state, ['status', 'message', 'retryLabel']); block.update(state); } }, children);
}
export interface NoticeState {
    readonly message: string;
    readonly tone?: 'info' | 'success' | 'warning' | 'error';
}
export function createNotice(state: NoticeState): Control<NoticeState> { check(state, ['message', 'tone']); const block = primitive.createNotice(state); return own({ ...block, update(next: Readonly<NoticeState>) { check(next, ['message', 'tone']); block.update(next); } }); }
export interface StatusState {
    readonly label: string;
    readonly tone?: 'neutral' | 'success' | 'warning' | 'error';
}
export function createStatus(state: StatusState): Control<StatusState> { check(state, ['label', 'tone']); const block = primitive.createStatus(state); return own({ ...block, update(next: Readonly<StatusState>) { check(next, ['label', 'tone']); block.update(next); } }); }
export interface ProgressState {
    readonly label: string;
    readonly value?: number;
    readonly max?: number;
}
export function createProgress(state: ProgressState): Control<ProgressState> { check(state, ['label', 'value', 'max']); const block = primitive.createProgress(state); return own({ ...block, update(next: Readonly<ProgressState>) { check(next, ['label', 'value', 'max']); block.update(next); } }); }
export interface DividerState {
    readonly label?: string;
}
export function createDivider(state: DividerState = {}): Control<DividerState> { check(state, ['label']); const block = primitive.createDivider(state); return own({ ...block, update(next: Readonly<DividerState>) { check(next, ['label']); block.update(next); } }); }
export interface KeyValueState {
    readonly items: readonly {
        readonly key: string;
        readonly label: string;
        readonly value: string;
    }[];
}
export function createKeyValue(state: KeyValueState): Control<KeyValueState> { check(state, ['items']); const block = primitive.createKeyValue(state); return own({ ...block, update(next: Readonly<KeyValueState>) { check(next, ['items']); block.update(next); } }); }
export interface FormState {
    readonly submitLabel?: string;
    readonly disabled?: boolean;
    readonly pending?: boolean;
    readonly error?: string;
}
export interface FormOptions extends FormState, ChildrenOptions {
    readonly onSubmit: () => ActionResult | Promise<ActionResult>;
    readonly onCancel?: () => void;
}
export interface Form extends Control<FormState> {
    submit(): void;
}
export function createForm(options: FormOptions): Form {
    check(options, ['children', 'submitLabel', 'disabled', 'pending', 'error', 'onSubmit', 'onCancel']);
    const fields = element('fieldset', 'pui-control-form-fields', ...nodes(options.children));
    const error = primitive.createNotice({ message: '', tone: 'error' });
    const submit = primitive.createButton({ label: options.submitLabel ?? 'Save', intent: 'primary', type: 'submit' });
    const cancel = options.onCancel ? primitive.createButton({ label: 'Cancel', onAction: options.onCancel }) : undefined;
    const actions = primitive.createActions({ children: [...(cancel ? [cancel.element] : []), submit.element] });
    const form = element('form', 'pui-control-stack', fields, error.element, actions.element);
    let state: FormState = { submitLabel: options.submitLabel, disabled: options.disabled, pending: options.pending, error: options.error };
    let pending = false, destroyed = false;
    const update = (next: Readonly<FormState>) => { check(next, ['submitLabel', 'disabled', 'pending', 'error']); state = next; fields.disabled = !!(next.disabled || next.pending || pending); error.update({ message: next.error ?? '', tone: 'error' }); submit.update({ label: next.submitLabel ?? 'Save', intent: 'primary', disabled: next.disabled, pending: !!(next.pending || pending) }); };
    const operation = createOperation({ unavailable: () => destroyed || !!(state.disabled || state.pending), onPending(value) { pending = value; update(state); }, onError(message) { update({ ...state, error: message }); } });
    const onSubmit = (event: SubmitEvent) => { event.preventDefault(); operation.run(options.onSubmit, result => { if (!result.ok)
        update({ ...state, error: result.error }); }); };
    form.addEventListener('submit', onSubmit);
    update(state);
    return own<FormState, Pick<Form, 'submit'>>({ element: form, update, destroy() { destroyed = true; operation.destroy(); form.removeEventListener('submit', onSubmit); error.destroy(); submit.destroy(); cancel?.destroy(); actions.destroy(); } }, options.children, { submit() { if (!destroyed)
            form.requestSubmit(); } }, () => operation.invalidate());
}
export interface DialogState {
    readonly title: string;
    readonly description?: string;
    readonly closeDisabled?: boolean;
}
export interface Dialog extends Control<DialogState> {
    open(): void;
    close(): void;
    isOpen(): boolean;
}
export function createDialog(options: DialogState & {
    readonly content?: Control;
    readonly actions?: Control;
    readonly onClose?: () => void;
}): Dialog {
    check(options, ['title', 'description', 'closeDisabled', 'content', 'actions', 'onClose']);
    const children = [...(options.content ? [options.content] : []), ...(options.actions ? [options.actions] : [])];
    nodes(children);
    let control: Dialog;
    const block = primitive.createDialog({ title: options.title, description: options.description, closeDisabled: options.closeDisabled, content: options.content ? entry(options.content).node : undefined, actions: options.actions ? entry(options.actions).node : undefined, onClose() { children.forEach(invalidate); options.onClose?.(); } });
    control = own<DialogState, Pick<Dialog, 'open' | 'close' | 'isOpen'>>({ ...block, update(state: Readonly<DialogState>) { check(state, ['title', 'description', 'closeDisabled']); block.update(state); } }, children, { open() { mounted(control); block.open(); }, close: block.close, isOpen: () => block.element.open });
    return control;
}
export interface TextEditState extends DialogState {
    readonly error?: string;
    readonly disabled?: boolean;
    readonly pending?: boolean;
    readonly inputDisabled?: boolean;
    readonly note?: string;
    readonly submitLabel?: string;
}
export interface TextEditOptions extends Partial<TextEditState> {
    /** Fixed message editor layouts; pending messages retain five native rows. */
    readonly purpose?: 'message' | 'pending-message';
    readonly label?: string;
    readonly onInput?: (value: string) => void;
    readonly onSubmit?: (value: string) => ActionResult | Promise<ActionResult>;
    readonly onClose?: () => void;
}
export interface TextEditDialog extends Control<TextEditState> {
    open(input: {
        readonly value: string;
        readonly title?: string;
        readonly description?: string;
        readonly note?: string;
    }): void;
    close(): void;
    read(): string;
    focus(): void;
    isOpen(): boolean;
}
const textEditKeys = ['title', 'description', 'closeDisabled', 'error', 'disabled', 'pending', 'inputDisabled', 'note', 'submitLabel'];
export function createTextEditDialog(options: TextEditOptions = {}): TextEditDialog {
    check(options, [...textEditKeys, 'purpose', 'label', 'onInput', 'onSubmit', 'onClose']);
    if (options.purpose && options.purpose !== 'message' && options.purpose !== 'pending-message') throw new Error('Unknown editor purpose.');
    const block = primitive.createTextEditDialog({...options, label: options.label ?? (options.purpose === 'pending-message' ? 'Pending message' : 'Message')});
    block.control.rows = options.purpose === 'pending-message' ? 5 : 8;
    let control: TextEditDialog;
    control = own<TextEditState, Pick<TextEditDialog, 'open' | 'close' | 'read' | 'focus' | 'isOpen'>>({ ...block, update(state: Readonly<TextEditState>) { check(state, textEditKeys); block.update(state); } }, [], { open(input: {
            readonly value: string;
            readonly title?: string;
            readonly description?: string;
            readonly note?: string;
        }) { check(input, ['value', 'title', 'description', 'note']); mounted(control); block.open(input); }, close: block.close, read: block.getValue, focus: block.focus, isOpen: () => block.element.open });
    return control;
}
export type ConfirmationMessage = string | {
    readonly before: string;
    readonly subject?: string;
    readonly after?: string;
};
export interface ConfirmState extends DialogState {
    readonly message?: ConfirmationMessage;
    readonly hint?: string;
    readonly error?: string;
    readonly disabled?: boolean;
    readonly pending?: boolean;
    readonly confirmLabel?: string;
}
export interface ConfirmDialog extends Control<ConfirmState> {
    open(state?: ConfirmState): void;
    close(): void;
    isOpen(): boolean;
    refreshAvailability(): void;
}
const confirmKeys = ['title', 'description', 'closeDisabled', 'message', 'hint', 'error', 'disabled', 'pending', 'confirmLabel'];
export function createConfirmDialog(options: ConfirmState & {
    readonly onConfirm: () => ActionResult | Promise<ActionResult>;
    readonly onClose?: () => void;
    readonly unavailable?: () => boolean;
}): ConfirmDialog {
    check(options, [...confirmKeys, 'onConfirm', 'onClose', 'unavailable']);
    let signature = '', message: string | Node | undefined;
    const presentation = (state: ConfirmState): primitive.ConfirmState => {
        const value = state.message;
        if (value !== undefined && typeof value !== 'string') {
            if (!value || typeof value.before !== 'string' || (value.subject !== undefined && typeof value.subject !== 'string') || (value.after !== undefined && typeof value.after !== 'string'))
                throw new Error('Confirmation content must be text.');
            check(value, ['before', 'subject', 'after']);
        }
        const next = JSON.stringify(value) ?? '';
        if (next !== signature) {
            signature = next;
            if (typeof value === 'object') {
                const fragment = document.createDocumentFragment();
                fragment.append(value.before);
                if (value.subject)
                    fragment.append(element('strong', '', value.subject));
                fragment.append(value.after ?? '');
                message = fragment;
            }
            else
                message = value;
        }
        return { ...state, message };
    };
    const block = primitive.createConfirmDialog({ ...presentation(options), onConfirm: options.onConfirm, onClose: options.onClose, unavailable: options.unavailable });
    let control: ConfirmDialog;
    control = own<ConfirmState, Pick<ConfirmDialog, 'open' | 'close' | 'isOpen' | 'refreshAvailability'>>({ ...block, update(state: Readonly<ConfirmState>) { check(state, confirmKeys); block.update(presentation(state)); } }, [], { open(state?: ConfirmState) { if (state)
            check(state, confirmKeys); mounted(control); block.open(state ? presentation(state) : undefined); }, close: block.close, isOpen: () => block.element.open, refreshAvailability: block.refreshAvailability });
    return control;
}
export interface PopoverState {
    readonly label: string;
    readonly disabled?: boolean;
}
export interface Popover extends Control<PopoverState> {
    open(): void;
    close(): void;
    isOpen(): boolean;
}
export function createPopover(options: PopoverState & {
    readonly content: Control;
    readonly onToggle?: (open: boolean) => void;
}): Popover {
    check(options, ['label', 'disabled', 'content', 'onToggle']);
    const [node] = nodes([options.content]);
    const block = primitive.createPopover({ ...options, content: node });
    let control: Popover;
    control = own<PopoverState, Pick<Popover, 'open' | 'close' | 'isOpen'>>({ ...block, update(state: Readonly<PopoverState>) { check(state, ['label', 'disabled']); block.update(state); } }, [options.content], { open() { mounted(control); block.open(); }, close: block.close, isOpen: block.isOpen });
    return control;
}
export interface MenuItem {
    readonly id: string;
    readonly label: string;
    readonly disabled?: boolean;
    readonly intent?: 'neutral' | 'danger';
    readonly checked?: boolean;
    readonly onAction: Action;
}
export interface MenuState extends PopoverState {
    readonly items: readonly MenuItem[];
}
export interface Menu extends Control<MenuState> {
    open(): void;
    close(): void;
    isOpen(): boolean;
}
function menuItems(items: readonly MenuItem[]): void { if (new Set(items.map(item => item.id)).size !== items.length)
    throw new Error('Menu IDs must be unique.'); for (const item of items) {
    check(item, ['id', 'label', 'disabled', 'intent', 'checked', 'onAction']);
    if (item.intent && item.intent !== 'neutral' && item.intent !== 'danger')
        throw new Error('Menu intent must be neutral or danger.');
} }
export function createMenu(options: MenuState & {
    readonly onError?: (message: string) => void;
}): Menu {
    check(options, ['label', 'disabled', 'items', 'onError']);
    menuItems(options.items);
    const block = primitive.createMenu(options);
    let control: Menu;
    control = own<MenuState, Pick<Menu, 'open' | 'close' | 'isOpen'>>({ ...block, update(state: Readonly<MenuState>) { check(state, ['label', 'disabled', 'items']); menuItems(state.items); block.update(state); } }, [], { open() { mounted(control); block.open(); }, close: block.close, isOpen: block.isOpen });
    return control;
}
export interface ContextMenuState {
    readonly label: string;
    readonly items: readonly Omit<MenuItem, 'checked'>[];
    readonly disabled?: boolean;
}
export interface ContextMenu extends Control<ContextMenuState> {
    open(trigger: Control): void;
    close(): void;
    isOpen(): boolean;
}
export function createContextMenu(options: ContextMenuState & {
    readonly onError?: (message: string) => void;
}): ContextMenu {
    check(options, ['label', 'items', 'disabled', 'onError']);
    menuItems(options.items);
    let state: ContextMenuState = { label: options.label, items: options.items, disabled: options.disabled };
    let open = false, pending = false;
    const feedback = primitive.createNotice({ message: '', tone: 'error' });
    const block = internalContextMenu({ onDismiss() { open = false; operation.invalidate(); }, onAction(item) {
            const action = state.items.find(action => action.id === item.id);
            if (!action || action.disabled || state.disabled || pending || !open)
                return;
            block.element.focus({ preventScroll: true });
            operation.run(action.onAction, result => { if (!result || result.ok)
                close();
            else
                fail(result.error); });
        } });
    const render = () => { block.update({ label: state.label, items: state.items.map(item => ({ id: item.id, label: item.label, danger: item.intent === 'danger', disabled: !!(state.disabled || item.disabled || pending) })) }); block.element.append(feedback.element); };
    const fail = (message: string) => { feedback.update({ message, tone: 'error' }); options.onError?.(message); };
    const operation = createOperation({ unavailable: () => !open || !!state.disabled, onPending(value) { pending = value; render(); }, onError: fail });
    const close = () => { open = false; operation.invalidate(); block.close(true); };
    render();
    let control: ContextMenu;
    control = own<ContextMenuState, Pick<ContextMenu, 'open' | 'close' | 'isOpen'>>({ element: block.element, update(next) { check(next, ['label', 'items', 'disabled']); menuItems(next.items); state = next; if (next.disabled)
            close(); render(); }, destroy() { open = false; operation.destroy(); feedback.destroy(); block.destroy(); } }, [], { open(trigger) { mounted(control); if (state.disabled)
            return; operation.invalidate(); feedback.update({ message: '', tone: 'error' }); const source = entry(trigger).node; const button = source instanceof HTMLButtonElement ? source : source.querySelector('button'); if (!button)
            throw new Error('Context menu trigger must contain an action control.'); open = true; block.open(button, { label: state.label, items: state.items.map(item => ({ id: item.id, label: item.label, danger: item.intent === 'danger', disabled: item.disabled })) }); render(); }, close, isOpen: () => open });
    return control;
}
export interface CopyButtonState {
    readonly value: string;
    readonly label?: string;
    readonly disabled?: boolean;
}
export function createCopyButton(options: CopyButtonState & {
    readonly onCopy: (text: string) => ActionResult | Promise<ActionResult>;
    readonly onError?: (message: string) => void;
}): Control<CopyButtonState> {
    check(options, ['value', 'label', 'disabled', 'onCopy', 'onError']);
    let state: CopyButtonState = { value: options.value, label: options.label, disabled: options.disabled };
    const status = element('span', 'pui-sr-only');
    status.setAttribute('role', 'status');
    const button = primitive.createButton({ label: options.label ?? 'Copy', disabled: options.disabled, onAction: () => feedback.copy(button.element, async () => { const result = await options.onCopy(state.value); if (!result.ok)
            throw new Error(result.error); }, 'Copied.'), onError: options.onError });
    const feedback = createCopyFeedback({ status, isDisabled: () => !!state.disabled, onError: error => options.onError?.(error instanceof Error ? error.message : String(error)) });
    const root = element('span', 'pui-control-copy', button.element, status);
    return own({ element: root, update(next: Readonly<CopyButtonState>) { check(next, ['value', 'label', 'disabled']); state = next; button.update({ label: next.label ?? 'Copy', disabled: next.disabled }); }, destroy() { feedback.destroy(); button.destroy(); } });
}
