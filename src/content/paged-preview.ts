import { renderDiff, renderMarkdown } from './markdown.js';
import type { UIBlock } from '../core.js';
import { adoptProductParts } from '../foundations.js';

// A rendering window, not a file acceptance cap. Large Markdown is shown as
// original text so page boundaries cannot change the meaning of fenced code.
export const previewPageBytes = 256 * 1024;

export function previewPageRanges(bytes: Uint8Array, window = previewPageBytes): Array<[number, number]> {
  if (window < 4) throw new RangeError('A preview window must fit a UTF-8 character');
  const ranges: Array<[number, number]> = [];
  for (let start = 0; start < bytes.length;) {
    let end = Math.min(start + window, bytes.length);
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    if (end < bytes.length) {
      // Prefer complete lines without turning a long line into tiny pages.
      for (let i = end - 1; i >= start + window / 2 - 1; i--) {
        if (bytes[i] === 10) { end = i + 1; break; }
      }
    }
    ranges.push([start, end]);
    start = end;
  }
  return ranges.length ? ranges : [[0, 0]];
}

export type PreviewKind = 'text' | 'markdown' | 'diff';
export interface PagedPreviewState { text: string; kind: PreviewKind }
export interface PagedPreviewOptions extends PagedPreviewState { container?: HTMLElement; onCopyCode?: (text: string, button: HTMLButtonElement) => void | Promise<void> }

export function createPagedPreview(options: PagedPreviewOptions): UIBlock<PagedPreviewState> {
  const element = options.container || document.createElement('div');
  let current = { text: options.text, kind: options.kind };
  let disposed = false;
  let dispose = renderPreview(element, current.text, current.kind);
  const click = (event: Event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-copy-code]');
    if (button && !button.disabled && element.contains(button) && options.onCopyCode) {event.stopPropagation(); void options.onCopyCode(button.closest('.pui-code-block')?.querySelector('code')?.textContent || '', button);}
  };
  if (options.onCopyCode) element.addEventListener('click', click);
  return {
    element,
    update(state): void {
      if (disposed || (state.text === current.text && state.kind === current.kind)) return;
      dispose();
      current = { ...state };
      dispose = renderPreview(element, state.text, state.kind);
    },
    destroy(): void {
      if (disposed) return;
      disposed = true;
      dispose();
      element.removeEventListener('click', click);
      element.replaceChildren();
    },
  };
}

const mounted = new WeakMap<HTMLElement, UIBlock<PagedPreviewState>>();
export function mountPagedPreview(container: HTMLElement, text: string, kind: PreviewKind): void {
  mounted.get(container)?.destroy();
  mounted.set(container, createPagedPreview({ container, text, kind }));
}

function renderPreview(container: HTMLElement, text: string, kind: PreviewKind): () => void {
  const bytes = new TextEncoder().encode(text);
  const ranges = previewPageRanges(bytes);
  const content = document.createElement(kind === 'markdown' && ranges.length === 1 ? 'div' : 'pre');
  content.className = kind === 'diff' ? 'pui-approval-diff' : content.tagName === 'DIV' ? 'pui-markdown' : 'pui-file-preview-text';
  if (kind === 'diff') content.setAttribute('aria-label', 'Proposed file changes');
  const toolbar = document.createElement('div');
  toolbar.className = 'pui-feature-toolbar pui-preview-pagination';
  const previous = document.createElement('button');
  const next = document.createElement('button');
  const status = document.createElement('span');
  status.setAttribute('aria-live', 'polite');
  for (const button of [previous, next]) { button.type = 'button'; button.className = 'pui-secondary-button'; }
  previous.textContent = 'Previous'; next.textContent = 'Next';
  toolbar.append(previous, status, next);
  const parts = adoptProductParts(container);
  let page = 0;
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const render = () => {
    const [start, end] = ranges[page];
    const value = decoder.decode(bytes.subarray(start, end));
    if (kind === 'markdown' && ranges.length === 1) content.innerHTML = renderMarkdown(value);
    else if (kind === 'diff') content.innerHTML = renderDiff(value);
    else content.textContent = value;
    parts.action(previous).update({ disabled: page === 0 }); parts.action(next).update({ disabled: page === ranges.length - 1 });
    status.textContent = `${page + 1} / ${ranges.length}${kind === 'markdown' && ranges.length > 1 ? ' · Plain text preview' : ''}`;
    content.scrollTop = 0;
    parts.update();
  };
  previous.onclick = () => { page--; render(); };
  next.onclick = () => { page++; render(); };
  container.replaceChildren(...(ranges.length > 1 ? [toolbar, content] : [content]));
  render();
  return () => { parts.destroy(); previous.onclick = null; next.onclick = null; };
}
