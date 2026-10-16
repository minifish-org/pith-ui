import type {ActionResult} from '../core.js';
import {adoptAction} from '../foundations.js';
import {createWorkspaceShell, type ComposerViewState, type WorkspaceShellState} from '../workspace.js';
import {createWorkspaceNavigation, createWorkspacePicker, createRenameConversation, type NavigationWorkspace, type WorkspacePickerState, type RenameConversationState, type RenameConversationDraft} from '../navigation/navigation.js';
import {createContextMenu, type ContextMenuItem} from '../navigation/context-menu.js';
import {createConversationView, type ConversationMessage, type ConversationAction, type ConversationActionAvailability} from '../content/conversation-view.js';
import {installConversationReader} from '../content/conversation-reader.js';
import {createWelcomeView, type WelcomeState} from '../content/welcome.js';
import type {LocalContentLink} from '../content/markdown.js';
import {createPendingMessages, createAttachments, createDropFeedback, type PendingMessagesState, type AttachmentsState} from '../composer.js';
import {createPermissionControl, createFullAccessConfirmation, createTaskFailure, type PermissionControlState, type FullAccessState, type TaskFailureState} from '../tasks/permission.js';
import {createApprovalPanel, type ApprovalPanelState} from '../tasks/approval.js';
import {createRuntimePanel, type RuntimePanelState} from '../tasks/runtime.js';
import {createCostLedger, createCompletionNotices, createCopyFeedback, historyStatusMarkup, type CostLedgerState, type CompletionNoticeDisplay} from '../files/systems.js';
import {createTextEditDialog, createConfirmDialog, type TextEditState, type TextEditBlock, type ConfirmBlock} from '../primitives.js';
import {createBranchHistory, type BranchHistoryState} from '../forms/history.js';
import type {AppEnvironment, HostResult, OwnedSurface} from './internal.js';
import type {ApplicationBrand} from './index.js';
import {createApplicationBrandMark} from './brand.js';

export type {ComposerViewState, WorkspaceShellState, WelcomeState, PendingMessagesState, AttachmentsState, PermissionControlState, FullAccessState, TaskFailureState, ApprovalPanelState, RuntimePanelState, CostLedgerState, CompletionNoticeDisplay, ConversationMessage, ConversationAction, ConversationActionAvailability, WorkspacePickerState, RenameConversationState, RenameConversationDraft, BranchHistoryState};
export interface NavigationStatus {readonly kind: 'approval' | 'running' | 'unread' | 'idle'}
export interface ApplicationConversation {
  readonly id: string; readonly title?: string; readonly active: boolean; readonly status?: NavigationStatus;
  readonly actions?: {readonly rename?: boolean; readonly history?: boolean; readonly export?: boolean; readonly delete?: boolean};
}
export interface ApplicationWorkspace {
  readonly id: string; readonly name: string; readonly path: string;
  readonly selected: boolean; readonly children: readonly ApplicationConversation[];
  readonly canRemove?: boolean;
}
export interface NavigationState {readonly groups: readonly ApplicationWorkspace[]; readonly empty: 'workspaces' | 'search' | null; readonly disabled?: boolean}
export interface ConversationState {readonly id: string; readonly messages: readonly ConversationMessage[]; readonly working: boolean}
export interface ImageTarget {readonly conversationId: string; readonly messageId: string; readonly index: number}
export type WorkspaceAction = 'workspace' | 'resources' | 'connections' | 'settings' | 'model' | 'compact' | 'continue' | 'diagnostics';
export type ConversationNavigationAction = 'rename' | 'history' | 'export' | 'delete';
export interface WorkspaceCallbacks {
  onAction?(action: WorkspaceAction): HostResult;
  onSubmit?(text: string): HostResult;
  onStop?(): HostResult;
  onInput?(text: string): void;
  onBlur?(): void;
  onImages?(files: File[]): void;
  onThinkingChange?(value: string): void;
  onBusyAction?(key: string): void;
  onSearch?(query: string): void;
  onSelectConversation?(id: string): void;
  onNewConversation?(workspaceId: string): void;
  onConversationAction?(action: ConversationNavigationAction, id: string): HostResult;
  onWorkspaceAction?(action: 'remove', id: string): HostResult;
  onMessageAction?(action: ConversationAction): HostResult;
  onCopyCode?(text: string): HostResult;
  resolveLocalLink?(href: string, conversationId: string): LocalContentLink | null;
  onLocalFile?(target: LocalContentLink): HostResult;
  onLoadImage?(target: ImageTarget): Promise<Blob | null>;
  onQueueAction?(action: 'edit' | 'delete' | 'steer', id: string): void;
  onRemoveAttachment?(id: string): void;
  onDropReferences?(input: {readonly paths: readonly string[]; readonly uris?: string; readonly hasUnidentifiedFiles: boolean}): void;
  onPermissionChange?(value: string): void;
  onApproval?(id: string, action: 'deny' | 'always' | 'allow'): void;
  onCompletionOpen?(id: string): void;
  onCompletionDismiss?(runId: string): void;
  onCostsChange?(): void;
  onError?(message: string): void;
}
export interface SceneSession<State> {
  update(state: Readonly<State>): void;
  close(): void;
  isOpen(): boolean;
  fail(message: string): void;
  destroy(): void;
}
export interface MessageEditorState {
  readonly title: string; readonly value: string; readonly description?: string; readonly note?: string;
  readonly submitLabel?: string; readonly disabled?: boolean; readonly pending?: boolean;
  readonly inputDisabled?: boolean; readonly error?: string;
}
export interface MessageEditorSession extends SceneSession<MessageEditorState> {read(): string; reset(value: string): void; focus(): void}
export interface ConfirmationState {
  readonly title: string; readonly action: string;
  readonly description: {readonly before: string; readonly subject?: string; readonly after?: string};
  readonly hint?: string; readonly error?: string; readonly disabled?: boolean;
}
export interface WorkspaceAvailability {
  /** A host mutation blocks actions in every scope. A running task is scoped below. */
  readonly busy?: boolean;
  /** Global actions only; unrelated inactive targets keep their own availability. */
  readonly global?: boolean;
  readonly active?: boolean; readonly conversations?: readonly string[]; readonly workspaces?: readonly string[];
}
export interface WorkspaceScene {
  updateShell(state: Readonly<WorkspaceShellState>): void;
  updateComposer(state: Readonly<ComposerViewState>): void;
  readDraft(): string;
  resetDraft(text: string): void;
  focusComposer(): void;
  pickImages(): void;
  insertReferences(paths: readonly string[]): void;
  receiveNativeDrop(input: {readonly paths: readonly string[]; readonly x: number; readonly y: number}): void;
  setDropPending(pending: boolean): void;
  updateNavigation(state: Readonly<NavigationState>): void;
  search(query: string): void;
  closeNavigationMenu(): void;
  setSidebarOpen(open: boolean): void;
  updateConversation(state: Readonly<ConversationState>): void;
  updateMessageAvailability(state: Readonly<ConversationActionAvailability>): void;
  pruneConversations(ids: readonly string[]): void;
  updateWelcome(state: Readonly<WelcomeState>): void;
  followLatest(): void;
  openFind(): void;
  closeFind(): void;
  updatePending(state: Readonly<PendingMessagesState>): void;
  updateAttachments(state: Readonly<AttachmentsState>): void;
  updateImageGuidance(message: string): void;
  updatePermission(state: Readonly<PermissionControlState>): void;
  updateApproval(state: Readonly<ApprovalPanelState>): void;
  updateFailure(state: Readonly<TaskFailureState>): void;
  updateRuntime(state: Readonly<RuntimePanelState>): void;
  updateTiming(value: {summary: string; duration: string; speed: string}): void;
  updateNotices(state: readonly CompletionNoticeDisplay[]): void;
  updateAvailability(state: Readonly<WorkspaceAvailability>): void;
  readCosts(): {readonly open: boolean; readonly runtimeOpen: boolean};
  updateCosts(state: {readonly visible: boolean; readonly report?: CostLedgerState; readonly loading?: boolean; readonly error?: string}): void;
  resetCosts(): void;
  openMessageEditor(state: MessageEditorState, callbacks?: {onSubmit?(text: string): ActionResult | Promise<ActionResult>; onInput?(text: string): void; onClose?(): void}): MessageEditorSession;
  openQueueEditor(state: MessageEditorState, callbacks?: {onSubmit?(text: string): ActionResult | Promise<ActionResult>; onInput?(text: string): void; onClose?(): void}): MessageEditorSession;
  openConfirmation(state: ConfirmationState, callbacks: {onConfirm(): ActionResult | Promise<ActionResult>; onClose?(): void}): SceneSession<ConfirmationState>;
  openWorkspacePicker(state: WorkspacePickerState, callbacks?: {onSubmit?(path: string): ActionResult | Promise<ActionResult>; onPick?(): Promise<{path?: string; error?: string}>; onSelect?(id: string): void; onClose?(): void}): SceneSession<WorkspacePickerState> & {read(): {path: string}; reset(path?: string): void; focus(): void};
  openRename(state: RenameConversationState, callbacks?: {onSubmit?(draft: RenameConversationDraft): ActionResult | Promise<ActionResult>; onClose?(): void}): SceneSession<RenameConversationState> & {read(): RenameConversationDraft; reset(state: RenameConversationState): void; focus(): void};
  openFullAccess(state: FullAccessState, callbacks: {onConfirm(): ActionResult | Promise<ActionResult>; onClose?(): void}): SceneSession<FullAccessState>;
  openHistory(state: BranchHistoryState, callbacks?: {onContinue?(nodeId: string): HostResult; onClose?(): void}): SceneSession<BranchHistoryState>;
  destroy(): void;
}

export function createWorkspaceScene(env: AppEnvironment, shell: ReturnType<typeof createWorkspaceShell>, callbacks: WorkspaceCallbacks, brand: ApplicationBrand): WorkspaceScene {
  let destroyed = false, activeId = '', query = '', dropPending = false, attachmentsDisabled = false, conversationWorking = false;
  let navigationState: NavigationState = {groups: [], empty: 'workspaces'};
  let navigationConversation = '';
  let composerState: ComposerViewState = {};
  let availability: WorkspaceAvailability = {};
  let messageAvailability: ConversationActionAvailability = {};
  const composerUnavailable = () => destroyed || !!composerState.disabled || !!composerState.readOnly || !!availability.busy || env.hasModal();
  const abort = new AbortController();
  const folds = new Map<string, Map<string, boolean>>(), expanded = new Map<string, boolean>();
  const imageData = new Map<string, Promise<string | null>>();
  let requestedImages = new WeakSet<HTMLImageElement>();
  let currentMessages: readonly ConversationMessage[] = [];
  let imageGeneration = 0;
  const imageURLs = new Set<string>();
  const sessions = new Set<{close(): void}>();
  const fail = (error: unknown) => {if (!destroyed) callbacks.onError?.(error instanceof Error ? error.message : String(error));};
  const run = async (action: (() => HostResult) | undefined): Promise<void> => {
    if (!action || destroyed) return;
    try {const result = await action(); if (result && !result.ok) throw new Error(result.error);}
    catch (error) {fail(error);}
  };
  const copy = createCopyFeedback({status: env.part('copy-status'), isDisabled: button => !!availability.busy || (button.hasAttribute('data-message-action') && !!messageAvailability[button.dataset.messageAction as ConversationAction['action']]), onError: fail});
  const copyAction = (button: HTMLButtonElement, action: () => HostResult, label: string) => copy.copy(button, async () => {const result = await action(); if (result && !result.ok) throw new Error(result.error);}, label);
  const messages = createConversationView({container: env.part('messages'), markdown: id => ({resolveLocalLink: href => callbacks.resolveLocalLink?.(href, id) ?? null}),
    onAction(action, button) {
      const target = Object.freeze({...action});
      if (target.action === 'copy') void copyAction(button, () => callbacks.onMessageAction ? callbacks.onMessageAction(target) : env.copyText(currentMessages.find(message => message.id === target.messageId)?.text || ''), 'Message copied');
      else void run(() => callbacks.onMessageAction?.(target));
    },
    onCopyCode(text, button) {void copyAction(button, () => callbacks.onCopyCode ? callbacks.onCopyCode(text) : env.copyText(text), 'Code copied');},
  });
  const reader = installConversationReader(env.part('chat-scroll'), env.part('messages'), env.part('conversation-find'), env.part<HTMLButtonElement>('back-to-latest'), {isKeyboardBlocked: env.hasModal});
  const logo = createApplicationBrandMark(brand.mark);
  if (logo instanceof HTMLImageElement) logo.src = env.brandMarkSource();
  const welcome = createWelcomeView({container: env.part('welcome'), logo, onAction: action => {void run(() => callbacks.onAction?.(action));}, onPrompt: text => {if (composerUnavailable()) return; shell.composer.reset(text); callbacks.onInput?.(text); shell.composer.focus();}});
  const menu = createContextMenu({element: env.part('conversation-menu'), onDismiss: () => {menuTarget = undefined; renderNavigation();}, onAction(item) {
    const target = menuTarget; closeMenu(); if (!target) return;
    if (target.kind === 'conversation') void run(() => callbacks.onConversationAction?.(item.action as ConversationNavigationAction, target.id));
    else void run(() => callbacks.onWorkspaceAction?.('remove', target.id));
  }});
  let menuTarget: {kind: 'workspace' | 'conversation'; id: string} | undefined;
  const navigation = createWorkspaceNavigation({groups: [], empty: 'workspaces'}, {element: env.part('history-list'), idPrefix: env.idPrefix,
    onToggle(id) {const group = navigationState.groups.find(group => group.id === id); if (!group) return; const open = !(expanded.get(id) ?? group.selected); expanded.set(id, open); renderNavigation();},
    onSelect(id) {closeMenu(); shell.setSidebarOpen(false); callbacks.onSelectConversation?.(id);},
    onAction(action) {
      if (action.action === 'add-workspace') {void run(() => callbacks.onAction?.('workspace')); return;}
      if (action.action === 'new-conversation') {closeMenu(); callbacks.onNewConversation?.(action.workspaceId); return;}
      const target = action.action === 'conversation-menu' ? {kind: 'conversation' as const, id: action.conversationId} : {kind: 'workspace' as const, id: action.workspaceId};
      if (menuTarget?.kind === target.kind && menuTarget.id === target.id) {closeMenu(); return;}
      closeMenu(); menuTarget = target;
      menu.open(action.trigger, {label: target.kind === 'conversation' ? 'Conversation actions' : 'Workspace actions', items: menuItems(target)}); renderNavigation();
    },
  });
  function closeMenu(): void {menu.close(); menuTarget = undefined; renderNavigation();}
  function menuItems(target: {kind: 'workspace' | 'conversation'; id: string}): ContextMenuItem[] {
    if (target.kind === 'workspace') {
      const group = navigationState.groups.find(group => group.id === target.id);
      return [{id: 'remove', label: 'Remove workspace', action: 'remove', danger: true, disabled: !!navigationState.disabled || !!availability.busy || availability.workspaces?.includes(target.id) || group?.canRemove === false}];
    }
    const entry = navigationState.groups.flatMap(group => group.children).find(item => item.id === target.id);
    return ([['rename', 'Rename'], ['history', 'Conversation branches'], ['export', 'Export Markdown'], ['delete', 'Delete conversation']] as const)
      .filter(([action]) => action !== 'history' || entry?.active)
      .map(([action, label]) => ({id: action, action, label, danger: action === 'delete', disabled: !!navigationState.disabled || !!availability.busy || availability.conversations?.includes(target.id) || entry?.actions?.[action] === false}));
  }
  function renderNavigation(): void {
    if (destroyed) return;
    const searched = query.trim().toLocaleLowerCase();
    const groups: NavigationWorkspace[] = navigationState.groups.map(group => ({...group, menuOpen: menuTarget?.kind === 'workspace' && menuTarget.id === group.id,
      expanded: searched ? true : expanded.get(group.id) ?? group.selected,
      children: group.children.filter(item => !searched || (item.title || '').toLocaleLowerCase().includes(searched)).map(item => {
        let status: Node | undefined;
        if (item.status) {const template = document.createElement('template'); template.innerHTML = historyStatusMarkup(item.status.kind); status = template.content;}
        return {...item, status, menuOpen: menuTarget?.kind === 'conversation' && menuTarget.id === item.id};
      }),
    })).filter(group => !searched || group.children.length > 0);
    navigation.update({groups, empty: searched && !groups.length ? 'search' : navigationState.empty, disabled: navigationState.disabled});
    if (menuTarget) menu.update({label: menuTarget.kind === 'conversation' ? 'Conversation actions' : 'Workspace actions', items: menuItems(menuTarget)});
  }
  const pending = createPendingMessages({container: env.part('queued-messages'), onAction: callbacks.onQueueAction});
  const attachments = createAttachments({container: env.part('draft-images'), onRemove: callbacks.onRemoveAttachment, onOpen: env.openImage});
  const drop = createDropFeedback({container: shell.composer.element});
  const permission = createPermissionControl({mode: 'ask', description: ''}, {element: env.part('permission-control'), descriptionElement: env.part('permission-description'), onChange: callbacks.onPermissionChange});
  const approval = createApprovalPanel({approval: null}, {element: env.part('approval'), idPrefix: env.idPrefix, onAction: callbacks.onApproval});
  const failure = createTaskFailure({visible: false, message: '', advice: '', canContinue: false}, {element: env.part('task-failure'), onContinue: () => {void run(() => callbacks.onAction?.('continue'));}, onSettings: () => {void run(() => callbacks.onAction?.('settings'));}, onDiagnostics: () => {void run(() => callbacks.onAction?.('diagnostics'));}});
  const runtime = createRuntimePanel({visible: false, summary: '', duration: '', speed: '', inputTokens: '', outputTokens: '', cacheRead: '', cacheWrite: '', contextTokens: '', contextWindow: '', compactions: '', toolFailures: '', recordedCost: '', latestCost: ''}, {element: env.part('run-status'), idPrefix: ''});
  const ledger = createCostLedger({container: env.part('cost-ledger')});
  const costs = env.part<HTMLDetailsElement>('cost-requests'), runDetails = env.part<HTMLDetailsElement>('run-status');
  const costsChanged = () => callbacks.onCostsChange?.(); costs.addEventListener('toggle', costsChanged, {signal: abort.signal}); runDetails.addEventListener('toggle', costsChanged, {signal: abort.signal});
  const notices = createCompletionNotices({container: env.part('completion-notices'), onOpen: callbacks.onCompletionOpen, onDismiss: callbacks.onCompletionDismiss});
  const compactAction = adoptAction(shell.element.querySelector<HTMLButtonElement>('[data-sdk="compact"]')!, {onAction: () => callbacks.onAction?.('compact'), onError: fail});
  const syncCompact = () => compactAction.update({disabled: !!availability.busy || !!availability.active || conversationWorking || !activeId || !currentMessages.length});
  syncCompact();
  shell.element.addEventListener('click', event => {
    const target = (event.target as Element).closest<HTMLElement>('[data-action], a[data-download-path]');
    if (!target || target instanceof HTMLButtonElement && target.disabled) return;
    if (target.matches('a[data-download-path]')) {event.preventDefault(); const link = Object.freeze({conversationId: target.dataset.downloadConversation!, path: target.dataset.downloadPath!}); void run(() => callbacks.onLocalFile?.(link)); return;}
    const action = target.dataset.action;
    if (action && ['workspace', 'resources', 'connections', 'settings'].includes(action)) {event.stopPropagation(); void run(() => callbacks.onAction?.(action as WorkspaceAction));}
  }, {signal: abort.signal});
  const input = shell.composer.input, form = shell.composer.element;
  const attachmentAction = adoptAction(env.part<HTMLButtonElement>('attach-images'));
  const syncAttachment = () => attachmentAction.update({disabled: attachmentsDisabled || !!composerState.disabled || !!composerState.readOnly || !!availability.busy});
  input.addEventListener('blur', () => callbacks.onBlur?.(), {signal: abort.signal});
  input.addEventListener('paste', event => {const files = [...event.clipboardData?.items || []].filter(item => item.type.startsWith('image/')).map(item => item.getAsFile()).filter((file): file is File => !!file); if (files.length) {event.preventDefault(); callbacks.onImages?.(files);}}, {signal: abort.signal});
  const dropUnavailable = () => composerUnavailable() || dropPending;
  form.addEventListener('dragover', event => {if (dropUnavailable()) return; event.preventDefault(); drop.update({active: true});}, {signal: abort.signal});
  form.addEventListener('dragleave', event => {if (!form.contains(event.relatedTarget as Node | null)) drop.update({active: false});}, {signal: abort.signal});
  form.addEventListener('drop', event => {
    event.preventDefault(); drop.update({active: false}); if (composerUnavailable()) return;
    const files = [...event.dataTransfer?.files || []];
    const isImage = (file: File) => ['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(file.type) || !file.type && /\.(?:png|jpe?g|gif|webp)$/i.test(file.name);
    const images = files.filter(isImage), uris = event.dataTransfer?.getData('text/uri-list') || '';
    if (images.length && !attachmentsDisabled) callbacks.onImages?.(images);
    if (dropPending) return;
    const hasUnidentifiedFiles = files.some(file => !isImage(file));
    if (uris || hasUnidentifiedFiles) callbacks.onDropReferences?.({paths: [], uris, hasUnidentifiedFiles});
  }, {signal: abort.signal});
  const collectFolds = () => {if (!activeId) return; const map = new Map<string, boolean>(); for (const item of env.part('messages').querySelectorAll<HTMLDetailsElement>('[data-tool-fold]')) map.set(item.dataset.toolFold!, item.open); folds.set(activeId, map);};
  const clearImages = () => {imageGeneration++; imageData.clear(); requestedImages = new WeakSet(); for (const url of imageURLs) URL.revokeObjectURL(url); imageURLs.clear();};
  function loadImages(): void {
    const generation = imageGeneration, id = activeId;
    for (const image of messages.images()) {
      if (requestedImages.has(image)) continue;
      requestedImages.add(image);
      const target: ImageTarget = Object.freeze({conversationId: id, messageId: image.dataset.messageId!, index: Number(image.dataset.imageIndex)});
      const key = JSON.stringify([target.conversationId, target.messageId, target.index]);
      let pending = imageData.get(key);
      if (!pending) {
        pending = Promise.resolve().then(() => callbacks.onLoadImage?.(target)).then(blob => {
          if (!blob || !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(blob.type) || generation !== imageGeneration || destroyed) return null;
          const url = URL.createObjectURL(blob); imageURLs.add(url); return url;
        }).catch(() => null); imageData.set(key, pending);
      }
      void pending.then(src => {
        if (!destroyed && generation === imageGeneration && id === activeId) {
          if (!src) {requestedImages.delete(image); if (imageData.get(key) === pending) imageData.delete(key);}
          messages.setImageState(image, src ? {status: 'ready', src} : {status: 'unavailable'});
        }
      });
    }
  }
  const editorSlots = new Map<'message' | 'queue', {close(): void}>();
  function openEditor(kind: 'message' | 'queue', state: MessageEditorState, actions: Parameters<WorkspaceScene['openMessageEditor']>[1] = {}): MessageEditorSession {
    editorSlots.get(kind)?.close();
    let alive = !destroyed, current = state, savedDraft = state.value, block: TextEditBlock;
    const release = () => {if (!alive) return; alive = false; savedDraft = block.getValue(); block.destroy(); sessions.delete(session); if (editorSlots.get(kind) === session) editorSlots.delete(kind); env.notifyClose(actions.onClose); env.changed();};
    block = createTextEditDialog({title: state.title, submitLabel: state.submitLabel, label: kind === 'message' ? 'Message' : 'Pending message', onInput: actions.onInput, onSubmit: value => actions.onSubmit?.(value) ?? {ok: true}, onClose: release});
    block.control.rows = kind === 'message' ? 8 : 5;
    shell.element.append(block.element);
    const isOpen = () => alive && !destroyed && block.element.open;
    const session: MessageEditorSession = {isOpen, close: release, destroy: release, read: () => alive ? block.getValue() : savedDraft,
      update(next) {if (isOpen()) {current = next; block.update(next as TextEditState);}},
      reset(value) {if (isOpen()) {current = {...current, value}; block.open(current);}}, focus() {if (isOpen()) block.focus();}, fail(message) {if (isOpen()) block.update({...current, error: message});},
    };
    editorSlots.set(kind, session); sessions.add(session);
    if (alive) {block.update(state); block.open(state); env.changed();} else block.destroy();
    return session;
  }
  let confirmation: SceneSession<ConfirmationState> | undefined;
  function openConfirmation(state: ConfirmationState, actions: Parameters<WorkspaceScene['openConfirmation']>[1]): SceneSession<ConfirmationState> {
    confirmation?.close();
    let alive = !destroyed, current = state, block: ConfirmBlock;
    const message = (value: ConfirmationState) => {const fragment = document.createDocumentFragment(); fragment.append(value.description.before); if (value.description.subject) {const strong = document.createElement('strong'); strong.textContent = value.description.subject; fragment.append(strong);} fragment.append(value.description.after || ''); return fragment;};
    const release = () => {if (!alive) return; alive = false; block.destroy(); sessions.delete(session); env.notifyClose(actions.onClose); env.changed();};
    const presentation = (value: ConfirmationState) => ({title: value.title, hint: value.hint, error: value.error, disabled: value.disabled, message: message(value), confirmLabel: value.action});
    block = createConfirmDialog({...presentation(state), onConfirm: actions.onConfirm, onClose: release}); shell.element.append(block.element);
    const session: SceneSession<ConfirmationState> = {isOpen: () => alive && !destroyed && block.element.open, close: release, destroy: release,
      update(next) {if (!session.isOpen()) return; current = next; block.update(presentation(next));}, fail(error) {session.update({...current, error});},
    };
    confirmation = session; sessions.add(session); if (alive) {block.open(); env.changed();} else block.destroy(); return session;
  }
  return {
    updateShell: state => {if (!destroyed) shell.update(state);},
    updateComposer(state) {if (!destroyed) {composerState = state; shell.composer.update(state); syncAttachment(); drop.update({active: false, disabled: dropUnavailable()});}},
    readDraft: () => shell.composer.getValue(), resetDraft: text => {if (!destroyed) shell.composer.reset(text);}, focusComposer: shell.composer.focus,
    pickImages() {if (!composerUnavailable() && !attachmentsDisabled) shell.composer.pickImages();},
    insertReferences(paths) {
      if (dropUnavailable() || !paths.length) return;
      const reference = paths.map(path => {const ticks = Math.max(0, ...[...path.matchAll(/`+/g)].map(match => match[0].length)) + 1; const delimiter = '`'.repeat(ticks); return delimiter + (/^`|`$|^ | $/.test(path) && !/^ +$/.test(path) ? ' ' + path + ' ' : path) + delimiter;}).join(' ');
      const value = input.value, start = input.selectionStart, end = input.selectionEnd;
      const before = value.slice(0, start), after = value.slice(end), inserted = (before && !/\s$/.test(before) ? ' ' : '') + reference + (after && !/^\s/.test(after) ? ' ' : '');
      shell.composer.reset(before + inserted + after); input.setSelectionRange(before.length + inserted.length, before.length + inserted.length); shell.composer.focus(); callbacks.onInput?.(input.value);
    },
    receiveNativeDrop({paths, x, y}) {if (dropUnavailable() || !Number.isFinite(x) || !Number.isFinite(y) || !form.contains(document.elementFromPoint(x, y))) return; callbacks.onDropReferences?.({paths: [...paths], hasUnidentifiedFiles: false});},
    setDropPending(value) {dropPending = value; if (value) drop.update({active: false});},
    updateNavigation(state) {navigationState = state; const active = state.groups.flatMap(group => group.children.filter(item => item.active).map(item => ({workspace: group.id, conversation: item.id})))[0]; if (active && active.conversation !== navigationConversation) expanded.set(active.workspace, true); navigationConversation = active?.conversation || ''; const ids = new Set(state.groups.map(group => group.id)); for (const id of expanded.keys()) if (!ids.has(id)) expanded.delete(id); if (menuTarget && !state.groups.some(group => menuTarget!.kind === 'workspace' ? group.id === menuTarget!.id : group.children.some(item => item.id === menuTarget!.id))) closeMenu(); renderNavigation();},
    search(value) {query = value; renderNavigation(); callbacks.onSearch?.(value);}, closeNavigationMenu: closeMenu, setSidebarOpen: shell.setSidebarOpen,
    updateConversation(state) {
      if (destroyed) return; collectFolds();
      if (state.id !== activeId) {env.closeImage(); clearImages(); costs.open = false; ledger.clear();}
      activeId = state.id; currentMessages = state.messages; conversationWorking = state.working; syncCompact(); reader.beforeRender(state.id);
      env.part('welcome').hidden = state.messages.length > 0; env.part('messages').hidden = !state.messages.length;
      messages.update({...state, folds: folds.get(state.id)}); loadImages(); reader.afterRender();
    },
    updateMessageAvailability(state) {messageAvailability = state; messages.updateActionAvailability(state);},
    pruneConversations(ids) {const keep = new Set(ids); for (const id of folds.keys()) if (!keep.has(id)) folds.delete(id); reader.prune([...ids]);},
    updateWelcome(state) {if (destroyed) return; if (logo instanceof HTMLImageElement) logo.src = env.brandMarkSource(); welcome.update(state);}, followLatest: reader.followLatest, openFind: reader.openFind, closeFind: reader.closeFind,
    updatePending: pending.update,
    updateAttachments(state) {if (!destroyed) {attachmentsDisabled = !!state.disabled; attachments.update(state); syncAttachment();}},
    updateImageGuidance(message) {const element = env.part('image-guidance'); element.textContent = message; element.hidden = !message;},
    updatePermission: permission.update, updateApproval: approval.update, updateFailure: failure.update, updateRuntime: runtime.update, updateTiming: runtime.updateTiming, updateNotices: notices.update,
    updateAvailability(state) {if (destroyed) return; availability = state; const conversations = new Set(state.conversations), workspaces = new Set(state.workspaces); shell.updateActionAvailability(scope => !!state.busy || (scope.kind === 'global' ? !!state.global : scope.kind === 'conversation' ? conversations.has(scope.id || '') : scope.kind === 'workspace' ? workspaces.has(scope.id || '') : !!state.active)); syncAttachment(); syncCompact(); renderNavigation();},
    readCosts: () => ({open: costs.open, runtimeOpen: runDetails.open}),
    updateCosts(state) {if (destroyed) return; costs.hidden = !state.visible; if (state.error) ledger.setError(state.error); else if (state.loading) ledger.loading(); else if (state.report) ledger.update(state.report);},
    resetCosts() {costs.open = false; ledger.clear();},
    openMessageEditor: (state, actions) => openEditor('message', state, actions), openQueueEditor: (state, actions) => openEditor('queue', state, actions), openConfirmation,
    openWorkspacePicker(state, actions = {}) {
      let surface: OwnedSurface; const block = createWorkspacePicker(state, {idPrefix: env.idPrefix, onSubmit: actions.onSubmit, onPick: actions.onPick, onSelect: actions.onSelect, onSubmitted: () => surface.close(), onCancel: () => surface.close()});
      surface = env.openDialog('workspace', block, actions.onClose); block.focus();
      return {isOpen: surface.isOpen, close: surface.close, destroy: surface.destroy, fail: surface.fail, read: block.read, update(next) {if (surface.isOpen()) block.update(next);}, reset(path) {if (surface.isOpen()) block.reset(path);}, focus() {if (surface.isOpen()) block.focus();}};
    },
    openRename(state, actions = {}) {
      let surface: OwnedSurface; const block = createRenameConversation(state, {idPrefix: env.idPrefix, onSubmit: actions.onSubmit, onSubmitted: () => surface.close(), onCancel: () => surface.close()});
      surface = env.openDialog('rename', block, actions.onClose); block.focus();
      return {isOpen: surface.isOpen, close: surface.close, destroy: surface.destroy, fail: surface.fail, read: block.read, update(next) {if (surface.isOpen()) block.update(next);}, reset(next) {if (surface.isOpen()) block.reset(next);}, focus() {if (surface.isOpen()) block.focus();}};
    },
    openFullAccess(state, actions) {
      let surface: OwnedSurface; const block = createFullAccessConfirmation(state, {idPrefix: env.idPrefix, onConfirm: async () => {const result = await actions.onConfirm(); if (result.ok && surface.isOpen()) surface.close(); return result;}});
      surface = env.openDialog('permissions', block, actions.onClose);
      return {isOpen: surface.isOpen, close: surface.close, destroy: surface.destroy, fail: surface.fail, update(next) {if (surface.isOpen()) block.update(next);}};
    },
    openHistory(state, actions = {}) {
      let surface: OwnedSurface; const block = createBranchHistory(state, {onContinue: async id => {const result = await actions.onContinue?.(id); if (result && !result.ok) throw new Error(result.error); if (surface.isOpen()) surface.close();}});
      surface = env.openFeature('Conversation branches', block, actions.onClose);
      return {isOpen: surface.isOpen, close: surface.close, destroy: surface.destroy, fail: surface.fail, update(next) {if (surface.isOpen()) block.update(next);}};
    },
    destroy() {if (destroyed) return; destroyed = true; abort.abort(); for (const session of [...sessions]) session.close(); sessions.clear(); clearImages(); folds.clear(); expanded.clear(); menu.destroy(); navigation.destroy(); copy.destroy(); reader.destroy(); messages.destroy(); welcome.destroy(); pending.destroy(); attachments.destroy(); attachmentAction.destroy(); compactAction.destroy(); drop.destroy(); permission.destroy(); approval.destroy(); failure.destroy(); runtime.destroy(); ledger.destroy(); notices.destroy();},
  };
}
