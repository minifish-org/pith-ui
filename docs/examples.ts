import type {ActionResult,ConversationViewState,CustomConnectionDraft,CustomConnectionState,ModelEditorState,ModelSelection,SettingsPanelState,SettingsProviderOption,SettingsDraft,MCPConnectionDraft,MCPEditorValue,ResourceEditorState,ResourceDraft,ProviderActionsState,ProviderActionOptions,ResourceActionsState,ResourceActionOptions,MCPConnectionListState,MCPConnectionListOptions,WorkspaceNavigationState,WorkspaceNavigationAction,FilePreviewState} from '../src/index.js';
type PithUI = typeof import('../src/index.js');

/** The block chooses standard typography/spacing automatically; no style or density arguments are needed. */
export function mountProviderChoice(ui: PithUI, host: HTMLElement, onChange: (value: string) => void): () => void {
  ui.setAppearance(host, 'system');
  const provider = ui.createSelect({
    label: '提供商', value: 'pith',
    options: [
      { value: 'pith', label: 'Pith' },
      { value: 'unavailable', label: '暂不可用', disabled: true },
      { value: 'example', label: '示例提供商' },
    ],
    onChange,
  });
  host.append(provider.element);
  provider.focus();
  return () => provider.destroy();
}

/** Native multi-selection reports every selected value; updates do not reset the draft. */
export function mountMultipleChoices(ui: PithUI, host: HTMLElement, onChange: (values: readonly string[]) => void): () => void {
  const choice = ui.createSelect({ label: 'Models', multiple: true, size: 5, values: ['a', 'c'],
    options: [{ value: 'a', label: 'Model A' }, { value: 'b', label: 'Model B' }, { value: 'c', label: 'Model C' }], onValuesChange: onChange });
  host.append(choice.element);
  choice.resetValues(['a', 'b']); // Explicit draft change, without emitting a user-change event.
  return () => choice.destroy();
}

/** Menu errors stay visible in the current surface and can also notify its owner. */
export function mountActionsMenu(ui: PithUI, host: HTMLElement, rename: () => Promise<ActionResult>, onError: (message: string) => void): () => void {
  const menu = ui.createMenu({ label: 'Actions', onError, items: [{ id: 'rename', label: 'Rename', onAction: rename }] });
  host.append(menu.element); return () => menu.destroy();
}

/** Owned semantic callbacks replace dataset routing, with typed target snapshots. */
export function mountProviderActions(ui: PithUI, host: HTMLElement, state: ProviderActionsState, onAction: NonNullable<ProviderActionOptions['onProviderAction']>): () => void {
  const block = ui.createProviderActions(state, { onProviderAction: onAction }); host.append(block.element);
  return () => block.destroy();
}
export function mountResourceActions(ui: PithUI, host: HTMLElement, state: ResourceActionsState, onAction: NonNullable<ResourceActionOptions['onResourceAction']>): () => void {
  const block = ui.createResourceActions(state, { onResourceAction: onAction }); host.append(block.element);
  return () => block.destroy();
}
export function mountMCPList(ui: PithUI, host: HTMLElement, state: MCPConnectionListState, onAction: NonNullable<MCPConnectionListOptions['onAction']>): () => void {
  const block = ui.createMCPConnectionList(state, { onAction }); host.append(block.element);
  return () => block.destroy();
}
export function mountNavigation(ui: PithUI, host: HTMLElement, state: WorkspaceNavigationState, onAction: (action: WorkspaceNavigationAction) => void): () => void {
  const block = ui.createWorkspaceNavigation(state, { onAction }); host.append(block.element);
  return () => block.destroy();
}

/** The host supplies native copying; one feedback owner handles pending, success and errors. */
export function mountFilePreview(ui: PithUI, host: HTMLElement, state: FilePreviewState, writeText: (text: string) => Promise<void>): () => void {
  const status = document.createElement('p'); status.setAttribute('role', 'status');
  const feedback = ui.createCopyFeedback({ status, isDisabled: () => false, onError: error => { status.textContent = error instanceof Error ? error.message : String(error); } });
  const preview = ui.createFilePreview({ onCopyCode: (text, button) => feedback.copy(button, () => writeText(text), 'Code copied') });
  host.append(preview.element, status); preview.update(state);
  return () => { preview.destroy(); feedback.destroy(); status.remove(); };
}

/** Complete API usage; the application supplies only its save operation. */
export function mountTextEditor(ui: PithUI, host: HTMLElement, save: (text: string) => Promise<ActionResult>): () => void {
  ui.setAppearance(host, 'system');
  const dialog = ui.createTextEditDialog({ title: 'Edit message', dialog: document.createElement('dialog'), onSubmit: save });
  const open = ui.createButton({ label: 'Edit', onAction: () => dialog.open({ value: 'Original message' }) });
  host.append(open.element, dialog.element);
  return () => { dialog.destroy(); open.destroy(); open.element.remove(); };
}

/** Public forms retain editable values while the host owns write identity and errors. */
export function mountConnectionEditor(ui: PithUI, host: HTMLElement, initial: CustomConnectionState, save: (draft: CustomConnectionDraft) => Promise<ActionResult>): () => void {
  const editor = ui.createCustomConnectionEditor(initial,{onSubmit:save});
  host.append(editor.element);
  return () => editor.destroy();
}

/** The picker owns its editor, search, native validation and submission lifetime. */
export function mountModelPicker(ui:PithUI,host:HTMLElement,editor:ModelEditorState,save:(selection:ModelSelection)=>Promise<ActionResult>):()=>void {
  const picker = ui.createModelPicker({editor,loading:false},{onSubmit:save});
  host.append(picker.element);
  return () => picker.destroy();
}

/** Credential retention policy stays in the host; no internal field IDs are needed. */
export function mountSettings(ui:PithUI,host:HTMLElement,initial:SettingsPanelState,providers:readonly SettingsProviderOption[],save:(draft:SettingsDraft)=>Promise<ActionResult>):()=>void {
  const panel = ui.createSettingsPanel({...initial,ready:true},{onSubmit:save});
  panel.setProviders(providers);
  host.append(panel.element);
  return () => panel.destroy();
}

/** JSON validation, credentials and the MCP request remain host responsibilities. */
export function mountMCPEditor(ui:PithUI,host:HTMLElement,entry:MCPEditorValue,save:(draft:MCPConnectionDraft)=>Promise<ActionResult>):()=>void {
  const panel = ui.createMCPConnectionsPanel({}, {onSubmit:save});
  host.append(panel.element);
  panel.edit(entry);
  return () => panel.destroy();
}

/** Initial name/content are drafts; feedback updates preserve the edited values. */
export function mountResourceEditor(ui:PithUI,host:HTMLElement,initial:ResourceEditorState,save:(draft:ResourceDraft)=>Promise<ActionResult>):()=>void {
  const editor = ui.createResourceEditor(initial,{onSubmit:save});
  host.append(editor.element);
  return () => editor.destroy();
}

/** A composed shell shares the exact message renderer and reader used by the consumer. */
export function mountConversation(ui: PithUI, host: HTMLElement, initial: ConversationViewState) {
  ui.setAppearance(host, 'system');
  const brand = document.createElement('span'); brand.textContent = 'Example';
  const shell = ui.createWorkspaceShell({ brand });
  const view = ui.createConversationView({ container: shell.part('messages'), onAction: ({ action, messageId }) => { host.dispatchEvent(new CustomEvent('message-action', { detail: { action, messageId } })); } });
  const reader = ui.installConversationReader(shell.part('chat-scroll'), view.element, shell.part('conversation-find'), shell.part<HTMLButtonElement>('back-to-latest'), { keyboardTarget: shell.element, isKeyboardBlocked: () => !!shell.element.querySelector('dialog[open]') });
  host.append(shell.element);
  const update = (state: ConversationViewState): void => { reader.beforeRender(state.id); view.update(state); reader.afterRender(); };
  update(initial);
  return { update, destroy(): void { reader.destroy(); view.destroy(); shell.destroy(); } };
}
