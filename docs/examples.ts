import type {ActionResult,ConversationViewState,CustomConnectionDraft,CustomConnectionState,ModelEditorState,ModelSelection,SettingsPanelState,SettingsProviderOption,SettingsDraft,MCPConnectionDraft,MCPEditorValue,ResourceEditorState,ResourceDraft} from '../src/index.js';
type PithUI = typeof import('../src/index.js');

/** A single choice uses the shared option surface; form adapters stay private to the composition. */
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
