import {assertOptions, createOwnedPart, isPartAlive, onPartAppearance, readPartAppearance, type Part} from './ownership.js';

export type BrandMarkOptions =
  | {symbol: 'pith'; alt: string; src?: never; darkSrc?: never}
  | {src: string; darkSrc?: string; alt: string; symbol?: never};
export interface BrandMarkPart extends Part {}
const marks = new WeakSet<Part>();
/** A fixed named symbol or image resource. Its geometry belongs to the library. */
export function createBrandMarkPart(options: BrandMarkOptions): BrandMarkPart {
  assertOptions(options, ['symbol', 'src', 'darkSrc', 'alt'], 'brand mark');
  if (typeof options.alt !== 'string') throw new TypeError('Brand alternative text must be text.');
  if (options.symbol !== undefined) {
    if (options.symbol !== 'pith' || options.src !== undefined || options.darkSrc !== undefined) throw new TypeError('Unknown brand mark resource.');
    const node = document.createElement('span'); node.className = 'pui-logo-mark';
    if (options.alt) {node.setAttribute('role', 'img'); node.setAttribute('aria-label', options.alt);} else node.setAttribute('aria-hidden', 'true');
    for (let index = 0; index < 4; index++) node.append(document.createElement('i'));
    const part = createOwnedPart(node, {}); marks.add(part); return part;
  }
  if (typeof options.src !== 'string' || options.darkSrc !== undefined && typeof options.darkSrc !== 'string') throw new TypeError('Brand image sources must be text.');
  const node = document.createElement('img'); node.className = 'pui-app-brand-image'; node.alt = options.alt;
  const media = matchMedia('(prefers-color-scheme: dark)');
  let stopAppearance = () => {};
  let part: BrandMarkPart;
  const sync = () => {
    if (!isPartAlive(part)) return;
    const appearance = readPartAppearance(part), source = (appearance === 'dark' || appearance === 'system' && media.matches) && options.darkSrc ? options.darkSrc : options.src;
    if (node.getAttribute('src') !== source) node.setAttribute('src', source);
  };
  part = createOwnedPart(node, {}, {dispose() {stopAppearance(); media.removeEventListener('change', sync);}});
  stopAppearance = onPartAppearance(part, sync); media.addEventListener('change', sync); marks.add(part); return part;
}

export interface BrandPartState {name: string; qualifier?: string}
export interface BrandPart extends Part {update(state: Readonly<BrandPartState>): void}
function validateBrand(state: Readonly<BrandPartState>): void {
  if (typeof state.name !== 'string' || state.qualifier !== undefined && typeof state.qualifier !== 'string') throw new TypeError('Brand wording must be text.');
}
/** Wordmark and optional mark, using the established native display-contents structure. */
export function createBrandPart(options: BrandPartState & {mark?: BrandMarkPart}): BrandPart {
  assertOptions(options, ['name', 'qualifier', 'mark'], 'brand'); validateBrand(options);
  if (options.mark !== undefined && (!marks.has(options.mark) || !isPartAlive(options.mark))) throw new TypeError('A brand requires a live Pith UI mark.');
  const node = document.createElement('div'); node.className = 'pui-brand';
  const contents = document.createElement('span'); contents.className = 'pui-app-brand';
  const wordmark = document.createElement('span'), caption = document.createTextNode(options.name); wordmark.append(caption);
  let suffix: HTMLSpanElement | undefined;
  const wordmarkPart = createOwnedPart(wordmark, {});
  let contentsPart: Part;
  try {contentsPart = createOwnedPart(contents, {}, {children: [...options.mark ? [options.mark] : [], wordmarkPart]});}
  catch (error) {wordmarkPart.destroy(); throw error;}
  let part: BrandPart;
  const update = (state: Readonly<BrandPartState>) => {
    assertOptions(state, ['name', 'qualifier'], 'brand state'); validateBrand(state); if (!isPartAlive(part)) return;
    if (caption.data !== state.name) caption.data = state.name;
    if (state.qualifier) {
      if (!suffix) {suffix = document.createElement('span'); suffix.className = 'pui-brand-light'; wordmark.append(suffix);}
      if (suffix.textContent !== ' ' + state.qualifier) suffix.textContent = ' ' + state.qualifier;
    } else {suffix?.remove(); suffix = undefined;}
  };
  part = createOwnedPart<Omit<BrandPart, keyof Part>>(node, {update}, {children: [contentsPart]}); update({name: options.name, qualifier: options.qualifier}); return part;
}
