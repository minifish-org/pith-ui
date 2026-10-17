import {createButtonPart} from './button.js';
import {createTextPart} from './text.js';
import {assertOptions, createOwnedPart, isPartAlive, type Part} from './ownership.js';

export interface PaginationPartState {page: number; total: number; note?: string}
export interface PaginationPartOptions extends PaginationPartState {onPage(page: number): void}
export interface PaginationPart extends Part {update(state: Readonly<PaginationPartState>): void}
function validate(state: Readonly<PaginationPartState>): void {
  assertOptions(state, ['page', 'total', 'note'], 'pagination state');
  if (!Number.isSafeInteger(state.total) || state.total < 1 || !Number.isSafeInteger(state.page) || state.page < 0 || state.page >= state.total) throw new TypeError('Pagination requires an existing page in a positive total.');
  if (state.note !== undefined && typeof state.note !== 'string') throw new TypeError('Pagination note must be text.');
}
/** A controlled Previous/status/Next row, with no content or page-size policy. */
export function createPaginationPart(options: PaginationPartOptions): PaginationPart {
  assertOptions(options, ['page', 'total', 'note', 'onPage'], 'pagination');
  const {onPage, ...initial} = options;validate(initial);
  if (typeof onPage !== 'function') throw new TypeError('Pagination requires a page callback.');
  let state = initial;
  const previous = createButtonPart({label: 'Previous',variant: 'secondary',onAction() {if (state.page > 0) onPage(state.page - 1);}});
  const status = createTextPart({text: '',announce: 'polite'});
  const next = createButtonPart({label: 'Next',variant: 'secondary',onAction() {if (state.page < state.total - 1) onPage(state.page + 1);}});
  const node = document.createElement('div');node.className = 'pui-feature-toolbar pui-preview-pagination';
  const part = createOwnedPart(node, {update(value: Readonly<PaginationPartState>) {
    validate(value);if (!isPartAlive(part)) return;state = {...value};
    previous.update({label: 'Previous',variant: 'secondary',disabled: value.page === 0});next.update({label: 'Next',variant: 'secondary',disabled: value.page === value.total - 1});
    status.update({text: `${value.page + 1} / ${value.total}${value.note ? ` · ${value.note}` : ''}`,announce: 'polite'});
  }}, {children: [previous,status,next]});part.update(initial);return part;
}
