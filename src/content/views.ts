import {reconcileKeyed} from '../reconcile.js';

export type View = { key: string; signature: string; html: () => string; children?: View[] };
type Entry = { element: HTMLElement; signature: string };
let version = 0;
const entries = new WeakMap<HTMLElement, Map<string, Entry>>();

// Reuse unchanged nodes: selection, focus, decoded images, feedback and code
// scrolling belong to the reader, and must survive another message's updates.
export function reconcileViews(parent: HTMLElement, views: View[]): void {
  const previous = entries.get(parent) || new Map<string, Entry>();
  const render = (view: View): HTMLElement => {
      const template = document.createElement('template');
      template.innerHTML = view.html();
      const element = template.content.firstElementChild as HTMLElement;
      element.dataset.renderVersion = String(++version);
      return element;
  };
  reconcileKeyed(parent, previous, views, {
    key: view => view.key, element: entry => entry.element,
    create: view => ({element:render(view), signature:view.signature}),
    update(entry, view) {
      if (entry.signature !== view.signature) {
        const next = render(view);
        if (entry.element.tagName === next.tagName) patchElement(entry.element, next);
        else {entry.element.replaceWith(next); entry.element = next;}
        entry.signature = view.signature;
      }
      if (view.children) reconcileViews(entry.element.querySelector<HTMLElement>('[data-view-children]')!, view.children);
    },
    destroy() {},
  });
  entries.set(parent, previous);
}

export function clearViews(parent: HTMLElement): void { parent.replaceChildren(); entries.delete(parent); }

/** Private patching of library-produced, sanitized markup. This is not a public
 * HTML renderer: product factories retain their own templates and state. */
export function patchChildren(parent: HTMLElement, source: ParentNode): void {
  const focused = parent.ownerDocument.activeElement;
  patchNodes(parent, source);
  if (focused instanceof HTMLElement && focused.isConnected && parent.contains(focused) && parent.ownerDocument.activeElement !== focused) focused.focus({preventScroll:true});
}

function key(node: Node): string | undefined {
  if (!(node instanceof Element)) return;
  for (const attribute of ['data-image-key', 'data-message-action', 'data-welcome-action', 'data-prompt', 'data-view-children', 'data-copy-code', 'id']) {
    if (node.hasAttribute(attribute)) return `${node.tagName}:${attribute}:${node.getAttribute(attribute)}`;
  }
}
function matches(current: Node, next: Node): boolean {
  if (current.nodeType !== next.nodeType) return false;
  if (current instanceof Element && next instanceof Element) return current.tagName === next.tagName && key(current) === key(next);
  return true;
}
function patchNodes(parent: Element, source: ParentNode): void {
  let cursor: ChildNode | null = parent.firstChild;
  for (const next of [...source.childNodes]) {
    let current = cursor;
    if (!current || !matches(current, next)) current = key(next) ? [...parent.childNodes].find(node => matches(node, next)) ?? null : null;
    if (!current) {parent.insertBefore(next, cursor); continue;}
    if (current !== cursor) parent.insertBefore(current, cursor);
    if (current instanceof HTMLElement && next instanceof HTMLElement) patchElement(current, next);
    else if (current instanceof SVGElement && next instanceof SVGElement) {patchAttributes(current, next); patchNodes(current, next);}
    else if (current instanceof Text && next instanceof Text && current.data !== next.data) {
      // Replacing only the changed span retains Range offsets in an unchanged
      // streamed prefix, unlike assigning textContent or replacing the Text.
      let prefix = 0, suffix = 0;
      while (prefix < current.length && prefix < next.length && current.data[prefix] === next.data[prefix]) prefix++;
      while (suffix < current.length - prefix && suffix < next.length - prefix && current.data[current.length - suffix - 1] === next.data[next.length - suffix - 1]) suffix++;
      current.replaceData(prefix, current.length - prefix - suffix, next.data.slice(prefix, next.length - suffix));
    }
    cursor = current.nextSibling;
  }
  while (cursor) {const next = cursor.nextSibling; cursor.remove(); cursor = next;}
}
function patchAttributes(current: Element, next: Element): void {
  for (const attribute of [...current.attributes]) {
    if (current instanceof HTMLDetailsElement && attribute.name === 'open') continue;
    if (!next.hasAttribute(attribute.name)) current.removeAttribute(attribute.name);
  }
  for (const attribute of [...next.attributes]) {
    if (current instanceof HTMLDetailsElement && attribute.name === 'open') continue;
    if (current.getAttribute(attribute.name) !== attribute.value) current.setAttribute(attribute.name, attribute.value);
  }
}
function patchElement(current: HTMLElement, next: HTMLElement): void {
  if ((current instanceof HTMLImageElement && current.dataset.imageKey && current.dataset.imageKey === next.dataset.imageKey) || (current instanceof HTMLButtonElement && current.dataset.copyPending === 'true')) return;
  const scrollTop = current.scrollTop, scrollLeft = current.scrollLeft;
  patchAttributes(current, next);
  if (!current.hasAttribute('data-view-children')) patchChildren(current, next);
  if (current.scrollTop !== scrollTop) current.scrollTop = scrollTop;
  if (current.scrollLeft !== scrollLeft) current.scrollLeft = scrollLeft;
}
