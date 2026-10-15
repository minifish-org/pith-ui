import { Generation, type UIBlock, type ActionResult } from './core.js';
import { icon } from './dom.js';

export interface ComposerViewState { placeholder?: string; disabled?: boolean; readOnly?: boolean; action?: 'send' | 'queue' | 'stop'; actionDisabled?: boolean; }
export interface ComposerViewOptions { prefix?: string; onSubmit?: (text: string) => void | ActionResult | Promise<void | ActionResult>; onStop?: () => void | ActionResult | Promise<void | ActionResult>; onInput?: (text: string) => void; }
let sequence = 0;
function identify(root: HTMLElement, prefix: string): void {
  if (!prefix) return;
  const attributes = ['id', 'for', 'aria-labelledby', 'aria-describedby', 'aria-controls', 'data-close'];
  for (const node of [root, ...root.querySelectorAll<HTMLElement>('*')]) for (const attribute of attributes) {
    const value = node.getAttribute(attribute); if (value) node.setAttribute(attribute, value.split(' ').map(part => prefix + part).join(' '));
  }
}
export function createComposerView(options: ComposerViewOptions = {}) {
  const holder = document.createElement('div'); holder.innerHTML = `<form id="composer-form" class="pui-composer">
        <div id="draft-images" class="pui-draft-images" aria-label="Image attachments" hidden></div>
        <input id="image-picker" type="file" accept="image/png,image/jpeg,image/gif,image/webp" multiple hidden />
        <textarea id="composer-input" rows="1" placeholder="Ask Pith to help with your work…" aria-label="Message Pith"></textarea>
        <div class="pui-composer-toolbar">
          <div class="pui-composer-context">
            <button id="attach-images" type="button" class="pui-quiet-icon pui-attach-images" data-action="attach-images" aria-label="Attach images" title="Attach images">${icon('image')}</button>
            <label class="pui-permission-control" id="permission-control">${icon('shield')}<span class="pui-sr-only">Conversation permissions</span><select id="permission-mode" aria-describedby="permission-description"><option value="ask">Ask before changes</option><option value="workspace-write">Allow workspace changes</option><option value="full-access">Full access</option></select>${icon('down')}</label>
          </div>
          <div class="pui-composer-actions"><button id="composer-model" type="button" class="pui-composer-model" data-action="model" data-idle-action data-global-idle aria-label="Choose model">Choose model</button><label class="pui-composer-thinking"><span class="pui-sr-only">Thinking effort</span><select id="composer-thinking" aria-label="Thinking effort"></select></label><button id="send-button" class="pui-send-button" type="submit" aria-label="Send message">${icon('arrow')}</button></div>
        </div>
      </form>`;
  const element = holder.firstElementChild as HTMLFormElement;
  const input = element.querySelector<HTMLTextAreaElement>('textarea')!;
  const action = element.querySelector<HTMLButtonElement>('[type="submit"]')!;
  identify(element, options.prefix ?? 'pui-composer-' + ++sequence + '-');
  const generation = new Generation();
  let pending = false, last: ComposerViewState = {}, lastAction = 'send';
  const error = document.createElement('div'); error.className = 'pui-form-error'; error.setAttribute('role','alert'); error.hidden = true; element.insertBefore(error, element.firstChild);
  const resize = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 180) + 'px'; };
  const update = (state: ComposerViewState) => {
    last = state;
    if (state.placeholder !== undefined) input.placeholder = state.placeholder;
    input.disabled = !!state.disabled; input.readOnly = !!state.readOnly;
    if (state.action && state.action !== lastAction) { lastAction = state.action; action.type = state.action === 'stop' ? 'button' : 'submit'; action.innerHTML = icon(state.action === 'stop' ? 'stop' : 'arrow'); action.classList.toggle('pui-is-stop', state.action === 'stop'); action.setAttribute('aria-label', state.action === 'stop' ? 'Stop agent' : state.action === 'queue' ? 'Queue message' : 'Send message'); }
    action.disabled = !!(state.actionDisabled || state.disabled || pending);
  };
  const onInput = () => { resize(); options.onInput?.(input.value); };
  const run = async (callback: (() => void | ActionResult | Promise<void | ActionResult>) | undefined) => {
    if (!callback || pending || action.disabled || input.disabled || input.readOnly) return;
    const seq = generation.next(); pending = true; error.hidden = true; error.textContent = ''; update(last);
    try {
      const result = await callback();
      if (generation.current(seq) && result && !result.ok) { error.textContent = result.error; error.hidden = false; }
    } catch (reason) {
      if (generation.current(seq)) { error.textContent = reason instanceof Error ? reason.message : String(reason); error.hidden = false; }
    } finally { if (generation.current(seq)) { pending = false; update(last); } }
  };
  const submit = (event: SubmitEvent) => { if (options.onSubmit) { event.preventDefault(); const text = input.value; void run(() => options.onSubmit!(text)); } };
  const stop = () => { if (action.type === 'button') void run(options.onStop); };
  const keydown = (event: KeyboardEvent) => {
    if (options.onSubmit && event.key === 'Enter' && !event.shiftKey && !event.isComposing && action.type === 'submit') { event.preventDefault(); element.requestSubmit(); }
  };
  input.addEventListener('input', onInput); input.addEventListener('keydown', keydown); element.addEventListener('submit', submit); action.addEventListener('click', stop);
  return { element, input, update, getValue: () => input.value,
    reset(value: string) { generation.invalidate(); pending = false; error.hidden = true; error.textContent = ''; input.value = value; update(last); resize(); }, focus: () => input.focus(), resize,
    destroy() { generation.destroy(); input.removeEventListener('input', onInput); input.removeEventListener('keydown', keydown); element.removeEventListener('submit', submit); action.removeEventListener('click', stop); element.remove(); } };

}

export interface WorkspaceShellOptions { brand: Node; prefix?: string; }
export interface WorkspaceShellState { workspace?: string; conversation?: string; reconnecting?: boolean; }
export function createWorkspaceShell(options: WorkspaceShellOptions): UIBlock<WorkspaceShellState> & { composer: ReturnType<typeof createComposerView>; part<T extends HTMLElement = HTMLElement>(name: string): T } {
  const element = document.createElement('div'); element.className = 'pui-app';
  element.innerHTML = `
  <aside class="pui-sidebar" id="sidebar">
    <div class="pui-brand"><span data-brand-slot></span></div>
    <div class="pui-sidebar-section-label">WORKSPACES <button class="pui-quiet-icon" data-action="workspace" aria-label="Manage workspaces">${icon('plus')}</button></div>
    <label class="pui-history-search">${icon('search')}<span class="pui-sr-only">Search conversation titles</span><input id="history-search" type="search" placeholder="Search conversations" autocomplete="off" /></label>
    <nav id="history-list" class="pui-history-list" aria-label="Workspaces and conversations"></nav>
    <div class="pui-sidebar-bottom">
      <button class="pui-settings-button" data-action="resources">${icon('file')}<span>Workspace resources</span></button>
      <button class="pui-settings-button" data-action="connections">${icon('plug')}<span>Connections</span></button>
      <button class="pui-settings-button" data-action="settings">${icon('settings')}<span>Settings</span></button>
      <div id="connection-status" class="pui-local-status" role="status" hidden><span class="pui-status-dot pui-reconnecting" aria-hidden="true"></span><span>Reconnecting…</span></div>
    </div>
  </aside>
  <div id="conversation-menu" class="pui-sidebar-conversation-menu" role="menu" hidden></div>
  <div class="pui-sidebar-scrim" id="sidebar-scrim"></div>
  <main class="pui-main">
    <header class="pui-topbar">
      <button class="pui-quiet-icon pui-mobile-menu" data-action="menu" aria-label="Open sidebar">${icon('menu')}</button>
      <div class="pui-breadcrumb">${icon('folder')}<span id="workspace-label">No workspace</span>${icon('chevron', 'pui-breadcrumb-chevron')}<span class="pui-breadcrumb-current" id="conversation-label">New conversation</span></div>
      <div class="pui-conversation-actions"><button class="pui-quiet-icon pui-compact-action" data-sdk="compact" data-sdk-idle title="Compress context by summarizing older messages" aria-label="Compress context">${icon('compress')}<span>Compact</span></button><div id="artifacts-control" class="pui-artifacts-control" hidden><button id="artifacts-toggle" type="button" class="pui-quiet-icon pui-artifacts-toggle" aria-label="Conversation files" title="Conversation files" aria-expanded="false" aria-controls="artifacts">${icon('file')}<span id="artifacts-count" class="pui-artifacts-count" aria-hidden="true"></span></button><section id="artifacts" class="pui-artifacts-panel" aria-labelledby="artifacts-title" tabindex="-1" hidden></section></div></div>
    </header>
    <section id="conversation-find" class="pui-conversation-find" aria-label="Find in conversation" hidden>
      <input type="search" aria-label="Find in this conversation" placeholder="Find in this conversation" autocomplete="off" />
      <span data-find-count role="status" aria-live="polite"></span>
      <button type="button" class="pui-quiet-icon pui-find-previous" data-find-previous aria-label="Previous match" title="Previous match (Shift+Enter)">${icon('down')}</button>
      <button type="button" class="pui-quiet-icon" data-find-next aria-label="Next match" title="Next match (Enter)">${icon('down')}</button>
      <button type="button" class="pui-quiet-icon" data-find-close aria-label="Close search" title="Close (Esc)">${icon('close')}</button>
    </section>
    <div class="pui-conversation-region"><section id="chat-scroll" class="pui-chat-scroll" aria-label="Conversation" tabindex="-1">
      <div id="welcome" class="pui-welcome"></div>
      <div id="messages" class="pui-messages" aria-live="polite" aria-relevant="additions text"></div>
    </section><button id="back-to-latest" type="button" class="pui-secondary-button pui-back-to-latest" hidden>${icon('down')}<span>Back to latest</span></button></div>
    <div class="pui-composer-region">
      <div class="pui-composer-panels">
      <div id="approval" class="pui-approval-region"></div>
      <div id="workspace-busy" class="pui-workspace-busy" hidden></div><div id="inline-error" class="pui-inline-error" role="alert" hidden></div>
      <section id="task-failure" class="pui-task-failure" role="status" hidden></section>
      <details id="run-status" class="pui-run-status" hidden><summary id="run-status-summary"></summary><div id="run-status-details"><div id="runtime-values"></div><details id="cost-requests" class="pui-cost-requests" hidden><summary>Request breakdown</summary><div id="cost-ledger"></div></details></div></details>
      <section id="queued-messages" class="pui-queued-messages" aria-label="Pending messages" aria-live="polite" hidden></section>
      </div>
      <div data-composer-slot></div>
      <p id="image-guidance" class="pui-composer-note pui-image-guidance" hidden></p>
      <p class="pui-composer-note" id="permission-description">Pith can read workspace files. Changes and commands require your approval.</p>
    </div>
  </main>
  <section id="completion-notices" class="pui-completion-notices" aria-label="Completed tasks" aria-live="polite"></section>
  <span id="copy-status" class="pui-sr-only" role="status" aria-live="polite"></span>
  <dialog id="model-dialog" class="pui-modal pui-model-modal" aria-labelledby="model-title"><div id="model-content"></div></dialog>
  <dialog id="settings-dialog" class="pui-modal" aria-labelledby="settings-title"><div id="settings-content"></div></dialog>
  <dialog id="workspace-dialog" class="pui-modal" aria-labelledby="workspace-title"><div id="workspace-content"></div></dialog>
  <dialog id="permissions-dialog" class="pui-modal pui-permission-modal" aria-labelledby="full-access-title"><div id="permissions-content"></div></dialog>
  <dialog id="delete-dialog" class="pui-modal" aria-labelledby="delete-title"><div id="delete-content"></div></dialog>
  <dialog id="rename-dialog" class="pui-modal" aria-labelledby="rename-title"><div id="rename-content"></div></dialog>
  <dialog id="queue-edit-dialog" class="pui-modal" aria-labelledby="queue-edit-title"><div id="queue-edit-content"></div></dialog>
  <dialog id="message-edit-dialog" class="pui-modal" aria-labelledby="message-edit-title"><div id="message-edit-content"></div></dialog>
  <dialog id="resources-dialog" class="pui-modal pui-feature-modal" aria-labelledby="resources-title"><div id="resources-content"></div></dialog>
  <dialog id="connections-dialog" class="pui-modal pui-feature-modal" aria-labelledby="connections-title"><div id="connections-content"></div></dialog>
  <dialog id="preview-dialog" class="pui-modal pui-file-preview-modal" aria-labelledby="preview-title"><div id="preview-content"></div></dialog>
  <dialog id="image-dialog"></dialog>
`;
  element.querySelector('[data-brand-slot]')!.replaceWith(options.brand);
  const prefix = options.prefix ?? 'pui-workspace-' + ++sequence + '-';
  const composer = createComposerView({ prefix: '' }); element.querySelector('[data-composer-slot]')!.replaceWith(composer.element);
  identify(element, prefix);
  const part = <T extends HTMLElement = HTMLElement>(name: string) => element.querySelector<T>('[id="' + prefix + name + '"]')!;
  return { element, composer, part, update(state) {
    if (state.workspace !== undefined) part('workspace-label').textContent = state.workspace;
    if (state.conversation !== undefined) part('conversation-label').textContent = state.conversation;
    part('connection-status').hidden = !state.reconnecting;
  }, destroy() { composer.destroy(); element.remove(); } };
}
