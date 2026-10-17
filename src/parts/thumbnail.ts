import type {LayoutPart} from './layout.js';
import {assertOptions,createOwnedPart,isPartAlive,onPartDestroy,replacePartChildren,type Part} from './ownership.js';

export interface ThumbnailStripState {label?: string;hidden?: boolean}
export interface ThumbnailStripOptions extends ThumbnailStripState {children: readonly Part[];onDispose?(): void}
export interface ThumbnailStripPart extends LayoutPart {update(state: Readonly<ThumbnailStripState>): void}
export interface ThumbnailPart extends LayoutPart {}
export interface CaptionPart extends Part {update(state: Readonly<{text: string}>): void}

function validateStrip(state: Readonly<ThumbnailStripState>): void {
  assertOptions(state,['label','hidden'],'thumbnail strip state');
  if (state.label !== undefined && typeof state.label !== 'string') throw new TypeError('Thumbnail strip label must be text.');
  if (state.hidden !== undefined && typeof state.hidden !== 'boolean') throw new TypeError('Thumbnail strip hidden must be boolean.');
}

/** One native horizontal strip. The library fixes thumbnail sizing and overflow. */
export function createThumbnailStripPart(options: ThumbnailStripOptions): ThumbnailStripPart {
  assertOptions(options,['label','hidden','children','onDispose'],'thumbnail strip');
  const initial = {label: options.label,hidden: options.hidden};validateStrip(initial);
  if (options.onDispose !== undefined && typeof options.onDispose !== 'function') throw new TypeError('Thumbnail strip onDispose must be a callback.');
  const node = document.createElement('div');node.className = 'pui-draft-images';let part: ThumbnailStripPart;
  const update = (state: Readonly<ThumbnailStripState>) => {
    validateStrip(state);if (!isPartAlive(part)) return;node.hidden = !!state.hidden;
    if (state.label !== undefined) node.setAttribute('aria-label',state.label);else node.removeAttribute('aria-label');
  };
  part = createOwnedPart<Omit<ThumbnailStripPart,keyof Part>>(node,{update,replace(children: readonly Part[]) {if (isPartAlive(part)) replacePartChildren(part,children);}},{children: options.children});
  if (options.onDispose) onPartDestroy(part,options.onDispose);update(initial);return part;
}

/** A native thumbnail figure. Images, captions and actions are caller-composed. */
export function createThumbnailPart(options: {children: readonly Part[]}): ThumbnailPart {
  assertOptions(options,['children'],'thumbnail');
  const node = document.createElement('figure');node.className = 'pui-draft-image';let part: ThumbnailPart;
  part = createOwnedPart<Omit<ThumbnailPart,keyof Part>>(node,{replace(children: readonly Part[]) {if (isPartAlive(part)) replacePartChildren(part,children);}},{children: options.children});return part;
}

/** Literal native caption text, without a span or markup port. */
export function createCaptionPart(options: {text: string}): CaptionPart {
  const validate = (state: Readonly<{text: string}>) => {assertOptions(state,['text'],'caption');if (typeof state.text !== 'string') throw new TypeError('Caption must be text.');};
  validate(options);const node = document.createElement('figcaption');let part: CaptionPart;
  const update = (state: Readonly<{text: string}>) => {validate(state);if (isPartAlive(part) && node.textContent !== state.text) node.textContent = state.text;};
  part = createOwnedPart<Omit<CaptionPart,keyof Part>>(node,{update});update(options);return part;
}
