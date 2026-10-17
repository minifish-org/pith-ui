import type {ActionResult} from '../core.js';
import {createOperation} from '../operation.js';
import {assertOptions, createOwnedPart, isPartAlive, replacePartChildren, type Part} from './ownership.js';

export interface FormPartState {disabled?: boolean; hidden?: boolean}
export interface FormPartOptions extends FormPartState {
  purpose?: 'form' | 'text-entry' | 'confirmation' | 'answer';
  children: readonly Part[];
  onSubmit?(): void | ActionResult | Promise<void | ActionResult>;
  onPending?(pending: boolean): void;
  onError?(message: string): void;
}
export interface FormPart extends Part {
  update(state: Readonly<FormPartState>): void;
  replace(children: readonly Part[]): void;
  submit(): void;
  reportValidity(): boolean;
  invalidate(): void;
  reset(): void;
  isPending(): boolean;
}

/** A native form without a fieldset or layout wrapper. Validation stays native. */
export function createFormPart(options: FormPartOptions): FormPart {
  assertOptions(options, ['purpose', 'children', 'disabled', 'hidden', 'onSubmit', 'onPending', 'onError'], 'form');
  if (options.purpose !== undefined && !['form', 'text-entry', 'confirmation', 'answer'].includes(options.purpose)) throw new TypeError('Unsupported form purpose.');
  for (const key of ['disabled', 'hidden'] as const) if (options[key] !== undefined && typeof options[key] !== 'boolean') throw new TypeError(`Form ${key} must be boolean.`);
  for (const key of ['onSubmit', 'onPending', 'onError'] as const) if (options[key] !== undefined && typeof options[key] !== 'function') throw new TypeError(`Form ${key} must be a callback.`);
  const node = document.createElement('form');
  if (options.purpose === 'text-entry') node.className = 'pui-text-edit';
  if (options.purpose === 'confirmation') node.className = 'pui-confirm';
  if (options.purpose === 'answer') node.className = 'pui-answer-form';
  node.hidden = !!options.hidden;
  let disabled = !!options.disabled;
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
  part = createOwnedPart<Omit<FormPart, keyof Part>>(node, {
    update(state: Readonly<FormPartState>) {
      assertOptions(state, ['disabled', 'hidden'], 'form state');
      for (const key of ['disabled', 'hidden'] as const) if (state[key] !== undefined && typeof state[key] !== 'boolean') throw new TypeError(`Form ${key} must be boolean.`);
      if (!isPartAlive(part)) return;
      if (state.disabled !== undefined) disabled = state.disabled;
      if (state.hidden !== undefined) node.hidden = state.hidden;
    },
    replace(children: readonly Part[]) {if (isPartAlive(part)) replacePartChildren(part, children);},
    submit() {if (isPartAlive(part)) node.requestSubmit();},
    reportValidity: () => isPartAlive(part) && node.reportValidity(),
    invalidate() {if (isPartAlive(part)) operation.invalidate();},
    reset() {if (isPartAlive(part)) {operation.invalidate(); node.reset();}},
    isPending: () => isPartAlive(part) && operation.pending,
  }, {children: options.children, dispose() {operation.destroy(); node.removeEventListener('submit', submit);}});
  return part;
}
