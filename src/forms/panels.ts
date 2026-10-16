import {type ActionResult, type UIBlock, type UIAction} from '../core.js';
import {scopeIds,bindFormSubmission} from './identity.js';
import { dialogHeading, escape, icon, uniqueId, setText } from '../dom.js';
import {createModelEditor, modelEditorMarkup, type ModelEditorState, type ModelSelection} from './model-editor.js';
import {adoptAction,adoptProductParts,reconcileSelectOptions,type ActionController} from '../foundations.js';
import {createOperation} from '../operation.js';
import {reconcileKeyed} from '../reconcile.js';
export {modelEditorMarkup} from './model-editor.js';

export interface FormFeedback { error?: string; disabled?: boolean }
export interface FormDOMBlock<State extends FormFeedback> extends UIBlock<State> {
  field<T extends HTMLElement = HTMLElement>(id: string): T;
  id(localId: string): string;
}
function formBlock<State extends FormFeedback>(markup: string, className: string, initial: State, prefix = ''): FormDOMBlock<State> & {parts: ReturnType<typeof adoptProductParts>} {
  const element = document.createElement('div');
  element.className = className;
  element.innerHTML = markup; scopeIds(element, prefix);
  const parts = adoptProductParts(element); let destroyed = false;
  const field = <T extends HTMLElement = HTMLElement>(id: string): T => {
    const result = Array.from(element.querySelectorAll<HTMLElement>('[id]')).find((node) => node.getAttribute('id') === prefix + id);
    if (!result) throw new Error(`Unknown component field: ${id}`);
    return result as T;
  };
  const update = (state: Readonly<State>) => {
    if (destroyed) return;
    if (state.error !== undefined) {
      const error = element.querySelector<HTMLElement>('[data-dialog-error]') || element.querySelector<HTMLElement>('.pui-form-error[role="alert"]');
      if (error) parts.feedback(error).update({message:state.error,tone:'error'});
    }
    if (state.disabled !== undefined) {
      for (const control of element.querySelectorAll<HTMLButtonElement>('button[type="submit"]')) {
        parts.action(control).update({disabled:state.disabled,pending:control.dataset.controlPending === 'true'});
      }
    }
  };
  update(initial);
  return {element,field,parts,id:(id) => prefix + id,update,destroy() {if (destroyed) return; destroyed = true; parts.destroy(); element.remove();}};
}
export interface SettingsPanelState extends FormFeedback { baseUrl: string; hasApiKey: boolean; ready?: boolean; testing?: boolean; appearance?: {mode: 'light' | 'dark' | 'system'; disabled?: boolean; error?: string}; testResult?: {message: string; ok?: boolean} }
export interface FormOptions { idPrefix?: string }
export interface SettingsDraft {provider: string; baseUrl: string; apiKey: string}
export interface SettingsProviderOption {id: string; name: string; configured?: boolean; signedIn?: boolean}
export interface SettingsCredentialView {status: string; hidden: boolean; required: boolean; placeholder: string; removeVisible: boolean; hint?: string; actions?: Node}
export interface SettingsPanel extends FormDOMBlock<SettingsPanelState> {read(): SettingsDraft; setProviders(providers: readonly SettingsProviderOption[], selected?: string): void; resetProvider(value: {provider: string; baseUrl: string; clearKey?: boolean; collapseAdvanced?: boolean}): void; setCredential(view: SettingsCredentialView): void; clearSecrets(): void; readonly updates: HTMLElement}
export interface SettingsPanelOptions extends FormOptions {onAppearanceChange?: (mode: string) => void; onProviderChange?: (provider: string) => void; onDraftChange?: (draft: SettingsDraft) => void; onSubmit?: (draft: SettingsDraft) => ActionResult | Promise<ActionResult>; onTest?: (draft: SettingsDraft) => void; onRemoveKey?: (draft: SettingsDraft) => ActionResult | Promise<ActionResult>}
export function createSettingsPanel(state: SettingsPanelState, options: SettingsPanelOptions = {}): SettingsPanel {
  const block = formBlock(`
    ${dialogHeading('Settings', 'settings-title', 'settings-dialog', 'MAKE IT YOURS')}
    <section class="pui-settings-section pui-appearance-settings" aria-labelledby="appearance-title">
      <h3 id="appearance-title">Appearance</h3>
      <p class="pui-appearance-hint" id="appearance-hint">A bright white workspace or a calm dark one, both with a blue accent. Follow system matches your computer.</p>
      <label class="pui-sr-only" for="appearance-mode">Appearance</label>
      <select id="appearance-mode" class="pui-appearance-select" aria-describedby="appearance-hint"><option value="system">Follow system</option><option value="light">Light</option><option value="dark">Dark</option></select>
      <div id="appearance-error" class="pui-form-error" role="alert"></div>
    </section>
    <section id="update-settings" class="pui-settings-section pui-update-settings" aria-labelledby="update-title">
      <h3 id="update-title">Updates</h3>
      <div class="pui-settings-copy">
        <p class="pui-field-hint" data-update-version></p>
        <p class="pui-field-hint" role="status" aria-live="polite" data-update-message>Loading update status…</p>
      </div>
      <progress max="100" value="0" aria-label="Update progress" hidden></progress>
      <div class="pui-settings-actions"><button class="pui-secondary-button" type="button" data-update-check disabled>Check for updates</button><button class="pui-primary-button" type="button" data-update-install hidden>Update and restart</button></div>
    </section>
    <form id="settings-form">
      <section class="pui-settings-section" aria-labelledby="provider-title">
        <h3 id="provider-title">Model providers</h3>
        <p class="pui-modal-description">Connect your model providers here. Choose models and thinking effort beside the message box.</p>
        <div class="pui-settings-actions"><button class="pui-secondary-button" type="button" data-sdk="custom">Add independent model connection</button></div>
        <div class="pui-settings-field">
          <label class="pui-field-label" for="settings-provider">Provider</label>
          <select id="settings-provider" class="pui-feature-select" required disabled><option value="">Loading providers…</option></select>
          <div id="provider-actions" hidden></div>
          <p id="provider-auth-hint" class="pui-field-hint" hidden></p>
        </div>
        <details id="provider-advanced" class="pui-provider-advanced">
          <summary>Advanced connection settings</summary>
          <label class="pui-field-label" for="base-url">API base URL</label>
          <div class="pui-input-with-icon">${icon('globe')}<input id="base-url" name="baseUrl" type="url" required value="${escape(state.baseUrl)}" autocomplete="off" /></div>
          <p class="pui-field-hint">The provider’s endpoint is filled in automatically. Change it only for a proxy or custom service.</p>
        </details>
        <div id="provider-api-key" class="pui-settings-field">
          <label class="pui-field-label" for="api-key">API key <span id="key-status" class="pui-configured-badge"></span></label>
          <input id="api-key" name="apiKey" type="password" placeholder="${state.hasApiKey ? 'Leave blank to keep your current key' : 'Paste your API key'}" autocomplete="new-password" ${state.hasApiKey ? '' : 'required'} />
          <p class="pui-field-hint">The saved key is never returned to this page. Model requests go to your configured provider.</p>
          <button class="pui-secondary-button pui-destructive-button" id="remove-key" type="button" hidden>Remove saved API key</button>
        </div>
      </section>
      <section class="pui-settings-section pui-connection-test">
        <p class="pui-field-hint">Uses this provider’s last selected model, or Pith’s default, to check streaming and tool calling. Does not save settings or access files.</p>
        <div class="pui-settings-actions"><button type="button" class="pui-secondary-button" id="test-connection" data-control-pending="true" disabled data-global-idle data-idle-action>Test connection</button></div>
        <div id="connection-test-result" role="status" aria-live="polite"></div>
      </section>
      <div id="settings-error" data-dialog-error class="pui-form-error" role="alert"></div>
      <section class="pui-settings-section pui-diagnostics-setting">
        <p class="pui-field-hint">Version, usage and failure category only; no conversation, file contents, paths or credentials.</p>
        <div class="pui-settings-actions"><button type="button" class="pui-secondary-button" data-action="diagnostics">Save diagnostics</button></div>
      </section>
      <div class="pui-modal-footer"><button class="pui-secondary-button" type="button" data-pui-close data-close="settings-dialog">Cancel</button><button class="pui-primary-button" id="save-settings" data-control-pending="true" disabled data-global-idle type="submit">Save settings</button></div>
    </form>`, 'pui-settings-panel', state, options.idPrefix ?? uniqueId('pui-form') + '-');
  const $ = block.field, abort = new AbortController(); let current = state, pending = false, removing = false, destroyed = false, operationKind: 'submit' | 'remove' = 'submit';
  // These controls also exist before providers or appearance state have loaded.
  // Adopt them eagerly so the first rendered frame uses the shared selector.
  block.parts.control($<HTMLSelectElement>('appearance-mode'));
  block.parts.control($<HTMLSelectElement>('settings-provider'));
  const form = $<HTMLFormElement>('settings-form'), submit = $<HTMLButtonElement>('save-settings'), test = $<HTMLButtonElement>('test-connection'), remove = $<HTMLButtonElement>('remove-key');
  const read = (): SettingsDraft => {const key = $<HTMLInputElement>('api-key'); return {provider:block.parts.control($<HTMLSelectElement>('settings-provider')).getValue(),baseUrl:block.parts.control($<HTMLInputElement>('base-url')).getValue().trim(),apiKey:key.disabled ? '' : block.parts.control(key).getValue().trim()};};
  const update = (next: Readonly<SettingsPanelState>) => {
    if (destroyed) return; current = next; block.update(next);
    block.parts.action(submit).update({disabled:next.disabled,pending:pending || removing || !!next.testing || next.ready !== true});
    block.parts.action(test).update({label:next.testing ? 'Cancel test' : 'Test connection',disabled:!!next.disabled || pending || removing,pending:next.ready !== true});
    block.parts.action(remove).update({disabled:!!next.disabled || pending || !!next.testing || next.ready !== true,pending:removing});
    if (next.appearance) {const appearance = block.parts.control($<HTMLSelectElement>('appearance-mode')); appearance.reset(next.appearance.mode); appearance.update({disabled:!!next.appearance.disabled}); block.parts.feedback($('appearance-error')).update({message:next.appearance.error || '',tone:'error'});}
    if (next.testResult) {const result = $('connection-test-result'); result.textContent = next.testResult.message; result.className = next.testResult.ok === undefined ? '' : next.testResult.ok ? 'pui-test-success' : 'pui-form-error';}
  };
  const operation = createOperation({unavailable:() => !!current.disabled || !!current.testing || current.ready !== true,
    onPending(value) {pending = value && operationKind === 'submit'; removing = value && operationKind === 'remove'; update(current);},
    onError(error) {update({...current,error});}});
  const run = (action: SettingsPanelOptions['onSubmit'], kind: 'submit' | 'remove') => {
    if (!action || operation.pending || current.disabled || current.testing || current.ready !== true) return;
    if (kind === 'submit' && !form.reportValidity()) return;
    operationKind = kind;
    operation.run(() => {update({...current,error:''}); return action(read());}, result => {if (!result.ok) update({...current,error:result.error});});
  };
  form.addEventListener('submit',event => {if (options.onSubmit) {event.preventDefault(); void run(options.onSubmit,'submit');}}, {signal:abort.signal});
  remove.addEventListener('click',() => {void run(options.onRemoveKey,'remove');}, {signal:abort.signal});
  test.addEventListener('click',() => {if (!test.disabled && (current.testing || form.reportValidity())) options.onTest?.(read());}, {signal:abort.signal});
  $<HTMLSelectElement>('appearance-mode').addEventListener('change',() => options.onAppearanceChange?.($<HTMLSelectElement>('appearance-mode').value), {signal:abort.signal});
  $<HTMLSelectElement>('settings-provider').addEventListener('change',() => options.onProviderChange?.(read().provider), {signal:abort.signal});
  form.addEventListener('input',() => options.onDraftChange?.(read()), {signal:abort.signal});
  $<HTMLInputElement>('base-url').addEventListener('invalid',() => {$<HTMLDetailsElement>('provider-advanced').open = true;}, {signal:abort.signal});
  update(state);
  return {...block,read,update,updates:$('update-settings'),
    setProviders(providers, selected) {if (destroyed) return; const select = $<HTMLSelectElement>('settings-provider'),previous = selected ?? select.value; reconcileSelectOptions(select,providers.map(provider=>({value:provider.id,label:`${provider.name}${provider.signedIn ? ' · Signed in' : provider.configured ? ' · Configured' : ''}`})),providers.some(provider=>provider.id === previous) ? previous : providers[0]?.id || ''); block.parts.control(select).update({disabled:!providers.length});},
    resetProvider(value) {if (destroyed) return; operation.invalidate(); update({...current,error:''}); block.parts.control($<HTMLSelectElement>('settings-provider')).reset(value.provider); block.parts.control($<HTMLInputElement>('base-url')).reset(value.baseUrl); if (value.clearKey) block.parts.control($<HTMLInputElement>('api-key')).reset(''); if (value.collapseAdvanced) $<HTMLDetailsElement>('provider-advanced').open = false;},
    setCredential(view) {if (destroyed) return; $('key-status').textContent = view.status; $('provider-api-key').hidden = view.hidden; block.parts.control($<HTMLInputElement>('api-key')).update({disabled:view.hidden,required:view.required,placeholder:view.placeholder}); remove.hidden = !view.removeVisible; $('provider-auth-hint').hidden = !view.hint; $('provider-auth-hint').textContent = view.hint || ''; const actions = $('provider-actions'); actions.hidden = !view.actions; if (view.actions && actions.firstChild !== view.actions) actions.replaceChildren(view.actions); else if (!view.actions) actions.replaceChildren(); block.parts.update();},
    clearSecrets() {block.parts.control($<HTMLInputElement>('api-key')).reset('');},
    destroy() {if (destroyed) return; destroyed = true; operation.destroy(); abort.abort(); $<HTMLInputElement>('api-key').value = ''; block.destroy();}
  };
}
export interface MCPEditorValue {name: string; type: string; url?: string; oauth?: boolean; oauthClientId?: string; oauthScope?: string; command?: string; args?: readonly string[]; enabled?: boolean; hasBearerToken?: boolean; envKeys?: readonly string[]}
export interface MCPConnectionDraft {name: string; type: 'http' | 'stdio'; url: string; oauth: boolean; oauthClientId: string; oauthScope: string; command: string; args: string; enabled: boolean; bearerToken: string; clearBearerToken: boolean; env: string; clearEnv: boolean}
export interface MCPConnectionsState extends FormFeedback {formError?: string}
export interface MCPConnectionsPanel extends FormDOMBlock<MCPConnectionsState> {renderType(): void; edit(value?: MCPEditorValue): void; read(): MCPConnectionDraft; clearBearerToken(): void; clearSecrets(): void; toggleEnvironment(): void; readonly list: HTMLElement}
export function createMCPConnectionsPanel(state: MCPConnectionsState = {}, options: FormOptions & {onSubmit?: (draft: MCPConnectionDraft) => ActionResult | Promise<ActionResult>} = {}): MCPConnectionsPanel {
  const block = formBlock(`${dialogHeading('Connections', 'connections-title', 'connections-dialog', 'EXTERNAL TOOLS')}<p class="pui-modal-description">Add an MCP server to give Pith access to its tools. Enabled connections connect automatically when a task starts. Disable a connection to stop using it in tasks. External tools require approval unless this conversation has full access.</p><div class="pui-feature-toolbar"><button type="button" class="pui-secondary-button" data-action="refresh-mcp">Refresh</button></div><div id="mcp-list"><p class="pui-feature-hint">Loading connections…</p></div><div id="mcp-error" data-dialog-error class="pui-form-error" role="alert"></div><section class="pui-connection-editor"><div class="pui-section-heading"><span id="mcp-form-title">Add connection</span><button type="button" class="pui-secondary-button" data-action="new-mcp">New connection</button></div><form id="mcp-form"><label class="pui-field-label" for="mcp-name">Name</label><input id="mcp-name" name="name" required autocomplete="off" placeholder="my-tools" /><label class="pui-field-label" for="mcp-type">Connection type</label><select id="mcp-type" name="type" class="pui-feature-select"><option value="http">HTTP</option><option value="stdio">Local command (stdio)</option></select><div id="mcp-http-fields"><label class="pui-field-label" for="mcp-url">Server URL</label><input id="mcp-url" name="url" type="url" placeholder="https://example.com/mcp" autocomplete="off" /><label class="pui-checkbox-field"><input id="mcp-oauth" type="checkbox" />Sign in with OAuth</label><details class="pui-provider-advanced"><summary>OAuth settings (optional)</summary><label class="pui-field-label">Registered client ID<input id="mcp-oauth-client" /></label><label class="pui-field-label">Scopes<input id="mcp-oauth-scope" /></label><p class="pui-field-hint">Uses the server’s OAuth discovery and PKCE. The temporary callback listens on 127.0.0.1:54819.</p></details><label class="pui-field-label" for="mcp-token">Bearer token (optional)</label><input id="mcp-token" name="bearerToken" type="password" autocomplete="new-password" placeholder="Optional token" /><label class="pui-checkbox-field" id="mcp-clear-token-row" hidden><input id="mcp-clear-token" type="checkbox" />Remove saved bearer token</label><p class="pui-field-hint">Saved tokens are never returned to this page. Leave this field blank to keep an existing token.</p></div><div id="mcp-stdio-fields" hidden><label class="pui-field-label" for="mcp-command">Installed executable</label><input id="mcp-command" name="command" placeholder="/path/to/mcp-server" autocomplete="off" /><label class="pui-field-label" for="mcp-args">Arguments (JSON array)</label><textarea id="mcp-args" name="args" rows="3" spellcheck="false">[]</textarea><p class="pui-field-hint">The executable and any runtime it needs must already be installed on your computer. Pith Desk does not bundle external runtimes or a marketplace.</p><div class="pui-secret-label"><label class="pui-field-label" for="mcp-env">Environment overrides (JSON object, optional)</label><button class="pui-secondary-button" type="button" id="mcp-env-visibility" data-action="toggle-env" aria-controls="mcp-env" aria-pressed="false">Show</button></div><textarea id="mcp-env" class="pui-secret-field" name="env" rows="3" spellcheck="false" autocomplete="off" aria-describedby="mcp-env-hint" placeholder='{"API_KEY":"…"}'></textarea><p id="mcp-env-hint" class="pui-field-hint">Values stay private. Leave blank to keep saved overrides. Add a JSON object of string keys and values to set or replace individual overrides.</p><p id="mcp-env-keys" class="pui-field-hint" hidden></p><label class="pui-checkbox-field" id="mcp-clear-env-row" hidden><input id="mcp-clear-env" type="checkbox" />Clear saved environment overrides</label></div><label class="pui-checkbox-field"><input id="mcp-enabled" name="enabled" type="checkbox" checked />Enable this connection</label><div id="mcp-form-error" class="pui-form-error" role="alert"></div><div class="pui-modal-footer"><button class="pui-secondary-button" type="button" data-pui-close data-close="connections-dialog">Close</button><button class="pui-primary-button" type="submit" data-idle-action data-global-idle>Save connection</button></div></form></section>`, 'pui-mcp-connections', state, options.idPrefix ?? uniqueId('pui-form') + '-');
  const $ = block.field; const abort = new AbortController(); let disposed = false, pending = false, current: MCPConnectionsState = state;
  const form = $<HTMLFormElement>('mcp-form'), submit = form.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const control = (id:string) => block.parts.control($<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(id));
  const read = (): MCPConnectionDraft => ({name:control('mcp-name').getValue().trim(),type:control('mcp-type').getValue() === 'stdio' ? 'stdio' : 'http',url:control('mcp-url').getValue().trim(),oauth:control('mcp-oauth').getChecked(),oauthClientId:control('mcp-oauth-client').getValue().trim(),oauthScope:control('mcp-oauth-scope').getValue().trim(),command:control('mcp-command').getValue().trim(),args:control('mcp-args').getValue(),enabled:control('mcp-enabled').getChecked(),bearerToken:control('mcp-token').getValue().trim(),clearBearerToken:control('mcp-clear-token').getChecked(),env:control('mcp-env').getValue(),clearEnv:control('mcp-clear-env').getChecked()});
  const update = (next: Readonly<MCPConnectionsState>) => {if (disposed) return; current = next; block.update(next); if (next.formError !== undefined) block.parts.feedback($('mcp-form-error')).update({message:next.formError,tone:'error'}); block.parts.action(submit).update({disabled:next.disabled,pending});};
  const renderType = () => {if (disposed) return; const http = control('mcp-type').getValue() === 'http'; for (const [id,active] of [['mcp-http-fields',http],['mcp-stdio-fields',!http]] as const) {const group = $(id); group.hidden = !active; for (const field of group.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input,textarea')) block.parts.control(field).update({disabled:!active});} control('mcp-url').update({required:http}); control('mcp-command').update({required:!http});};
  const edit = (entry?: MCPEditorValue) => {
    if (disposed) return;
    submission.invalidate();
    $<HTMLFormElement>('mcp-form').reset();
    $<HTMLTextAreaElement>('mcp-env').classList.remove('pui-revealed');
    $('mcp-env-visibility').setAttribute('aria-pressed', 'false'); $('mcp-env-visibility').textContent = 'Show';
    $('mcp-form-title').textContent = entry ? `Edit ${entry.name}` : 'Add connection';
    control('mcp-name').reset(entry?.name || ''); control('mcp-name').update({readOnly:!!entry});
    control('mcp-type').reset(entry?.type || 'http'); control('mcp-url').reset(entry?.url || '');
    control('mcp-oauth').reset(entry?.oauth || false); control('mcp-oauth-client').reset(entry?.oauthClientId || ''); control('mcp-oauth-scope').reset(entry?.oauthScope || '');
    control('mcp-command').reset(entry?.command || ''); control('mcp-args').reset(JSON.stringify(entry?.args || [],null,2));
    control('mcp-enabled').reset(entry?.enabled ?? true);
    control('mcp-token').update({placeholder:entry?.hasBearerToken ? 'Leave blank to keep your saved token' : 'Optional token'});
    $('mcp-clear-token-row').hidden = !entry?.hasBearerToken; const envKeys = entry?.envKeys || [];
    $('mcp-clear-env-row').hidden = !envKeys.length; $('mcp-env-keys').hidden = !envKeys.length; $('mcp-env-keys').textContent = `Saved environment keys: ${envKeys.join(', ')}`;
    $('mcp-form-error').textContent = ''; current = {...current,formError:''}; update(current); renderType(); $<HTMLInputElement>(entry ? entry.type === 'stdio' ? 'mcp-command' : 'mcp-url' : 'mcp-name').focus();
  };
  $<HTMLSelectElement>('mcp-type').addEventListener('change', renderType, {signal:abort.signal});
  const toggleEnvironment = () => {if (disposed) return; const field = $<HTMLTextAreaElement>('mcp-env'); const revealed = field.classList.toggle('pui-revealed'); const button = $('mcp-env-visibility'); button.setAttribute('aria-pressed',String(revealed)); block.parts.action(button as HTMLButtonElement).update({label:revealed ? 'Hide' : 'Show'});};
  $('mcp-env-visibility').addEventListener('click',event => {event.stopPropagation(); toggleEnvironment();}, {signal:abort.signal});
  const submission = bindFormSubmission(form,{read,unavailable:()=>!!current.disabled,onSubmit:options.onSubmit,onPending(value) {pending = value; update(current);},onError(formError) {update({...current,formError});}});
  const clearBearerToken = () => {control('mcp-token').reset('');};
  const clearSecrets = () => {clearBearerToken(); control('mcp-env').reset('');};
  renderType(); update(state);
  return {...block,update,renderType,edit,read,clearBearerToken,clearSecrets,toggleEnvironment,list:$('mcp-list'),destroy() {if (disposed) return; disposed = true; submission.destroy(); abort.abort(); clearSecrets(); block.destroy();}};
}
export interface ModelPickerState extends FormFeedback {editor?: ModelEditorState; loading?: boolean}
export interface ModelPicker extends FormDOMBlock<ModelPickerState> {read(): ModelSelection; reset(selection: ModelSelection): void; focus(): void}
export function createModelPicker(state: ModelPickerState = {}, options: FormOptions & {onSubmit?: (selection: ModelSelection) => ActionResult | Promise<ActionResult>} = {}): ModelPicker {
  const prefix = options.idPrefix ?? uniqueId('pui-form') + '-';
  const block = formBlock(`${dialogHeading('Choose a model', 'model-title', 'model-dialog', 'PITH MODEL CATALOG')}<form id="model-form">${modelEditorMarkup('picker')}<div id="model-error" class="pui-form-error" role="alert"></div><div class="pui-modal-footer"><button type="button" class="pui-secondary-button" data-pui-close data-close="model-dialog">Cancel</button><button type="submit" class="pui-primary-button" id="choose-model" data-global-idle data-control-pending="true" disabled>Use model</button></div></form>`, 'pui-model-picker', state, prefix);
  let editor: ReturnType<typeof createModelEditor> | undefined;
  let destroyed = false, pending = false, current = state;
  const form = block.field<HTMLFormElement>('model-form'), submit = block.field<HTMLButtonElement>('choose-model');
  const update = (next: Readonly<ModelPickerState>) => {if (destroyed) return; current = next; block.update(next); if (next.editor) {if (editor) editor.update(next.editor); else editor = createModelEditor(next.editor,{prefix:prefix + 'picker',element:block.element});} const loading = next.loading ?? !next.editor; block.parts.action(submit).update({disabled:next.disabled,pending:pending || loading});};
  const read = (): ModelSelection => editor?.read() || {provider:'',model:'',thinkingLevel:''};
  const submission = bindFormSubmission(form,{read,unavailable:()=>submit.disabled,onSubmit:options.onSubmit,onPending(value) {pending = value; update(current);},onError(error) {update({...current,error});}});
  update(state); return {...block,update,read,reset(selection) {submission.invalidate(); editor?.reset(selection);},focus() {editor?.focus();},destroy() {if (destroyed) return; destroyed = true; submission.destroy(); editor?.destroy(); block.destroy();}};
}
export interface MCPConnectionItem {
 name: string; type: string; url?: string; command?: string; args?: readonly string[]; enabled: boolean;
 hasBearerToken?: boolean; status?: string; statusLabel: string; envKeys?: readonly string[]; error?: string; oauth?: boolean; signedIn?: boolean;
}
export interface MCPConnectionListState extends FormFeedback { entries: readonly MCPConnectionItem[] }
export type MCPConnectionAction = 'mcp-login' | 'mcp-logout' | 'mcp-edit' | 'mcp-toggle' | 'mcp-remove';
export interface MCPConnectionTarget {readonly name: string}
export interface MCPConnectionListOptions {onAction?: (action: MCPConnectionAction, target: MCPConnectionTarget) => ReturnType<UIAction>}
type MCPConnectionDOM = {element: HTMLElement; name: HTMLElement; address: HTMLElement; enabled: HTMLElement; status: HTMLElement; env: HTMLElement; error: HTMLElement; actions: HTMLElement; signIn: HTMLButtonElement; signOut: HTMLButtonElement; edit: HTMLButtonElement; toggle: HTMLButtonElement; remove: HTMLButtonElement; handles: Map<HTMLButtonElement,ActionController>; abort: AbortController; localError: string};
export function createMCPConnectionList(initial: MCPConnectionListState, options: MCPConnectionListOptions = {}): UIBlock<MCPConnectionListState> {
  const element = document.createElement('div'); element.className = 'pui-mcp-connection-list';
  const parts = adoptProductParts(element); let destroyed = false; const entries = new Map<string, MCPConnectionDOM>();
  const empty = document.createElement('p'); empty.className = 'pui-feature-hint'; empty.textContent = 'No connections yet. Add an HTTP server or an installed local MCP command below. Tools are discovered on demand using tool search and Codemode.';
  function createEntry(item: MCPConnectionItem): MCPConnectionDOM {
    const root = document.createElement('article'); root.className = 'pui-connection-card';
    root.innerHTML = '<div class="pui-connection-card-heading"><strong></strong></div><p class="pui-file-path"></p><p class="pui-feature-hint"></p><p class="pui-connection-status" role="status"></p><p class="pui-feature-hint" hidden></p><p class="pui-form-error"></p><div class="pui-file-actions"></div>';
    const paragraphs = root.querySelectorAll<HTMLElement>('p'); const actions = root.querySelector<HTMLElement>('.pui-file-actions')!;
    const button = (label: string, destructive = false) => {const node = document.createElement('button'); node.type = 'button'; node.className = destructive ? 'pui-secondary-button pui-destructive-button' : 'pui-secondary-button'; node.textContent = label; return node;};
    const signIn = button('Sign in'); signIn.dataset.sdk = 'mcp-login'; const signOut = button('Sign out'); signOut.dataset.sdk = 'mcp-logout';
    const edit = button('Edit'); const toggle = button('Disable'); const remove = button('Delete',true);
    for (const node of [toggle,remove]) {node.dataset.globalIdle = ''; node.dataset.idleAction = '';}
    actions.append(edit,toggle,remove);
    const entry: MCPConnectionDOM = {element:root,name:root.querySelector('strong')!,address:paragraphs[0],enabled:paragraphs[1],status:paragraphs[2],env:paragraphs[3],error:paragraphs[4],actions,signIn,signOut,edit,toggle,remove,handles:new Map(),abort:new AbortController(),localError:''};
    const target = Object.freeze({name:item.name});
    for (const [node,action] of [[signIn,'mcp-login'],[signOut,'mcp-logout'],[edit,'mcp-edit'],[toggle,'mcp-toggle'],[remove,'mcp-remove']] as const) {
      if (options.onAction) node.addEventListener('click',event => event.stopPropagation(),{signal:entry.abort.signal});
      entry.handles.set(node,adoptAction(node,{onAction:options.onAction ? () => {entry.localError = ''; parts.feedback(entry.error).update({message:'',tone:'error'}); return options.onAction!(action,target);} : undefined,onError(message) {entry.localError = message; parts.feedback(entry.error).update({message,tone:'error'});}}));
    }
    return entry;
  }
  const release = (entry: MCPConnectionDOM) => {entry.abort.abort(); for (const handle of entry.handles.values()) handle.destroy();};
  const update = (state: Readonly<MCPConnectionListState>) => {
    if (destroyed) return;
    reconcileKeyed(element,entries,state.entries,{key:item=>item.name,element:entry=>entry.element,create:createEntry,update(entry,item) {
      setText(entry.name, item.name); entry.element.dataset.connectionKey = item.name;
      setText(entry.address, item.type === 'http' ? item.url || '' : [item.command,...(item.args || [])].join(' '));
      setText(entry.enabled, `${item.enabled ? 'Enabled' : 'Disabled'}${item.hasBearerToken ? ' · Token configured' : ''}`);
      setText(entry.status, item.statusLabel); entry.status.classList.toggle('pui-is-error',item.enabled && item.status === 'error');
      entry.env.hidden = !item.envKeys?.length; setText(entry.env, item.envKeys?.length ? 'Saved environment keys: '+item.envKeys.join(', ') : ''); parts.feedback(entry.error).update({message:item.error || entry.localError,tone:'error'});
      setText(entry.signIn, item.signedIn ? 'Sign in again' : 'Sign in'); entry.signIn.dataset.id = entry.signOut.dataset.id = item.name;
      entry.edit.dataset.mcpEdit = item.name; entry.toggle.dataset.mcpToggle = item.name; entry.remove.dataset.mcpRemove = item.name; setText(entry.toggle, item.enabled ? 'Disable' : 'Enable');
      if (item.oauth) {if (entry.signIn.parentElement !== entry.actions) entry.actions.insertBefore(entry.signIn,entry.edit);} else entry.signIn.remove();
      if (item.oauth && item.signedIn) {if (entry.signOut.parentElement !== entry.actions) entry.actions.insertBefore(entry.signOut,entry.edit);} else entry.signOut.remove();
      for (const [button,handle] of entry.handles) handle.update({disabled:!!state.disabled || (button === entry.signIn && !item.oauth) || (button === entry.signOut && (!item.oauth || !item.signedIn))});
    },destroy:release});
    if (!state.entries.length) {if (empty.parentElement !== element) element.append(empty);} else empty.remove(); parts.update();
  };
  update(initial); return {element,update,destroy() {if (destroyed) return; destroyed = true; for (const entry of entries.values()) release(entry); parts.destroy(); entries.clear(); element.remove();}};
}
