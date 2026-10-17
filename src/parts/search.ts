import {adoptNativeControl} from '../foundations.js';
import {iconElement, uniqueId} from '../dom.js';
import {assertOptions, createOwnedPart, isPartAlive, type Part} from './ownership.js';

export interface SearchFieldPartState {label: string; placeholder?: string; disabled?: boolean; hidden?: boolean}
export interface SearchFieldPartOptions extends SearchFieldPartState {value?: string; onInput?(value: string): void}
export interface SearchFieldPart extends Part {update(state: Readonly<SearchFieldPartState>): void; read(): string; reset(value: string): void; focus(): void}
function validate(state: Readonly<SearchFieldPartState>): void {
  if (typeof state.label !== 'string' || state.placeholder !== undefined && typeof state.placeholder !== 'string') throw new TypeError('Search wording must be text.');
  for (const key of ['disabled', 'hidden'] as const) if (state[key] !== undefined && typeof state[key] !== 'boolean') throw new TypeError(`Search ${key} must be boolean.`);
}
/** A native containing search label. Its one icon and input use the fixed rail specification. */
export function createSearchFieldPart(options: SearchFieldPartOptions): SearchFieldPart {
  assertOptions(options, ['label', 'placeholder', 'disabled', 'hidden', 'value', 'onInput'], 'search field'); validate(options);
  if (options.value !== undefined && typeof options.value !== 'string') throw new TypeError('Search value must be text.');
  if (options.onInput !== undefined && typeof options.onInput !== 'function') throw new TypeError('Search input must be a callback.');
  const node = document.createElement('label'); node.className = 'pui-history-search';
  const caption = document.createElement('span'); caption.className = 'pui-sr-only';
  const input = document.createElement('input'); input.type = 'search'; input.id = uniqueId('pui-search'); input.autocomplete = 'off'; input.defaultValue = options.value ?? ''; input.value = options.value ?? '';
  node.append(iconElement('search'), caption, input);
  const native = adoptNativeControl(input, {onInput: options.onInput ? value => options.onInput!(value) : undefined});
  let part: SearchFieldPart;
  const update = (state: Readonly<SearchFieldPartState>) => {
    assertOptions(state, ['label', 'placeholder', 'disabled', 'hidden'], 'search field state'); validate(state); if (!isPartAlive(part)) return;
    if (caption.textContent !== state.label) caption.textContent = state.label; node.hidden = !!state.hidden;
    native.update({placeholder: state.placeholder ?? '', disabled: !!state.disabled});
  };
  part = createOwnedPart<Omit<SearchFieldPart, keyof Part>>(node, {update, read: native.getValue,
    reset(value: string) {if (typeof value !== 'string') throw new TypeError('Search value must be text.'); if (isPartAlive(part)) native.reset(value);}, focus: native.focus}, {dispose: native.destroy});
  update({label: options.label, placeholder: options.placeholder, disabled: options.disabled, hidden: options.hidden}); return part;
}
