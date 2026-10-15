import type { UIBlock } from '../core.js';
import { escape } from '../dom.js';
export interface BranchHistoryNode {id: string; role: string; text: string; active: boolean}
export interface BranchHistoryState {nodes: readonly BranchHistoryNode[] | null; error?: string; loading?: boolean}
export function createBranchHistory(state: BranchHistoryState, options: {onContinue?: (id: string) => void | Promise<void>} = {}): UIBlock<BranchHistoryState> {
 const element = document.createElement('div'); element.className = 'pui-branch-history'; const abort = new AbortController(); let destroyed = false;
 const update = (state: Readonly<BranchHistoryState>) => {if (destroyed) return; if (state.loading) {element.textContent = 'Loading history…'; return;} if (state.error) {element.textContent = state.error; return;} element.innerHTML = `<p class="pui-modal-description">Continue from any saved message. Other branches remain available here; files and external actions are not undone.</p><div class="pui-branch-list">${(state.nodes || []).map((node) => `<article class="pui-branch-node ${node.active ? 'pui-current-branch' : ''}"><div class="pui-connection-card-heading"><strong>${escape(node.role)}${node.active ? ' · current branch' : ''}</strong><button class="pui-secondary-button" data-branch="${escape(node.id)}">Continue here</button></div><p>${escape(node.text.slice(0, 360) || '(Image or empty reply)')}</p></article>`).join('') || '<p>No history yet.</p>'}</div>`;};
 element.addEventListener('click', (event) => {const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-branch]'); if (target && options.onContinue) void options.onContinue(target.dataset.branch!);}, {signal: abort.signal});
 update(state); return {element, update, destroy() {if (destroyed) return; destroyed = true; abort.abort(); element.remove();}};
}
