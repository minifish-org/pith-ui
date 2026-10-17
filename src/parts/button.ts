import type {UIAction} from '../core.js';
import {iconElement} from '../dom.js';
import {adoptAction} from '../foundations.js';
import {assertOptions, createOwnedPart, isPartAlive, type Part} from './ownership.js';
import {assertIconName, type IconName} from './text.js';

export type ButtonVariant = 'standard' | 'primary' | 'secondary' | 'danger' | 'quiet-icon';
interface ButtonState {
  label: string;
  disabled?: boolean;
  pending?: boolean;
  title?: string;
  hidden?: boolean;
}
export type ButtonPartState = ButtonState & (
  | {variant: 'quiet-icon'; icon: IconName}
  | {variant?: Exclude<ButtonVariant, 'quiet-icon'>; icon?: IconName}
);
export type ButtonPartOptions = ButtonPartState & {
  /** Prompt actions retain the established generic dialog presentation. */
  purpose?: 'action' | 'prompt';
  type?: 'button' | 'submit' | 'reset';
  onAction?: UIAction;
  onError?: (message: string) => void;
};
export interface ButtonPart extends Part {update(state: Readonly<ButtonPartState>): void; focus(): void}
const variants: Record<ButtonVariant, string> = {
  standard: 'pui-button', primary: 'pui-primary-button', secondary: 'pui-secondary-button',
  danger: 'pui-secondary-button pui-destructive-button', 'quiet-icon': 'pui-quiet-icon',
};
const stateKeys = ['label', 'variant', 'icon', 'disabled', 'pending', 'title', 'hidden'] as const;
const availability = new WeakMap<Part, {disabled: boolean; pending: boolean; hidden: boolean}>();
/** Internal semantic anchor checks; local click pending must not block its own popup. */
export function isButtonPart(part: Part): part is ButtonPart {return availability.has(part) && isPartAlive(part);}
export function isButtonAvailable(part: ButtonPart): boolean {
  const state = availability.get(part);
  return isButtonPart(part) && !!state && !state.disabled && !state.pending && !state.hidden;
}

/** Retained product button markup, backed by the existing action controller. */
export function createButtonPart(options: ButtonPartOptions): ButtonPart {
  assertOptions(options, [...stateKeys, 'purpose', 'type', 'onAction', 'onError'], 'button');
  const purpose = options.purpose ?? 'action';
  if (!['action', 'prompt'].includes(purpose)) throw new TypeError('Unknown button purpose.');
  const node = document.createElement('button');
  const type = options.type ?? 'button';
  if (!['button', 'submit', 'reset'].includes(type)) throw new TypeError('Unknown button type.');
  node.type = type;
  const action = adoptAction(node, {onAction: options.onAction, onError: options.onError});
  const caption = purpose === 'prompt' ? document.createElement('span') : document.createTextNode('');
  let glyph: SVGSVGElement | undefined;
  let icon: IconName | undefined;
  const update = (state: Readonly<ButtonPartState>) => {
    assertOptions(state, stateKeys, 'button state');
    if (!isPartAlive(part)) return;
    const variant = state.variant ?? 'standard';
    if (!Object.hasOwn(variants, variant)) throw new TypeError('Unknown button variant.');
    if (typeof state.label !== 'string') throw new TypeError('Button label must be a string.');
    if (state.icon !== undefined) assertIconName(state.icon);
    if (variant === 'quiet-icon' && !state.icon) throw new TypeError('An icon button requires a library icon.');
    availability.set(part, {disabled: !!state.disabled, pending: !!state.pending, hidden: !!state.hidden});
    if (purpose === 'prompt') {
      const intent = variant === 'primary' ? 'primary' : variant === 'danger' ? 'danger' : 'neutral';
      node.className = `pui-button pui-${intent} pui-normal${variant === 'quiet-icon' ? ' pui-icon-button' : variant === 'secondary' ? ' pui-secondary-button' : ''}`;
    } else node.className = variants[variant];
    node.hidden = !!state.hidden;
    if (icon !== state.icon) {
      icon = state.icon; glyph?.remove();
      glyph = icon ? iconElement(icon) : undefined;
      if (glyph) node.prepend(glyph);
    }
    if (variant === 'quiet-icon') {
      node.setAttribute('aria-label', state.label);
      if (caption instanceof HTMLElement) {caption.className = 'pui-sr-only'; caption.textContent = state.label; if (caption.parentNode !== node) node.append(caption);}
      else caption.remove();
    }
    else {
      node.removeAttribute('aria-label');
      if (caption instanceof HTMLElement) caption.className = '';
      if (caption.textContent !== state.label) caption.textContent = state.label;
      if (caption.parentNode !== node) node.append(caption);
    }
    // The direct text node and SVG stay owned here; adoptAction provides the
    // established local pending, external availability and stale response rules.
    action.update({disabled: !!state.disabled, pending: !!state.pending, title: state.title ?? ''});
  };
  const part = createOwnedPart(node, {update, focus() {if (isPartAlive(part)) node.focus();}}, {dispose: action.destroy});
  const {purpose: _purpose, type: _type, onAction: _onAction, onError: _onError, ...initial} = options;
  try {update(initial as ButtonPartState);} catch (error) {part.destroy(); throw error;}
  return part;
}
