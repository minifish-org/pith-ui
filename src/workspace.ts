import { Generation, type UIBlock, type ActionResult } from './core.js';
import { icon } from './dom.js';
import { controlDisabled } from './core.js';
import { adoptProductParts, reconcileSelectOptions } from './foundations.js';
import { installDialogLifecycle } from './surface.js';

export interface ComposerViewState {
  placeholder?: string; disabled?: boolean; readOnly?: boolean;
  action?: 'send' | 'queue' | 'stop'; actionDisabled?: boolean;
  model?: { label: string; description: string; disabled?: boolean };
  thinking?: { options: readonly { value: string; label: string }[]; value: string; disabled?: boolean };
}
export interface ComposerViewOptions {
  prefix?: string;
  onSubmit?: (text: string) => void | ActionResult | Promise<void | ActionResult>;
  onStop?: () => void | ActionResult | Promise<void | ActionResult>;
  onInput?: (text: string) => void;
  onModel?: () => void;
  onAttach?: () => void;
  onImages?: (files: File[]) => void;
  onThinkingChange?: (value: string) => void;
}
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
  const model = element.querySelector<HTMLButtonElement>('[data-action="model"]')!;
  const thinking = element.querySelector<HTMLSelectElement>('[aria-label="Thinking effort"]')!;
  const imagePicker = element.querySelector<HTMLInputElement>('[type="file"]')!;
  identify(element, options.prefix ?? 'pui-composer-' + ++sequence + '-');
  const generation = new Generation();
  const parts = adoptProductParts(element);
  let destroyed = false;
  let pending = false, last: ComposerViewState = {}, lastAction = 'send';
  const error = document.createElement('div'); error.className = 'pui-form-error'; error.setAttribute('role','alert'); error.hidden = true; element.insertBefore(error, element.firstChild);
  const resize = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 180) + 'px'; };
  const update = (state: ComposerViewState) => {
    if (destroyed) return;
    last = state;
    parts.control(input).update({ disabled: !!state.disabled, readOnly: !!state.readOnly, ...(state.placeholder !== undefined ? { placeholder: state.placeholder } : {}) });
    if (state.action && state.action !== lastAction) { lastAction = state.action; action.type = state.action === 'stop' ? 'button' : 'submit'; action.innerHTML = icon(state.action === 'stop' ? 'stop' : 'arrow'); action.classList.toggle('pui-is-stop', state.action === 'stop'); }
    const actionLabel = lastAction === 'stop' ? 'Stop agent' : lastAction === 'queue' ? 'Queue message' : 'Send message';
    action.setAttribute('aria-label', actionLabel); action.title = actionLabel;
    parts.action(action).update({ disabled: !!(state.actionDisabled || state.disabled), pending });
    if (state.model) {
      parts.action(model).update({ label: state.model.label, title: state.model.description, disabled: !!state.model.disabled });
    }
    if (state.thinking) {
      const { options: choices, value, disabled } = state.thinking;
      reconcileSelectOptions(thinking, choices, value);
      parts.control(thinking).update({ disabled: !!disabled }); thinking.parentElement!.hidden = choices.length < 2;
    }
    parts.update();
  };
  const onInput = () => { resize(); options.onInput?.(input.value); };
  const run = async (callback: (() => void | ActionResult | Promise<void | ActionResult>) | undefined, textSubmission = true) => {
    if (!callback || pending || action.disabled || (textSubmission && (input.disabled || input.readOnly))) return;
    const seq = generation.next(); pending = true; error.hidden = true; error.textContent = ''; update(last);
    try {
      const result = await callback();
      if (generation.current(seq) && result && !result.ok) { error.textContent = result.error; error.hidden = false; }
    } catch (reason) {
      if (generation.current(seq)) { error.textContent = reason instanceof Error ? reason.message : String(reason); error.hidden = false; }
    } finally { if (generation.current(seq)) { pending = false; update(last); } }
  };
  const submit = (event: SubmitEvent) => { if (options.onSubmit) { event.preventDefault(); const text = input.value; void run(() => options.onSubmit!(text)); } };
  const stop = () => { if (action.type === 'button') void run(options.onStop, false); };
  const keydown = (event: KeyboardEvent) => {
    if (options.onSubmit && event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      if (action.type === 'submit') element.requestSubmit();
    }
  };
  const click = (event: MouseEvent) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button');
    if (!button || button.disabled) return;
    const callback = button === model ? options.onModel : button.hasAttribute('data-action') && button.dataset.action === 'attach-images' ? options.onAttach : undefined;
    if (callback) { event.stopPropagation(); callback(); }
  };
  const chooseThinking = () => options.onThinkingChange?.(thinking.value);
  const images = () => { const files = Array.from(imagePicker.files ?? []); imagePicker.value = ''; options.onImages?.(files); };
  element.addEventListener('click', click); thinking.addEventListener('change', chooseThinking); imagePicker.addEventListener('change', images);
  input.addEventListener('input', onInput); input.addEventListener('keydown', keydown); element.addEventListener('submit', submit); action.addEventListener('click', stop);
  return { element, input, update, getValue: () => input.value,
    reset(value: string) { if (destroyed) return; generation.invalidate(); pending = false; error.hidden = true; error.textContent = ''; input.value = value; update(last); resize(); }, focus: () => { if (!destroyed) input.focus(); }, resize,
    pickImages() { if (!destroyed) imagePicker.click(); },
    destroy() { if (destroyed) return; destroyed = true; generation.destroy(); parts.destroy(); input.removeEventListener('input', onInput); input.removeEventListener('keydown', keydown); element.removeEventListener('submit', submit); action.removeEventListener('click', stop); element.removeEventListener('click', click); thinking.removeEventListener('change', chooseThinking); imagePicker.removeEventListener('change', images); element.remove(); } };

}

export type WorkspaceDialogName = 'model' | 'settings' | 'workspace' | 'permissions' | 'delete' | 'rename' | 'queue-edit' | 'message-edit' | 'resources' | 'connections' | 'preview' | 'image';
export interface ActionScope { kind: 'global' | 'conversation' | 'workspace' | 'active'; id?: string; }
export interface WorkspaceShellOptions { brand: Node; prefix?: string; composer?: ComposerViewOptions; onDialogClose?: (name: WorkspaceDialogName) => void; onSearch?: (query: string) => void; onBusyAction?: (key: string) => void; }
export interface WorkspaceShellState { workspace?: string; conversation?: string; reconnecting?: boolean; error?: { message: string; hidden?: boolean }; busy?: { key: string; message: string; actionLabel: string } | null; }
export function createWorkspaceShell(options: WorkspaceShellOptions) {
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
  const composer = createComposerView({ ...options.composer, prefix: '' }); element.querySelector('[data-composer-slot]')!.replaceWith(composer.element);
  identify(element, prefix);
  const part = <T extends HTMLElement = HTMLElement>(name: string) => element.querySelector<T>('[id="' + prefix + name + '"]')!;
  let destroyed = false;
  const parts = adoptProductParts(element);
  const dialogs = new Map(Array.from(element.querySelectorAll<HTMLDialogElement>('dialog'), dialog => {
    const name = dialog.id.slice(prefix.length).replace(/-dialog$/, '') as WorkspaceDialogName;
    return [name, installDialogLifecycle(dialog, { onClose: () => options.onDialogClose?.(name) })] as const;
  }));
  const setSidebarOpen = (open: boolean) => { if (destroyed) return; part('sidebar').classList.toggle('pui-open', open); part('sidebar-scrim').classList.toggle('pui-visible', open); };
  const sidebarClick = (event: MouseEvent) => { const target = event.target as Element; if (target === part('sidebar-scrim') || target.closest('[data-action="menu"]')) { setSidebarOpen(target !== part('sidebar-scrim')); event.stopPropagation(); } };
  const search = part<HTMLInputElement>('history-search'); const onSearch = () => options.onSearch?.(search.value);
  search.addEventListener('input', onSearch); element.addEventListener('click', sidebarClick);
  const busy = part('workspace-busy');
  const onBusy = (event: MouseEvent) => { if ((event.target as Element).closest('button') && busy.dataset.key) { event.stopPropagation(); options.onBusyAction?.(busy.dataset.key); } };
  busy.addEventListener('click', onBusy);
  return { element, composer, part, update(state: Readonly<WorkspaceShellState>) {
    if (destroyed) return;
    if (state.workspace !== undefined) part('workspace-label').textContent = state.workspace;
    if (state.conversation !== undefined) part('conversation-label').textContent = state.conversation;
    part('connection-status').hidden = !state.reconnecting;
    if (state.error) { part('inline-error').textContent = state.error.message; part('inline-error').hidden = !!state.error.hidden || !state.error.message; }
    if (state.busy !== undefined) {
      busy.hidden = !state.busy;
      if (state.busy) {
        if (!busy.firstChild) { busy.append(document.createElement('span'), document.createElement('button')); const button = busy.lastElementChild as HTMLButtonElement; button.type = 'button'; button.className = 'pui-text-button'; }
        busy.dataset.key = state.busy.key;
        if (busy.firstElementChild!.textContent !== state.busy.message) busy.firstElementChild!.textContent = state.busy.message;
        if (busy.lastElementChild!.textContent !== state.busy.actionLabel) busy.lastElementChild!.textContent = state.busy.actionLabel;
      }
    }
    parts.update();
  }, setSidebarOpen,
  openDialog(name: WorkspaceDialogName) { if (!destroyed) { setSidebarOpen(false); dialogs.get(name)?.open(); } },
  closeDialog(name: WorkspaceDialogName) { if (!destroyed) dialogs.get(name)?.close(); },
  isDialogOpen(name: WorkspaceDialogName) { return !destroyed && !!dialogs.get(name)?.isOpen(); },
  updateActionAvailability(unavailable: (scope: ActionScope) => boolean, root: ParentNode = element) {
    if (destroyed) return;
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-idle-action], [data-global-idle], [data-mcp-edit], [data-action="new-mcp"]')) {
      const scope: ActionScope = button.hasAttribute('data-global-idle') || button.hasAttribute('data-mcp-edit') || button.dataset.action === 'new-mcp' ? { kind: 'global' } : button.dataset.idleConversation ? { kind: 'conversation', id: button.dataset.idleConversation } : button.dataset.idleWorkspace ? { kind: 'workspace', id: button.dataset.idleWorkspace } : { kind: 'active' };
      button.disabled = controlDisabled(button, unavailable(scope));
    }
    for (const link of root.querySelectorAll<HTMLAnchorElement>('a[data-download-conversation]')) link.setAttribute('aria-disabled', String(unavailable({ kind: 'conversation', id: link.dataset.downloadConversation })));
  },
  destroy() { if (destroyed) return; destroyed = true; for (const dialog of dialogs.values()) dialog.destroy(); parts.destroy(); search.removeEventListener('input', onSearch); element.removeEventListener('click', sidebarClick); busy.removeEventListener('click', onBusy); composer.destroy(); element.remove(); } };
}
