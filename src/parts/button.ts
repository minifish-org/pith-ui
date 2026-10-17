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

/** Retained product button markup, backed by the existing action controller. */
export function createButtonPart(options: ButtonPartOptions): ButtonPart {
  assertOptions(options, [...stateKeys, 'type', 'onAction', 'onError'], 'button');
  const node = document.createElement('button');
  const type = options.type ?? 'button';
  if (!['button', 'submit', 'reset'].includes(type)) throw new TypeError('Unknown button type.');
  node.type = type;
  const action = adoptAction(node, {onAction: options.onAction, onError: options.onError});
  const caption = document.createTextNode('');
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
    node.className = variants[variant];
    node.hidden = !!state.hidden;
    if (icon !== state.icon) {
      icon = state.icon; glyph?.remove();
      glyph = icon ? iconElement(icon) : undefined;
      if (glyph) node.prepend(glyph);
    }
    if (variant === 'quiet-icon') {caption.remove(); node.setAttribute('aria-label', state.label);}
    else {
      node.removeAttribute('aria-label');
      if (caption.data !== state.label) caption.data = state.label;
      if (caption.parentNode !== node) node.append(caption);
    }
    // The direct text node and SVG stay owned here; adoptAction provides the
    // established local pending, external availability and stale response rules.
    action.update({disabled: !!state.disabled, pending: !!state.pending, title: state.title ?? ''});
  };
  const part = createOwnedPart(node, {update, focus() {if (isPartAlive(part)) node.focus();}}, {dispose: action.destroy});
  const {type: _type, onAction: _onAction, onError: _onError, ...initial} = options;
  try {update(initial as ButtonPartState);} catch (error) {part.destroy(); throw error;}
  return part;
}
