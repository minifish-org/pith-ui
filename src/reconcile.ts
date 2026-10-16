/** Reconcile owned keyed rows without moving unchanged nodes. Row rendering and
 * child ownership stay with the block; this helper owns ordering and focus only.
 */
export function reconcileKeyed<Value, Key, Row>(parent: HTMLElement, rows: Map<Key, Row>, values: readonly Value[], options: {
  key(value: Value): Key;
  element(row: Row): HTMLElement;
  create(value: Value): Row;
  update(row: Row, value: Value): void;
  destroy(row: Row): void;
}): void {
  const active = parent.ownerDocument.activeElement;
  const focused = active instanceof HTMLElement && parent.contains(active) ? active : null;
  const keep = new Set(values.map(options.key));
  for (const [key, row] of rows) if (!keep.has(key)) { options.destroy(row); options.element(row).remove(); rows.delete(key); }
  let cursor = parent.firstElementChild;
  for (const value of values) {
    const key = options.key(value);
    let row = rows.get(key);
    if (!row) { row = options.create(value); rows.set(key, row); }
    const previousNode = options.element(row), nextSibling = previousNode.nextElementSibling;
    options.update(row, value);
    const node = options.element(row);
    // A view may change its semantic root (for example article to paragraph).
    // The insertion cursor must follow that replacement, not a detached node.
    if (cursor === previousNode && node !== previousNode) cursor = node.parentElement === parent ? node : nextSibling;
    if (node !== cursor) parent.insertBefore(node, cursor);
    cursor = node.nextElementSibling;
  }
  if (focused?.isConnected && parent.contains(focused) && parent.ownerDocument.activeElement !== focused) focused.focus({ preventScroll: true });
}
