import type {UIAction} from '../core.js';
import {iconElement} from '../dom.js';
import {adoptAction} from '../foundations.js';
import {assertOptions, createOwnedPart, isPartAlive, type Part} from './ownership.js';
import {assertIconName, type IconName} from './text.js';

type OrdinaryButtonVariant = 'standard' | 'primary' | 'secondary' | 'danger' | 'warning' | 'caution' | 'text-action' | 'compact-choice';
type NavigationButtonVariant = 'navigation' | 'navigation-item' | 'toolbar-action' | 'drawer-trigger' | 'previous-match' | 'latest' | 'quiet-action';
export type ButtonVariant = OrdinaryButtonVariant | NavigationButtonVariant | 'quiet-icon' | 'counter' | 'picker' | 'suggestion' | 'overlay-close' | 'context-icon' | 'submit-icon' | 'stop-icon';
interface ButtonState {
  label: string;
  disabled?: boolean;
  pending?: boolean;
  title?: string;
  hidden?: boolean;
  accessibleLabel?: string;
  type?: 'button'|'submit'|'reset';
}
type PromptButtonState = ButtonState & (
  | {variant: 'quiet-icon'; icon: IconName; menuExpanded?: boolean}
  | {variant?: OrdinaryButtonVariant; icon?: IconName; menuExpanded?: never}
);
export type ButtonPartState = PromptButtonState | ButtonState & {variant: NavigationButtonVariant; icon: IconName; menuExpanded?: never}
  | ButtonState & {variant: 'counter'; icon: IconName; count: string; menuExpanded?: never}
  | ButtonState & {variant: 'picker'|'suggestion'; icon: IconName; menuExpanded?: never}
  | ButtonState & {variant: 'overlay-close'; icon: 'close'; menuExpanded?: never}
  | ButtonState & {variant: 'context-icon'; icon: 'image'; menuExpanded?: never}
  | ButtonState & {variant: 'submit-icon'; icon: 'arrow'; menuExpanded?: never}
  | ButtonState & {variant: 'stop-icon'; icon: 'stop'; menuExpanded?: never};
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
  caution: 'pui-secondary-button pui-always-allow-button',
  navigation: 'pui-settings-button', 'navigation-item': 'pui-workspace-item pui-empty-workspace',
  'toolbar-action': 'pui-quiet-icon pui-compact-action', 'drawer-trigger': 'pui-quiet-icon pui-mobile-menu',
  counter: 'pui-quiet-icon pui-artifacts-toggle',
  'previous-match': 'pui-quiet-icon pui-find-previous',latest: 'pui-secondary-button pui-back-to-latest','quiet-action': 'pui-quiet-icon pui-queue-steer',
  picker: 'pui-picker-button',
  suggestion: 'pui-suggestion-action',
  'overlay-close': 'pui-remove-image',
  'context-icon': 'pui-quiet-icon pui-attach-images','submit-icon': 'pui-send-button','stop-icon': 'pui-send-button pui-is-stop',
  'text-action': 'pui-text-button','compact-choice': 'pui-composer-model',
};
const stateKeys = ['label', 'variant', 'icon', 'disabled', 'pending', 'title', 'hidden', 'accessibleLabel', 'menuExpanded', 'count','type'] as const;
const navigationVariants = ['navigation', 'navigation-item', 'toolbar-action', 'drawer-trigger', 'previous-match', 'latest', 'quiet-action'];
function validateState(state: Readonly<ButtonPartState>, purpose: 'action' | 'prompt'): void {
  assertOptions(state, stateKeys, 'button state');
  const variant = state.variant ?? 'standard';
  if (!Object.hasOwn(variants, variant)) throw new TypeError('Unknown button variant.');
  if (typeof state.label !== 'string') throw new TypeError('Button label must be a string.');
  for (const key of ['title', 'accessibleLabel'] as const) if (state[key] !== undefined && typeof state[key] !== 'string') throw new TypeError(`Button ${key} must be text.`);
  for (const key of ['disabled', 'pending', 'hidden', 'menuExpanded'] as const) if (state[key] !== undefined && typeof state[key] !== 'boolean') throw new TypeError(`Button ${key} must be boolean.`);
  if (state.icon !== undefined) assertIconName(state.icon);
  if (state.type !== undefined && !['button','submit','reset'].includes(state.type)) throw new TypeError('Unknown button type.');
  const fixedIcons: Partial<Record<ButtonVariant,IconName>> = {'context-icon': 'image','submit-icon': 'arrow','stop-icon': 'stop'};
  if (fixedIcons[variant] && state.icon !== fixedIcons[variant]) throw new TypeError('This action requires its semantic icon.');
  const count = 'count' in state ? state.count : undefined;
  if (variant === 'counter' ? typeof count !== 'string' : count !== undefined) throw new TypeError('Only counter actions require count text.');
  if ((variant === 'quiet-icon' || variant === 'counter' || variant === 'picker' || variant === 'suggestion' || variant === 'overlay-close' || navigationVariants.includes(variant)) && !state.icon) throw new TypeError('This action requires a library icon.');
  if (variant === 'overlay-close' && state.icon !== 'close') throw new TypeError('Overlay close actions require the close icon.');
  if (purpose === 'prompt' && (navigationVariants.includes(variant) || variant === 'counter' || variant === 'picker' || variant === 'suggestion' || variant === 'overlay-close' || variant === 'text-action' || variant === 'compact-choice' || fixedIcons[variant])) throw new TypeError('This action uses action presentation.');
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
  const {purpose: _purpose, onAction: _onAction, onError: _onError, ...initial} = options;
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
    if (state.type !== undefined) node.type = state.type;
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
      node.className = `pui-button pui-${intent} pui-normal${variant === 'quiet-icon' ? ' pui-icon-button' : variant === 'secondary' ? ' pui-secondary-button' : variant === 'caution' ? ' pui-secondary-button pui-always-allow-button' : variant === 'warning' ? ' pui-warning-button' : ''}`;
    } else node.className = variants[variant];
    if (icon !== state.icon) {
      icon = state.icon; glyph?.remove();
      glyph = icon ? iconElement(icon) : undefined;
      if (glyph) node.prepend(glyph);
    }
    const iconOnly = variant === 'quiet-icon' || variant === 'drawer-trigger' || variant === 'previous-match' || variant === 'overlay-close' || variant === 'context-icon' || variant === 'submit-icon' || variant === 'stop-icon';
    const nextCaption = iconOnly && purpose !== 'prompt' ? undefined : purpose === 'prompt' || variant === 'counter' || navigationVariants.includes(variant) ? spanCaption : textCaption;
    if (caption !== nextCaption) {caption?.remove(); caption = nextCaption;}
    if (caption) {
      if (caption instanceof HTMLElement) {caption.className = variant === 'counter' ? 'pui-artifacts-count' : iconOnly ? 'pui-sr-only' : '';if (variant === 'counter') caption.setAttribute('aria-hidden','true');else caption.removeAttribute('aria-hidden');}
      const value = variant === 'counter' && 'count' in state ? state.count : state.label;
      if (caption.textContent !== value) caption.textContent = value;
      if (caption.parentNode !== node) node.append(caption);
    }
    if (iconOnly || variant === 'counter' || variant === 'toolbar-action' || state.accessibleLabel !== undefined) node.setAttribute('aria-label', state.accessibleLabel ?? state.label);
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
