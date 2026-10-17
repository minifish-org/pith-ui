import {assertOptions,createOwnedPart,isPartAlive,type Part} from './ownership.js';

export interface DescriptionEntry {key: string;label: string;value: string}
export interface DescriptionListPart extends Part {update(entries: readonly DescriptionEntry[]): void}
function validate(entries: readonly DescriptionEntry[]): void {
  if (!Array.isArray(entries)) throw new TypeError('Description entries must be an array.');const keys = new Set<string>();
  for (const entry of entries) {assertOptions(entry,['key','label','value'],'description entry');if (typeof entry.key !== 'string' || typeof entry.label !== 'string' || typeof entry.value !== 'string' || keys.has(entry.key)) throw new TypeError('Description entries need unique text keys, labels and values.');keys.add(entry.key);}
}
/** Native keyed term/definition pairs, without a row wrapper. */
export function createDescriptionListPart(options: {entries: readonly DescriptionEntry[]}): DescriptionListPart {
  assertOptions(options,['entries'],'description list');validate(options.entries);
  const node = document.createElement('dl');node.className = 'pui-description-list';const rows = new Map<string,{term: HTMLElement;value: HTMLElement}>();
  let part: DescriptionListPart;
  const update = (entries: readonly DescriptionEntry[]) => {
    validate(entries);if (!isPartAlive(part)) return;const keys = new Set(entries.map(entry => entry.key));
    for (const [key,row] of rows) if (!keys.has(key)) {row.term.remove();row.value.remove();rows.delete(key);}
    let cursor = node.firstElementChild;
    for (const entry of entries) {
      let row = rows.get(entry.key);if (!row) {row = {term: document.createElement('dt'),value: document.createElement('dd')};rows.set(entry.key,row);}
      if (row.term.textContent !== entry.label) row.term.textContent = entry.label;if (row.value.textContent !== entry.value) row.value.textContent = entry.value;
      for (const child of [row.term,row.value]) {if (child !== cursor) node.insertBefore(child,cursor);cursor = child.nextElementSibling;}
    }
  };
  part = createOwnedPart<Omit<DescriptionListPart,keyof Part>>(node,{update},{dispose() {rows.clear();}});update(options.entries);return part;
}
