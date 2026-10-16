import {scopeIds} from '../forms/identity.js';
import { Generation, Lifetime, type ActionResult, type UIBlock } from '../core.js';
import {dialogHeading, escape, icon, uniqueId} from '../dom.js';
import { adoptProductParts } from '../foundations.js';
import { installDialogLifecycle } from '../surface.js';
export interface NavigationConversation {id: string; title?: string; active: boolean; menuOpen?: boolean; status?: Node | null}
export interface NavigationWorkspace {id: string; name: string; path: string; expanded: boolean; selected: boolean; menuOpen?: boolean; children: readonly NavigationConversation[]}
export interface WorkspaceNavigationState {groups: readonly NavigationWorkspace[]; empty: 'workspaces' | 'search' | null; disabled?: boolean}
type ConversationDOM = {element: HTMLElement; button: HTMLButtonElement; title: HTMLElement; more: HTMLButtonElement; status: Node[]; statusSignature: string; statusSource?: Node | null};
type WorkspaceDOM = {element: HTMLElement; heading: HTMLElement; toggle: HTMLButtonElement; title: HTMLElement; more: HTMLButtonElement; create: HTMLButtonElement; children: HTMLElement; empty: HTMLElement};
export function createWorkspaceNavigation(initial: WorkspaceNavigationState, options: {element?: HTMLElement; idPrefix?: string; onToggle?: (id: string) => void; onSelect?: (id: string) => void} = {}): UIBlock<WorkspaceNavigationState> {
  const element = options.element || document.createElement('nav');
  if (!options.element) {element.className = 'pui-history-list pui-workspace-navigation'; element.setAttribute('aria-label', 'Workspaces and conversations');}
  const prefix = options.idPrefix ?? uniqueId('pui-nav') + '-';
  const abort = new AbortController(); let destroyed = false;
  const parts = adoptProductParts(element);
  const workspaces = new Map<string, WorkspaceDOM>(); const conversations = new Map<string, ConversationDOM>();
  const emptyWorkspace = document.createElement('button'); emptyWorkspace.type = 'button'; emptyWorkspace.className = 'pui-workspace-item pui-empty-workspace'; emptyWorkspace.dataset.action = 'workspace'; emptyWorkspace.innerHTML = `${icon('folder')}<span>Add a workspace</span>`;
  const emptySearch = document.createElement('p'); emptySearch.className = 'pui-history-empty'; emptySearch.textContent = 'No matching conversations.';
  function createWorkspace(): WorkspaceDOM {
    const root = document.createElement('section'); root.className = 'pui-workspace-group';
    root.innerHTML = `<div class="pui-workspace-heading"><button class="pui-workspace-toggle">${icon('chevron', 'pui-workspace-chevron')}${icon('folder')}<span></span></button><button class="pui-quiet-icon pui-workspace-more" aria-haspopup="menu">${icon('more')}</button><button class="pui-quiet-icon pui-workspace-new" title="New conversation">${icon('compose')}</button></div><div class="pui-workspace-children"></div>`;
    const buttons = root.querySelectorAll<HTMLButtonElement>('button'); const empty = document.createElement('p'); empty.className = 'pui-workspace-empty'; empty.textContent = 'No conversations yet';
    return {element:root,heading:root.firstElementChild as HTMLElement,toggle:buttons[0],title:buttons[0].querySelector('span')!,more:buttons[1],create:buttons[2],children:root.lastElementChild as HTMLElement,empty};
  }
  function createConversation(): ConversationDOM {
    const root = document.createElement('div'); root.className = 'pui-history-row';
    root.innerHTML = `<button class="pui-history-item"><span></span></button><button class="pui-quiet-icon pui-history-more" aria-haspopup="menu">${icon('more')}</button>`;
    const buttons = root.querySelectorAll<HTMLButtonElement>('button'); return {element:root,button:buttons[0],title:buttons[0].querySelector('span')!,more:buttons[1],status:[],statusSignature:''};
  }
  function statusSignature(node?: Node | null): string {
    if (!node) return ''; const holder = document.createElement('div'); holder.append(node.cloneNode(true)); return holder.innerHTML;
  }
  const update = (state: Readonly<WorkspaceNavigationState>) => {
    if (destroyed) return; const currentWorkspaces = new Set<string>(); const currentConversations = new Set<string>(); let groupCursor: Element | null = element.firstElementChild;
    for (const workspace of state.groups) {
      currentWorkspaces.add(workspace.id); let group = workspaces.get(workspace.id); if (!group) {group = createWorkspace(); workspaces.set(workspace.id,group);}
      group.element.setAttribute('aria-label',workspace.name); group.heading.classList.toggle('pui-selected',workspace.selected);
      group.toggle.dataset.toggleWorkspace = workspace.id; group.toggle.setAttribute('aria-expanded',String(workspace.expanded)); group.toggle.setAttribute('aria-controls',prefix+'workspace-children-'+workspace.id); group.toggle.title = workspace.path;
      if (group.title.textContent !== workspace.name) group.title.textContent = workspace.name;
      group.more.id = prefix+'workspace-actions-'+workspace.id; group.more.dataset.workspaceMenu = workspace.id; group.more.setAttribute('aria-label','Actions for workspace '+workspace.name); group.more.setAttribute('aria-expanded',String(!!workspace.menuOpen)); parts.action(group.more).update({disabled: !!state.disabled});
      group.create.dataset.newWorkspace = workspace.id; group.create.setAttribute('aria-label','New conversation in '+workspace.name); parts.action(group.create).update({disabled: !!state.disabled});
      group.children.id = prefix+'workspace-children-'+workspace.id; group.children.hidden = !workspace.expanded; let rowCursor: Element | null = group.children.firstElementChild;
      for (const entry of workspace.children) {
        currentConversations.add(entry.id); let row = conversations.get(entry.id); if (!row) {row = createConversation(); conversations.set(entry.id,row);}
        const title = entry.title || 'Untitled conversation'; row.element.classList.toggle('pui-active',entry.active); row.button.dataset.conversation = entry.id; parts.action(row.button).update({title, disabled: !!state.disabled});
        if (entry.active) row.button.setAttribute('aria-current','page'); else row.button.removeAttribute('aria-current'); if (row.title.textContent !== title) row.title.textContent = title;
        row.more.id = prefix+'conversation-actions-'+entry.id; row.more.dataset.conversationMenu = entry.id; row.more.setAttribute('aria-label','Actions for '+title); row.more.setAttribute('aria-expanded',String(!!entry.menuOpen)); parts.action(row.more).update({disabled: !!state.disabled});
        const signature = entry.status === row.statusSource && entry.status instanceof DocumentFragment && entry.status.childNodes.length === 0 ? row.statusSignature : statusSignature(entry.status);
        row.statusSource = entry.status;
        if (signature !== row.statusSignature) {for (const node of row.status) node.parentNode?.removeChild(node); row.status = entry.status ? entry.status instanceof DocumentFragment ? [...entry.status.childNodes] : [entry.status] : []; row.button.append(...row.status); row.statusSignature = signature;}
        if (row.element !== rowCursor) group.children.insertBefore(row.element,rowCursor); rowCursor = row.element.nextElementSibling;
      }
      if (!workspace.children.length) {if (group.empty.parentElement !== group.children) group.children.append(group.empty);} else group.empty.remove();
      if (group.element !== groupCursor) element.insertBefore(group.element,groupCursor); groupCursor = group.element.nextElementSibling;
    }
    for (const [id,row] of conversations) if (!currentConversations.has(id)) {row.element.remove(); conversations.delete(id);}
    for (const [id,group] of workspaces) if (!currentWorkspaces.has(id)) {group.element.remove(); workspaces.delete(id);}
    if (state.empty === 'workspaces') {if (emptyWorkspace.parentElement !== element) element.append(emptyWorkspace);} else emptyWorkspace.remove();
    if (state.empty === 'search') {if (emptySearch.parentElement !== element) element.append(emptySearch);} else emptySearch.remove();
    parts.update();
  };
  element.addEventListener('click',event => {const target = (event.target as HTMLElement).closest<HTMLButtonElement>('button'); if (target?.disabled) return; if (target?.dataset.toggleWorkspace) options.onToggle?.(target.dataset.toggleWorkspace); if (target?.dataset.conversation) options.onSelect?.(target.dataset.conversation);},{signal:abort.signal});
  update(initial); return {element,update,destroy() {if (destroyed) return; destroyed = true; abort.abort(); parts.destroy(); workspaces.clear(); conversations.clear(); if (!options.element) element.remove();}};
}
export interface RenameConversationState {id: string; title: string; error?: string; disabled?: boolean}
export interface RenameConversationDraft {id: string; title: string}
export interface RenameConversationOptions {
  idPrefix?: string;
  dialog?: HTMLDialogElement;
  unavailable?: () => boolean;
  onSubmit?: (draft: RenameConversationDraft) => Promise<ActionResult> | ActionResult;
  onSubmitted?: () => void;
  onCancel?: () => void;
}
export interface RenameConversationBlock extends UIBlock<RenameConversationState> {
  readonly input: HTMLInputElement;
  readonly form: HTMLFormElement;
  read(): RenameConversationDraft;
  reset(state: RenameConversationState): void;
  open(state?: RenameConversationState): void;
  close(): void;
  focus(): void;
}
export function createRenameConversation(initial: RenameConversationState, options: RenameConversationOptions = {}): RenameConversationBlock {
 const state = initial; const element = document.createElement('div'); element.className = 'pui-rename-conversation'; element.innerHTML = `${dialogHeading('Rename conversation', 'rename-title', 'rename-dialog', 'CONVERSATION')}<form id="rename-form"><label class="pui-field-label" for="conversation-title">Title</label><input id="conversation-title" name="title" value="${escape(state.title)}" required autocomplete="off" /><div id="rename-error" class="pui-form-error" role="alert"></div><div class="pui-modal-footer"><button type="button" class="pui-secondary-button" data-close="rename-dialog">Cancel</button><button type="submit" class="pui-primary-button" data-idle-action data-idle-conversation="${escape(state.id)}">Save title</button></div></form>`;
 const input = element.querySelector<HTMLInputElement>('#conversation-title')!; const form = element.querySelector<HTMLFormElement>('#rename-form')!; const error = element.querySelector<HTMLElement>('#rename-error')!;
 scopeIds(element, options.idPrefix ?? uniqueId('pui-rename') + '-');
 const parts = adoptProductParts(element); const control = parts.control(input); const feedback = parts.feedback(error);
 const button = form.querySelector<HTMLButtonElement>('button[type="submit"]')!; const action = parts.action(button);
 const generation = new Generation(); const life = new Lifetime();
 let current = initial; let targetId = initial.id; let pending = false; let destroyed = false;
 const sync = () => {action.update({disabled: !!current.disabled || !!options.unavailable?.(), pending}); feedback.update({message: current.error || '', tone: 'error'});};
 const lifecycle = options.dialog ? installDialogLifecycle(options.dialog, {onOpen() {generation.invalidate(); pending = false; sync();}, onClose() {generation.invalidate(); pending = false; sync();}}) : undefined;
 const update = (next: Readonly<RenameConversationState>) => {if (destroyed) return; current = {...next, error: next.error ?? current.error}; sync();};
 const reset = (next: RenameConversationState) => {if (destroyed) return; generation.invalidate(); pending = false; targetId = next.id; current = next; control.reset(next.title); button.dataset.idleConversation = next.id; sync();};
 const close = () => {generation.invalidate(); pending = false; lifecycle?.close(); sync();};
 if (options.onSubmit) life.listen(form, 'submit', (async event => {
   event.preventDefault();
   const title = control.getValue().trim();
   if (destroyed || pending || current.disabled || options.unavailable?.() || !title) return;
   const seq = generation.next(); pending = true; current = {...current, error: ''}; sync();
   let result: ActionResult;
   try {result = await options.onSubmit!({id: targetId, title});}
   catch (reason) {result = {ok: false, error: reason instanceof Error ? reason.message : String(reason)};}
   if (!generation.current(seq) || (options.dialog && !options.dialog.open)) return;
   pending = false;
   if (result.ok) {lifecycle?.close(); options.onSubmitted?.();}
   else current = {...current, error: result.error};
   sync();
 }) as EventListener);
 life.listen(element, 'click', (event => {if ((event.target as Element).closest('[data-close]')) {generation.invalidate(); pending = false; options.onCancel?.(); lifecycle?.close();}}) as EventListener);
 update(initial);
 return {element, input, form, update, read: () => ({id: targetId, title: control.getValue()}), reset, open(next) {if (next) reset(next); lifecycle?.open(); input.select();}, close, focus() {input.select();}, destroy() {if (destroyed) return; destroyed = true; generation.destroy(); life.destroy(); lifecycle?.close(); lifecycle?.destroy(); parts.destroy(); element.remove();}};
}
export interface WorkspacePickerState {workspaces: readonly {id: string; name: string; path: string}[]; error?: string; disabled?: boolean}
export interface WorkspacePickerOptions {
  idPrefix?: string;
  dialog?: HTMLDialogElement;
  unavailable?: () => boolean;
  onSubmit?: (path: string) => Promise<ActionResult> | ActionResult;
  onPick?: () => Promise<{path?: string; error?: string}>;
  onSelect?: (id: string) => void;
  onSubmitted?: () => void;
  onCancel?: () => void;
}
export interface WorkspacePickerBlock extends UIBlock<WorkspacePickerState> {
  readonly input: HTMLInputElement;
  readonly form: HTMLFormElement;
  readonly pickButton: HTMLButtonElement;
  read(): {path: string};
  reset(path?: string): void;
  open(): void;
  close(): void;
  focus(): void;
}
export function createWorkspacePicker(initial: WorkspacePickerState, options: WorkspacePickerOptions = {}): WorkspacePickerBlock {
 const state = initial; const element = document.createElement('div'); element.className = 'pui-workspace-picker'; element.innerHTML = `${dialogHeading('Workspaces', 'workspace-title', 'workspace-dialog', 'A PLACE TO WORK')}<p class="pui-modal-description">Choose a local folder. Conversations belong to a workspace, so Pith knows where to read and create files.</p><div class="pui-modal-workspaces">${state.workspaces.map((entry) => `<button class="pui-modal-workspace" data-modal-workspace="${escape(entry.id)}">${icon('folder')}<span><strong>${escape(entry.name)}</strong><small>${escape(entry.path)}</small></span>${icon('chevron')}</button>`).join('')}</div><div class="pui-workspace-add"><button class="pui-picker-button" id="pick-folder" type="button">${icon('folder')}Choose a folder…</button><div class="pui-path-divider"><span>or enter a folder path</span></div><form id="workspace-form"><label class="pui-sr-only" for="workspace-path">Absolute folder path</label><input id="workspace-path" name="path" placeholder="/Users/you/Documents/my-work" required autocomplete="off" spellcheck="false" /><p class="pui-field-hint">Use an existing folder on this computer. Pith will work inside it.</p><div id="workspace-error" class="pui-form-error" role="alert"></div><div class="pui-modal-footer"><button class="pui-secondary-button" type="button" data-close="workspace-dialog">Cancel</button><button class="pui-primary-button" id="add-workspace" type="submit">Add workspace</button></div></form></div>`;
 const input = element.querySelector<HTMLInputElement>('#workspace-path')!; const form = element.querySelector<HTMLFormElement>('#workspace-form')!; const pickButton = element.querySelector<HTMLButtonElement>('#pick-folder')!; const error = element.querySelector<HTMLElement>('#workspace-error')!;
 scopeIds(element, options.idPrefix ?? uniqueId('pui-workspace') + '-');
 const list = element.querySelector<HTMLElement>('.pui-modal-workspaces')!;
 const rows = new Map([...list.querySelectorAll<HTMLButtonElement>('[data-modal-workspace]')].map(row => [row.dataset.modalWorkspace!, row]));
 const parts = adoptProductParts(element); const control = parts.control(input); const feedback = parts.feedback(error);
 const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
 const generation = new Generation(); const life = new Lifetime();
 let current = initial; let pending = false; let destroyed = false;
 const sync = () => {const disabled = !!current.disabled || !!options.unavailable?.(); parts.action(submitButton).update({disabled, pending}); parts.action(pickButton).update({disabled, pending}); for (const row of rows.values()) parts.action(row).update({disabled: disabled || pending}); feedback.update({message: current.error || '', tone: 'error'});};
 const lifecycle = options.dialog ? installDialogLifecycle(options.dialog, {onOpen() {generation.invalidate(); pending = false; sync();}, onClose() {generation.invalidate(); pending = false; sync();}}) : undefined;
 const update = (next: Readonly<WorkspacePickerState>) => {
   if (destroyed) return; current = {...next, error: next.error ?? current.error};
   const keep = new Set(next.workspaces.map(entry => entry.id));
   for (const [id, row] of rows) if (!keep.has(id)) {row.remove(); rows.delete(id);}
   let cursor = list.firstElementChild;
   for (const entry of next.workspaces) {
     let row = rows.get(entry.id);
     if (!row) {row = document.createElement('button'); row.type = 'button'; row.className = 'pui-modal-workspace'; row.dataset.modalWorkspace = entry.id; row.innerHTML = `${icon('folder')}<span><strong></strong><small></small></span>${icon('chevron')}`; rows.set(entry.id, row);}
     const name = row.querySelector('strong')!; const path = row.querySelector('small')!;
     if (name.textContent !== entry.name) name.textContent = entry.name;
     if (path.textContent !== entry.path) path.textContent = entry.path;
     if (cursor !== row) list.insertBefore(row, cursor); cursor = row.nextElementSibling;
   }
   parts.update(); sync();
 };
 const submit = async (path: string, owner?: number): Promise<void> => {
   if (!options.onSubmit || destroyed || (pending && owner === undefined) || current.disabled || options.unavailable?.() || !path.trim()) return;
   const seq = owner ?? generation.next(); pending = true; current = {...current, error: ''}; sync();
   let result: ActionResult;
   try {result = await options.onSubmit(path.trim());}
   catch (reason) {result = {ok: false, error: reason instanceof Error ? reason.message : String(reason)};}
   if (!generation.current(seq) || (options.dialog && !options.dialog.open)) return;
   pending = false;
   if (result.ok) {lifecycle?.close(); options.onSubmitted?.();}
   else current = {...current, error: result.error};
   sync();
 };
 if (options.onSubmit) life.listen(form, 'submit', (event => {event.preventDefault(); void submit(control.getValue());}) as EventListener);
 if (options.onPick) life.listen(pickButton, 'click', (async () => {
   if (destroyed || pending || current.disabled || options.unavailable?.()) return;
   const seq = generation.next(); pending = true; current = {...current, error: ''}; sync();
   let result: {path?: string; error?: string};
   try {result = await options.onPick!();}
   catch (reason) {result = {error: `${reason instanceof Error ? reason.message : String(reason)} You can enter the path below.`};}
   if (!generation.current(seq) || (options.dialog && !options.dialog.open)) return;
   if (result.error) {pending = false; current = {...current, error: result.error}; sync(); control.focus();}
   else if (result.path) {control.reset(result.path); if (options.onSubmit) await submit(result.path, seq); else {pending = false; sync();}}
   else {pending = false; sync();}
 }) as EventListener);
 life.listen(element, 'click', (event => {
   const target = event.target as Element;
   const selection = target.closest<HTMLButtonElement>('[data-modal-workspace]');
   if (selection && options.onSelect) {event.stopPropagation(); if (!pending && !current.disabled && !options.unavailable?.()) options.onSelect(selection.dataset.modalWorkspace!);}
   if (target.closest('[data-close]')) {generation.invalidate(); pending = false; options.onCancel?.(); lifecycle?.close();}
 }) as EventListener);
 update(initial);
 return {element, input, form, pickButton, update, read: () => ({path: control.getValue()}), reset(path = '') {if (destroyed) return; generation.invalidate(); pending = false; current = {...current, error: ''}; control.reset(path); sync();}, open() {lifecycle?.open();}, close() {generation.invalidate(); pending = false; lifecycle?.close(); sync();}, focus: control.focus, destroy() {if (destroyed) return; destroyed = true; generation.destroy(); life.destroy(); lifecycle?.close(); lifecycle?.destroy(); parts.destroy(); element.remove();}};
}
