import { dialogHeading, escape, icon, uniqueId, setText } from '../dom.js';
import type { UIBlock } from '../core.js';
import { createPagedPreview, type PreviewKind } from '../content/paged-preview.js';
import { adoptProductParts } from '../foundations.js';
import { createButton } from '../primitives.js';
import { bindContentClose, installAnchoredSurface } from '../surface.js';
import { reconcileKeyed } from '../reconcile.js';

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
  const parts = adoptProductParts(element);
  let destroyed = false;
  const click = (event: Event) => {
    const target = (event.target as Element).closest<HTMLElement>('button');
    if (target && element.contains(target) && !(target as HTMLButtonElement).disabled) {
      event.stopPropagation(); options.onAction?.(target.dataset.fileAction as 'open' | 'reveal' | 'copy' | 'copy-path' || 'preview');
    }
  };
  if (options.onAction) element.addEventListener('click', click);
  return {
    element,
    setDisabled(disabled: boolean): void { if (!destroyed) for (const button of element.querySelectorAll('button')) parts.action(button).update({disabled}); },
    destroy(): void { if (destroyed) return; destroyed = true; parts.destroy(); element.removeEventListener('click', click); element.remove(); },
  };
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
  let destroyed = false;
  const surface = installAnchoredSurface({
    trigger: toggle,
    panel: element,
    position: false,
    closeOnFocusOut: true,
    exclusions: [control, ...(options.dismissExclusions ?? [])],
    canOpen: () => !control.hidden,
    canEscape: () => !document.querySelector('dialog[open]'),
    onToggle(open) { if (open) element.focus(); },
  });
  function setOpen(value: boolean, restoreFocus = false): void {
    if (destroyed) return;
    if (value) surface.open();
    else surface.close(restoreFocus && !control.hidden);
  }
  const abort = new AbortController();
  toggle.addEventListener('click', () => setOpen(!surface.isOpen()), { signal: abort.signal });
  element.addEventListener('click', event => { if ((event.target as Element).closest('[data-artifacts-close]')) setOpen(false, true); }, { signal: abort.signal });
  return {
    element, setOpen, get open() { return surface.isOpen(); },
    update(state: Readonly<ArtifactPanelState>): void {
      if (destroyed) return;
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
      reconcileKeyed(rows, entries, state.files, {
        key: file => `${state.ownerId}/${file.path}`,
        element: entry => entry.element,
        create(file) {
          const article = document.createElement('article'); article.className = 'pui-file-card';
          article.innerHTML = `${icon('file')}<div class="pui-file-info"><strong></strong><span class="pui-file-path">${escape(file.path)}</span></div>${fileActionsMarkup({ kind: 'artifact', ownerId: state.ownerId, path: file.path, preview: true, copyMode: state.copyMode })}`;
          return { element: article, name: article.querySelector('strong')!, copy: article.querySelector<HTMLButtonElement>('[data-file-action="copy"], [data-file-action="copy-path"]')! };
        },
        update(entry, file) {
          setText(entry.name, file.name);
          const copyAction = state.copyMode === 'file' ? 'copy' : 'copy-path';
          if (entry.copy.dataset.fileAction !== copyAction) entry.copy.dataset.fileAction = copyAction;
          if (entry.copy.dataset.copyPending !== 'true') setText(entry.copy, state.copyMode === 'file' ? 'Copy file' : 'Copy path');
        },
        destroy() {},
      });
      parts.update();
    },
    destroy(): void { destroyed = true; surface.destroy(); abort.abort(); parts.destroy(); entries.clear(); element.replaceChildren(); },
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
  const close = bindContentClose(element, { dialogId: ids.dialogId, onClose: options.onClose });
  let list: HTMLElement | undefined, error: HTMLElement | undefined;
  let destroyed = false;
  const parts = adoptProductParts(element);
  const buttons: ReturnType<typeof createButton>[] = [];
  const rowButtons: ReturnType<typeof createButton>[] = [];
  type Slot = { source?: Node; nodes: ChildNode[] };
  type ResourceRow = { element: HTMLElement; body?: HTMLElement; name?: HTMLElement; description?: HTMLElement; path?: HTMLElement; content?: HTMLElement; slots?: [Slot, Slot] };
  type Section = { element: HTMLElement; rows: Map<string, ResourceRow>; create: Slot };
  const sections = new Map<string, Section>();
  let diagnostics: Section | undefined;
  let instructionButton: ReturnType<typeof createButton> | undefined;
  const createActions = new Map<ReturnType<typeof createButton>,string>(); let createDisabled = false;
  const button = (label: string, onAction: () => void, row = false, create = false) => { const block = createButton({label,appearance:'secondary',onAction,disabled:create && createDisabled}); (row ? rowButtons : buttons).push(block); if (create) createActions.set(block,label); return block.element; };
  const clearButtons = (list = buttons) => { for (const block of list.splice(0)) {createActions.delete(block); block.destroy();} };
  function updateSlot(parent: HTMLElement, slot: Slot, source?: Node): void {
    if (slot.source === source) return;
    for (const node of slot.nodes) if (node.parentNode === parent) node.remove();
    slot.source = source;
    slot.nodes = source ? source instanceof DocumentFragment ? [...source.childNodes] : [source as ChildNode] : [];
  }
  function row(type: 'instructions' | 'skill' | 'template'): ResourceRow {
    const outer = document.createElement('article'); outer.className = type === 'instructions' ? 'pui-resource-card' : 'pui-file-card';
    const body = type === 'instructions' ? document.createElement('div') : outer;
    if (type === 'instructions') body.className = 'pui-file-card';
    body.innerHTML = `${type === 'template' ? '' : icon('file')}<div class="pui-file-info"><strong></strong>${type !== 'instructions' ? '<p></p>' : ''}<span class="pui-file-path"></span></div>`;
    let content: HTMLElement | undefined;
    if (type === 'instructions') { outer.append(body); const details = document.createElement('details'); details.className = 'pui-resource-preview'; details.innerHTML = '<summary>View instructions</summary><pre></pre>'; outer.append(details); content = details.querySelector('pre')!; }
    return { element: outer, body, name: body.querySelector('strong')!, description: body.querySelector('p') || undefined, path: body.querySelector<HTMLElement>('.pui-file-path')!, content, slots: [{nodes:[]}, {nodes:[]}] };
  }
  function updateRow(row: ResourceRow, entry: ResourceDisplayEntry): void {
    setText(row.name!, entry.name); setText(row.path!, entry.path);
    if (row.description) setText(row.description, entry.description || '');
    if (row.content) setText(row.content, entry.content || '');
    updateSlot(row.body!, row.slots![0], entry.fileActions); updateSlot(row.body!, row.slots![1], entry.actions);
    let cursor = row.body!.querySelector('.pui-file-info')!.nextSibling;
    for (const node of row.slots!.flatMap(slot => slot.nodes)) {
      if (node !== cursor) row.body!.insertBefore(node, cursor);
      cursor = node.nextSibling;
    }
  }
  function section(): Section {
    const element = document.createElement('section'); element.className = 'pui-resource-section';
    return {element, rows:new Map(), create:{nodes:[]}};
  }
  return {
    element,
    open(workspaceName: string, toolbar?: Node): void {
      if (destroyed) return;
      clearButtons();
      clearButtons(rowButtons);
      instructionButton = undefined; sections.clear(); diagnostics = undefined;
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
      if (!sections.size) list.replaceChildren();
      for (const [title, entries, type, empty] of [
        ['Instructions', state.instructions, 'instructions', 'No workspace instructions found.'],
        ['Skills', state.skills, 'skill', 'No skills found. Add .pi/skills/<skill-name>/SKILL.md in this workspace, then refresh.'],
        ['Prompt templates', state.templates, 'template', 'No prompt templates yet.'],
      ] as const) {
        let current = sections.get(type);
        if (!current) { current = section(); sections.set(type, current); list.append(current.element); }
        type Item = { key: string; kind: 'heading' | 'empty' | 'entry'; entry?: ResourceDisplayEntry };
        const items: Item[] = [{key:'heading', kind:'heading'}, ...entries.map(entry => ({key:`entry:${entry.path}`, kind:'entry' as const, entry}))];
        if (!entries.length) items.push({key:'empty', kind:'empty'});
        reconcileKeyed(current.element, current.rows, items, {
          key: item => item.key, element: row => row.element,
          create(item) {
            if (item.kind === 'entry') return row(type);
            const element = document.createElement(item.kind === 'heading' ? 'h3' : 'p');
            if (item.kind === 'empty') element.className = 'pui-feature-hint';
            return {element};
          },
          update(row, item) { if (item.entry) updateRow(row, item.entry); else setText(row.element, item.kind === 'heading' ? title : empty); },
          destroy() {},
        });
        if (type === 'instructions') {
          let create = state.createInstructions;
          if (!create && state.canCreateInstructions) {
            if (!instructionButton) {
              const element = button('Create AGENTS.md in this workspace', () => options.onCreate?.('instructions'), true, true);
              instructionButton = rowButtons.find(block => block.element === element)!;
            }
            create = instructionButton.element;
          }
          updateSlot(current.element, current.create, create);
          for (const node of current.create.nodes) if (node.parentNode !== current.element) current.element.append(node);
        }
      }
      if (state.diagnostics.length) {
        if (!diagnostics) { diagnostics = section(); diagnostics.element.classList.add('pui-resource-diagnostics'); list.append(diagnostics.element); }
        reconcileKeyed(diagnostics.element, diagnostics.rows, [{key:'heading', text:'Resource notes'}, ...state.diagnostics.map((text,index) => ({key:`note:${index}`, text}))], {
          key: value => value.key, element: row => row.element,
          create(value) { return {element:document.createElement(value.key === 'heading' ? 'h3' : 'p')}; },
          update(row, value) {setText(row.element, value.text);}, destroy() {},
        });
      } else if (diagnostics) { diagnostics.element.remove(); diagnostics = undefined; }
      parts.update();
    },
    destroy(): void { if (destroyed) return; destroyed = true; clearButtons(); clearButtons(rowButtons); sections.clear(); diagnostics = undefined; parts.destroy(); close.destroy(); element.replaceChildren(); },
  };
}

export interface FilePreviewState { kind: PreviewKind | 'image'; text?: string; imageSrc?: string; imageAlt?: string; truncated?: boolean; error?: string }
export interface FilePreviewOptions { container?: HTMLElement; titleId?: string; dialogId?: string; bodyId?: string; onClose?: () => void; onCopyCode?: (text: string, button: HTMLButtonElement) => void }
export function createFilePreview(options: FilePreviewOptions = {}) {
  const element = options.container || document.createElement('div');
  const ids = { titleId: options.titleId || uniqueId('pui-preview-title'), dialogId: options.dialogId || uniqueId('pui-preview-dialog'), bodyId: options.bodyId || uniqueId('pui-preview-body') };
  const close = bindContentClose(element, { dialogId: ids.dialogId, onClose: options.onClose });
  let body: HTMLElement | undefined;
  let page: UIBlock<{ text: string; kind: PreviewKind }> | undefined;
  let image: HTMLImageElement | undefined;
  let note: HTMLElement | undefined;
  let mode: FilePreviewState['kind'] | 'error' | undefined;
  let destroyed = false;
  function clear(): void {
    if (destroyed) return;
    page?.destroy(); page = undefined; image = undefined; note = undefined; mode = undefined;
    element.replaceChildren(); body = undefined;
  }
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
      const nextMode = state.error ? 'error' : state.kind;
      if (mode !== nextMode) {
        page?.destroy(); page = undefined; image = undefined; note = undefined;
        body.replaceChildren(); mode = nextMode;
      }
      if (state.error) setText(body, state.error);
      else if (state.kind === 'image') {
        if (!image) {
          image = document.createElement('img'); image.className = 'pui-file-preview-image';
          image.setAttribute('role', 'button'); image.tabIndex = 0; image.title = 'Click to enlarge'; body.append(image);
        }
        if (image.getAttribute('src') !== (state.imageSrc || '')) image.src = state.imageSrc || '';
        if (image.alt !== (state.imageAlt || '')) image.alt = state.imageAlt || '';
      } else if (page) page.update({ text: state.text || '', kind: state.kind });
      else page = createPagedPreview({ container: body, text: state.text || '', kind: state.kind, onCopyCode: options.onCopyCode });
      if (state.truncated) {
        if (!note) { note = document.createElement('p'); note.className = 'pui-preview-note'; note.textContent = 'Showing the first 8 MiB. Use Open for the complete file.'; }
        if (note.parentElement !== body) body.append(note);
      } else { note?.remove(); note = undefined; }
    },
    destroy(): void { if (destroyed) return; clear(); close.destroy(); destroyed = true; },
  };
}
