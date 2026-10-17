import type {ActionResult} from '../../../src/core.js';
import {adoptAction, type ActionController} from '../../../src/foundations.js';
import {createArtifactPanel, createFileActions, createFilePreview} from '../../../src/files/panels.js';
import {createCopyFeedback} from '../../../src/files/systems.js';
import {createOperation} from '../../../src/operation.js';
import type {AppEnvironment, OwnedSurface} from './internal.js';

export type AppFileAction = 'open' | 'reveal' | 'copy' | 'copy-path';
export type FileActionResult = void | ActionResult | Promise<void | ActionResult>;
export interface AppFileOwner {readonly kind: 'artifact'; readonly id: string}
export interface AppFileTarget {readonly owner: AppFileOwner; readonly name: string; readonly path: string}
export interface FileCapabilities {readonly open?: boolean; readonly reveal?: boolean; readonly copyMode?: 'file' | 'path' | 'none'}
export interface AppFilePreviewState {
  readonly kind: 'text' | 'markdown' | 'diff' | 'image';
  readonly text?: string;
  readonly imageSrc?: string;
  readonly imageAlt?: string;
  readonly truncated?: boolean;
  readonly error?: string;
  readonly disabled?: boolean;
}
export interface FilePreviewInput extends AppFileTarget {
  readonly capabilities: FileCapabilities;
  readonly content?: AppFilePreviewState;
}
export interface FilePreviewCallbacks {
  onFileAction?: (action: AppFileAction, target: AppFileTarget) => FileActionResult;
  onCopyCode?: (text: string) => FileActionResult;
  onClose?: () => void;
}
export interface FilePreviewSession {
  update(state: Readonly<AppFilePreviewState>): void;
  fail(message: string): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
}
export interface AppArtifactsState {
  readonly ownerId: string;
  readonly files: readonly {readonly name: string; readonly path: string}[];
  readonly loading: boolean;
  readonly error: string;
  readonly copyMode: 'file' | 'path';
  readonly disabled?: boolean;
}
export interface ArtifactsCallbacks {
  onPreview?: (target: AppFileTarget) => FileActionResult;
  onFileAction?: (action: AppFileAction, target: AppFileTarget) => FileActionResult;
}
export interface FilesScene {
  updateArtifacts(state: Readonly<AppArtifactsState>, callbacks?: ArtifactsCallbacks): void;
  closeArtifacts(): void;
  areArtifactsOpen(): boolean;
  openPreview(input: Readonly<FilePreviewInput>, callbacks?: FilePreviewCallbacks): FilePreviewSession;
  destroy(): void;
}

/** File data comes from the host; presentation, actions and zoom stay owned here. */
export function createFilesScene(env: AppEnvironment): FilesScene {
  let disposed = false;
  let preview: FilePreviewSession | undefined;
  let artifactState: Readonly<AppArtifactsState> = {ownerId: '', files: [], loading: false, error: '', copyMode: 'path'};
  let artifactCallbacks: ArtifactsCallbacks = {};
  const panel = createArtifactPanel({container: env.part('artifacts'), control: env.part('artifacts-control'), toggle: env.part('artifacts-toggle'), count: env.part('artifacts-count'), headingId: env.idPrefix + 'artifacts-title', dismissExclusions: [env.part('preview-dialog'), env.part('image-dialog')]});
  const operations = new Map<HTMLButtonElement, ReturnType<typeof createOperation>>();
  const actions = new Map<HTMLButtonElement, ActionController>();
  const actionFor = (button: HTMLButtonElement): ActionController => {
    let action = actions.get(button);
    if (!action) {action = adoptAction(button); actions.set(button, action);}
    return action;
  };
  const clearActions = () => {
    for (const operation of operations.values()) operation.destroy(); operations.clear();
    for (const action of actions.values()) action.destroy(); actions.clear();
  };
  const abort = new AbortController();
  let artifactCopy = makeArtifactCopy();
  function makeArtifactCopy() {
    const owner = artifactState.ownerId;
    return createCopyFeedback({status: env.part('copy-status'), isDisabled: () => disposed || !!artifactState.disabled || artifactState.ownerId !== owner,
      onError(error) {if (!disposed && artifactState.ownerId === owner) {artifactState = {...artifactState, error: error instanceof Error ? error.message : String(error)}; panel.update(artifactState);}}});
  }
  async function completed(result: FileActionResult): Promise<void> {
    const value = await result;
    if (value && !value.ok) throw new Error(value.error);
  }
  const targetFor = (path: string): AppFileTarget | undefined => {
    const file = artifactState.files.find(file => file.path === path);
    return file ? Object.freeze({owner: Object.freeze({kind: 'artifact' as const, id: artifactState.ownerId}), name: file.name, path: file.path}) : undefined;
  };
  panel.element.addEventListener('click', event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button');
    if (!button || button.disabled || disposed || artifactState.disabled) return;
    const path = button.dataset.previewPath || button.dataset.filePath;
    if (!path) return;
    event.stopPropagation();
    const target = targetFor(path);
    if (!target) return;
    if (button.dataset.previewPath) {
      if (artifactCallbacks.onPreview) runArtifact(button, () => artifactCallbacks.onPreview!(target));
      return;
    }
    const action = button.dataset.fileAction as AppFileAction;
    if (!artifactCallbacks.onFileAction || !['open','reveal','copy','copy-path'].includes(action)) return;
    if (action === 'copy' || action === 'copy-path') void artifactCopy.copy(button, () => completed(artifactCallbacks.onFileAction!(action,target)), action === 'copy' ? 'File copied.' : 'Path copied.');
    else runArtifact(button, () => artifactCallbacks.onFileAction!(action,target));
  }, {signal: abort.signal});
  function runArtifact(button: HTMLButtonElement, callback: () => FileActionResult): void {
    let operation = operations.get(button);
    if (!operation) {
      const owner = artifactState.ownerId;
      operation = createOperation({unavailable: () => disposed || artifactState.ownerId !== owner || !!artifactState.disabled,
        onPending(pending) {actionFor(button).update({pending, disabled: !!artifactState.disabled});},
        onError(message) {if (!disposed && artifactState.ownerId === owner) {artifactState = {...artifactState,error:message}; panel.update(artifactState);}}});
      operations.set(button,operation);
    }
    operation.run(() => completed(callback()));
  }
  return {
    updateArtifacts(next, callbacks) {
      if (disposed) return;
      if (next.ownerId !== artifactState.ownerId) {
        artifactCopy.destroy(); clearActions();
        panel.setOpen(false);
        artifactState = next; artifactCopy = makeArtifactCopy();
      } else artifactState = next;
      if (callbacks) artifactCallbacks = callbacks;
      panel.update(next);
      for (const button of panel.element.querySelectorAll<HTMLButtonElement>('[data-file-action], [data-preview-path]')) actionFor(button).update({disabled: !!next.disabled});
      for (const [button,operation] of operations) if (!panel.element.contains(button)) {operation.destroy(); operations.delete(button);}
      for (const [button,action] of actions) if (!panel.element.contains(button)) {action.destroy(); actions.delete(button);}
    },
    closeArtifacts() {if (!disposed) panel.setOpen(false);},
    areArtifactsOpen: () => !disposed && panel.open,
    openPreview(input, callbacks = {}) {
      preview?.destroy();
      let released = false;
      let content: Readonly<AppFilePreviewState> = input.content || {kind: 'text'};
      let surface: OwnedSurface | undefined;
      const target: AppFileTarget = Object.freeze({owner: Object.freeze({...input.owner}),name:input.name,path:input.path});
      const current = () => !disposed && !released && !!surface?.isOpen();
      const fail = (message: string) => {if (current()) {content = {...content,error:message}; block.update(content);}};
      const feedback = createCopyFeedback({status: env.part('copy-status'), isDisabled: () => !current() || !!content.disabled, onError: error => fail(error instanceof Error ? error.message : String(error))});
      const operation = createOperation({unavailable: () => !current() || !!content.disabled, onPending: pending => actions.setDisabled(pending || !!content.disabled), onError: fail});
      const actions = createFileActions({kind: 'artifact',ownerId:input.owner.id,path:input.path,copyMode:input.capabilities.copyMode ?? 'none',onAction: action => {
        if (!current() || content.disabled || !callbacks.onFileAction || action === 'preview') return;
        const button = actions.element.querySelector<HTMLButtonElement>(`[data-file-action="${action}"]`);
        if (action === 'copy' || action === 'copy-path') {
          if (button) void feedback.copy(button, () => completed(callbacks.onFileAction!(action,target)), action === 'copy' ? 'File copied.' : 'Path copied.');
        } else operation.run(() => completed(callbacks.onFileAction!(action,target)));
      }});
      if (input.capabilities.open === false) actions.element.querySelector('[data-file-action="open"]')?.remove();
      if (input.capabilities.reveal === false) actions.element.querySelector('[data-file-action="reveal"]')?.remove();
      const block = createFilePreview({titleId:env.idPrefix+'preview-title',dialogId:env.idPrefix+'preview-dialog',bodyId:env.idPrefix+'file-preview-body',onClose:()=>surface?.close(),onCopyCode:(text,button) => {
        if (!current()) return;
        void feedback.copy(button, () => completed(callbacks.onCopyCode ? callbacks.onCopyCode(text) : env.copyText(text)), 'Code copied.');
      }});
      const listeners = new AbortController();
      const zoom = (event: Event) => {
        const image = event.target;
        if (!current() || !(image instanceof HTMLImageElement) || !image.matches('.pui-file-preview-image')) return;
        if (event instanceof KeyboardEvent && (event.isComposing || !['Enter',' '].includes(event.key))) return;
        event.preventDefault(); event.stopPropagation(); env.openImage(image);
      };
      block.element.addEventListener('click',zoom,{signal:listeners.signal}); block.element.addEventListener('keydown',zoom,{signal:listeners.signal});
      block.open({name:input.name,path:input.path,actions:actions.element});
      const release = () => {if (released) return; released = true; listeners.abort(); operation.destroy(); feedback.destroy(); actions.destroy(); block.destroy();};
      const session: FilePreviewSession = {
        update(state) {if (current()) {content = state; block.update(state); actions.setDisabled(!!state.disabled || operation.pending);}},
        fail,
        close() {if (current()) surface!.close();},
        isOpen: current,
        destroy() {if (released) return; if (surface?.isOpen()) surface.destroy(); release();},
      };
      if (!disposed) {
        surface = env.openDialog('preview',{element:block.element,destroy:release},() => {release(); callbacks.onClose?.();});
        preview = session; if (input.content) session.update(input.content);
      } else release();
      return session;
    },
    destroy() {if (disposed) return; disposed = true; preview?.destroy(); abort.abort(); artifactCopy.destroy(); clearActions(); panel.destroy();},
  };
}
