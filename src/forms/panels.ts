import type { UIBlock } from '../core.js';
import {scopeIds} from './identity.js';
import { dialogHeading, escape, icon, uniqueId, setText } from '../dom.js';

export interface FormFeedback { error?: string; disabled?: boolean }
export interface FormDOMBlock<State extends FormFeedback> extends UIBlock<State> {
  field<T extends HTMLElement = HTMLElement>(id: string): T;
  id(localId: string): string;
}
function formBlock<State extends FormFeedback>(markup: string, className: string, initial: State, prefix = ''): FormDOMBlock<State> {
  const element = document.createElement('div');
  element.className = className;
  element.innerHTML = markup; scopeIds(element, prefix);
  let destroyed = false;
  const field = <T extends HTMLElement = HTMLElement>(id: string): T => {
    const result = Array.from(element.querySelectorAll<HTMLElement>('[id]')).find((node) => node.getAttribute('id') === prefix + id);
    if (!result) throw new Error(`Unknown component field: ${id}`);
    return result as T;
  };
  const update = (state: Readonly<State>) => {
    if (destroyed) return;
    if (state.error !== undefined) {
      const error = element.querySelector<HTMLElement>('[data-dialog-error]') || element.querySelector<HTMLElement>('.pui-form-error[role="alert"]');
      if (error) error.textContent = state.error;
    }
    if (state.disabled !== undefined) {
      for (const control of element.querySelectorAll<HTMLButtonElement>('button[type="submit"]')) {
        control.disabled = state.disabled || control.dataset.controlPending === 'true';
      }
    }
  };
  update(initial);
  return {element, field, id: (id) => prefix + id, update, destroy() { if (destroyed) return; destroyed = true; element.remove(); }};
}
export interface SettingsPanelState extends FormFeedback { baseUrl: string; hasApiKey: boolean }
export interface FormOptions { idPrefix?: string }
export function createSettingsPanel(state: SettingsPanelState, options: FormOptions = {}): FormDOMBlock<SettingsPanelState> {
  return formBlock(`
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
      <div class="pui-modal-footer"><button class="pui-secondary-button" type="button" data-close="settings-dialog">Cancel</button><button class="pui-primary-button" id="save-settings" data-control-pending="true" disabled data-global-idle type="submit">Save settings</button></div>
    </form>`, 'pui-settings-panel', state, options.idPrefix ?? uniqueId('pui-form') + '-');
}
export interface MCPEditorValue {name: string; type: string; url?: string; oauth?: boolean; oauthClientId?: string; oauthScope?: string; command?: string; args?: readonly string[]; enabled?: boolean; hasBearerToken?: boolean; envKeys?: readonly string[]}
export interface MCPConnectionsPanel extends FormDOMBlock<FormFeedback> {renderType(): void; edit(value?: MCPEditorValue): void}
export function createMCPConnectionsPanel(state: FormFeedback = {}, options: FormOptions = {}): MCPConnectionsPanel {
  const block = formBlock(`${dialogHeading('Connections', 'connections-title', 'connections-dialog', 'EXTERNAL TOOLS')}<p class="pui-modal-description">Add an MCP server to give Pith access to its tools. Enabled connections connect automatically when a task starts. Disable a connection to stop using it in tasks. External tools require approval unless this conversation has full access.</p><div class="pui-feature-toolbar"><button class="pui-secondary-button" data-action="refresh-mcp">Refresh</button></div><div id="mcp-list"><p class="pui-feature-hint">Loading connections…</p></div><div id="mcp-error" data-dialog-error class="pui-form-error" role="alert"></div><section class="pui-connection-editor"><div class="pui-section-heading"><span id="mcp-form-title">Add connection</span><button type="button" class="pui-secondary-button" data-action="new-mcp">New connection</button></div><form id="mcp-form"><label class="pui-field-label" for="mcp-name">Name</label><input id="mcp-name" name="name" required autocomplete="off" placeholder="my-tools" /><label class="pui-field-label" for="mcp-type">Connection type</label><select id="mcp-type" name="type" class="pui-feature-select"><option value="http">HTTP</option><option value="stdio">Local command (stdio)</option></select><div id="mcp-http-fields"><label class="pui-field-label" for="mcp-url">Server URL</label><input id="mcp-url" name="url" type="url" placeholder="https://example.com/mcp" autocomplete="off" /><label class="pui-checkbox-field"><input id="mcp-oauth" type="checkbox" />Sign in with OAuth</label><details class="pui-provider-advanced"><summary>OAuth settings (optional)</summary><label class="pui-field-label">Registered client ID<input id="mcp-oauth-client" /></label><label class="pui-field-label">Scopes<input id="mcp-oauth-scope" /></label><p class="pui-field-hint">Uses the server’s OAuth discovery and PKCE. The temporary callback listens on 127.0.0.1:54819.</p></details><label class="pui-field-label" for="mcp-token">Bearer token (optional)</label><input id="mcp-token" name="bearerToken" type="password" autocomplete="new-password" placeholder="Optional token" /><label class="pui-checkbox-field" id="mcp-clear-token-row" hidden><input id="mcp-clear-token" type="checkbox" />Remove saved bearer token</label><p class="pui-field-hint">Saved tokens are never returned to this page. Leave this field blank to keep an existing token.</p></div><div id="mcp-stdio-fields" hidden><label class="pui-field-label" for="mcp-command">Installed executable</label><input id="mcp-command" name="command" placeholder="/path/to/mcp-server" autocomplete="off" /><label class="pui-field-label" for="mcp-args">Arguments (JSON array)</label><textarea id="mcp-args" name="args" rows="3" spellcheck="false">[]</textarea><p class="pui-field-hint">The executable and any runtime it needs must already be installed on your computer. Pith Desk does not bundle external runtimes or a marketplace.</p><div class="pui-secret-label"><label class="pui-field-label" for="mcp-env">Environment overrides (JSON object, optional)</label><button class="pui-secondary-button" type="button" id="mcp-env-visibility" data-action="toggle-env" aria-controls="mcp-env" aria-pressed="false">Show</button></div><textarea id="mcp-env" class="pui-secret-field" name="env" rows="3" spellcheck="false" autocomplete="off" aria-describedby="mcp-env-hint" placeholder='{"API_KEY":"…"}'></textarea><p id="mcp-env-hint" class="pui-field-hint">Values stay private. Leave blank to keep saved overrides. Add a JSON object of string keys and values to set or replace individual overrides.</p><p id="mcp-env-keys" class="pui-field-hint" hidden></p><label class="pui-checkbox-field" id="mcp-clear-env-row" hidden><input id="mcp-clear-env" type="checkbox" />Clear saved environment overrides</label></div><label class="pui-checkbox-field"><input id="mcp-enabled" name="enabled" type="checkbox" checked />Enable this connection</label><div id="mcp-form-error" class="pui-form-error" role="alert"></div><div class="pui-modal-footer"><button class="pui-secondary-button" type="button" data-close="connections-dialog">Close</button><button class="pui-primary-button" type="submit" data-idle-action data-global-idle>Save connection</button></div></form></section>`, 'pui-mcp-connections', state, options.idPrefix ?? uniqueId('pui-form') + '-');
  const $ = block.field; const abort = new AbortController(); let disposed = false;
  const renderType = () => {if (disposed) return; const http = $<HTMLSelectElement>('mcp-type').value === 'http'; $('mcp-http-fields').hidden = !http; $('mcp-stdio-fields').hidden = http; $<HTMLInputElement>('mcp-url').required = http; $<HTMLInputElement>('mcp-command').required = !http;};
  const edit = (entry?: MCPEditorValue) => {
    if (disposed) return;
    $<HTMLFormElement>('mcp-form').reset();
    $<HTMLTextAreaElement>('mcp-env').classList.remove('pui-revealed');
    $('mcp-env-visibility').setAttribute('aria-pressed', 'false'); $('mcp-env-visibility').textContent = 'Show';
    $('mcp-form-title').textContent = entry ? `Edit ${entry.name}` : 'Add connection';
    $<HTMLInputElement>('mcp-name').value = entry?.name || ''; $<HTMLInputElement>('mcp-name').readOnly = !!entry;
    $<HTMLSelectElement>('mcp-type').value = entry?.type || 'http'; $<HTMLInputElement>('mcp-url').value = entry?.url || '';
    $<HTMLInputElement>('mcp-oauth').checked = entry?.oauth || false; $<HTMLInputElement>('mcp-oauth-client').value = entry?.oauthClientId || ''; $<HTMLInputElement>('mcp-oauth-scope').value = entry?.oauthScope || '';
    $<HTMLInputElement>('mcp-command').value = entry?.command || ''; $<HTMLTextAreaElement>('mcp-args').value = JSON.stringify(entry?.args || [], null, 2);
    $<HTMLInputElement>('mcp-enabled').checked = entry?.enabled ?? true;
    $<HTMLInputElement>('mcp-token').placeholder = entry?.hasBearerToken ? 'Leave blank to keep your saved token' : 'Optional token';
    $('mcp-clear-token-row').hidden = !entry?.hasBearerToken; const envKeys = entry?.envKeys || [];
    $('mcp-clear-env-row').hidden = !envKeys.length; $('mcp-env-keys').hidden = !envKeys.length; $('mcp-env-keys').textContent = `Saved environment keys: ${envKeys.join(', ')}`;
    $('mcp-form-error').textContent = ''; renderType(); $<HTMLInputElement>(entry ? entry.type === 'stdio' ? 'mcp-command' : 'mcp-url' : 'mcp-name').focus();
  };
  $<HTMLSelectElement>('mcp-type').addEventListener('change', renderType, {signal:abort.signal});
  $('mcp-env-visibility').addEventListener('click', (event) => {event.stopPropagation(); const field = $<HTMLTextAreaElement>('mcp-env'); const revealed = field.classList.toggle('pui-revealed'); const button = $('mcp-env-visibility'); button.setAttribute('aria-pressed', String(revealed)); button.textContent = revealed ? 'Hide' : 'Show';}, {signal:abort.signal});
  renderType();
  return {...block, renderType, edit, destroy() {if (disposed) return; disposed = true; abort.abort(); block.destroy();}};
}
export function modelEditorMarkup(prefix: string): string { prefix = escape(prefix); return `<label class="pui-field-label" for="${prefix}-provider">Provider</label><select class="pui-feature-select" id="${prefix}-provider" required disabled><option value="">Loading providers…</option></select><label class="pui-field-label" for="${prefix}-search">Model</label><input id="${prefix}-search" type="search" placeholder="Search by model name or ID" autocomplete="off" /><label class="pui-sr-only" for="${prefix}-model">Choose model</label><select id="${prefix}-model" class="pui-model-list" size="6" required disabled></select><p id="${prefix}-capabilities" class="pui-field-hint" aria-live="polite"></p><label class="pui-field-label" id="${prefix}-thinking-label" for="${prefix}-thinking">Thinking effort</label><select id="${prefix}-thinking" class="pui-feature-select" aria-describedby="${prefix}-capabilities" required></select><p class="pui-field-hint">Built-in models come from the Pith SDK catalog. Custom models use your saved definitions. Availability depends on your endpoint and account.</p>`; }
export function createModelPicker(state: FormFeedback = {}, options: FormOptions = {}): FormDOMBlock<FormFeedback> {
  return formBlock(`${dialogHeading('Choose a model', 'model-title', 'model-dialog', 'PITH MODEL CATALOG')}<form id="model-form">${modelEditorMarkup('picker')}<div id="model-error" class="pui-form-error" role="alert"></div><div class="pui-modal-footer"><button type="button" class="pui-secondary-button" data-close="model-dialog">Cancel</button><button type="submit" class="pui-primary-button" id="choose-model" data-global-idle data-control-pending="true" disabled>Use model</button></div></form>`, 'pui-model-picker', state, options.idPrefix ?? uniqueId('pui-form') + '-');
}
export interface MCPConnectionItem {
 name: string; type: string; url?: string; command?: string; args?: readonly string[]; enabled: boolean;
 hasBearerToken?: boolean; status?: string; statusLabel: string; envKeys?: readonly string[]; error?: string; oauth?: boolean; signedIn?: boolean;
}
export interface MCPConnectionListState extends FormFeedback { entries: readonly MCPConnectionItem[] }
type MCPConnectionDOM = {element: HTMLElement; name: HTMLElement; address: HTMLElement; enabled: HTMLElement; status: HTMLElement; env: HTMLElement; error: HTMLElement; actions: HTMLElement; signIn: HTMLButtonElement; signOut: HTMLButtonElement; edit: HTMLButtonElement; toggle: HTMLButtonElement; remove: HTMLButtonElement};
export function createMCPConnectionList(initial: MCPConnectionListState): UIBlock<MCPConnectionListState> {
  const element = document.createElement('div'); element.className = 'pui-mcp-connection-list';
  let destroyed = false; const entries = new Map<string, MCPConnectionDOM>();
  const empty = document.createElement('p'); empty.className = 'pui-feature-hint'; empty.textContent = 'No connections yet. Add an HTTP server or an installed local MCP command below. Tools are discovered on demand using tool search and Codemode.';
  function createEntry(): MCPConnectionDOM {
    const root = document.createElement('article'); root.className = 'pui-connection-card';
    root.innerHTML = '<div class="pui-connection-card-heading"><strong></strong></div><p class="pui-file-path"></p><p class="pui-feature-hint"></p><p class="pui-connection-status" role="status"></p><p class="pui-feature-hint" hidden></p><p class="pui-form-error"></p><div class="pui-file-actions"></div>';
    const paragraphs = root.querySelectorAll<HTMLElement>('p'); const actions = root.querySelector<HTMLElement>('.pui-file-actions')!;
    const button = (label: string, destructive = false) => {const node = document.createElement('button'); node.type = 'button'; node.className = destructive ? 'pui-secondary-button pui-destructive-button' : 'pui-secondary-button'; node.textContent = label; return node;};
    const signIn = button('Sign in'); signIn.dataset.sdk = 'mcp-login'; const signOut = button('Sign out'); signOut.dataset.sdk = 'mcp-logout';
    const edit = button('Edit'); const toggle = button('Disable'); const remove = button('Delete',true);
    for (const node of [toggle,remove]) {node.dataset.globalIdle = ''; node.dataset.idleAction = '';}
    actions.append(edit,toggle,remove);
    return {element:root,name:root.querySelector('strong')!,address:paragraphs[0],enabled:paragraphs[1],status:paragraphs[2],env:paragraphs[3],error:paragraphs[4],actions,signIn,signOut,edit,toggle,remove};
  }
  const update = (state: Readonly<MCPConnectionListState>) => {
    if (destroyed) return; const current = new Set<string>(); let cursor: Element | null = element.firstElementChild;
    for (const item of state.entries) {
      current.add(item.name); let entry = entries.get(item.name); if (!entry) {entry = createEntry(); entries.set(item.name,entry);}
      setText(entry.name, item.name); entry.element.dataset.connectionKey = item.name;
      setText(entry.address, item.type === 'http' ? item.url || '' : [item.command,...(item.args || [])].join(' '));
      setText(entry.enabled, `${item.enabled ? 'Enabled' : 'Disabled'}${item.hasBearerToken ? ' · Token configured' : ''}`);
      setText(entry.status, item.statusLabel); entry.status.classList.toggle('pui-is-error',item.enabled && item.status === 'error');
      entry.env.hidden = !item.envKeys?.length; setText(entry.env, item.envKeys?.length ? 'Saved environment keys: '+item.envKeys.join(', ') : ''); setText(entry.error, item.error || '');
      setText(entry.signIn, item.signedIn ? 'Sign in again' : 'Sign in'); entry.signIn.dataset.id = entry.signOut.dataset.id = item.name;
      entry.edit.dataset.mcpEdit = item.name; entry.toggle.dataset.mcpToggle = item.name; entry.remove.dataset.mcpRemove = item.name; setText(entry.toggle, item.enabled ? 'Disable' : 'Enable');
      if (item.oauth) {if (entry.signIn.parentElement !== entry.actions) entry.actions.insertBefore(entry.signIn,entry.edit);} else entry.signIn.remove();
      if (item.oauth && item.signedIn) {if (entry.signOut.parentElement !== entry.actions) entry.actions.insertBefore(entry.signOut,entry.edit);} else entry.signOut.remove();
      for (const button of [entry.signIn,entry.signOut,entry.edit,entry.toggle,entry.remove]) button.disabled = !!state.disabled;
      if (entry.element !== cursor) element.insertBefore(entry.element,cursor); cursor = entry.element.nextElementSibling;
    }
    for (const [key,entry] of entries) if (!current.has(key)) {entry.element.remove(); entries.delete(key);}
    if (!state.entries.length) {if (empty.parentElement !== element) element.append(empty);} else empty.remove();
  };
  update(initial); return {element,update,destroy() {if (destroyed) return; destroyed = true; entries.clear(); element.remove();}};
}
