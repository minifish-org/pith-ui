import { icon, setText } from '../dom.js';
import type { UIBlock } from '../core.js';
import { adoptAction, adoptFeedback, adoptProductParts } from '../foundations.js';
import type { ActionController } from '../foundations.js';
import { reconcileKeyed } from '../reconcile.js';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 6 });
const numbers = new Intl.NumberFormat();
export interface CostSummaryDisplay { unavailable?: boolean; requestCount: number; unknownRequests: number; runRequests: number; runUnknownRequests: number; total: number; runTotal: number }
export function formatCost(cost: CostSummaryDisplay | undefined, latestTask = false): string {
  if (cost?.unavailable) return 'Unavailable';
  const count = latestTask ? cost?.runRequests : cost?.requestCount;
  const unknown = (latestTask ? cost?.runUnknownRequests : cost?.unknownRequests) || 0;
  if (!count) return 'Not recorded';
  if (count === unknown) return 'Unknown';
  return `~${currency.format((latestTask ? cost?.runTotal : cost?.total) || 0)}${unknown ? ' (partial)' : ''}`;
}
export interface CostRequestDisplay {
  id: string; purpose: string; status: string; provider: string; providerName?: string; model: string; modelName?: string;
  time: string; source: string; price: unknown; known: boolean;
  usage: { input: number; output: number; cacheRead: number; cacheWrite: number; reasoning?: number; cost: { total: number } };
}
export interface CostLedgerState { unknownRequests: number; requests: readonly CostRequestDisplay[] | null }
export function createCostLedger(options: { container?: HTMLElement } = {}) {
  const element = options.container || document.createElement('div');
  type Row = { element: HTMLTableRowElement; purpose: HTMLElement; identity: HTMLElement; time: HTMLElement; details: HTMLDetailsElement; source: HTMLElement; price: HTMLElement; reasoning: HTMLElement; cells: HTMLTableCellElement[] };
  const rows = new Map<string, Row>();
  let table: HTMLTableSectionElement | undefined;
  let note: HTMLElement | undefined;
  let empty: HTMLTableRowElement | undefined;
  let destroyed = false;
  function clear(): void { rows.clear(); table = undefined; note = undefined; empty = undefined; element.replaceChildren(); }
  function ensure(): void {
    if (table) return;
    element.innerHTML = '<p class="pui-cost-note"></p><div class="pui-cost-table"><table><thead><tr><th>Request</th><th>Input</th><th>Output</th><th>Cache read / write</th><th>Estimate</th></tr></thead><tbody></tbody></table></div>';
    table = element.querySelector('tbody')!; note = element.querySelector<HTMLElement>('.pui-cost-note')!;
    empty = document.createElement('tr'); const cell = document.createElement('td'); cell.colSpan = 5; cell.textContent = 'No recorded requests yet.'; empty.append(cell);
  }
  function makeRow(id: string): Row {
    const row = document.createElement('tr');
    row.innerHTML = '<td><strong data-purpose></strong><br><span data-identity></span><br><small data-time></small><details><summary>Price source and rates (USD / million tokens)</summary><p data-source></p><pre data-price></pre><p data-reasoning hidden></p></details></td><td></td><td></td><td></td><td></td>';
    const details = row.querySelector('details')!; details.dataset.costId = id;
    return { element: row, purpose: row.querySelector('[data-purpose]')!, identity: row.querySelector('[data-identity]')!, time: row.querySelector('[data-time]')!, details, source: row.querySelector('[data-source]')!, price: row.querySelector('[data-price]')!, reasoning: row.querySelector('[data-reasoning]')!, cells: [...row.querySelectorAll('td')] };
  }
  return {
    element,
    clear(): void { if (!destroyed) clear(); },
    loading(): void { if (!destroyed && !element.childElementCount) element.textContent = 'Loading request breakdown…'; },
    setError(message: string): void { if (!destroyed) { clear(); element.textContent = message; } },
    update(report: Readonly<CostLedgerState>): void {
      if (destroyed) return;
      ensure();
      setText(note!, `USD estimates for recorded requests, not a provider bill. Prices are saved per request; retries and context summaries are included when usage is reported. ${report.unknownRequests ? `${report.unknownRequests} request(s) have unknown prices or usage and are excluded. ` : ''}Older requests made before recording began are not reconstructed.`);
      const requests = report.requests || [];
      empty!.remove();
      const n = (value: number) => numbers.format(value || 0);
      reconcileKeyed(table!, rows, requests, {
        key: request => request.id, element: row => row.element, create: request => makeRow(request.id),
        update(row, request) {
          setText(row.purpose, `${request.purpose} · ${request.status}`);
          setText(row.identity, `${request.providerName || request.provider} / ${request.modelName || request.model}`);
          setText(row.time, request.time); setText(row.source, request.source); setText(row.price, JSON.stringify(request.price, null, 2));
          row.reasoning.hidden = request.usage.reasoning == null;
          setText(row.reasoning, request.usage.reasoning == null ? '' : `Reasoning tokens: ${n(request.usage.reasoning)} (included in output)`);
          setText(row.cells[1]!, n(request.usage.input)); setText(row.cells[2]!, n(request.usage.output));
          setText(row.cells[3]!, `${n(request.usage.cacheRead)} / ${n(request.usage.cacheWrite)}`);
          setText(row.cells[4]!, request.known ? currency.format(request.usage.cost.total) : 'Unknown');
        },
        destroy() {},
      });
      if (!requests.length) table!.append(empty!);
    },
    destroy(): void { if (!destroyed) clear(); destroyed = true; },
  };
}

export interface UpdatePanelState { version: string; enabled: boolean; phase: string; availableVersion: string; progress: number; message: string }
export function createUpdatePanel(options: { container?: HTMLElement; productName?: string; onCheck?: () => void; onInstall?: () => void } = {}) {
  const element = options.container || document.createElement('section');
  if (!element.querySelector('[data-update-version]')) element.innerHTML = '<p data-update-version></p><p data-update-message role="status"></p><div class="pui-feature-toolbar"><button type="button" class="pui-secondary-button" data-update-check>Check for updates</button><button type="button" class="pui-secondary-button" data-update-install hidden>Update and restart</button></div><progress max="100" hidden></progress>';
  const version = element.querySelector<HTMLElement>('[data-update-version]')!;
  const message = element.querySelector<HTMLElement>('[data-update-message]')!;
  const check = element.querySelector<HTMLButtonElement>('[data-update-check]')!;
  const install = element.querySelector<HTMLButtonElement>('[data-update-install]')!;
  const progress = element.querySelector<HTMLProgressElement>('progress')!;
  const parts = adoptProductParts(element);
  let state: Readonly<UpdatePanelState> | undefined;
  let pending = false, destroyed = false;
  let error = '';
  let retryCheck = false;
  const checkAction = () => options.onCheck?.(), installAction = () => options.onInstall?.();
  check.addEventListener('click', checkAction); install.addEventListener('click', installAction);
  function render(): void {
    if (destroyed) return;
    if (!state) { parts.action(check).update({pending}); parts.action(install).update({pending}); parts.feedback(message).update({message:error,tone:'info'}); return; }
    version.textContent = `${options.productName || 'Application'} ${state.version}`;
    parts.feedback(message).update({message:error || state.message,tone:'info'});
    const busy = ['checking', 'installing', 'restarting'].includes(state.phase);
    parts.action(check).update({disabled:!state.enabled || (busy && !retryCheck),pending});
    install.hidden = !state.availableVersion; parts.action(install).update({disabled:!state.enabled || busy,pending,label:'Update and restart'});
    progress.hidden = state.phase !== 'installing'; progress.value = state.progress;
  }
  return {
    element,
    update(value: Readonly<UpdatePanelState>): void { state = value; error = ''; retryCheck = false; render(); },
    setPending(value: boolean): void { pending = value; render(); },
    setError(value: string, options: { allowCheckRetry?: boolean } = {}): void { if (!destroyed) { error = value; retryCheck = !!options.allowCheckRetry; render(); } },
    destroy(): void { if (destroyed) return; destroyed = true; parts.destroy(); check.removeEventListener('click', checkAction); install.removeEventListener('click', installAction); },
  };
}

export interface CompletionNoticeDisplay { id: string; runID: string; title: string; workspace: string }
export function historyStatusMarkup(status: 'approval' | 'running' | 'unread' | 'idle'): string {
  if (status === 'approval') return '<span class="pui-history-status pui-needs-approval" role="img" aria-label="Waiting for approval" title="Waiting for approval"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 4h.01"/></svg></span>';
  if (status === 'running') return '<span class="pui-history-status" role="img" aria-label="Running" title="Running"><i class="pui-history-spinner" aria-hidden="true"></i></span>';
  if (status === 'unread') return '<span class="pui-history-status" role="img" aria-label="Completed, unread" title="Completed, unread"><i class="pui-history-unread" aria-hidden="true"></i></span>';
  return '<span class="pui-history-status" aria-hidden="true"></span>';
}
export function createCompletionNotices(options: { container?: HTMLElement; onOpen?: (id: string) => void; onDismiss?: (runID: string) => void } = {}): UIBlock<readonly CompletionNoticeDisplay[]> {
  const element = options.container || document.createElement('div');
  const parts = adoptProductParts(element);
  const entries = new Map<string, { element: HTMLElement; text: HTMLElement; open: HTMLButtonElement; dismiss: HTMLButtonElement }>();
  let destroyed = false;
  const click = (event: Event) => {
    const target = (event.target as Element).closest<HTMLElement>('[data-conversation], [data-dismiss-completion]');
    if (!target || !element.contains(target)) return;
    if (target.dataset.conversation) options.onOpen?.(target.dataset.conversation);
    else if (target.dataset.dismissCompletion) options.onDismiss?.(target.dataset.dismissCompletion);
  };
  if (options.onOpen || options.onDismiss) element.addEventListener('click', click);
  return {
    element,
    update(notices): void {
      if (destroyed) return;
      reconcileKeyed(element, entries, notices, {
        key: notice => notice.runID, element: entry => entry.element,
        create() {
          const article = document.createElement('article'); article.className = 'pui-completion-notice';
          article.innerHTML = `<span class="pui-completion-check" aria-hidden="true">${icon('check')}</span><div class="pui-completion-content"><strong>Task completed</strong><p></p><button class="pui-text-button" type="button" data-conversation>Open conversation</button></div><button class="pui-quiet-icon pui-completion-dismiss" type="button" data-dismiss-completion aria-label="Dismiss completion notification">${icon('close')}</button>`;
          return { element: article, text: article.querySelector('p')!, open: article.querySelector<HTMLButtonElement>('[data-conversation]')!, dismiss: article.querySelector<HTMLButtonElement>('[data-dismiss-completion]')! };
        },
        update(entry, notice) {
          setText(entry.text, `${notice.workspace} · ${notice.title}`);
          parts.action(entry.open).update({label:'Open conversation'});
          parts.action(entry.dismiss).update({label:'Dismiss completion notification'});
          if (entry.open.dataset.conversation !== notice.id) entry.open.dataset.conversation = notice.id;
          if (entry.dismiss.dataset.dismissCompletion !== notice.runID) entry.dismiss.dataset.dismissCompletion = notice.runID;
        },
        destroy() {},
      });
      parts.update();
    },
    destroy(): void { if (destroyed) return; destroyed = true; parts.destroy(); entries.clear(); element.removeEventListener?.('click', click); element.replaceChildren(); },
  };
}

export function createCopyFeedback(options: { status: HTMLElement; isDisabled: (button: HTMLButtonElement) => boolean; onError: (error: unknown) => void }) {
  let destroyed = false;
  const notice = adoptFeedback(options.status, {presentation:'inline',autoHide:false});
  type CopyEntry = { controller: ActionController; original: ChildNode[]; label: string | null; title: string; displayed: boolean; timer?: ReturnType<typeof setTimeout> };
  const entries = new Map<HTMLButtonElement, CopyEntry>();
  const release = (button: HTMLButtonElement, entry: CopyEntry): void => {
    if (entry.timer) clearTimeout(entry.timer);
    if (entry.displayed && button.isConnected) {
      button.replaceChildren(...entry.original);
      if (entry.label === null) button.removeAttribute('aria-label'); else button.setAttribute('aria-label', entry.label);
      button.title = entry.title;
    }
    delete button.dataset.copyPending;
    entry.controller.update({disabled:options.isDisabled(button)});
    entry.controller.destroy();
    entries.delete(button);
  };
  return {
    async copy(button: HTMLButtonElement, action: () => Promise<void>, announcement: string): Promise<void> {
      if (destroyed || button.dataset.copyPending === 'true') return;
      const entry: CopyEntry = { controller:adoptAction(button), original:[...button.childNodes], label:button.getAttribute('aria-label'), title:button.title, displayed:false };
      entries.set(button, entry);
      notice.update({message:'',tone:'info'}); button.dataset.copyPending = 'true'; entry.controller.update({disabled:options.isDisabled(button)});
      try {
        await action();
        if (destroyed) return;
        notice.update({message:announcement,tone:'info'});
        if (!button.isConnected) { release(button, entry); return; }
        button.innerHTML = button.classList.contains('pui-message-action') ? icon('check') : 'Copied';
        button.setAttribute('aria-label', announcement); button.title = announcement;
        entry.displayed = true;
        entry.timer = setTimeout(() => { if (!destroyed && entries.get(button) === entry) release(button, entry); }, 1500);
      } catch (error) {
        if (destroyed) return;
        release(button, entry); options.onError(error);
      }
    },
    destroy(): void { if (destroyed) return; destroyed = true; for (const [button, entry] of entries) release(button, entry); notice.destroy(); },
  };
}
