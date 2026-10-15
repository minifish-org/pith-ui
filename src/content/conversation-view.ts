import { escape, icon } from '../dom.js';
import type { UIBlock } from '../core.js';
import { renderMarkdown, type MarkdownOptions } from './markdown.js';
import { reconcileViews, clearViews, type View } from './views.js';

/** UI data only. Hosts decide copy/edit/branch eligibility and resolve images. */
export interface ConversationMessage {
  id: string;
  role: string;
  text: string;
  timestamp?: number;
  toolName?: string;
  toolCallId?: string;
  status?: string;
  images?: Array<{ index: number; mimeType?: string }>;
  command?: { text: string; cwd: string; exitCode?: number };
  actions?: { copy?: boolean | string; edit?: boolean; branch?: { key: string; label?: string } };
}
export interface ConversationViewState {
  id: string;
  messages: readonly ConversationMessage[];
  working: boolean;
  folds?: ReadonlyMap<string, boolean>;
}
export interface ConversationAction { action: 'copy' | 'edit' | 'branch'; messageId: string; branchKey?: string }
export interface ConversationViewOptions {
  container?: HTMLElement;
  markdown?: (conversationId: string) => MarkdownOptions;
  onAction?: (action: ConversationAction) => void;
  onCopyCode?: (text: string) => void;
}


export function createConversationView(options: ConversationViewOptions = {}): UIBlock<ConversationViewState> {
  const container = options.container || document.createElement('div');
  container.classList.add('pui-conversation-messages');
  let destroyed = false;
  const click = (event: Event) => {
    const target = (event.target as Element).closest<HTMLElement>('[data-message-action], [data-copy-code]');
    if (!target || !container.contains(target) || (target as HTMLButtonElement).disabled) return;
    if (target.hasAttribute('data-copy-code')) {
      const text = target.closest('.pui-code-block')?.querySelector('pre > code')?.textContent || '';
      options.onCopyCode?.(text);
      return;
    }
    options.onAction?.({ action: target.dataset.messageAction as ConversationAction['action'], messageId: target.dataset.messageActionId!, branchKey: target.dataset.branchKey });
  };
  container.addEventListener('click', click);
  let activeId = '';
  function update(id: string, messages: readonly ConversationMessage[], working: boolean, folds: ReadonlyMap<string, boolean>): void {
    if (destroyed) return;
    if (id !== activeId) { clearViews(container); activeId = id; }
    const views: View[] = [];
    const messageView = (message: ConversationMessage, key = message.id, foldKey = ''): View => ({
      key, signature: JSON.stringify(message), html: () => renderMessage(id, message, folds.get(foldKey), foldKey, (text, conversationId) => renderMarkdown(text, options.markdown?.(conversationId))),
    });
    let groupIndex = 0;
    for (let index = 0; index < messages.length;) {
      if (messages[index].role !== 'tool') { views.push(messageView(messages[index++])); continue; }
      const start = index;
      while (index < messages.length && messages[index].role === 'tool') index++;
      const tools = messages.slice(start, index), key = `group-${groupIndex++}`;
      const running = tools.filter((tool) => tool.status === 'running').length;
      const failed = tools.filter((tool) => tool.status === 'error').length;
      const label = toolGroupLabel(tools);
      views.push({ key, signature: JSON.stringify([label, tools.length, failed, running]),
        html: () => `<details class="pui-tool-group" data-tool-fold="${key}" ${folds.get(key) ? 'open' : ''}><summary>${icon('terminal')}<span class="pui-tool-group-label">${label}</span><span class="pui-tool-group-count">${tools.length} ${tools.length === 1 ? 'call' : 'calls'}</span>${failed ? `<span class="pui-tool-group-failed">${failed} failed</span>` : ''}${running ? `<span class="pui-tool-group-running">${running} running</span>` : ''}${icon('down')}</summary><div class="pui-tool-group-content" data-view-children></div></details>`,
        children: tools.map((tool) => { const toolKey = `${key}-tool-${tool.toolCallId || tool.id}`; return messageView(tool, toolKey, toolKey); }),
      });
    }
    if (working) views.push({ key: 'working', signature: 'working', html: () => '<div class="pui-agent-working" role="status"><span class="pui-working-dots" aria-hidden="true"><i></i><i></i><i></i></span><span>Working…</span></div>' });
    reconcileViews(container, views);
  }
  return {
    element: container,
    update(state): void {
      const folds = state.folds || new Map(Array.from(container.querySelectorAll<HTMLDetailsElement>('[data-tool-fold]'), (element) => [element.dataset.toolFold!, element.open] as const));
      update(state.id, state.messages, state.working, folds);
    },
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      container.removeEventListener('click', click);
      clearViews(container);
    },
  };
}

function toolGroupLabel(tools: readonly ConversationMessage[]): string {
  if (tools.length === 1) return ({ list_files: 'Listed files', read_file: 'Read a file', run_command: 'Ran a command', write_file: 'Wrote a file', edit_file: 'Edited a file', tool_search: 'Searched tools', codemode: 'Ran code' } as Record<string, string>)[tools[0].toolName || ''] || 'Used a tool';
  const hasCommands = tools.some((tool) => tool.toolName === 'run_command');
  const exploredFiles = tools.every((tool) => ['list_files', 'read_file', 'grep', 'find', 'ls', 'run_command'].includes(tool.toolName || ''));
  if (tools.every((tool) => tool.toolName === 'run_command')) return 'Ran commands';
  if (exploredFiles) return hasCommands ? 'Ran commands and explored files' : 'Explored files';
  return 'Used tools';
}

function renderMessage(conversationId: string, message: ConversationMessage, expanded = false, foldKey = '', markdown: (value: string, conversationId: string) => string = (text) => renderMarkdown(text)): string {
  const text = message.text ?? '';
  const images = (message.images || []).map((image) => `<img class="pui-history-image" data-image-key="${escape(`${conversationId}/${message.id}/${image.index}`)}" data-message-id="${escape(message.id)}" data-image-index="${image.index}" alt="Image ${image.index + 1}" role="button" tabindex="0" title="Click to enlarge" loading="lazy" />`).join('');
  const gallery = images ? `<div class="pui-message-images">${images}</div>` : '';
  const copyLabel = typeof message.actions?.copy === 'string' ? message.actions.copy : 'Copy message';
  const copy = message.actions?.copy ? `<button type="button" class="pui-quiet-icon pui-message-action" data-message-action="copy" data-message-action-id="${escape(message.id)}" title="${escape(copyLabel)}" aria-label="${escape(copyLabel)}">${icon('copy')}</button>` : '';
  const edit = message.actions?.edit ? `<button type="button" class="pui-quiet-icon pui-message-action" data-message-action="edit" data-message-action-id="${escape(message.id)}" title="Edit message" aria-label="Edit message">${icon('edit')}</button>` : '';
  const branchAction = message.actions?.branch;
  const branch = branchAction ? `<button type="button" class="pui-quiet-icon pui-message-action" data-message-action="branch" data-message-action-id="${escape(message.id)}" data-branch-key="${escape(branchAction.key)}" title="${escape(branchAction.label || 'Branch from this message')}" aria-label="${escape(branchAction.label || 'Branch from this message')}">${icon('branch')}</button>` : '';
  const actions = copy || edit || branch ? `<div class="pui-message-actions">${copy}${edit}${branch}</div>` : '';
  const date = new Date(message.timestamp || NaN);
  const time = Number.isFinite(date.getTime()) ? `<time class="pui-message-time" datetime="${date.toISOString()}" title="${escape(date.toLocaleString())}">${escape(date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))}</time>` : '';
  const footer = time || actions ? `<div class="pui-message-footer">${time}${actions}</div>` : '';
  if (message.role === 'tool') {
    const command = message.command;
    const details = command ? `<div class="pui-command-details"><span class="pui-tool-field-label">Command</span><pre class="pui-command-text">${escape(command.text)}</pre><div class="pui-command-directory"><span class="pui-tool-field-label">Directory</span><code>${escape(command.cwd)}</code></div></div>` : '';
    const status = command ? ({ running: 'Running', done: 'Completed', error: 'Failed' } as Record<string, string>)[message.status || ''] || message.status || 'Result' : message.status || 'Result';
    const exit = command?.exitCode !== undefined ? ` · Exit ${command.exitCode}` : '';
    const output = command ? `<div class="pui-command-output"><span class="pui-tool-field-label">Output</span><pre>${escape(text)}</pre></div>` : `<pre>${escape(text)}</pre>`;
    return `<details class="pui-tool-message" data-reading-id="${escape(message.id)}" data-tool-fold="${escape(foldKey)}" ${expanded ? 'open' : ''}><summary>${icon('terminal')}<span>${command ? 'Command' : escape(message.toolName || 'Tool result')}</span><span class="pui-tool-status${message.status === 'error' ? ' pui-tool-status-error' : ''}">${escape(status + exit)}</span>${icon('down')}</summary>${details}${output}${gallery}</details>`;
  }
  if (message.role === 'user') return `<article class="pui-message pui-user-message" data-reading-id="${escape(message.id)}" aria-label="Your message"><div class="pui-message-content">${gallery}${text ? `<div class="pui-user-text">${escape(text)}</div>` : ''}${footer}</div></article>`;
  if (message.role === 'system') return `<div class="pui-system-message" data-reading-id="${escape(message.id)}">${escape(text)}</div>`;
  return `<article class="pui-message pui-assistant-message" data-reading-id="${escape(message.id)}" aria-label="Agent response"><div class="pui-message-content"><div class="pui-markdown">${markdown(text, conversationId)}</div>${message.status === 'error' ? '<span class="pui-message-error-label">Response interrupted</span>' : ''}${footer}</div></article>`;
}
