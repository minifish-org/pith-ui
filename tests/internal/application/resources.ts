import type {ActionResult} from '../../../src/core.js';
import {createResourcesPanel, createFileActions} from '../../../src/files/panels.js';
import {createResourceActions} from '../../../src/forms/actions.js';
import {createResourceEditor, type ResourceDraft} from '../../../src/forms/resource-editor.js';
import {createOperation} from '../../../src/operation.js';
import type {AppEnvironment, OwnedSurface} from './internal.js';
import {createLoadingSession, type LoadingState, type LoadingSession} from './session.js';

export type {ResourceDraft} from '../../../src/forms/resource-editor.js';

export type AppResourceKind = 'instructions' | 'skill' | 'template';
export type ResourceActionResult = void | ActionResult | Promise<void | ActionResult>;
export interface AppResourceEntry {
  readonly name: string;
  readonly path: string;
  readonly description?: string;
  readonly content?: string;
}
export interface AppResourceTarget {
  readonly workspaceId: string;
  readonly kind: AppResourceKind;
  readonly name: string;
  readonly path: string;
}
export interface ResourcesState {
  readonly workspace: {readonly id: string; readonly name: string; readonly path: string};
  readonly instructions: readonly AppResourceEntry[];
  readonly skills: readonly AppResourceEntry[];
  readonly templates: readonly AppResourceEntry[];
  readonly diagnostics: readonly string[];
  readonly canCreateInstructions?: boolean;
  readonly loading?: boolean;
  readonly error?: string;
  readonly busy?: boolean;
}
export interface ResourcesCallbacks {
  onRefresh?: () => ResourceActionResult;
  onCreate?: (kind: AppResourceKind) => ResourceActionResult;
  onUse?: (target: AppResourceTarget) => ResourceActionResult;
  onEdit?: (target: AppResourceTarget) => ResourceActionResult;
  onFileAction?: (action: 'open' | 'reveal', target: AppResourceTarget) => ResourceActionResult;
  onClose?: () => void;
}
export interface ResourcesSession {
  read(): Readonly<ResourcesState>;
  update(state: Readonly<ResourcesState>): void;
  fail(message: string): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
}
export interface AppResourceEditorState {
  readonly workspaceId: string;
  readonly workspacePath: string;
  readonly path?: string;
  readonly kind: AppResourceKind;
  readonly name?: string;
  readonly content: string;
  readonly editable: boolean;
  readonly workspaceBusy: boolean;
  readonly error?: string;
  readonly disabled?: boolean;
}
export interface ResourceEditorCallbacks {
  onSubmit?: (draft: ResourceDraft) => ActionResult | Promise<ActionResult>;
  onDelete?: (target: AppResourceTarget) => ResourceActionResult;
  onClose?: () => void;
}
export interface ResourceEditorSession {
  read(): ResourceDraft;
  update(state: Readonly<AppResourceEditorState>): void;
  fail(message: string): void;
  close(): void;
  isOpen(): boolean;
  destroy(): void;
}
export interface ResourcesScene {
  openEditorLoading(state: Readonly<LoadingState> & {readonly kind: AppResourceKind; readonly path?: string}, callbacks?: {onClose?: () => void}): LoadingSession;
  open(state: Readonly<ResourcesState>, callbacks?: ResourcesCallbacks): ResourcesSession;
  openEditor(state: Readonly<AppResourceEditorState>, callbacks?: ResourceEditorCallbacks): ResourceEditorSession;
  destroy(): void;
}

/** Compose the existing resource views; callers never own their DOM or slots. */
export function createResourcesScene(env: AppEnvironment): ResourcesScene {
  let disposed = false;
  let inventory: ResourcesSession | undefined;
  let editor: ResourceEditorSession | undefined;
  let loading: LoadingSession | undefined;
  return {
    openEditorLoading(state, callbacks = {}) {
      loading?.destroy();
      loading = createLoadingSession(env, state.path ? 'Edit workspace resource' : `Create ${state.kind}`, state, callbacks.onClose);
      if (disposed) loading.destroy();
      return loading;
    },
    open(initial, callbacks = {}) {
      inventory?.destroy();
      let state = initial, released = disposed;
      let rendered = false;
      let surface: OwnedSurface | undefined;
      const owner = initial.workspace.id;
      const rows = new Map<string, {
        actions: ReturnType<typeof createResourceActions>;
        files?: ReturnType<typeof createFileActions>;
        operation: ReturnType<typeof createOperation>;
        target: AppResourceTarget;
      }>();
      const current = () => !disposed && !released && !!surface?.isOpen();
      const fail = (message: string) => {if (current()) panel.setError(message);};
      const refresh = createOperation({unavailable: () => !current(), onError: fail});
      const create = createOperation({unavailable: () => !current() || !!state.busy, onPending: () => panel.setCreateDisabled(!!state.busy || create.pending), onError: fail});
      const accept = (result: void | ActionResult) => {if (result && !result.ok) fail(result.error);};
      const panel = createResourcesPanel({
        titleId: env.idPrefix + 'resources-title', dialogId: env.idPrefix + 'resources-dialog',
        listId: env.idPrefix + 'resources-list', errorId: env.idPrefix + 'resources-error',
        onClose: () => surface?.close(),
        onRefresh: () => {if (callbacks.onRefresh) refresh.run(callbacks.onRefresh, accept);},
        onCreate: kind => {if (callbacks.onCreate) create.run(() => callbacks.onCreate!(kind), accept);},
      });
      const release = () => {
        if (released) return;
        released = true; refresh.destroy(); create.destroy();
        for (const row of rows.values()) {row.operation.destroy(); row.actions.destroy(); row.files?.destroy();}
        rows.clear(); panel.destroy();
      };
      panel.open(initial.workspace.name);
      const session: ResourcesSession = {
        read: () => state,
        update(next) {
          if (!current() || next.workspace.id !== owner) return;
          state = next;
          if (next.loading && !rendered && !next.instructions.length && !next.skills.length && !next.templates.length) {
            panel.setCreateDisabled(!!next.busy || create.pending); panel.setError(next.error || ''); return;
          }
          const keep = new Set<string>();
          const entries = (kind: AppResourceKind, values: readonly AppResourceEntry[]) => values.map(value => {
            const key = JSON.stringify([kind, value.path]); keep.add(key);
            const target: AppResourceTarget = Object.freeze({workspaceId: owner, kind, name: value.name, path: value.path});
            let row = rows.get(key);
            if (!row) {
              const actions = createResourceActions({kind, resource: value, workspaceId: owner}, {
                onResourceAction: action => {
                  if (!current()) return;
                  const target = rows.get(key)!.target;
                  return action === 'use-resource' ? callbacks.onUse?.(target) : callbacks.onEdit?.(target);
                }, onError: fail,
              });
              const operation = createOperation({unavailable: () => !current() || !!state.busy,
                onPending: pending => rows.get(key)?.files?.setDisabled(!!state.busy || pending), onError: fail});
              const files = kind === 'template' ? undefined : createFileActions({kind: 'resource', ownerId: owner, path: value.path, copyMode: 'none', onAction: action => {
                if (action !== 'open' && action !== 'reveal') return;
                if (callbacks.onFileAction) operation.run(() => callbacks.onFileAction!(action, rows.get(key)!.target), accept);
              }});
              row = {actions, files, operation, target}; rows.set(key, row);
            }
            row.target = target;
            row.actions.update({kind, resource: value, workspaceId: owner});
            row.files?.setDisabled(!!state.busy || row.operation.pending);
            return {...value, actions: row.actions.element, fileActions: row.files?.element};
          });
          panel.update({instructions: entries('instructions', next.instructions), skills: entries('skill', next.skills), templates: entries('template', next.templates), diagnostics: next.diagnostics, canCreateInstructions: next.canCreateInstructions});
          rendered = true;
          for (const [key, row] of rows) if (!keep.has(key)) {row.operation.destroy(); row.actions.destroy(); row.files?.destroy(); rows.delete(key);}
          panel.setCreateDisabled(!!next.busy || create.pending);
          panel.setError(next.error || '');
        },
        fail,
        close() {if (current()) surface!.close();},
        isOpen: current,
        destroy() {if (released) return; if (surface?.isOpen()) surface.destroy(); release();},
      };
      if (!disposed) {
        surface = env.openDialog('resources', {element: panel.element, destroy: release}, () => {release(); callbacks.onClose?.();});
        inventory = session; session.update(initial);
      } else {released = false; release();}
      return session;
    },
    openEditor(initial, callbacks = {}) {
      editor?.destroy();
      let state = initial, released = disposed;
      let surface: OwnedSurface | undefined;
      let saved = {name: initial.name || '', content: initial.content};
      const identity = JSON.stringify([initial.workspaceId, initial.workspacePath, initial.kind, initial.path]);
      const current = () => !disposed && !released && !!surface?.isOpen();
      const fail = (message: string) => {if (current()) {state = {...state, error: message}; block.update(state);}};
      const deletion = createOperation({unavailable: () => !current() || !!state.disabled || !state.editable || state.workspaceBusy, onError: fail});
      const block = createResourceEditor(initial, {idPrefix: env.idPrefix,
        onSubmit: async draft => {
          saved = draft;
          if (!current() || !callbacks.onSubmit) return {ok: false, error: 'Saving is unavailable.'};
          const result = await callbacks.onSubmit(draft);
          if (current() && result.ok) surface!.close();
          return result;
        },
        onDelete: () => {
          if (!callbacks.onDelete) return;
          const target = Object.freeze({workspaceId: state.workspaceId, kind: state.kind, name: state.name || state.path?.split('/').pop() || '', path: state.path || ''});
          deletion.run(() => callbacks.onDelete!(target), result => {if (result && !result.ok) fail(result.error);});
        },
      });
      const release = () => {if (released) return; saved = block.read(); released = true; deletion.destroy(); block.destroy();};
      const session: ResourceEditorSession = {
        read() {return current() ? block.read() : {...saved};},
        update(next) {if (!current() || JSON.stringify([next.workspaceId, next.workspacePath, next.kind, next.path]) !== identity) return; state = next; block.update(next);},
        fail,
        close() {if (current()) surface!.close();},
        isOpen: current,
        destroy() {if (released) return; if (surface?.isOpen()) surface.destroy(); release();},
      };
      if (!disposed) {
        const title = !initial.editable ? 'Workspace resource' : initial.path ? 'Edit workspace resource' : `Create ${initial.kind}`;
        surface = env.openFeature(title, {element: block.element, destroy: release}, () => {release(); callbacks.onClose?.();});
        editor = session;
      } else {released = false; release();}
      return session;
    },
    destroy() {if (disposed) return; disposed = true; loading?.destroy(); inventory?.destroy(); editor?.destroy();},
  };
}
