/** Scope DOM IDs and their references without relying on document-level lookup. */
export function scopeIds(root: HTMLElement, prefix: string): void {
  for (const control of root.querySelectorAll<HTMLElement>('input:not([type="checkbox"]):not([type="file"]), textarea, select')) control.classList.add('pui-control');
  if (!prefix) return;
  const attributes = ['id', 'for', 'aria-labelledby', 'aria-describedby', 'aria-controls', 'data-close'];
  for (const node of [root, ...root.querySelectorAll<HTMLElement>('*')]) for (const attribute of attributes) {
    const value = node.getAttribute(attribute);
    if (value) node.setAttribute(attribute, value.split(' ').map(id => prefix + id).join(' '));
  }
}
export function localField<T extends HTMLElement = HTMLElement>(root: HTMLElement, id: string): T {
  const found = [...root.querySelectorAll<HTMLElement>('[id]')].find(node => node.getAttribute('id') === id);
  if (!found) throw new Error(`Unknown component field: ${id}`);
  return found as T;
}
