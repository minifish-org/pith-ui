import {iconElement} from '../dom.js';
import {assertOptions, createOwnedPart, isPartAlive, replacePartChildren, type Part} from './ownership.js';
import {assertIconName, type IconName} from './text.js';
import type {ActionsPart} from './layout.js';

export interface ListRowPartState {title: string; description?: string; meta?: string; icon?: IconName; selected?: boolean; hidden?: boolean}
export interface ListRowPart extends Part {update(state: Readonly<ListRowPartState>): void}
const rows = new WeakSet<Part>();
const rowKeys = ['title', 'description', 'meta', 'icon', 'selected', 'hidden'];
function validateRow(state: Readonly<ListRowPartState>): void {
  assertOptions(state, rowKeys, 'list row state');
  if (typeof state.title !== 'string') throw new TypeError('A list row title must be text.');
  for (const key of ['description', 'meta'] as const) if (state[key] !== undefined && typeof state[key] !== 'string') throw new TypeError(`List row ${key} must be text.`);
  for (const key of ['selected', 'hidden'] as const) if (state[key] !== undefined && typeof state[key] !== 'boolean') throw new TypeError(`List row ${key} must be boolean.`);
  if (state.icon !== undefined) assertIconName(state.icon);
}
/** A small presentational row, with independently composed action buttons. */
export function createListRowPart(options: ListRowPartState & {actions?: ActionsPart}): ListRowPart {
  assertOptions(options, [...rowKeys, 'actions'], 'list row');
  const {actions, ...initial} = options; validateRow(initial);
  const node = document.createElement('div'); node.className = 'pui-list-row'; node.setAttribute('role', 'listitem');
  const glyph = document.createElement('span'); glyph.className = 'pui-list-row-icon';
  const body = document.createElement('div'); body.className = 'pui-list-row-body';
  const title = document.createElement('div'); title.className = 'pui-list-row-title';
  const description = document.createElement('div'); description.className = 'pui-muted';
  const meta = document.createElement('small'); meta.className = 'pui-muted';
  body.append(title, description);
  const staticParts = [createOwnedPart(glyph, {}), createOwnedPart(body, {}), createOwnedPart(meta, {})];
  let icon: IconName | undefined;
  let part: ListRowPart;
  const update = (state: Readonly<ListRowPartState>) => {
    validateRow(state); if (!isPartAlive(part)) return;
    if (title.textContent !== state.title) title.textContent = state.title;
    if (description.textContent !== (state.description ?? '')) description.textContent = state.description ?? '';
    description.hidden = !state.description;
    if (meta.textContent !== (state.meta ?? '')) meta.textContent = state.meta ?? '';
    meta.hidden = !state.meta;
    node.classList.toggle('pui-selected', !!state.selected); node.hidden = !!state.hidden;
    if (icon !== state.icon) {icon = state.icon; glyph.replaceChildren(...(icon ? [iconElement(icon)] : []));}
    glyph.hidden = !state.icon;
  };
  try {part = createOwnedPart<Omit<ListRowPart, keyof Part>>(node, {update}, {children: [...staticParts, ...(actions ? [actions] : [])]});}
  catch (error) {staticParts.forEach(item => item.destroy()); throw error;}
  update(initial); rows.add(part); return part;
}

export interface ListEntry {key: string; content: ListRowPart}
export interface ListPartState {label: string; hidden?: boolean}
export interface ListPart extends Part {update(state: Readonly<ListPartState>): void; replace(entries: readonly ListEntry[]): void}
function validateList(state: Readonly<ListPartState>): void {
  assertOptions(state, ['label', 'hidden'], 'list state');
  if (typeof state.label !== 'string') throw new TypeError('A list label must be text.');
  if (state.hidden !== undefined && typeof state.hidden !== 'boolean') throw new TypeError('List hidden must be boolean.');
}
function validateEntries(entries: readonly ListEntry[]): void {
  if (!Array.isArray(entries)) throw new TypeError('List entries must be an array.');
  const keys = new Set<string>(), contents = new Set<Part>();
  for (const entry of entries) {
    assertOptions(entry, ['key', 'content'], 'list entry');
    if (typeof entry.key !== 'string' || !entry.key || keys.has(entry.key)) throw new TypeError('List entry keys must be unique nonempty text.');
    if (!rows.has(entry.content) || !isPartAlive(entry.content)) throw new TypeError('List entries require live Pith UI list rows.');
    if (contents.has(entry.content)) throw new TypeError('A row may appear only once in a list.');
    keys.add(entry.key); contents.add(entry.content);
  }
}
/** Keyed direct row children. No list-item wrapper or public rendering callback. */
export function createListPart(options: ListPartState & {entries: readonly ListEntry[]}): ListPart {
  assertOptions(options, ['label', 'hidden', 'entries'], 'list');
  const initial = {label: options.label, hidden: options.hidden}; validateList(initial); validateEntries(options.entries);
  const node = document.createElement('div'); node.setAttribute('role', 'list');
  let part: ListPart;
  const update = (state: Readonly<ListPartState>) => {
    validateList(state); if (!isPartAlive(part)) return;
    node.setAttribute('aria-label', state.label); node.hidden = !!state.hidden;
  };
  part = createOwnedPart<Omit<ListPart, keyof Part>>(node, {update, replace(entries: readonly ListEntry[]) {
    validateEntries(entries); replacePartChildren(part, entries.map(entry => entry.content));
  }}, {children: options.entries.map(entry => entry.content)});
  update(initial); return part;
}
