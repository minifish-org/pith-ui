import type {UIAction} from '../core.js';
import {iconElement} from '../dom.js';
import {adoptAction} from '../foundations.js';
import {assertOptions, createOwnedPart, isPartAlive, type Part} from './ownership.js';
import {assertIconName, type IconName} from './text.js';

type OrdinaryButtonVariant = 'standard' | 'primary' | 'secondary' | 'danger' | 'warning';
type NavigationButtonVariant = 'navigation' | 'navigation-item' | 'toolbar-action' | 'drawer-trigger';
export type ButtonVariant = OrdinaryButtonVariant | NavigationButtonVariant | 'quiet-icon';
interface ButtonState {
  label: string;
  disabled?: boolean;
  pending?: boolean;
  title?: string;
  hidden?: boolean;
  accessibleLabel?: string;
}
type PromptButtonState = ButtonState & (
  | {variant: 'quiet-icon'; icon: IconName; menuExpanded?: boolean}
  | {variant?: OrdinaryButtonVariant; icon?: IconName; menuExpanded?: never}
);
export type ButtonPartState = PromptButtonState | ButtonState & {variant: NavigationButtonVariant; icon: IconName; menuExpanded?: never};
export type ButtonPartOptions = (ButtonPartState & {purpose?: 'action'} | PromptButtonState & {purpose: 'prompt'}) & {
  /** Prompt actions retain the established generic dialog presentation. */
  type?: 'button' | 'submit' | 'reset';
  onAction?: UIAction;
  onError?: (message: string) => void;
};
export interface ButtonPart extends Part {update(state: Readonly<ButtonPartState>): void; invalidate(): void; focus(): void}
const variants: Record<ButtonVariant, string> = {
  standard: 'pui-button', primary: 'pui-primary-button', secondary: 'pui-secondary-button',
  danger: 'pui-secondary-button pui-destructive-button', 'quiet-icon': 'pui-quiet-icon',
  warning: 'pui-primary-button pui-warning-button',
  navigation: 'pui-settings-button', 'navigation-item': 'pui-workspace-item pui-empty-workspace',
  'toolbar-action': 'pui-quiet-icon pui-compact-action', 'drawer-trigger': 'pui-quiet-icon pui-mobile-menu',
};
const stateKeys = ['label', 'variant', 'icon', 'disabled', 'pending', 'title', 'hidden', 'accessibleLabel', 'menuExpanded'] as const;
const navigationVariants = ['navigation', 'navigation-item', 'toolbar-action', 'drawer-trigger'];
function validateState(state: Readonly<ButtonPartState>, purpose: 'action' | 'prompt'): void {
  assertOptions(state, stateKeys, 'button state');
  const variant = state.variant ?? 'standard';
  if (!Object.hasOwn(variants, variant)) throw new TypeError('Unknown button variant.');
  if (typeof state.label !== 'string') throw new TypeError('Button label must be a string.');
  for (const key of ['title', 'accessibleLabel'] as const) if (state[key] !== undefined && typeof state[key] !== 'string') throw new TypeError(`Button ${key} must be text.`);
  for (const key of ['disabled', 'pending', 'hidden', 'menuExpanded'] as const) if (state[key] !== undefined && typeof state[key] !== 'boolean') throw new TypeError(`Button ${key} must be boolean.`);
  if (state.icon !== undefined) assertIconName(state.icon);
  if ((variant === 'quiet-icon' || navigationVariants.includes(variant)) && !state.icon) throw new TypeError('This action requires a library icon.');
  if (purpose === 'prompt' && navigationVariants.includes(variant)) throw new TypeError('Navigation actions use action presentation.');
  if (state.menuExpanded !== undefined && variant !== 'quiet-icon') throw new TypeError('Menu state belongs to quiet menu triggers.');
}
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
  const {purpose: _purpose, type: _type, onAction: _onAction, onError: _onError, ...initial} = options;
  validateState(initial as ButtonPartState, purpose);
  for (const key of ['onAction', 'onError'] as const) if (options[key] !== undefined && typeof options[key] !== 'function') throw new TypeError(`Button ${key} must be a callback.`);
  const node = document.createElement('button');
  const type = options.type ?? 'button';
  if (!['button', 'submit', 'reset'].includes(type)) throw new TypeError('Unknown button type.');
  node.type = type;
  const action = adoptAction(node, {onAction: options.onAction, onError: options.onError});
  const textCaption = document.createTextNode(''), spanCaption = document.createElement('span');
  let caption: Text | HTMLSpanElement | undefined;
  let glyph: SVGSVGElement | undefined;
  let icon: IconName | undefined;
  let ownsMenuState = false;
  const update = (state: Readonly<ButtonPartState>) => {
    validateState(state, purpose);
    if (!isPartAlive(part)) return;
    const variant = state.variant ?? 'standard';
    availability.set(part, {disabled: !!state.disabled, pending: !!state.pending, hidden: !!state.hidden});
    node.hidden = !!state.hidden;
    // The private copy presenter temporarily owns caption, glyph and accessible
    // feedback. Availability snapshots must not erase that fixed-lived state.
    if (node.dataset.copyPending === 'true') {
      action.update({disabled: !!state.disabled, pending: !!state.pending, title: undefined});
      return;
    }
    if (purpose === 'prompt') {
      const intent = variant === 'primary' || variant === 'warning' ? 'primary' : variant === 'danger' ? 'danger' : 'neutral';
      node.className = `pui-button pui-${intent} pui-normal${variant === 'quiet-icon' ? ' pui-icon-button' : variant === 'secondary' ? ' pui-secondary-button' : variant === 'warning' ? ' pui-warning-button' : ''}`;
    } else node.className = variants[variant];
    if (icon !== state.icon) {
      icon = state.icon; glyph?.remove();
      glyph = icon ? iconElement(icon) : undefined;
      if (glyph) node.prepend(glyph);
    }
    const iconOnly = variant === 'quiet-icon' || variant === 'drawer-trigger';
    const nextCaption = iconOnly && purpose !== 'prompt' ? undefined : purpose === 'prompt' || navigationVariants.includes(variant) ? spanCaption : textCaption;
    if (caption !== nextCaption) {caption?.remove(); caption = nextCaption;}
    if (caption) {
      if (caption instanceof HTMLElement) caption.className = iconOnly ? 'pui-sr-only' : '';
      if (caption.textContent !== state.label) caption.textContent = state.label;
      if (caption.parentNode !== node) node.append(caption);
    }
    if (iconOnly || variant === 'toolbar-action' || state.accessibleLabel !== undefined) node.setAttribute('aria-label', state.accessibleLabel ?? state.label);
    else node.removeAttribute('aria-label');
    if (state.menuExpanded !== undefined) {node.setAttribute('aria-haspopup', 'menu'); node.setAttribute('aria-expanded', String(state.menuExpanded)); ownsMenuState = true;}
    else if (ownsMenuState) {node.removeAttribute('aria-haspopup'); node.removeAttribute('aria-expanded'); ownsMenuState = false;}
    // The direct text node and SVG stay owned here; adoptAction provides the
    // established local pending, external availability and stale response rules.
    action.update({disabled: !!state.disabled, pending: !!state.pending, title: purpose === 'prompt' ? state.title ?? '' : state.title});
    if (purpose === 'action' && state.title === undefined) node.removeAttribute('title');
  };
  const part = createOwnedPart(node, {update, invalidate() {if (isPartAlive(part)) action.invalidate();}, focus() {if (isPartAlive(part)) node.focus();}}, {dispose: action.destroy});
  try {update(initial as ButtonPartState);} catch (error) {part.destroy(); throw error;}
  return part;
}
