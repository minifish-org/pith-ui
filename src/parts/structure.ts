import {iconElement} from '../dom.js';
import type {ValuePart} from './fields.js';
import {assertOptions, createOwnedPart, isPartAlive, nodeOf, replacePartChildren, type Part} from './ownership.js';
import {assertIconName, type IconName} from './text.js';

export interface FieldsetPartState {legend: string; disabled?: boolean; hidden?: boolean}
export interface FieldsetPart extends Part {update(state: Readonly<FieldsetPartState>): void; replace(children: readonly Part[]): void}
function validateFieldset(state: Readonly<FieldsetPartState>): void {
  if (typeof state.legend !== 'string') throw new TypeError('Fieldset legend must be text.');
  for (const key of ['disabled', 'hidden'] as const) if (state[key] !== undefined && typeof state[key] !== 'boolean') throw new TypeError(`Fieldset ${key} must be boolean.`);
}
/** A native legend group. Disabling is inherited by its existing controls. */
export function createFieldsetPart(options: FieldsetPartState & {children: readonly Part[]}): FieldsetPart {
  assertOptions(options, ['legend', 'disabled', 'hidden', 'children'], 'fieldset'); validateFieldset(options);
  const node = document.createElement('fieldset'); node.className = 'pui-custom-model';
  const legend = document.createElement('legend'), legendPart = createOwnedPart(legend, {});
  let part: FieldsetPart;
  const update = (state: Readonly<FieldsetPartState>) => {
    assertOptions(state, ['legend', 'disabled', 'hidden'], 'fieldset state'); validateFieldset(state); if (!isPartAlive(part)) return;
    if (legend.textContent !== state.legend) legend.textContent = state.legend;
    node.disabled = !!state.disabled; node.hidden = !!state.hidden;
  };
  try {part = createOwnedPart<Omit<FieldsetPart, keyof Part>>(node, {update, replace(children: readonly Part[]) {replacePartChildren(part, [legendPart, ...children]);}}, {children: [legendPart, ...options.children]});}
  catch (error) {legendPart.destroy(); throw error;}
  update({legend: options.legend, disabled: options.disabled, hidden: options.hidden}); return part;
}

export interface FieldGridPartState {hidden?: boolean}
export interface FieldGridPart extends Part {update(state: Readonly<FieldGridPartState>): void; replace(children: readonly Part[]): void}
/** The library's fixed two-column field grid; children retain their own identity. */
export function createFieldGridPart(options: FieldGridPartState & {children: readonly Part[]}): FieldGridPart {
  assertOptions(options, ['hidden', 'children'], 'field grid');
  if (options.hidden !== undefined && typeof options.hidden !== 'boolean') throw new TypeError('Grid hidden must be boolean.');
  const node = document.createElement('div'); node.className = 'pui-sdk-grid';
  let part: FieldGridPart;
  const update = (state: Readonly<FieldGridPartState>) => {
    assertOptions(state, ['hidden'], 'field grid state');
    if (state.hidden !== undefined && typeof state.hidden !== 'boolean') throw new TypeError('Grid hidden must be boolean.');
    if (isPartAlive(part)) node.hidden = !!state.hidden;
  };
  part = createOwnedPart<Omit<FieldGridPart, keyof Part>>(node, {update, replace(children: readonly Part[]) {replacePartChildren(part, children);}}, {children: options.children});
  update({hidden: options.hidden}); return part;
}

export interface InputAdornmentPartState {icon: IconName; hidden?: boolean}
export interface InputAdornmentPart extends Part {update(state: Readonly<InputAdornmentPartState>): void}
function validateAdornment(state: Readonly<InputAdornmentPartState>): void {
  assertIconName(state.icon);
  if (state.hidden !== undefined && typeof state.hidden !== 'boolean') throw new TypeError('Input adornment hidden must be boolean.');
}
/** The existing icon/input container; ordinary inputs receive no extra wrapper. */
export function createInputAdornmentPart(options: InputAdornmentPartState & {control: ValuePart}): InputAdornmentPart {
  assertOptions(options, ['icon', 'hidden', 'control'], 'input adornment'); validateAdornment(options);
  if (!(nodeOf(options.control) instanceof HTMLInputElement)) throw new TypeError('An input adornment requires a Pith UI input.');
  const node = document.createElement('div'); node.className = 'pui-input-with-icon';
  const glyph = iconElement(options.icon), glyphPart = createOwnedPart(glyph, {});
  let icon = options.icon;
  let part: InputAdornmentPart;
  const update = (state: Readonly<InputAdornmentPartState>) => {
    assertOptions(state, ['icon', 'hidden'], 'input adornment state'); validateAdornment(state); if (!isPartAlive(part)) return;
    if (icon !== state.icon) {icon = state.icon; glyph.replaceChildren(...iconElement(icon).childNodes);}
    node.hidden = !!state.hidden;
  };
  try {part = createOwnedPart<Omit<InputAdornmentPart, keyof Part>>(node, {update}, {children: [glyphPart, options.control]});}
  catch (error) {glyphPart.destroy(); throw error;}
  update({icon: options.icon, hidden: options.hidden}); return part;
}
