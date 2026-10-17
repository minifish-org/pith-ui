import {element} from './dom.js';
import {checkOptions, controlEntry, controlNodes, ownControl} from './controls.js';
import type {Control} from './controls.js';

export interface TableColumn {
  readonly key: string;
  readonly label: string;
}
export interface TableRow {
  readonly key: string;
  readonly cells: readonly Control[];
}
export interface TableState {
  readonly rows: readonly TableRow[];
  readonly empty?: string;
}
export interface TableOptions extends TableState {
  readonly label: string;
  readonly columns: readonly TableColumn[];
}

/** A native table with fixed presentation and explicitly owned cell controls. */
export function createTable(options: TableOptions): Control<TableState> {
  checkOptions(options, ['label', 'columns', 'rows', 'empty']);
  if (!options.label.trim() || !options.columns.length)
    throw new Error('A table needs a label and at least one column.');
  const columnKeys = new Set<string>();
  const columns = options.columns.map(column => {
    checkOptions(column, ['key', 'label']);
    if (!column.key || columnKeys.has(column.key))
      throw new Error('Table column keys must be nonempty and unique.');
    columnKeys.add(column.key);
    return {key: column.key, label: column.label};
  });
  const children: Control[] = [];
  const node = element('div', 'pui-table'), table = element('table');
  table.setAttribute('aria-label', options.label);
  const heading = element('tr');
  for (const column of columns) {
    const cell = element('th');
    cell.scope = 'col';
    cell.textContent = column.label;
    heading.append(cell);
  }
  const body = element('tbody'), head = element('thead', undefined, heading);
  table.append(head, body);
  node.append(table);
  const emptyRow = element('tr'), emptyCell = element('td');
  emptyCell.colSpan = columns.length;
  emptyRow.append(emptyCell);
  let empty = options.empty ?? 'No items.';
  let current = new Map<string, HTMLTableRowElement>();
  let control: Control<TableState>;
  const update = (state: Readonly<TableState>) => {
    checkOptions(state, ['rows', 'empty']);
    const keys = new Set<string>(), seen = new Set<Control>(), previous = new Set(children);
    for (const row of state.rows) {
      checkOptions(row, ['key', 'cells']);
      if (!row.key || keys.has(row.key))
        throw new Error('Table row keys must be nonempty and unique.');
      if (row.cells.length !== columns.length)
        throw new Error('Each table row must match the column count.');
      keys.add(row.key);
      for (const cell of row.cells) {
        if (seen.has(cell))
          throw new Error('A table cell control cannot occur twice.');
        seen.add(cell);
        if (previous.has(cell)) controlEntry(cell);
        else controlNodes([cell]);
      }
    }
    if (state.empty !== undefined) empty = state.empty;
    emptyCell.textContent = empty;
    const focused = document.activeElement instanceof HTMLElement && node.contains(document.activeElement)
      ? document.activeElement : null;
    for (const child of children) if (!seen.has(child)) child.destroy();
    for (const [key, row] of current) if (!keys.has(key)) row.remove();
    const next = new Map<string, HTMLTableRowElement>();
    emptyRow.remove();
    let cursor = body.firstChild;
    for (const row of state.rows) {
      const retained = current.get(row.key);
      const line = retained ?? element('tr');
      if (!retained) for (const _column of columns) line.append(element('td'));
      row.cells.forEach((cell, index) => {
        const value = controlEntry(cell), target = line.cells[index];
        value.owner = control;
        if (target.firstChild !== value.node || target.childNodes.length !== 1)
          target.replaceChildren(value.node);
      });
      if (line !== cursor) body.insertBefore(line, cursor);
      cursor = line.nextSibling;
      next.set(row.key, line);
    }
    if (!state.rows.length) body.append(emptyRow);
    if (focused?.isConnected && document.activeElement !== focused)
      focused.focus({preventScroll: true});
    children.splice(0, children.length, ...seen);
    current = next;
  };
  control = ownControl({element: node, update, destroy() {current.clear();}}, children);
  update({rows: options.rows, empty: options.empty});
  return control;
}
