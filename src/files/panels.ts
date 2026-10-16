import { dialogHeading, escape, icon, uniqueId, setText } from '../dom.js';
import type { UIBlock } from '../core.js';
import { createPagedPreview, type PreviewKind } from '../content/paged-preview.js';
import { adoptProductParts } from '../foundations.js';
import { createButton } from '../primitives.js';

export interface FileActionOptions {
  kind: string; ownerId: string; path: string; preview?: boolean;
  copyMode?: 'file' | 'path' | 'none';
  onAction?: (action: 'preview' | 'open' | 'reveal' | 'copy' | 'copy-path') => void;
}
export function fileActionsMarkup(options: FileActionOptions): string {
  const scope = `data-idle-action ${options.kind === 'resource' ? 'data-idle-workspace' : 'data-idle-conversation'}="${escape(options.ownerId)}"`;
  const attributes = `${scope} data-file-kind="${escape(options.kind)}" data-file-owner="${escape(options.ownerId)}" data-file-path="${escape(options.path)}"`;
  const preview = options.preview ? `<button type="button" class="pui-secondary-button" ${scope} data-preview-path="${escape(options.path)}" data-preview-id="${escape(options.ownerId)}">Preview</button>` : '';
  const copy = options.copyMode && options.copyMode !== 'none' ? `<button type="button" class="pui-secondary-button" ${attributes} data-file-action="${options.copyMode === 'file' ? 'copy' : 'copy-path'}">${options.copyMode === 'file' ? 'Copy file' : 'Copy path'}</button>` : '';
  return `<div class="pui-file-actions">${preview}<button type="button" class="pui-secondary-button" ${attributes} data-file-action="open">Open</button><button type="button" class="pui-secondary-button" ${attributes} data-file-action="reveal">Reveal</button>${copy}</div>`;
}
export function createFileActions(options: FileActionOptions) {
  const template = document.createElement('template');
  template.innerHTML = fileActionsMarkup(options);
  const element = template.content.firstElementChild as HTMLElement;
  const click = (event: Event) => {
    const target = (event.target as Element).closest<HTMLElement>('button');
    if (target && !(target as HTMLButtonElement).disabled) options.onAction?.(target.dataset.fileAction as 'open' | 'reveal' | 'copy' | 'copy-path' || 'preview');
  };
  if (options.onAction) element.addEventListener('click', click);
  return { element, destroy(): void { element.removeEventListener('click', click); element.remove(); } };
}

export interface ArtifactPanelState { ownerId: string; files: readonly { name: string; path: string }[]; loading: boolean; error: string; copyMode: 'file' | 'path' }
export interface ArtifactPanelOptions { container: HTMLElement; control: HTMLElement; toggle: HTMLElement; count: HTMLElement; headingId?: string; dismissExclusions?: readonly HTMLElement[] }
export function createArtifactPanel(options: ArtifactPanelOptions) {
  const { container: element, control, toggle, count } = options;
  element.innerHTML = `<div class="pui-artifacts-heading"><h2${options.headingId ? ` id="${escape(options.headingId)}"` : ''}>Files <span data-file-count></span></h2><button type="button" class="pui-quiet-icon" data-artifacts-close aria-label="Close files">${icon('close')}</button></div><p class="pui-artifacts-status" role="status" hidden>Looking for files…</p><div class="pui-artifacts-content"><div data-file-rows></div><p class="pui-form-error" role="alert" hidden></p></div>`;
  const total = element.querySelector<HTMLElement>('[data-file-count]')!;
  const loading = element.querySelector<HTMLElement>('[role="status"]')!;
  const rows = element.querySelector<HTMLElement>('[data-file-rows]')!;
  const error = element.querySelector<HTMLElement>('[role="alert"]')!;
  const parts = adoptProductParts(element);
  const entries = new Map<string, { element: HTMLElement; name: HTMLElement; copy: HTMLButtonElement }>();
  let open = false;
  let destroyed = false;
  function setOpen(value: boolean, restoreFocus = false): void {
    if (destroyed) return;
    open = value && !control.hidden;
    element.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (open) element.focus();
    else if (restoreFocus && !control.hidden) toggle.focus();
  }
  const abort = new AbortController();
  toggle.addEventListener('click', () => setOpen(!open), { signal: abort.signal });
  element.addEventListener('click', event => { if ((event.target as Element).closest('[data-artifacts-close]')) setOpen(false, true); }, { signal: abort.signal });
  const outside = (event: Event) => { const target = event.target as Node; if (open && !element.contains(target) && !control.contains(target) && !options.dismissExclusions?.some(node => node.contains(target))) setOpen(false); };
  document.addEventListener('click', outside, { signal: abort.signal });
  document.addEventListener('focusin', outside, { signal: abort.signal });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && open && !document.querySelector('dialog[open]')) { event.preventDefault(); setOpen(false, true); } }, { signal: abort.signal });
  return {
    element, setOpen, get open() { return open; },
    update(state: Readonly<ArtifactPanelState>): void {
      if (destroyed) return;
      const focused = document.activeElement;
      control.hidden = !state.ownerId || (!state.files.length && !state.error);
      if (control.hidden) setOpen(false);
      const number = `${state.files.length} ${state.files.length === 1 ? 'file' : 'files'}`;
      const label = state.error ? 'Conversation files unavailable' : `Conversation files (${number})`;
      toggle.setAttribute('aria-label', label); toggle.title = label;
      count.textContent = state.files.length ? String(state.files.length) : '!';
      total.textContent = number;
      loading.hidden = !state.loading;
      error.hidden = !state.error;
      parts.feedback(error).update({ message: state.error, tone: 'error' });
      const keep = new Set(state.files.map(file => `${state.ownerId}/${file.path}`));
      for (const [key, entry] of entries) if (!keep.has(key)) { entry.element.remove(); entries.delete(key); }
      let cursor = rows.firstElementChild;
      for (const file of state.files) {
        const key = `${state.ownerId}/${file.path}`;
        let entry = entries.get(key);
        if (!entry) {
          const article = document.createElement('article'); article.className = 'pui-file-card';
          article.innerHTML = `${icon('file')}<div class="pui-file-info"><strong></strong><span class="pui-file-path">${escape(file.path)}</span></div>${fileActionsMarkup({ kind: 'artifact', ownerId: state.ownerId, path: file.path, preview: true, copyMode: state.copyMode })}`;
          entry = { element: article, name: article.querySelector('strong')!, copy: article.querySelector<HTMLButtonElement>('[data-file-action="copy"], [data-file-action="copy-path"]')! };
          entries.set(key, entry);
        }
        setText(entry.name, file.name);
        const copyAction = state.copyMode === 'file' ? 'copy' : 'copy-path';
        if (entry.copy.dataset.fileAction !== copyAction) entry.copy.dataset.fileAction = copyAction;
        if (entry.copy.dataset.copyPending !== 'true') setText(entry.copy, state.copyMode === 'file' ? 'Copy file' : 'Copy path');
        if (entry.element !== cursor) rows.insertBefore(entry.element, cursor);
        cursor = entry.element.nextElementSibling;
      }
      if (focused instanceof HTMLElement && element.contains(focused) && document.activeElement !== focused) focused.focus({ preventScroll: true });
    },
    destroy(): void { destroyed = true; abort.abort(); parts.destroy(); entries.clear(); element.replaceChildren(); },
  };
}

export interface ResourceDisplayEntry { name: string; path: string; description?: string; content?: string; fileActions?: Node; actions?: Node }
export interface ResourcesPanelState {
  instructions: readonly ResourceDisplayEntry[]; skills: readonly ResourceDisplayEntry[]; templates: readonly ResourceDisplayEntry[];
  diagnostics: readonly string[]; createInstructions?: Node; canCreateInstructions?: boolean;
}
export interface ResourcesPanelOptions { container?: HTMLElement; titleId?: string; dialogId?: string; listId?: string; errorId?: string; onClose?: () => void; onRefresh?: () => void; onCreate?: (kind: 'instructions' | 'skill' | 'template') => void }
export function createResourcesPanel(options: ResourcesPanelOptions = {}) {
  const element = options.container || document.createElement('div');
  const ids = { titleId: options.titleId || uniqueId('pui-resources-title'), dialogId: options.dialogId || uniqueId('pui-resources-dialog'), listId: options.listId || uniqueId('pui-resources-list'), errorId: options.errorId || uniqueId('pui-resources-error') };
  const close = (event: Event) => {
    if (!(event.target as Element).closest('[data-close]')) return;
    if (options.onClose) options.onClose();
    else { const dialog = element.closest('dialog'); if (dialog?.open) dialog.close(); else element.hidden = true; }
  };
  element.addEventListener('click', close);
  let list: HTMLElement | undefined, error: HTMLElement | undefined;
  let destroyed = false;
  const parts = adoptProductParts(element);
  const buttons: ReturnType<typeof createButton>[] = [];
  const rowButtons: ReturnType<typeof createButton>[] = [];
  const createActions = new Map<ReturnType<typeof createButton>,string>(); let createDisabled = false;
  const button = (label: string, onAction: () => void, row = false, create = false) => { const block = createButton({label,appearance:'secondary',onAction,disabled:create && createDisabled}); (row ? rowButtons : buttons).push(block); if (create) createActions.set(block,label); return block.element; };
  const clearButtons = (list = buttons) => { for (const block of list.splice(0)) {createActions.delete(block); block.destroy();} };
  function row(entry: ResourceDisplayEntry, type: 'instructions' | 'skill' | 'template'): HTMLElement {
    const outer = document.createElement('article'); outer.className = type === 'instructions' ? 'pui-resource-card' : 'pui-file-card';
    const body = type === 'instructions' ? document.createElement('div') : outer;
    if (type === 'instructions') body.className = 'pui-file-card';
    body.innerHTML = `${type === 'template' ? '' : icon('file')}<div class="pui-file-info"><strong>${escape(entry.name)}</strong>${type !== 'instructions' ? `<p>${escape(entry.description || '')}</p>` : ''}<span class="pui-file-path">${escape(entry.path)}</span></div>`;
    if (entry.fileActions) body.append(entry.fileActions);
    if (entry.actions) body.append(entry.actions);
    if (type === 'instructions') { outer.append(body); const details = document.createElement('details'); details.className = 'pui-resource-preview'; details.innerHTML = `<summary>View instructions</summary><pre>${escape(entry.content || '')}</pre>`; outer.append(details); }
    return outer;
  }
  return {
    element,
    open(workspaceName: string, toolbar?: Node): void {
      if (destroyed) return;
      clearButtons();
      clearButtons(rowButtons);
      element.hidden = false;
      element.innerHTML = `${dialogHeading('Workspace resources', ids.titleId, ids.dialogId, workspaceName)}<p class="pui-modal-description">Instructions, skills and prompt templates are loaded by Pith for each task. Edit them here or open their Markdown files.</p><div class="pui-feature-toolbar" data-resources-toolbar></div><div id="${escape(ids.listId)}" data-resources-list><p class="pui-feature-hint">Loading workspace resources…</p></div><div id="${escape(ids.errorId)}" data-resources-error class="pui-form-error" role="alert"></div>`;
      const actions = element.querySelector<HTMLElement>('[data-resources-toolbar]')!;
      if (toolbar) actions.append(toolbar);
      else actions.append(button('Refresh', () => options.onRefresh?.()), button('Add skill', () => options.onCreate?.('skill'),false,true), button('Add prompt template', () => options.onCreate?.('template'),false,true));
      list = element.querySelector<HTMLElement>('[data-resources-list]')!;
      error = element.querySelector<HTMLElement>('[data-resources-error]')!;
      parts.layout(actions, 'toolbar').update({});
    },
    setError(message: string): void { if (!destroyed && error) parts.feedback(error).update({ message, tone: 'error' }); },
    setCreateDisabled(disabled: boolean): void {if (destroyed) return; createDisabled = disabled; for (const [block,label] of createActions) block.update({label,appearance:'secondary',disabled});},
    update(state: Readonly<ResourcesPanelState>): void {
      if (destroyed || !list) return;
      clearButtons(rowButtons);
      list.replaceChildren();
      for (const [title, entries, type, empty] of [
        ['Instructions', state.instructions, 'instructions', 'No workspace instructions found.'],
        ['Skills', state.skills, 'skill', 'No skills found. Add .pi/skills/<skill-name>/SKILL.md in this workspace, then refresh.'],
        ['Prompt templates', state.templates, 'template', 'No prompt templates yet.'],
      ] as const) {
        const section = document.createElement('section'); section.className = 'pui-resource-section';
        const heading = document.createElement('h3'); heading.textContent = title; section.append(heading);
        if (entries.length) entries.forEach((entry) => section.append(row(entry, type)));
        else { const hint = document.createElement('p'); hint.className = 'pui-feature-hint'; hint.textContent = empty; section.append(hint); }
        if (type === 'instructions' && state.createInstructions) section.append(state.createInstructions);
        else if (type === 'instructions' && state.canCreateInstructions) section.append(button('Create AGENTS.md in this workspace', () => options.onCreate?.('instructions'),true,true));
        list.append(section);
      }
      parts.update();
      if (state.diagnostics.length) {
        const section = document.createElement('section'); section.className = 'pui-resource-section pui-resource-diagnostics';
        section.innerHTML = `<h3>Resource notes</h3>${state.diagnostics.map((note) => `<p>${escape(note)}</p>`).join('')}`;
        list.append(section);
      }
    },
    destroy(): void { destroyed = true; clearButtons(); clearButtons(rowButtons); parts.destroy(); element.removeEventListener('click', close); element.replaceChildren(); },
  };
}

export interface FilePreviewState { kind: PreviewKind | 'image'; text?: string; imageSrc?: string; imageAlt?: string; truncated?: boolean; error?: string }
export interface FilePreviewOptions { container?: HTMLElement; titleId?: string; dialogId?: string; bodyId?: string; onClose?: () => void }
export function createFilePreview(options: FilePreviewOptions = {}) {
  const element = options.container || document.createElement('div');
  const ids = { titleId: options.titleId || uniqueId('pui-preview-title'), dialogId: options.dialogId || uniqueId('pui-preview-dialog'), bodyId: options.bodyId || uniqueId('pui-preview-body') };
  const close = (event: Event) => {
    if (!(event.target as Element).closest('[data-close]')) return;
    if (options.onClose) options.onClose();
    else { const dialog = element.closest('dialog'); if (dialog?.open) dialog.close(); else element.hidden = true; }
  };
  element.addEventListener('click', close);
  let body: HTMLElement | undefined;
  let page: UIBlock<{ text: string; kind: PreviewKind }> | undefined;
  let destroyed = false;
  function clear(): void { page?.destroy(); page = undefined; element.replaceChildren(); body = undefined; }
  return {
    element, clear,
    open(input: { name: string; path: string; actions: Node }): void {
      if (destroyed) return;
      clear();
      element.hidden = false;
      element.innerHTML = `${dialogHeading(input.name, ids.titleId, ids.dialogId, 'File preview')}<p class="pui-file-preview-path">${escape(input.path)}</p><div id="${escape(ids.bodyId)}" data-file-preview-body class="pui-file-preview-body" aria-live="polite">Loading preview…</div><div class="pui-file-preview-actions"></div>`;
      element.querySelector('.pui-file-preview-actions')!.append(input.actions);
      body = element.querySelector<HTMLElement>('[data-file-preview-body]')!;
    },
    update(state: Readonly<FilePreviewState>): void {
      if (destroyed || !body) return;
      page?.destroy(); page = undefined; body.replaceChildren();
      if (state.error) body.textContent = state.error;
      else if (state.kind === 'image') {
        const image = document.createElement('img'); image.className = 'pui-file-preview-image';
        image.src = state.imageSrc || ''; image.alt = state.imageAlt || '';
        image.setAttribute('role', 'button'); image.tabIndex = 0; image.title = 'Click to enlarge'; body.append(image);
      } else page = createPagedPreview({ container: body, text: state.text || '', kind: state.kind });
      if (state.truncated) { const note = document.createElement('p'); note.className = 'pui-preview-note'; note.textContent = 'Showing the first 8 MiB. Use Open for the complete file.'; body.append(note); }
    },
    destroy(): void { if (destroyed) return; clear(); element.removeEventListener('click', close); destroyed = true; },
  };
}
