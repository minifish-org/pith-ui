import {adoptNativeControl} from '../foundations.js';
import {assertOptions,createOwnedPart,isPartAlive,type Part} from './ownership.js';

export interface MessageInputState {label?: string;placeholder?: string;disabled?: boolean;readOnly?: boolean}
export interface MessageInputOptions extends MessageInputState {value?: string;onInput?(text: string): void;onSubmit?(): void;onBlur?(): void;onImages?(files: File[]): void}
export interface MessageSelection {before: string;selected: string;after: string}
export interface MessageInputPart extends Part {update(state: Readonly<MessageInputState>): void;read(): string;reset(value: string): void;focus(): void;selectAll(): void;readSelection(): Readonly<MessageSelection>;replaceSelection(text: string): void}
const stateKeys = ['label','placeholder','disabled','readOnly'] as const;
function validate(state: MessageInputState): void {
  for (const key of ['label','placeholder'] as const) if (state[key] !== undefined && typeof state[key] !== 'string') throw new TypeError(`Message ${key} must be text.`);
  for (const key of ['disabled','readOnly'] as const) if (state[key] !== undefined && typeof state[key] !== 'boolean') throw new TypeError(`Message ${key} must be boolean.`);
}
/** One native drafting textarea. Growth and composition behavior are fixed. */
export function createMessageInputPart(options: MessageInputOptions): MessageInputPart {
  assertOptions(options,[...stateKeys,'value','onInput','onSubmit','onBlur','onImages'],'message input');validate(options);
  if (options.value !== undefined && typeof options.value !== 'string') throw new TypeError('A message value must be text.');
  for (const key of ['onInput','onSubmit','onBlur','onImages'] as const) if (options[key] !== undefined && typeof options[key] !== 'function') throw new TypeError(`Message ${key} must be a callback.`);
  const node = document.createElement('textarea');node.rows = 1;node.value = options.value ?? '';
  const native = adoptNativeControl(node);let part: MessageInputPart;
  const resize = () => {node.style.height = 'auto';node.style.height = Math.min(node.scrollHeight,180) + 'px';};
  const input = () => {resize();options.onInput?.(node.value);};
  const keydown = (event: KeyboardEvent) => {if (options.onSubmit && event.key === 'Enter' && !event.shiftKey && !event.isComposing) {event.preventDefault();options.onSubmit();}};
  const blur = () => options.onBlur?.();
  const paste = (event: ClipboardEvent) => {const files = [...event.clipboardData?.items || []].filter(item => item.type.startsWith('image/')).map(item => item.getAsFile()).filter((file): file is File => !!file);if (files.length) {event.preventDefault();options.onImages?.(files);}};
  node.addEventListener('input',input);node.addEventListener('keydown',keydown);node.addEventListener('blur',blur);node.addEventListener('paste',paste);
  part = createOwnedPart<Omit<MessageInputPart,keyof Part>>(node,{
    update(state) {assertOptions(state,stateKeys,'message input state');validate(state);if (!isPartAlive(part)) return;if (state.label !== undefined) node.setAttribute('aria-label',state.label);native.update(state);},
    read: native.getValue,reset(value) {if (typeof value !== 'string') throw new TypeError('Message reset must be text.');if (isPartAlive(part)) {native.reset(value);resize();}},focus: native.focus,selectAll() {if (isPartAlive(part)) node.select();},
    readSelection() {return Object.freeze({before: node.value.slice(0,node.selectionStart),selected: node.value.slice(node.selectionStart,node.selectionEnd),after: node.value.slice(node.selectionEnd)});},
    replaceSelection(text) {if (typeof text !== 'string') throw new TypeError('Replacement must be text.');if (isPartAlive(part)) {node.setRangeText(text,node.selectionStart,node.selectionEnd,'end');resize();}},
  },{dispose() {native.destroy();node.removeEventListener('input',input);node.removeEventListener('keydown',keydown);node.removeEventListener('blur',blur);node.removeEventListener('paste',paste);}});
  part.update(Object.fromEntries(stateKeys.filter(key => options[key] !== undefined).map(key => [key,options[key]])));return part;
}
export interface FilePickerPart extends Part {pick(): void;update(state: {disabled: boolean}): void}
/** A native image chooser with the library's supported image formats. */
export function createFilePickerPart(options: {kind: 'images';disabled?: boolean;onFiles(files: File[]): void}): FilePickerPart {
  assertOptions(options,['kind','disabled','onFiles'],'file picker');if (options.kind !== 'images' || typeof options.onFiles !== 'function' || options.disabled !== undefined && typeof options.disabled !== 'boolean') throw new TypeError('An image picker requires an image kind, callback and boolean availability.');
  const node = document.createElement('input');node.type = 'file';node.hidden = true;node.multiple = true;node.accept = 'image/png,image/jpeg,image/gif,image/webp';node.disabled = !!options.disabled;
  const change = () => {const files = Array.from(node.files ?? []);node.value = '';options.onFiles(files);};node.addEventListener('change',change);
  const part = createOwnedPart(node,{pick() {if (isPartAlive(part)) node.click();},update(state: {disabled: boolean}) {assertOptions(state,['disabled'],'file picker state');if (typeof state.disabled !== 'boolean') throw new TypeError('Picker availability must be boolean.');if (isPartAlive(part)) node.disabled = state.disabled;}},{dispose() {node.removeEventListener('change',change);}});return part;
}
