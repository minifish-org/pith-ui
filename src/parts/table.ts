import {assertOptions,assertUnownedParts,createOwnedPart,isPartAlive,replacePartChildren,type Part} from './ownership.js';

declare const tableRowBrand: unique symbol;
export interface TableRowPart extends Part {readonly [tableRowBrand]: true;update(state: {cells: readonly (string|undefined)[]}): void}
export interface TablePart extends Part {replaceRows(rows: readonly TableRowPart[]): void}
const rows = new WeakMap<Part,number>();

/** Native cells contain either literal text or opaque child parts. */
export function createTableRowPart(options: {cells: readonly (string|readonly Part[])[]}): TableRowPart {
  assertOptions(options,['cells'],'table row');
  if (!Array.isArray(options.cells) || !options.cells.length || options.cells.some(cell => typeof cell !== 'string' && !Array.isArray(cell))) throw new TypeError('Table cells must be text or arrays of Pith UI parts.');
  assertUnownedParts(options.cells.flatMap(cell => typeof cell === 'string' ? [] : cell));
  const node = document.createElement('tr'),literal = options.cells.map(cell => typeof cell === 'string'),cells = options.cells.map(cell => {
    const element = document.createElement('td');if (typeof cell === 'string') element.textContent = cell;
    return {element,part: createOwnedPart(element,{}, {children: typeof cell === 'string' ? [] : cell})};
  });
  let part: TableRowPart;
  const update = (state: {cells: readonly (string|undefined)[]}) => {
    assertOptions(state,['cells'],'table row state');
    if (!Array.isArray(state.cells) || state.cells.length !== cells.length || state.cells.some((value,index) => value !== undefined && (typeof value !== 'string' || !literal[index]))) throw new TypeError('Only existing literal cells can receive text updates.');
    if (!isPartAlive(part)) return;
    state.cells.forEach((value,index) => {if (value !== undefined && cells[index]!.element.textContent !== value) cells[index]!.element.textContent = value;});
  };
  part = createOwnedPart<Omit<TableRowPart,keyof Part|typeof tableRowBrand>>(node,{update},{children: cells.map(cell => cell.part)}) as TableRowPart;
  rows.set(part,cells.length);return part;
}

/** A fixed native table with text headers and genuine, explicitly composed rows. */
export function createTablePart(options: {headers: readonly string[];rows: readonly TableRowPart[];emptyLabel: string}): TablePart {
  assertOptions(options,['headers','rows','emptyLabel'],'table');
  if (!Array.isArray(options.headers) || !options.headers.length || options.headers.some(value => typeof value !== 'string') || typeof options.emptyLabel !== 'string') throw new TypeError('Table headings and empty label must be text.');
  const validate = (value: readonly TableRowPart[]) => {
    if (!Array.isArray(value) || value.some(row => !isPartAlive(row) || rows.get(row) !== options.headers.length)) throw new TypeError('Table rows must be genuine live rows with matching cells.');
  };
  validate(options.rows);assertUnownedParts(options.rows);
  const node = document.createElement('div');node.className = 'pui-cost-table';
  const table = document.createElement('table'),head = document.createElement('thead'),heading = document.createElement('tr'),body = document.createElement('tbody');
  for (const label of options.headers) {const cell = document.createElement('th');cell.textContent = label;heading.append(cell);}head.append(heading);
  const bodyPart = createOwnedPart(body,{}),tablePart = createOwnedPart(table,{}, {children: [bodyPart]});table.prepend(head);
  let empty: Part|undefined,part: TablePart;
  const replaceRows = (value: readonly TableRowPart[]) => {
    validate(value);if (!isPartAlive(part)) return;
    if (value.length) {replacePartChildren(bodyPart,value);empty = undefined;}
    else {
      if (!empty || !isPartAlive(empty)) {const row = document.createElement('tr'),cell = document.createElement('td');cell.colSpan = options.headers.length;cell.textContent = options.emptyLabel;row.append(cell);empty = createOwnedPart(row,{});}
      replacePartChildren(bodyPart,[empty]);
    }
  };
  part = createOwnedPart<Omit<TablePart,keyof Part>>(node,{replaceRows},{children: [tablePart]});replaceRows(options.rows);return part;
}
