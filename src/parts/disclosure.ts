import {Lifetime} from '../core.js';
import {assertOptions, createOwnedPart, isPartAlive, replacePartChildren, type Part} from './ownership.js';

export type DisclosurePurpose = 'plain' | 'advanced' | 'preview';
export interface DisclosurePartState {title: string; disabled?: boolean; hidden?: boolean}
export interface DisclosurePartOptions extends DisclosurePartState {
  purpose?: DisclosurePurpose;
  children: readonly Part[];
  open?: boolean;
  onToggle?(open: boolean): void;
}
export interface DisclosurePart extends Part {
  update(state: Readonly<DisclosurePartState>): void;
  replace(children: readonly Part[]): void;
  setOpen(open: boolean): void;
  isOpen(): boolean;
}
const purposes: Record<DisclosurePurpose, string> = {plain: '', advanced: 'pui-provider-advanced', preview: 'pui-resource-preview'};
function validate(state: Readonly<DisclosurePartState>): void {
  if (typeof state.title !== 'string') throw new TypeError('Disclosure title must be text.');
  for (const key of ['disabled', 'hidden'] as const) if (state[key] !== undefined && typeof state[key] !== 'boolean') throw new TypeError(`Disclosure ${key} must be boolean.`);
}

/** Native details with a text summary and directly owned content parts. */
export function createDisclosurePart(options: DisclosurePartOptions): DisclosurePart {
  assertOptions(options, ['title', 'disabled', 'hidden', 'purpose', 'children', 'open', 'onToggle'], 'disclosure'); validate(options);
  const purpose = options.purpose ?? 'plain';
  if (!Object.hasOwn(purposes, purpose)) throw new TypeError('Unknown disclosure purpose.');
  if (options.open !== undefined && typeof options.open !== 'boolean') throw new TypeError('Disclosure open must be boolean.');
  if (options.onToggle !== undefined && typeof options.onToggle !== 'function') throw new TypeError('Disclosure onToggle must be a callback.');
  const node = document.createElement('details'); if (purposes[purpose]) node.className = purposes[purpose];
  const summary = document.createElement('summary');
  const summaryPart = createOwnedPart(summary, {});
  const life = new Lifetime();
  let disabled = !!options.disabled;
  let part: DisclosurePart;
  life.listen(summary, 'click', event => {if (disabled) event.preventDefault();});
  life.listen(node, 'toggle', () => {if (isPartAlive(part)) options.onToggle?.(node.open);});
  const update = (state: Readonly<DisclosurePartState>) => {
    assertOptions(state, ['title', 'disabled', 'hidden'], 'disclosure state'); validate(state);
    if (!isPartAlive(part)) return;
    if (summary.textContent !== state.title) summary.textContent = state.title;
    disabled = !!state.disabled; summary.setAttribute('aria-disabled', String(disabled)); node.hidden = !!state.hidden;
  };
  try {
    part = createOwnedPart<Omit<DisclosurePart, keyof Part>>(node, {update,
      replace(children: readonly Part[]) {replacePartChildren(part, [summaryPart, ...children]);},
      setOpen(open: boolean) {if (typeof open !== 'boolean') throw new TypeError('Disclosure open must be boolean.'); if (isPartAlive(part)) node.open = open;},
      isOpen: () => isPartAlive(part) && node.open,
    }, {children: [summaryPart, ...options.children], dispose: () => life.destroy()});
  } catch (error) {summaryPart.destroy(); life.destroy(); throw error;}
  update({title: options.title, disabled: options.disabled, hidden: options.hidden}); node.open = !!options.open;
  return part;
}
