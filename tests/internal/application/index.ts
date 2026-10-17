import {createWorkspaceShell, type WorkspaceDialogName} from '../../../src/workspace.js';
import {createSDKDialogElements, createFeatureDialogFrame} from '../../../src/forms/dialog-frame.js';
import {installImageViewer} from '../../../src/content/image-viewer.js';
import {setAppearance, type Appearance} from '../../../src/theme.js';
import type {ActionResult} from '../../../src/core.js';
import {createWorkspaceScene, type WorkspaceCallbacks, type WorkspaceScene} from './workspace.js';
import {createSettingsScene, type SettingsScene} from './settings.js';
import {createResourcesScene, type ResourcesScene} from './resources.js';
import {createFilesScene, type FilesScene} from './files.js';
import type {AppEnvironment, HostResult, OwnedContent, OwnedSurface} from './internal.js';
import {createApplicationBrandMark} from './brand.js';
import {mount as mountControl, assertModalControl, type Dialog, type TextEditDialog, type ConfirmDialog, type Mount} from '../../../src/controls.js';
export type {LoadingState, LoadingSession} from './session.js';

export type {ActionResult} from '../../../src/core.js';
export type {Appearance} from '../../../src/theme.js';
export type {WorkspaceCallbacks, WorkspaceScene, WorkspaceAction, WorkspaceAvailability, NavigationStatus, NavigationState, ApplicationWorkspace, ApplicationConversation, ConversationState, ImageTarget, ConversationNavigationAction, SceneSession, MessageEditorState, MessageEditorSession, ConfirmationState, ComposerViewState, WorkspaceShellState, WelcomeState, PendingMessagesState, AttachmentsState, PermissionControlState, FullAccessState, TaskFailureState, ApprovalPanelState, RuntimePanelState, CostLedgerState, CompletionNoticeDisplay, ConversationMessage, ConversationAction, ConversationActionAvailability, WorkspacePickerState, RenameConversationState, RenameConversationDraft, BranchHistoryState} from './workspace.js';
export type {SettingsScene, SettingsSession, MCPSession, ModelSession, CustomConnectionSession, ProviderLoginSession, SettingsCredential, SettingsCallbacks, MCPCallbacks, ModelCallbacks, CustomConnectionCallbacks, ProviderLoginCallbacks, SettingsPanelState, SettingsDraft, SettingsProviderOption, MCPConnectionsState, MCPConnectionDraft, MCPEditorValue, MCPConnectionItem, ModelPickerState, ModelSelection, CustomConnectionState, CustomConnectionDraft, ProviderLoginState, UpdatePanelState, ProviderAction, ProviderActionsState, ProviderActionTarget, MCPConnectionAction, MCPConnectionTarget, UpdateAction} from './settings.js';
export type {ResourcesState, ResourcesCallbacks, ResourcesSession, ResourcesScene, AppResourceEntry, AppResourceTarget, AppResourceKind, AppResourceEditorState, ResourceEditorCallbacks, ResourceEditorSession, ResourceActionResult, ResourceDraft} from './resources.js';
export type {FilesScene, AppArtifactsState, ArtifactsCallbacks, AppFileOwner, AppFileTarget, AppFileAction, FileCapabilities, FileActionResult, AppFilePreviewState, FilePreviewInput, FilePreviewCallbacks, FilePreviewSession} from './files.js';
export {formatCost} from '../../../src/files/systems.js';
export {thinkingLabel} from '../../../src/forms/model-editor.js';
export {customModelDefaults} from '../../../src/forms/custom-connection.js';

export interface ApplicationBrand {
  readonly name: string;
  readonly qualifier?: string;
  readonly mark?:
    | {readonly src: string; readonly darkSrc?: string; readonly alt: string; readonly symbol?: never}
    | {readonly symbol: 'pith'; readonly alt: string; readonly src?: never; readonly darkSrc?: never};
}
export interface ApplicationHost {
  copyText?(text: string): HostResult;
  openExternal?(url: string): HostResult;
}
export interface ApplicationState {readonly hasModal: boolean; readonly appearance: Appearance}
export type ApplicationDialog = Dialog | TextEditDialog | ConfirmDialog;
export interface ApplicationOptions {
  readonly brand?: ApplicationBrand;
  readonly appearance?: Appearance;
  readonly host?: ApplicationHost;
  readonly workspace?: WorkspaceCallbacks;
  readonly onUIStateChange?: (state: ApplicationState) => void;
  readonly onError?: (message: string) => void;
}
export interface Application {
  readonly workspace: WorkspaceScene;
  readonly settings: SettingsScene;
  readonly resources: ResourcesScene;
  readonly files: FilesScene;
  read(): ApplicationState;
  setAppearance(appearance: Appearance): void;
  /** Attach one independently composed small dialog, retaining app modal guards. */
  attachDialog(dialog: ApplicationDialog): {destroy(): void};
  downloadFile(file: {readonly blob: Blob; readonly name: string}): Promise<ActionResult>;
  destroy(): void;
}

let sequence = 0;
const resultOf = async (action: () => HostResult): Promise<ActionResult> => {
  try {return await action() || {ok: true};}
  catch (error) {return {ok: false, error: error instanceof Error ? error.message : String(error)};}
};

/** The only DOM argument is the application mount. Scenes return semantic ports. */
export function createApplication(mount: HTMLElement, options: ApplicationOptions = {}): Application {
  const idPrefix = `pui-app-${++sequence}-`;
  let destroyed = false, appearance = options.appearance ?? 'system', lastModal = false;
  const disposals: Array<() => void> = [];
  const fixed = new Map<WorkspaceDialogName, {content: OwnedContent; release(): void}>();
  const fixedOpenings = new Map<WorkspaceDialogName, number>();
  let openingSequence = 0;
  const brand = document.createElement('span'); brand.className = 'pui-app-brand';
  const brandData = options.brand ?? {name: 'Pith'};
  const brandMark = createApplicationBrandMark(brandData.mark);
  if (brandMark) brand.append(brandMark);
  const wordmark = document.createElement('span'); wordmark.textContent = brandData.name;
  if (brandData.qualifier) {const suffix = document.createElement('span'); suffix.className = 'pui-brand-light'; suffix.textContent = ' ' + brandData.qualifier; wordmark.append(suffix);}
  brand.append(wordmark);
  const shell: ReturnType<typeof createWorkspaceShell> = createWorkspaceShell({brand, prefix: idPrefix, composer: {
    onSubmit: options.workspace?.onSubmit,
    onStop: options.workspace?.onStop,
    onInput: options.workspace?.onInput,
    onModel: () => options.workspace?.onAction?.('model'),
    onAttach: () => workspace.pickImages(),
    onImages: options.workspace?.onImages,
    onThinkingChange: options.workspace?.onThinkingChange,
  }, onBusyAction: key => options.workspace?.onBusyAction?.(key),
  onSearch: query => workspace.search(query),
  onDialogClose(name) {fixed.get(name)?.release(); changed();},
  });
  mount.replaceChildren(shell.element);
  const themeRoot = mount.ownerDocument.documentElement;
  setAppearance(themeRoot, appearance);
  const media = matchMedia('(prefers-color-scheme: dark)');
  const assetMark = brandData.mark?.symbol === 'pith' ? undefined : brandData.mark;
  const brandMarkSource = () => (appearance === 'dark' || appearance === 'system' && media.matches) && assetMark?.darkSrc ? assetMark.darkSrc : assetMark?.src || '';
  const syncTheme = () => {
    themeRoot.dataset.theme = appearance === 'system' ? media.matches ? 'dark' : 'light' : appearance;
    const source = brandMarkSource();
    for (const image of shell.element.querySelectorAll<HTMLImageElement>('.pui-app-brand-image')) if (image.getAttribute('src') !== source) image.setAttribute('src', source);
  };
  media.addEventListener('change', syncTheme); disposals.push(() => media.removeEventListener('change', syncTheme)); syncTheme();
  const sdk = createSDKDialogElements({idPrefix}); shell.element.append(sdk.dialog, sdk.oauthDialog);
  const feature = createFeatureDialogFrame({dialog: sdk.dialog, content: sdk.content, titleId: idPrefix + 'sdk-title', errorId: idPrefix + 'sdk-error', onClose: () => changed()});
  const oauth = createFeatureDialogFrame({dialog: sdk.oauthDialog, content: sdk.oauthContent, titleId: idPrefix + 'oauth-title', errorId: idPrefix + 'oauth-frame-error', onClose: () => changed()});
  const frameOpenings = new Map<typeof feature, number>();
  const frameOwners = new Map<typeof feature, (deferNotify?: boolean) => void>();
  const images = installImageViewer(shell.part<HTMLDialogElement>('image-dialog'), {triggerRoot: shell.element});
  const read = (): ApplicationState => Object.freeze({hasModal: !destroyed && !!shell.element.querySelector('dialog[open]'), appearance});
  function notify(callback?: () => void): void {
    try {callback?.();}
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      try {(options.onError ?? options.workspace?.onError)?.(message);} catch {}
    }
  }
  function changed(): void {
    const modal = read().hasModal;
    if (lastModal === modal) return;
    lastModal = modal; notify(() => options.onUIStateChange?.(read()));
  }
  // Image zoom and native dialog dismissal also participate in the same modal
  // state; this observer is UI-local and never starts business work or polling.
  const observer = new MutationObserver(changed);
  observer.observe(shell.element, {subtree: true, attributes: true, attributeFilter: ['open']});
  const copyText = (text: string) => resultOf(async () => {
    if (destroyed) return {ok: false, error: 'Application has been destroyed.'};
    if (options.host?.copyText) return options.host.copyText(text);
    await navigator.clipboard.writeText(text); return {ok: true};
  });
  const openExternal = (value: string) => resultOf(async () => {
    if (destroyed) return {ok: false, error: 'Application has been destroyed.'};
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return {ok: false, error: 'Unsupported external link.'};
    if (options.host?.openExternal) return options.host.openExternal(url.href);
    window.open(url.href, '_blank', 'noopener,noreferrer'); return {ok: true};
  });
  const frameOpen = (frame: typeof feature, title: string, content: OwnedContent, onClose?: () => void): OwnedSurface => {
    const opening = ++openingSequence; frameOpenings.set(frame, opening);
    let alive = !destroyed;
    const release = (deferNotify = false) => {
      if (!alive) return; alive = false;
      if (frameOwners.get(frame) === release) frameOwners.delete(frame);
      try {content.destroy();} finally {if (deferNotify) queueMicrotask(() => notify(onClose)); else notify(onClose);}
    };
    // Native dismissal clears the frame synchronously. Notify the host after
    // that clear so a new opening from onClose cannot be erased by the old one.
    const guarded: OwnedContent = {element: content.element, destroy: () => release(true)};
    const isOpen = () => alive && !destroyed && frameOwners.get(frame) === release && frame.isOpen();
    const close = () => {if (!alive) return; if (frameOwners.get(frame) !== release) {release(); return;} try {frame.close();} finally {try {release();} finally {changed();}}};
    if (alive) {
      frameOwners.get(frame)?.();
      if (destroyed || frameOpenings.get(frame) !== opening) release();
      else {frameOwners.set(frame, release); frame.open({title, body: guarded}); changed();}
    } else content.destroy();
    return {isOpen, close, destroy: close, fail(message) {if (isOpen()) frame.fail(message);}};
  };
  const environment: AppEnvironment = {
    idPrefix, productName: [brandData.name, brandData.qualifier].filter(Boolean).join(' '), brandMarkSource, part: shell.part, copyText, openExternal, hasModal: () => read().hasModal, changed, notifyClose: notify,
    openImage: image => {if (!destroyed) {images.open(image); changed();}},
    closeImage() {images.close(); changed();},
    openDialog(name, content, onClose) {
      const opening = ++openingSequence; fixedOpenings.set(name, opening);
      let alive = !destroyed;
      const dialog = shell.part<HTMLDialogElement>(name + '-dialog');
      const release = () => {
        if (!alive) return; alive = false;
        if (fixed.get(name)?.content === content) fixed.delete(name);
        try {content.destroy();} finally {notify(onClose);}
      };
      const isOpen = () => alive && !destroyed && fixed.get(name)?.content === content && dialog.open;
      const close = () => {if (!alive || fixed.get(name)?.content !== content) return; try {shell.closeDialog(name);} finally {try {release();} finally {changed();}}};
      if (alive) {
        fixed.get(name)?.release();
        if (destroyed || fixedOpenings.get(name) !== opening) release();
        else {
          fixed.set(name, {content, release});
          shell.part(name + '-content').replaceChildren(content.element);
          shell.openDialog(name); changed();
        }
      } else content.destroy();
      return {isOpen, close, destroy: close, fail(message) {
        if (!isOpen()) return;
        const error = content.element.querySelector<HTMLElement>('[data-dialog-error]') ?? content.element.querySelector<HTMLElement>('.pui-form-error[role="alert"]');
        if (error) error.textContent = message;
      }};
    },
    openFeature: (title, content, onClose) => frameOpen(feature, title, content, onClose),
    openOAuth: (title, content, onClose) => frameOpen(oauth, title, content, onClose),
  };
  const workspace = createWorkspaceScene(environment, shell, options.workspace ?? {}, brandData);
  const settings = createSettingsScene(environment), resources = createResourcesScene(environment), files = createFilesScene(environment);
  const downloads = new Map<string, ReturnType<typeof setTimeout>>();
  const attachedDialogs = new Set<Mount>();
  return {
    workspace, settings, resources, files, read,
    setAppearance(next) {if (destroyed) return; appearance = next; setAppearance(themeRoot, next); for (const dialog of attachedDialogs) dialog.setAppearance(next); syncTheme(); notify(() => options.onUIStateChange?.(read()));},
    attachDialog(dialog) {
      if (destroyed) throw new Error('Application has been destroyed.');
      assertModalControl(dialog);
      const host = document.createElement('div'); host.className = 'pui-owned-controls';
      shell.element.append(host);
      let mounted: Mount;
      try {mounted = mountControl(host, dialog, {appearance});}
      catch (error) {host.remove(); throw error;}
      attachedDialogs.add(mounted);
      let released = false;
      return {destroy() {if (released) return; released = true; attachedDialogs.delete(mounted); mounted.destroy(); host.remove(); changed();}};
    },
    async downloadFile({blob, name}) {
      if (destroyed) return {ok: false, error: 'Application has been destroyed.'};
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      try {link.href = url; link.download = name; shell.element.append(link); link.click(); return {ok: true};}
      catch (error) {return {ok: false, error: error instanceof Error ? error.message : String(error)};}
      finally {link.remove(); if (destroyed) URL.revokeObjectURL(url); else downloads.set(url, setTimeout(() => {URL.revokeObjectURL(url); downloads.delete(url);}, 30_000));}
    },
    destroy() {
      if (destroyed) return; destroyed = true;
      observer.disconnect(); disposals.splice(0).forEach(dispose => dispose());
      for (const dialog of attachedDialogs) dialog.destroy(); attachedDialogs.clear();
      workspace.destroy(); settings.destroy(); resources.destroy(); files.destroy();
      for (const owner of [...fixed.values()]) owner.release(); fixed.clear();
      for (const release of [...frameOwners.values()]) release(); frameOwners.clear();
      feature.destroy(); oauth.destroy(); images.destroy(); sdk.destroy(); shell.destroy();
      for (const [url, timer] of downloads) {clearTimeout(timer); URL.revokeObjectURL(url);} downloads.clear(); changed();
    },
  };
}
