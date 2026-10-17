import {findRanges} from './conversation-reader.js';

export interface ReadingSearchState {readonly open: boolean;readonly query: string;readonly current: number;readonly total: number;readonly label: string}
interface ReadingPosition {top: number;follow: boolean;anchor?: string;offset?: number}
interface Match {key: string;parts: HTMLElement[]}
interface ReadingEngineOptions {
  isKeyboardBlocked(): boolean;
  onSearchState?(state: ReadingSearchState): void;
  onLatestChange?(visible: boolean): void;
  onSearchIntent?(intent: 'open'|'close'): void;
}

/** Private retained reading algorithm. It owns no search toolbar or buttons. */
export function createReadingEngine(scroll: HTMLElement,messages: HTMLElement,options: ReadingEngineOptions) {
  let destroyed = false,activeID = '',matches: Match[] = [],selected = -1,frame = 0,restoring = false,searchSignature = '';
  let open = false,query = '',latestVisible: boolean | undefined,pendingPosition: ReadingPosition | undefined;
  let contentHeight = scroll.scrollHeight,viewportHeight = scroll.clientHeight,viewportWidth = scroll.clientWidth;
  let cachedMatches = new WeakMap<HTMLElement,{query: string;version: string;matches: Match[]}>();
  const positions = new Map<string,ReadingPosition>(),removals: (() => void)[] = [];
  const listen = (target: EventTarget,type: string,listener: EventListener,settings?: AddEventListenerOptions) => {target.addEventListener(type,listener,settings);removals.push(() => target.removeEventListener(type,listener,settings));};
  const nearBottom = () => scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight < 80;
  const layoutChanged = () => contentHeight !== scroll.scrollHeight || viewportHeight !== scroll.clientHeight || viewportWidth !== scroll.clientWidth;
  function recordLayout(): void {contentHeight = scroll.scrollHeight;viewportHeight = scroll.clientHeight;viewportWidth = scroll.clientWidth;}
  function capture(follow = nearBottom()): ReadingPosition {
    const top = scroll.getBoundingClientRect().top,anchor = [...messages.querySelectorAll<HTMLElement>('[data-reading-id]')].find(node => node.getBoundingClientRect().bottom > top);
    return {top: scroll.scrollTop,follow,anchor: anchor?.dataset.readingId,offset: anchor ? anchor.getBoundingClientRect().top - top : undefined};
  }
  function updateLatest(): void {const visible = !!messages.childElementCount && !nearBottom();if (visible !== latestVisible) {latestVisible = visible;options.onLatestChange?.(visible);}}
  function remember(): void {if (activeID && !restoring && !pendingPosition) positions.set(activeID,capture());recordLayout();updateLatest();}
  function restore(position: ReadingPosition): void {
    restoring = true;
    if (position.follow) scroll.scrollTop = scroll.scrollHeight;
    else {
      const anchor = [...messages.querySelectorAll<HTMLElement>('[data-reading-id]')].find(node => node.dataset.readingId === position.anchor);
      scroll.scrollTop = anchor && position.offset !== undefined ? scroll.scrollTop + anchor.getBoundingClientRect().top - scroll.getBoundingClientRect().top - position.offset : position.top;
    }
    restoring = false;if (activeID) positions.set(activeID,capture(position.follow));recordLayout();updateLatest();
  }
  function followLatest(): void {if (!destroyed) {const position = {top: 0,follow: true};if (pendingPosition) pendingPosition = position;restore(position);}}
  function clearMarks(root: HTMLElement = messages): void {
    for (const mark of root.querySelectorAll('mark[data-find-match]')) mark.replaceWith(document.createTextNode(mark.textContent ?? ''));
    root.normalize();if (root === messages) cachedMatches = new WeakMap();else cachedMatches.delete(root);
  }
  function updateSelection(): void {
    matches.forEach((match,index) => match.parts.forEach(part => part.classList.toggle('pui-find-current',index === selected)));
    options.onSearchState?.(Object.freeze({open,query,current: selected,total: matches.length,label: query ? matches.length ? `${selected + 1} / ${matches.length}` : 'No matches' : ''}));
  }
  function markMatches(): void {
    const previousKey = matches[selected]?.key;matches = [];
    if (open && query) {
      for (const root of messages.querySelectorAll<HTMLElement>('[data-reading-id]')) {
        // The old renderer supplied renderVersion. Independently composed parts
        // retain text identity without that renderer, so unchanged literal text
        // and still-connected marks provide the equivalent private cache key.
        const version = root.dataset.renderVersion ?? root.textContent ?? '',cached = cachedMatches.get(root);
        if (cached?.query === query && cached.version === version && cached.matches.every(match => match.parts.every(part => root.contains(part)))) {matches.push(...cached.matches);continue;}
        clearMarks(root);
        const walker = document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode: node => node.parentElement?.closest('button, summary, script, style, [data-find-ignore]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT});
        const nodes: {node: Text;start: number;end: number}[] = [];let text = '',block: Element | null = null;
        while (walker.nextNode()) {
          const node = walker.currentNode as Text,parent = node.parentElement?.closest('p, pre, li, h1, h2, h3, h4, h5, h6, .pui-user-text, .pui-system-message') ?? root;
          if (text && parent !== block) text += '\n';block = parent;const start = text.length;text += node.data;nodes.push({node,start,end: text.length});
        }
        const ranges = findRanges(text,query),base = matches.length;matches.push(...ranges.map(range => ({key: `${root.dataset.readingId}:${range.start}`,parts: []})));
        for (const {node,start,end} of nodes) {
          const intersections = ranges.map((range,index) => ({start: Math.max(start,range.start) - start,end: Math.min(end,range.end) - start,index: base + index})).filter(range => range.end > range.start);
          if (!intersections.length) continue;
          const fragment = document.createDocumentFragment();let offset = 0;
          for (const range of intersections) {
            fragment.append(document.createTextNode(node.data.slice(offset,range.start)));const mark = document.createElement('mark');mark.dataset.findMatch = String(range.index);mark.textContent = node.data.slice(range.start,range.end);matches[range.index]!.parts.push(mark);fragment.append(mark);offset = range.end;
          }
          fragment.append(document.createTextNode(node.data.slice(offset)));node.replaceWith(fragment);
        }
        cachedMatches.set(root,{query,version,matches: matches.slice(base)});
      }
    } else clearMarks();
    const kept = matches.findIndex(match => match.key === previousKey);selected = matches.length ? kept >= 0 ? kept : Math.max(0,Math.min(selected,matches.length - 1)) : -1;updateSelection();
  }
  function reveal(): void {
    const target = matches[selected]?.parts[0];if (!target) return;
    for (let parent = target.parentElement;parent && parent !== messages;parent = parent.parentElement) if (parent instanceof HTMLDetailsElement) parent.open = true;
    scroll.scrollTop += target.getBoundingClientRect().top - scroll.getBoundingClientRect().top - scroll.clientHeight / 3;remember();
  }
  function moveMatch(direction: 'next'|'previous'): void {if (!destroyed && matches.length) {selected = (selected + (direction === 'next' ? 1 : -1) + matches.length) % matches.length;updateSelection();reveal();}}
  function openSearch(value?: string): void {if (!destroyed) {if (value !== undefined) query = value;open = true;markMatches();options.onSearchIntent?.('open');}}
  function closeSearch(): void {if (!destroyed) {open = false;clearMarks();matches = [];selected = -1;updateSelection();scroll.focus({preventScroll: true});updateLatest();options.onSearchIntent?.('close');}}
  listen(document,'keydown',event => {
    const key = event as KeyboardEvent;if (key.isComposing || options.isKeyboardBlocked()) return;
    if ((key.metaKey || key.ctrlKey) && !key.altKey && key.key.toLowerCase() === 'f') {key.preventDefault();openSearch();}
    else if (key.key === 'Escape' && open) {key.preventDefault();closeSearch();}
  });
  listen(scroll,'scroll',() => {
    if (restoring || pendingPosition) return;const saved = positions.get(activeID);
    if (saved && layoutChanged()) restore(saved);else if (!saved || Math.abs(scroll.scrollTop - saved.top) > 1) remember();else updateLatest();
  },{passive: true});
  const observer = new ResizeObserver(() => {if (!destroyed) {if (!pendingPosition && activeID) {const saved = positions.get(activeID);if (saved) restore(saved);}updateLatest();}});observer.observe(messages);observer.observe(scroll);
  return {
    beforeUpdate(id: string): void {
      if (destroyed) return;if (activeID && !positions.has(activeID)) positions.set(activeID,capture());
      pendingPosition = id === activeID ? pendingPosition ?? positions.get(activeID) ?? capture() : positions.get(id) ?? {top: 0,follow: true};
      if (id !== activeID) {selected = -1;matches = [];searchSignature = '';}activeID = id;cancelAnimationFrame(frame);
    },
    afterUpdate(): void {
      if (destroyed) return;const signature = messages.innerHTML;if (open && signature !== searchSignature) {markMatches();searchSignature = messages.innerHTML;}
      frame = requestAnimationFrame(() => {if (!destroyed) {const position = pendingPosition;pendingPosition = undefined;if (position) restore(position);else updateLatest();}});
    },
    prune(ids: readonly string[]): void {if (!destroyed) {const keep = new Set(ids);for (const id of positions.keys()) if (!keep.has(id)) positions.delete(id);}},
    search(value: string): void {if (!destroyed) {query = value;selected = -1;matches = [];markMatches();reveal();}},
    followLatest,openSearch,closeSearch,moveMatch,
    destroy(): void {if (!destroyed) {destroyed = true;cancelAnimationFrame(frame);observer.disconnect();removals.splice(0).forEach(remove => remove());clearMarks();positions.clear();matches = [];pendingPosition = undefined;}},
  };
}
