import {createReadingEngine,type ReadingSearchState} from '../content/reading-engine.js';
import {isReadingColumnPart,type ReadingColumnPart} from './reading.js';
import {assertOptions,assertUnownedParts,createOwnedPart,isPartAlive,nodeOf,type Part} from './ownership.js';

export type {ReadingSearchState};
export interface ReadingViewportOptions {
  reading: ReadingColumnPart;children: readonly Part[];
  onSearchState?(state: ReadingSearchState): void;
  onLatestChange?(visible: boolean): void;
  onSearchIntent?(intent: 'open'|'close'): void;
}
export interface ReadingViewportPart extends Part {
  beforeUpdate(key: string): void;afterUpdate(): void;prune(keys: readonly string[]): void;
  followLatest(): void;openSearch(query?: string): void;closeSearch(): void;
  search(query: string): void;moveMatch(direction: 'next'|'previous'): void;focus(): void;
}
/** One native reading section. Search controls and all content are caller parts. */
export function createReadingViewportPart(options: ReadingViewportOptions): ReadingViewportPart {
  assertOptions(options,['reading','children','onSearchState','onLatestChange','onSearchIntent'],'reading viewport');
  if (!isReadingColumnPart(options.reading) || !Array.isArray(options.children) || !options.children.includes(options.reading)) throw new TypeError('A reading viewport requires its genuine column among direct child parts.');
  for (const key of ['onSearchState','onLatestChange','onSearchIntent'] as const) if (options[key] !== undefined && typeof options[key] !== 'function') throw new TypeError(`Reading ${key} must be a callback.`);
  assertUnownedParts(options.children);
  const node = document.createElement('section');node.className = 'pui-chat-scroll';node.setAttribute('aria-label','Conversation');node.tabIndex = -1;
  let engine: ReturnType<typeof createReadingEngine> | undefined;
  const text = (value: unknown): void => {if (typeof value !== 'string') throw new TypeError('Reading keys and queries must be text.');};
  const part: ReadingViewportPart = createOwnedPart<Omit<ReadingViewportPart,keyof Part>>(node,{
    beforeUpdate(key) {text(key);engine?.beforeUpdate(key);},afterUpdate() {engine?.afterUpdate();},
    prune(keys) {if (!Array.isArray(keys) || keys.some(key => typeof key !== 'string')) throw new TypeError('Reading keys must be an array of text.');engine?.prune(keys);},
    followLatest() {engine?.followLatest();},openSearch(query) {if (query !== undefined) text(query);engine?.openSearch(query);},closeSearch() {engine?.closeSearch();},
    search(query) {text(query);engine?.search(query);},moveMatch(direction) {if (!['next','previous'].includes(direction)) throw new TypeError('Reading match direction must be next or previous.');engine?.moveMatch(direction);},
    focus() {if (isPartAlive(part)) node.focus({preventScroll: true});},
  },{children: options.children,dispose() {engine?.destroy();}});
  engine = createReadingEngine(node,nodeOf(options.reading) as HTMLElement,{onSearchState: options.onSearchState,onLatestChange: options.onLatestChange,onSearchIntent: options.onSearchIntent,
    isKeyboardBlocked: () => !isPartAlive(part) || !node.isConnected || !!(node.closest('.pui-app') ?? node.closest('.pui'))?.querySelector('dialog[open]')});
  return part;
}
