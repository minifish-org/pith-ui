import type {ActionResult} from '../core.js';
import {createOperation} from '../operation.js';
import {assertOptions, createOwnedPart, isPartAlive, replacePartChildren, type Part} from './ownership.js';

export interface FormPartState {disabled?: boolean; hidden?: boolean;dropEnabled?: boolean}
export interface FileDropData {readonly files: readonly File[];readonly uris: string}
/** Coordinates are incoming native pointer data, never a layout parameter. */
export interface NativeFileDropData {readonly paths: readonly string[];readonly x: number;readonly y: number}
export interface FormPartOptions extends FormPartState {
  purpose?: 'form' | 'text-entry' | 'confirmation' | 'answer' | 'composer';
  children: readonly Part[];
  onSubmit?(): void | ActionResult | Promise<void | ActionResult>;
  onPending?(pending: boolean): void;
  onError?(message: string): void;
  onDrop?(data: Readonly<FileDropData>): void;
  onNativeDrop?(paths: readonly string[]): void;
}
export interface FormPart extends Part {
  update(state: Readonly<FormPartState>): void;
  replace(children: readonly Part[]): void;
  submit(): void;
  reportValidity(): boolean;
  invalidate(): void;
  reset(): void;
  isPending(): boolean;
  receiveNativeDrop(data: Readonly<NativeFileDropData>): void;
}

/** A native form without a fieldset or layout wrapper. Validation stays native. */
export function createFormPart(options: FormPartOptions): FormPart {
  assertOptions(options, ['purpose', 'children', 'disabled', 'hidden', 'dropEnabled', 'onSubmit', 'onPending', 'onError','onDrop','onNativeDrop'], 'form');
  if (options.purpose !== undefined && !['form', 'text-entry', 'confirmation', 'answer', 'composer'].includes(options.purpose)) throw new TypeError('Unsupported form purpose.');
  for (const key of ['disabled', 'hidden','dropEnabled'] as const) if (options[key] !== undefined && typeof options[key] !== 'boolean') throw new TypeError(`Form ${key} must be boolean.`);
  for (const key of ['onSubmit', 'onPending', 'onError','onDrop','onNativeDrop'] as const) if (options[key] !== undefined && typeof options[key] !== 'function') throw new TypeError(`Form ${key} must be a callback.`);
  const node = document.createElement('form');
  if (options.purpose === 'text-entry') node.className = 'pui-text-edit';
  if (options.purpose === 'confirmation') node.className = 'pui-confirm';
  if (options.purpose === 'answer') node.className = 'pui-answer-form';
  if (options.purpose === 'composer') node.className = 'pui-composer';
  node.hidden = !!options.hidden;
  let disabled = !!options.disabled;
  let dropEnabled = !!options.dropEnabled;
  let part: FormPart;
  const operation = createOperation({
    unavailable: () => !isPartAlive(part) || disabled,
    onPending(pending) {
      node.setAttribute('aria-busy', String(pending));
      options.onPending?.(pending);
    },
    onError: options.onError,
  });
  const submit = (event: SubmitEvent) => {
    event.preventDefault();
    if (!options.onSubmit || disabled || operation.pending || !node.reportValidity()) return;
    operation.run(options.onSubmit, result => {if (result && !result.ok) options.onError?.(result.error);});
  };
  node.addEventListener('submit', submit);
  const dragover = (event: DragEvent) => {if (dropEnabled) {event.preventDefault();node.classList.add('pui-drag-images');}};
  const dragleave = (event: DragEvent) => {if (!node.contains(event.relatedTarget as Node|null)) node.classList.remove('pui-drag-images');};
  const drop = (event: DragEvent) => {event.preventDefault();node.classList.remove('pui-drag-images');options.onDrop?.(Object.freeze({files: Object.freeze([...event.dataTransfer?.files || []]),uris: event.dataTransfer?.getData('text/uri-list') || ''}));};
  if (options.onDrop) {node.addEventListener('dragover',dragover);node.addEventListener('dragleave',dragleave);node.addEventListener('drop',drop);}
  part = createOwnedPart<Omit<FormPart, keyof Part>>(node, {
    update(state: Readonly<FormPartState>) {
      assertOptions(state, ['disabled', 'hidden','dropEnabled'], 'form state');
      for (const key of ['disabled', 'hidden','dropEnabled'] as const) if (state[key] !== undefined && typeof state[key] !== 'boolean') throw new TypeError(`Form ${key} must be boolean.`);
      if (!isPartAlive(part)) return;
      if (state.disabled !== undefined) disabled = state.disabled;
      if (state.hidden !== undefined) node.hidden = state.hidden;
      if (state.dropEnabled !== undefined) {dropEnabled = state.dropEnabled;node.classList.remove('pui-drag-images');}
    },
    replace(children: readonly Part[]) {if (isPartAlive(part)) replacePartChildren(part, children);},
    submit() {if (isPartAlive(part)) node.requestSubmit();},
    reportValidity: () => isPartAlive(part) && node.reportValidity(),
    invalidate() {if (isPartAlive(part)) operation.invalidate();},
    reset() {if (isPartAlive(part)) {operation.invalidate(); node.reset();}},
    isPending: () => isPartAlive(part) && operation.pending,
    receiveNativeDrop(data) {assertOptions(data,['paths','x','y'],'native file drop');if (!Array.isArray(data.paths) || data.paths.some(path => typeof path !== 'string')) throw new TypeError('Native file paths must be text.');if (!isPartAlive(part) || !dropEnabled || !Number.isFinite(data.x) || !Number.isFinite(data.y) || !node.contains(document.elementFromPoint(data.x,data.y))) return;options.onNativeDrop?.(Object.freeze([...data.paths]));},
  }, {children: options.children, dispose() {operation.destroy(); node.removeEventListener('submit', submit);node.removeEventListener('dragover',dragover);node.removeEventListener('dragleave',dragleave);node.removeEventListener('drop',drop);}});
  return part;
}
