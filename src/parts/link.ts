import type {ActionResult} from '../core.js';
import {createOperation} from '../operation.js';
import {assertOptions,createOwnedPart,isPartAlive,type Part} from './ownership.js';

export interface LinkPartState {label: string;href?: string;hidden?: boolean;disabled?: boolean}
export interface LinkPartOptions extends LinkPartState {
  presentation?: 'inline' | 'paragraph';
  onOpen?(url: string): void | ActionResult | Promise<void | ActionResult>;
  onError?(message: string): void;
}
export interface LinkPart extends Part {update(state: Readonly<LinkPartState>): void}
function validate(state: Readonly<LinkPartState>): void {
  assertOptions(state,['label','href','hidden','disabled'],'link state');
  if (typeof state.label !== 'string' || state.href !== undefined && typeof state.href !== 'string') throw new TypeError('Link label and destination must be text.');
  for (const key of ['hidden','disabled'] as const) if (state[key] !== undefined && typeof state[key] !== 'boolean') throw new TypeError(`Link ${key} must be boolean.`);
}
function destination(value: string | undefined): string {
  try {const url = new URL(value ?? '');return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';}
  catch {return '';}
}
/** One external HTTP link, with fixed browser security attributes and a data callback. */
export function createLinkPart(options: LinkPartOptions): LinkPart {
  assertOptions(options,['label','href','hidden','disabled','presentation','onOpen','onError'],'link');
  if (options.presentation !== undefined && !['inline','paragraph'].includes(options.presentation)) throw new TypeError('Unsupported link presentation.');
  for (const key of ['onOpen','onError'] as const) if (options[key] !== undefined && typeof options[key] !== 'function') throw new TypeError(`Link ${key} must be a callback.`);
  const initial = {label: options.label,href: options.href,hidden: options.hidden,disabled: options.disabled};validate(initial);
  const anchor = document.createElement('a');anchor.target = '_blank';anchor.rel = 'noopener noreferrer';
  const node = options.presentation === 'paragraph' ? document.createElement('p') : anchor;if (node !== anchor) node.append(anchor);
  let state: Readonly<LinkPartState> = initial,href = '',part: LinkPart;
  const operation = createOperation({unavailable: () => !isPartAlive(part) || node.hidden || !!state.disabled || !href,onError: options.onError});
  const click = (event: MouseEvent) => {
    if (node.hidden || state.disabled || !href || operation.pending) {event.preventDefault();return;}
    if (!options.onOpen) return;
    event.preventDefault();event.stopPropagation();const url = href;
    operation.run(() => options.onOpen!(url),result => {if (result && !result.ok) options.onError?.(result.error);});
  };
  anchor.addEventListener('click',click);
  const update = (next: Readonly<LinkPartState>) => {
    validate(next);if (!isPartAlive(part)) return;
    state = next;href = destination(next.href);anchor.textContent = next.label;node.hidden = !!next.hidden || !href;
    if (href && !next.disabled) anchor.href = href;else anchor.removeAttribute('href');
    if (next.disabled) anchor.setAttribute('aria-disabled','true');else anchor.removeAttribute('aria-disabled');
  };
  part = createOwnedPart<Omit<LinkPart,keyof Part>>(node,{update},{dispose() {operation.destroy();anchor.removeEventListener('click',click);}});
  update(initial);return part;
}
