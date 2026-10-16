import type { UIBlock } from '../core.js';
import { setText } from '../dom.js';
import { adoptAction, adoptFeedback, type ActionController } from '../foundations.js';

export interface BranchHistoryNode {id: string; role: string; text: string; active: boolean}
export interface BranchHistoryState {nodes: readonly BranchHistoryNode[] | null; error?: string; loading?: boolean}

export function createBranchHistory(initial: BranchHistoryState, options: {onContinue?: (id: string) => void | Promise<void>} = {}): UIBlock<BranchHistoryState> {
  const element = document.createElement('div'); element.className = 'pui-branch-history';
  const description = document.createElement('p'); description.className = 'pui-modal-description';
  description.textContent = 'Continue from any saved message. Other branches remain available here; files and external actions are not undone.';
  const list = document.createElement('div'); list.className = 'pui-branch-list';
  const empty = document.createElement('p'); empty.textContent = 'No history yet.';
  const status = document.createElement('div');
  const error = document.createElement('p'); error.className = 'pui-form-error';
  const feedback = adoptFeedback(status, { presentation: 'inline' });
  const actionFeedback = adoptFeedback(error, { presentation: 'inline' });
  type Row = { element: HTMLElement; role: HTMLElement; text: HTMLElement; action: ActionController };
  const rows = new Map<string, Row>();
  let destroyed = false;
  const clear = (): void => { for (const row of rows.values()) row.action.destroy(); rows.clear(); list.replaceChildren(); };
  const update = (state: Readonly<BranchHistoryState>): void => {
    if (destroyed) return;
    if (state.loading || state.error) {
      clear();
      const message = state.loading ? 'Loading history…' : state.error!;
      feedback.update({ message, tone: state.loading ? 'info' : 'error' });
      actionFeedback.update({ message: '', tone: 'error' });
      element.replaceChildren(status);
      return;
    }
    feedback.update({ message: '', tone: 'info' });
    if (description.parentNode !== element) element.replaceChildren(description, list, error);
    const nodes = state.nodes ?? [];
    const keep = new Set(nodes.map(node => node.id));
    for (const [id, row] of rows) if (!keep.has(id)) { row.action.destroy(); row.element.remove(); rows.delete(id); }
    let cursor = list.firstElementChild;
    for (const node of nodes) {
      let row = rows.get(node.id);
      if (!row) {
        const article = document.createElement('article'); article.className = 'pui-branch-node';
        const heading = document.createElement('div'); heading.className = 'pui-connection-card-heading';
        const role = document.createElement('strong'), button = document.createElement('button'), text = document.createElement('p');
        button.type = 'button'; button.className = 'pui-secondary-button'; button.textContent = 'Continue here'; button.dataset.branch = node.id;
        heading.append(role, button); article.append(heading, text);
        const action = adoptAction(button, {
          onAction: options.onContinue ? () => { actionFeedback.update({ message: '', tone: 'error' }); return options.onContinue!(node.id); } : undefined,
          onError: message => actionFeedback.update({ message, tone: 'error' }),
        });
        row = { element: article, role, text, action }; rows.set(node.id, row);
      }
      row.element.classList.toggle('pui-current-branch', node.active);
      setText(row.role, `${node.role}${node.active ? ' · current branch' : ''}`);
      setText(row.text, node.text.slice(0, 360) || '(Image or empty reply)');
      if (row.element !== cursor) list.insertBefore(row.element, cursor);
      cursor = row.element.nextElementSibling;
    }
    if (!nodes.length) { if (empty.parentNode !== list) list.append(empty); } else empty.remove();
  };
  update(initial);
  return { element, update, destroy() { if (destroyed) return; destroyed = true; clear(); feedback.destroy(); actionFeedback.destroy(); element.remove(); } };
}
