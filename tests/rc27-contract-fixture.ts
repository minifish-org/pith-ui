/**
 * Baseline oracle: Desk 3f1ee24 consuming UI 897f46a / npm 0.2.2.
 * This is internal validation, never a public application or scene API.
 * Keep scenario inputs and expected contracts when replacing the implementation.
 */
import {createApplication, type Application, type Appearance, type ConversationMessage, type SettingsSession} from '../src/app/index.js';

export const rc27Scenarios = [
  'shell', 'welcome-unconfigured', 'welcome-model', 'navigation-menu', 'navigation-empty',
  'conversation', 'conversation-expanded', 'conversation-find', 'conversation-image', 'conversation-unavailable', 'conversation-streaming',
  'composer', 'composer-stop', 'composer-queue', 'tasks', 'approval-command', 'task-failure', 'task-failure-settings',
  'workspace-picker', 'rename', 'message-editor', 'queue-editor', 'confirmation', 'full-access',
  'history-loading', 'history', 'settings-loading', 'settings', 'settings-probing',
  'connections-http', 'connections-stdio', 'model-loading', 'model-picker',
  'connection-loading', 'custom-connection', 'login-link', 'login-text', 'login-secret', 'login-choice', 'login-error',
  'resources-loading', 'resources', 'resource-loading', 'resource-create', 'resource-editor', 'resource-readonly',
  'artifacts', 'preview-text', 'preview-markdown', 'preview-diff', 'preview-image',
] as const;
export type RC27Scenario = typeof rc27Scenarios[number];
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const workspace = {id: 'w1', name: 'Workspace 中文', path: '/demo/workspace'};
const model = {id: 'model-a', name: 'Model A', provider: 'provider', thinkingLevels: ['off', 'high'], supportsImages: true, contextWindow: 128000, maxTokens: 8192};
const messages: ConversationMessage[] = [
  {id: 'u1', role: 'user', text: 'Inspect the project 中文 and explain the result.', timestamp: 1792180800000, actions: {copy: 'Copy message', edit: true}},
  {id: 's1', role: 'system', text: 'Conversation context was summarized.'},
  {id: 't1', role: 'tool', toolName: 'read_file', toolCallId: 'call-1', text: 'README.md\nProject overview', status: 'complete'},
  {id: 't2', role: 'tool', toolName: 'run_command', toolCallId: 'call-2', text: 'Command failed: expected a configuration file.', status: 'error', command: {text: 'inspect --check', cwd: '/demo/workspace', exitCode: 1}},
  {id: 'a1', role: 'assistant', text: '# Result\n\nThe **project** contains `source.ts` and a [local file](./report.md).\n\n- First finding\n- Second finding\n\n| Item | State |\n| --- | --- |\n| Source | Ready |\n\n```ts\nconst result = "verified";\nconsole.log(result);\n```\n\n> Preserve existing behavior.', timestamp: 1792180860000, status: 'complete', actions: {copy: 'Copy response', branch: {key: 'branch-a'}}},
  {id: 'u2', role: 'user', text: 'Check this image.', images: [{index: 0, mimeType: 'image/png'}], actions: {copy: 'Copy message', edit: true}},
];

type Closeable = {close(): void; isOpen(): boolean; destroy(): void};
export interface RC27Fixture {
  app: Application;
  events: unknown[];
  scenario: RC27Scenario;
  roots: string[];
  session?: Closeable;
  ready: Promise<void>;
  dispose(): void;
}
declare global {interface Window {rc27: RC27Fixture}}

const result = {ok: true} as const;
const query = <T extends Element = HTMLElement>(selector: string): T => {
  const value = document.querySelector<T>(selector);
  if (!value) throw new Error(`Missing contract fixture target ${selector}`);
  return value;
};
const settle = async () => {await document.fonts.ready; await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));};

async function mount(scenario: RC27Scenario, appearance: Appearance): Promise<RC27Fixture> {
  const events: unknown[] = [];
  const log = (action: string, ...args: unknown[]) => {events.push({action, args}); return result;};
  const app = createApplication(query('#contract-root'), {
    brand: {name: 'Pith', qualifier: 'Desk', mark: {symbol: 'pith', alt: ''}}, appearance,
    host: {copyText: text => log('copy', text), openExternal: href => log('external', href)},
    workspace: {
      onAction: action => log('workspace', action), onSubmit: text => log('submit', text), onStop: () => log('stop'),
      onInput: text => {log('input', text);}, onThinkingChange: value => {log('thinking', value);},
      onBusyAction: key => {log('busy', key);}, onSelectConversation: id => {log('select', id);},
      onNewConversation: id => {log('new', id);}, onConversationAction: (action, id) => log('conversation', action, id),
      onWorkspaceAction: (action, id) => log('workspace-action', action, id), onMessageAction: action => log('message', action),
      onCopyCode: text => log('code', text), resolveLocalLink: (href, conversationId) => ({conversationId, path: href}),
      onLocalFile: target => log('local-file', target), onLoadImage: async () => scenario === 'conversation-unavailable' ? null : await (await fetch(png)).blob(),
      onQueueAction: (action, id) => {log('queue', action, id);}, onRemoveAttachment: id => {log('remove-image', id);},
      onPermissionChange: mode => {log('permission', mode);}, onApproval: (id, action) => {log('approval', id, action);},
      onCompletionOpen: id => {log('completion', id);}, onCompletionDismiss: id => {log('dismiss', id);},
      onCostsChange: () => {log('costs');}, onError: message => {log('error', message);},
    },
  });
  const fixture: RC27Fixture = {app, scenario, events, roots: ['.pui-app'], ready: Promise.resolve(), dispose: () => app.destroy()};
  window.rc27 = fixture;
  const w = app.workspace;
  w.updateShell({workspace: workspace.name, conversation: 'Review the project', reconnecting: false, error: {message: ''}, busy: null});
  w.updateComposer({action: 'send', actionDisabled: false, readOnly: false, placeholder: 'Ask Pith to help with your work…',
    model: {label: 'Model A', description: 'provider / model-a', disabled: false},
    thinking: {options: [{value: 'off', label: 'Thinking off'}, {value: 'high', label: 'Thinking: high'}], value: 'high', disabled: false}});
  w.updateNavigation({groups: [{...workspace, selected: true, canRemove: true, children: [
    {id: 'a', title: 'Review the project', active: true, status: {kind: 'idle'}, actions: {rename: true, history: true, export: true, delete: true}},
    {id: 'b', title: 'Waiting task', active: false, status: {kind: 'approval'}, actions: {rename: false, history: false, export: false, delete: false}},
    {id: 'c', title: 'Running task', active: false, status: {kind: 'running'}},
    {id: 'd', title: 'Completed task', active: false, status: {kind: 'unread'}},
  ]}, {id: 'w2', name: 'Other workspace', path: '/demo/other', selected: false, canRemove: true, children: []}], empty: null});
  w.updateConversation({id: 'a', messages: [], working: false});
  w.updateWelcome({workspace, hasApiKey: true, hasConnections: true, modelName: 'Model A'});
  w.updatePermission({mode: 'ask', description: 'Pith can read workspace files. Changes, commands, and external connection tools require approval.'});
  w.updateAvailability({busy: false, global: false, active: false, conversations: ['b', 'c'], workspaces: ['w2']});
  const dialog = () => {fixture.roots = ['dialog[open]'];};
  const settings = (probing = false): SettingsSession => {
    const panel = app.settings.openSettings({baseUrl: 'https://provider.example/v1', hasApiKey: true, ready: true, appearance: {mode: appearance},
      testing: probing, testResult: {message: probing ? 'Testing streaming and tool calling…' : 'Streaming and tool calling are available.', ok: probing ? undefined : true}}, {
      onSubmit: draft => log('settings-save', draft), onRemoveKey: draft => log('remove-key', draft),
      onProviderAction: (action, target) => log('provider-action', action, target), onProviderChange: value => log('provider-change', value),
      onTest: draft => log('probe', draft), onCancelTest: () => log('cancel-probe'), onCreateConnection: () => log('custom'),
      onUpdateAction: action => log('update', action), onDiagnostics: () => log('diagnostics'),
    });
    panel.setProviders([{id: 'provider', name: 'Provider', configured: true}, {id: 'oauth', name: 'Account provider', signedIn: true}], 'provider');
    panel.setCredential({status: 'Configured', hidden: false, required: false, placeholder: 'Leave blank to keep this provider’s key', removeVisible: true,
      providerActions: {id: 'provider', oauth: true, custom: true, signedIn: false, disabled: probing}});
    panel.updateUpdates({version: '0.1.0-rc.27', enabled: true, phase: 'available', availableVersion: '0.1.0-rc.28', progress: 0, message: 'An update is available.'});
    fixture.session = panel; dialog(); return panel;
  };
  switch (scenario) {
    case 'shell': break;
    case 'welcome-unconfigured': w.updateWelcome({hasApiKey: false, hasConnections: false, modelName: ''}); fixture.roots = ['[id$=welcome]']; break;
    case 'welcome-model': w.updateWelcome({workspace, hasApiKey: false, hasConnections: true, modelName: ''}); fixture.roots = ['[id$=welcome]']; break;
    case 'navigation-menu': query<HTMLButtonElement>('[data-conversation-menu=a]').click(); fixture.roots = ['[id$=sidebar]', '[id$=conversation-menu]']; break;
    case 'navigation-empty': w.updateNavigation({groups: [], empty: 'workspaces'}); fixture.roots = ['[id$=sidebar]']; break;
    case 'conversation': case 'conversation-expanded': case 'conversation-find': case 'conversation-image': case 'conversation-unavailable':
      w.updateConversation({id: 'a', messages, working: true}); fixture.roots = ['.pui-conversation-region'];
      await settle();
      if (scenario === 'conversation-expanded') for (const details of document.querySelectorAll<HTMLDetailsElement>('[data-tool-fold]')) details.open = true;
      if (scenario === 'conversation-find') {w.openFind(); const input = query<HTMLInputElement>('[id$=conversation-find] input'); input.value = 'project'; input.dispatchEvent(new Event('input', {bubbles: true})); fixture.roots.unshift('[id$=conversation-find]');}
      if (scenario === 'conversation-image') {
        const image = query<HTMLImageElement>('[data-image-key]');
        if (!image.complete || !image.naturalWidth) await new Promise<void>(resolve => image.addEventListener('load', () => resolve(), {once: true}));
        await image.decode(); image.click();
        if (!app.read().hasModal) throw new Error('The loaded conversation image did not open its viewer.');
        fixture.roots = ['[id$=image-dialog]'];
      }
      break;
    case 'conversation-streaming': w.updateConversation({id: 'a', messages: [messages[0]!, {...messages[4]!, id: 'a-stream', text: 'An incomplete **streaming** response…', status: 'streaming', actions: {copy: false}}, {...messages[4]!, id: 'a-error', text: 'A partial response retained after failure.', status: 'error'}], working: true}); w.updateMessageAvailability({edit: true, branch: true}); fixture.roots = ['.pui-conversation-region']; break;
    case 'composer-stop': case 'composer-queue':
      w.updateComposer({action: scenario === 'composer-stop' ? 'stop' : 'queue', actionDisabled: false, readOnly: false, placeholder: 'Send a message to queue it…'});
      if (scenario === 'composer-queue') w.resetDraft('Send this after the current task.');
      w.updatePermission({mode: 'full-access', description: 'Full access: all enabled tools run without asking. There is no OS sandbox.'}); fixture.roots = ['.pui-composer-region']; break;
    case 'composer':
      w.resetDraft('Review these files 中文\nand preserve the current behavior.');
      w.updatePending({items: [{id: 'q1', text: 'Follow-up message', mode: 'follow-up', imageCount: 2}, {id: 'q2', text: 'Use this instruction', mode: 'steer'}], running: true, busy: false});
      w.updateAttachments({items: [{id: 'image-a', name: 'diagram.png', url: png}, {id: 'image-b', name: 'reference 中文.png', url: png}], disabled: false});
      w.updateImageGuidance('The selected model supports image attachments.'); fixture.roots = ['.pui-composer-region']; break;
    case 'tasks':
      w.updateShell({reconnecting: true, busy: {key: 'b', message: 'A task is running in this workspace or an overlapping folder.', actionLabel: 'Open running conversation'}, error: {message: 'A recoverable host error.'}});
      w.updateApproval({approval: {id: 'approval-a', toolName: 'edit_file', warning: 'Review this workspace change.', canAlwaysAllow: true, argsText: '{\n  "path": "source.ts"\n}', preview: {kind: 'modify', path: 'source.ts', diff: '--- a/source.ts\n+++ b/source.ts\n@@ -1 +1 @@\n-old\n+new\n'}}});
      w.updateRuntime({visible: true, summary: 'Waiting for approval · Model A · 1,250 tokens · ~$0.003', duration: '1m 2s', speed: '20.2', provider: 'Provider', thinkingLevel: 'high', inputTokens: '1,000', outputTokens: '250', cacheRead: '500', cacheWrite: '0', contextTokens: '2,500', contextWindow: '128,000', compactions: '1', toolFailures: '1', recordedCost: '~$0.003', latestCost: '~$0.002'});
      w.updateCosts({visible: true, report: {unknownRequests: 1, requests: [{id: 'cost-a', purpose: 'Reply', status: 'complete', provider: 'provider', model: 'model-a', time: '2026-10-17 12:00', source: 'Saved catalog', price: {input: 1, output: 2}, known: true, usage: {input: 1000, output: 250, cacheRead: 500, cacheWrite: 0, reasoning: 50, cost: {total: 0.003}}}]}});
      w.updateNotices([{id: 'd', runID: 'run-d', title: 'Completed task', workspace: workspace.name}]);
      query<HTMLDetailsElement>('[id$=run-status]').open = true; query<HTMLDetailsElement>('[id$=cost-requests]').open = true;
      query<HTMLDetailsElement>('.pui-approval-arguments').open = true;
      fixture.roots = ['.pui-topbar', '.pui-composer-region', '[id$=completion-notices]']; break;
    case 'task-failure': w.updateFailure({visible: true, message: 'The provider connection failed.', advice: 'Review your settings or continue this conversation.', canContinue: true, workspaceId: workspace.id}); fixture.roots = ['[id$=task-failure]']; break;
    case 'task-failure-settings': w.updateFailure({visible: true, message: 'No model is configured.', advice: 'Choose a provider before continuing.', canContinue: false, workspaceId: workspace.id}); fixture.roots = ['[id$=task-failure]']; break;
    case 'approval-command': w.updateApproval({approval: {id: 'approval-command', toolName: 'run_command', warning: 'This command runs with your normal computer permissions. It may access or change files outside this workspace.', canAlwaysAllow: false, argsText: '{\n  "command": "inspect --check"\n}'}}); fixture.roots = ['[id$=approval]']; break;
    case 'workspace-picker': fixture.session = w.openWorkspacePicker({workspaces: [workspace], disabled: false}, {onSubmit: path => log('workspace-save', path), onPick: async () => ({path: '/demo/new-workspace'}), onSelect: id => {log('workspace-select', id);}}); dialog(); break;
    case 'rename': fixture.session = w.openRename({id: 'a', title: 'Review the project'}, {onSubmit: draft => log('rename', draft)}); dialog(); break;
    case 'message-editor': fixture.session = w.openMessageEditor({title: 'Edit message', value: 'Original message 中文\nSecond paragraph.', submitLabel: 'Send again', note: 'Send again to replace this message and its following replies. 1 attached image will be kept.'}, {onSubmit: text => log('edit-message', text)}); dialog(); break;
    case 'queue-editor': fixture.session = w.openQueueEditor({title: 'Edit pending message', value: 'Queued follow-up', submitLabel: 'Save message'}, {onSubmit: text => log('edit-queue', text)}); dialog(); break;
    case 'confirmation': fixture.session = w.openConfirmation({title: 'Delete conversation?', action: 'Delete conversation', description: {before: 'Permanently delete ', subject: 'Review the project', after: ', including its history, image attachments and run records?'}, hint: 'Deleted conversation data cannot be recovered from Pith Desk.'}, {onConfirm: () => log('confirm')}); dialog(); break;
    case 'full-access': fixture.session = w.openFullAccess({title: 'Review the project'}, {onConfirm: () => log('full-access')}); dialog(); break;
    case 'history-loading': fixture.session = w.openHistory({nodes: null, loading: true}); dialog(); break;
    case 'history': fixture.session = w.openHistory({nodes: [{id: 'branch-u', role: 'user', text: 'Original request 中文', active: true}, {id: 'branch-a', role: 'assistant', text: 'Earlier response', active: false}]}, {onContinue: id => log('branch', id)}); dialog(); break;
    case 'settings-loading': fixture.session = app.settings.openSettings({baseUrl: '', hasApiKey: false, ready: false}); dialog(); break;
    case 'settings': settings(); query<HTMLDetailsElement>('[id$=provider-advanced]').open = true; break;
    case 'settings-probing': settings(true); break;
    case 'connections-http': case 'connections-stdio': {
      const panel = app.settings.openConnections({}, {onSubmit: draft => log('mcp-save', draft), onConnectionAction: (action, target) => log('mcp-action', action, target), onRefresh: () => log('mcp-refresh'), onNew: () => log('mcp-new')});
      panel.setConnections([{name: 'Remote tools', type: 'http', url: 'https://tools.example/mcp', enabled: true, oauth: true, signedIn: true, status: 'connected', statusLabel: 'Connected · 3 tools'}, {name: 'Local tools', type: 'stdio', command: 'tool-server', args: ['--local'], enabled: false, statusLabel: 'Will not be used by tasks', envKeys: ['TOKEN']}]);
      panel.edit(scenario === 'connections-http' ? {name: 'Remote tools', type: 'http', url: 'https://tools.example/mcp', oauth: true, oauthClientId: 'client-id', oauthScope: 'tools', enabled: true, hasBearerToken: true} : {name: 'Local tools', type: 'stdio', command: 'tool-server', args: ['--local'], enabled: true, envKeys: ['TOKEN']});
      fixture.session = panel; dialog(); break;
    }
    case 'model-loading': fixture.session = app.settings.openModels({loading: true}); dialog(); break;
    case 'model-picker': fixture.session = app.settings.openModels({editor: {providers: [{id: 'provider', name: 'Provider'}], models: [model, {...model, id: 'model-b', name: 'Model B', supportsImages: false}], selection: {provider: 'provider', model: 'model-a', thinkingLevel: 'high'}}}, {onSubmit: selection => log('model', selection)}); dialog(); break;
    case 'connection-loading': fixture.session = app.settings.openConnectionLoading({editing: false}); dialog(); break;
    case 'custom-connection': fixture.session = app.settings.openCustomConnection({name: 'Independent provider', baseUrl: 'https://custom.example/v1', api: 'openai-completions', editing: true, models: [{id: 'custom-a', name: 'Custom A', contextWindow: 128000, maxTokens: 8192, reasoning: true, input: ['text', 'image'], cost: {input: 1, output: 2, cacheRead: 0.1, cacheWrite: 0.2}}, {id: 'custom-b', name: 'Custom B'}]}, {onSubmit: draft => log('custom-save', draft)}); dialog(); break;
    case 'login-link': case 'login-text': case 'login-secret': case 'login-choice': case 'login-error':
      fixture.session = app.settings.openProviderLogin(scenario === 'login-link' ? {phase: 'waiting', message: 'Open the sign-in page and enter the verification code.', url: 'https://provider.example/login', code: 'ABCD-EFGH'} : scenario === 'login-error' ? {phase: 'error', message: 'Provider sign-in failed. Please try again.'} : {phase: 'prompt', message: 'Complete provider verification.', prompt: 'Verification value', promptType: scenario === 'login-secret' ? 'secret' : 'text', options: scenario === 'login-choice' ? [{id: 'yes', label: 'Yes'}, {id: 'no', label: 'No'}] : undefined}, {onAnswer: answer => log('login-answer', answer), onCancel: () => log('login-cancel')}); dialog(); break;
    case 'resources-loading': case 'resources': {
      fixture.session = app.resources.open({workspace, instructions: scenario === 'resources' ? [{name: 'AGENTS.md', path: '/demo/workspace/AGENTS.md', content: '# Workspace instructions\nPreserve behavior.'}] : [], skills: scenario === 'resources' ? [{name: 'inspect', path: '/demo/workspace/.pi/skills/inspect/SKILL.md', description: 'Inspect this workspace.'}] : [], templates: scenario === 'resources' ? [{name: 'summarize', path: '/demo/workspace/.pi/prompts/summarize.md', description: 'Summarize the project.'}] : [], diagnostics: scenario === 'resources' ? ['One optional resource could not be loaded.'] : [], loading: scenario === 'resources-loading', canCreateInstructions: scenario === 'resources-loading'}, {onRefresh: () => log('refresh-resources'), onCreate: kind => log('create-resource', kind), onEdit: target => log('edit-resource', target), onUse: target => log('use-resource', target), onFileAction: (action, target) => log('resource-file', action, target)});
      if (scenario === 'resources') query<HTMLDetailsElement>('.pui-resource-preview').open = true; dialog(); break;
    }
    case 'resource-loading': fixture.session = app.resources.openEditorLoading({kind: 'skill'}); dialog(); break;
    case 'resource-create': fixture.session = app.resources.openEditor({workspaceId: workspace.id, workspacePath: workspace.path, kind: 'skill', content: '---\nname: my-skill\ndescription: Describe when to use this skill.\n---\n\nWrite the instructions here.\n', editable: true, workspaceBusy: false}, {onSubmit: draft => log('resource-save', draft)}); dialog(); break;
    case 'resource-editor': case 'resource-readonly': fixture.session = app.resources.openEditor({workspaceId: workspace.id, workspacePath: workspace.path, path: scenario === 'resource-readonly' ? '/parent/AGENTS.md' : '/demo/workspace/.pi/skills/inspect/SKILL.md', kind: scenario === 'resource-readonly' ? 'instructions' : 'skill', content: '# Instructions 中文\n\nPreserve every existing behavior.\n', editable: scenario === 'resource-editor', workspaceBusy: false}, {onSubmit: draft => log('resource-save', draft), onDelete: target => log('resource-delete', target)}); dialog(); break;
    case 'artifacts': app.files.updateArtifacts({ownerId: 'a', files: [{name: 'report.md', path: '/demo/workspace/report.md'}, {name: 'diagram.png', path: '/demo/workspace/diagram.png'}], loading: false, error: '', copyMode: 'path'}, {onPreview: target => log('artifact-preview', target), onFileAction: (action, target) => log('artifact-file', action, target)}); query<HTMLButtonElement>('[id$=artifacts-toggle]').click(); fixture.roots = ['[id$=artifacts-control]', '[id$=artifacts]']; break;
    case 'preview-text': case 'preview-markdown': case 'preview-diff': case 'preview-image': {
      const kind = scenario.slice('preview-'.length) as 'text' | 'markdown' | 'diff' | 'image';
      fixture.session = app.files.openPreview({owner: {kind: 'artifact', id: 'a'}, name: 'report.md', path: '/demo/workspace/report.md', capabilities: {open: true, reveal: true, copyMode: 'path'}, content: kind === 'image' ? {kind, imageSrc: png, imageAlt: 'Diagram'} : {kind, text: kind === 'diff' ? '--- a/report.md\n+++ b/report.md\n@@ -1 +1 @@\n-Old result\n+New result 中文\n' : kind === 'markdown' ? '# Report 中文\n\nA **verified** result.\n\n```ts\nconst ready = true;\n```' : 'Plain report 中文\n\nSecond paragraph.', truncated: false}}, {onFileAction: (action, target) => log('preview-file', action, target)}); dialog(); break;
    }
    default: throw new Error(`Unknown rc.27 scenario ${scenario satisfies never}`);
  }
  await settle();
  await Promise.all([...document.images].filter(image => image.getClientRects().length).map(image => image.decode().catch(() => {})));
  await settle();
  return fixture;
}

if (typeof window !== 'undefined') {
  const params = new URLSearchParams(location.search);
  const scenario = params.get('scenario') || 'shell';
  if (!rc27Scenarios.includes(scenario as RC27Scenario)) throw new Error(`Unknown rc.27 scenario ${scenario}`);
  const appearance = params.get('appearance') === 'dark' ? 'dark' : 'light';
  const ready = mount(scenario as RC27Scenario, appearance);
  ready.then(fixture => {fixture.ready = ready.then(() => {}); document.documentElement.dataset.contractReady = scenario;});
}
