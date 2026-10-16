import {
  createApplication,
  type ActionResult, type Appearance, type Application, type AppFileAction, type AppFileTarget,
  type AppResourceEntry, type AppResourceKind, type AppResourceTarget, type ConversationMessage,
  type CustomConnectionState, type MCPConnectionItem,
  type ModelPickerState, type ModelSelection, type ProviderLoginState, type ResourcesSession,
  type ResourcesState, type SettingsPanelState,
} from 'pith-ui/app';
import 'pith-ui/styles.css';

// This controller deliberately has no DOM beyond the checked application mount.
// All data and host capabilities are simulated in memory; no account, server,
// filesystem, clipboard, credential store or update service is accessed.
const mount = document.getElementById('app');
if (!(mount instanceof HTMLElement)) throw new Error('Missing application mount.');
const requestedTheme = new URLSearchParams(location.search).get('theme');
const appearance: Appearance = requestedTheme === 'light' || requestedTheme === 'dark' ? requestedTheme : 'system';
const workspace = {id: 'demo-workspace', name: '模拟工作区', path: '/demo'};
const conversationId = 'demo-conversation';
const notice = '这是模拟参考应用：所有聊天、审批、连接和文件操作都只使用内存数据，不访问真实服务。';
let title = '模拟会话', sequence = 0, working = false, taskGeneration = 0, destroyed = false;
let permission = 'ask', clipboard = '', signedIn = false;
let selection: ModelSelection = {provider: 'demo', model: 'demo-balanced', thinkingLevel: 'high'};
let settingsData = {provider: 'demo', baseUrl: 'https://provider.example.test/v1', apiKey: ''};
let messages: ConversationMessage[] = [{id: 'demo-intro', role: 'assistant', text: notice, actions: {copy: true}}];
let queued: {id: string; mode: string; text: string; imageCount: number}[] = [];
let connections: MCPConnectionItem[] = [];
let resources: ResourcesState = {
  workspace,
  instructions: [{name: 'AGENTS.md', path: '/examples/AGENTS.md', content: '# Inherited instructions\n\n这是只读的模拟上级指令。'}],
  skills: [{name: 'review', path: '/demo/.pi/skills/review/SKILL.md', description: '先读代码，再验证行为。', content: '# Review\n\n先读代码，再验证行为。'}],
  templates: [{name: 'summarize', path: '/demo/.pi/prompts/summarize.md', description: '用证据总结。', content: '根据当前代码给出简洁总结。'}],
  diagnostics: ['模拟数据：资源编辑内容含 fail 时演示失败；去掉后可保存。'], canCreateInstructions: true,
};
let resourceInventory: ResourcesSession | undefined;
let independent: CustomConnectionState = {
  name: '模拟独立连接', baseUrl: 'https://custom.example.test/v1', api: 'openai-completions', editing: false,
  models: [{id: 'demo-custom', name: 'Custom Demo', contextWindow: 128000, maxTokens: 8192, reasoning: true}],
};
const timers = new Map<ReturnType<typeof setTimeout>, () => void>();
function pause(milliseconds = 160): Promise<void> {
  return new Promise(resolve => {const timer = setTimeout(() => {timers.delete(timer); resolve();}, milliseconds); timers.set(timer, resolve);});
}
const ok = (): ActionResult => ({ok: true});
const nextId = (kind: string) => `demo-${kind}-${++sequence}`;
function copyText(text: string): ActionResult {clipboard = text; announce(`模拟复制完成：${clipboard.length} 个字符仅保存在本页内存。`); return ok();}

const app: Application = createApplication(mount, {
  brand: {name: 'Pith', qualifier: 'UI · 模拟应用'}, appearance,
  host: {
    copyText,
    openExternal(url) {announce(`模拟打开外部链接：${url}。没有离开当前页面。`); return ok();},
  },
  workspace: {
    onAction(action) {
      if (action === 'settings') openSettings();
      else if (action === 'connections') openConnections();
      else if (action === 'resources') openResources();
      else if (action === 'model') openModels();
      else if (action === 'workspace') openWorkspace();
      else if (action === 'compact') announce('模拟上下文已压缩；没有调用模型。');
      else if (action === 'continue') submit('继续模拟任务');
      else announce('模拟诊断已生成；没有写入文件。');
    },
    onSubmit: submit,
    onInput: renderComposer,
    onStop() {taskGeneration++; working = false; app.workspace.updateApproval({approval: null}); announce('模拟任务已停止。队列内容仍然保留。'); render();},
    onThinkingChange(value) {selection = {...selection, thinkingLevel: value}; renderComposer();},
    onQueueAction(action, id) {
      const item = queued.find(value => value.id === id); if (!item) return;
      if (action === 'edit') app.workspace.openQueueEditor({title: 'Edit pending message', value: item.text, submitLabel: 'Save message'}, {onSubmit: async text => {
        await pause(); const current = queued.find(value => value.id === id);
        if (!current) return {ok: false, error: '模拟队列目标已失效；没有覆盖其他消息。'};
        current.text = text; renderQueue(); return ok();
      }});
      else if (action === 'delete') {queued = queued.filter(value => value.id !== id); renderQueue();}
      else {item.mode = 'steer'; renderQueue();}
    },
    onApproval(_id, action) {
      app.workspace.updateApproval({approval: null});
      if (action === 'deny') {taskGeneration++; working = false; announce('模拟操作已拒绝。没有更改文件。'); render();}
      else void finishTask(taskGeneration);
    },
    onConversationAction(action) {
      if (action === 'history') openHistory();
      else if (action === 'rename') app.workspace.openRename({id: conversationId, title}, {onSubmit: draft => {title = draft.title; render(); return ok();}});
      else if (action === 'delete') app.workspace.openConfirmation({title: 'Delete simulated conversation?', action: 'Delete conversation', description: {before: 'Only this page’s in-memory conversation will be cleared.'}}, {onConfirm() {messages = [{id: nextId('intro'), role: 'assistant', text: notice}]; render(); return ok();}});
      else announce('模拟会话导出已准备；没有下载或写入文件。');
    },
    onMessageAction(action) {
      const message = messages.find(value => value.id === action.messageId); if (!message) return;
      if (action.action === 'copy') return copyText(message.text);
      if (action.action === 'edit') app.workspace.openMessageEditor({title: 'Edit message', value: message.text, submitLabel: 'Save message'}, {onSubmit: text => {message.text = text; renderMessages(); return ok();}});
      else if (action.action === 'branch') openHistory();
    },
    onPermissionChange(mode) {
      if (mode === 'full-access') app.workspace.openFullAccess({title}, {onConfirm() {permission = mode; renderPermission(); return ok();}});
      else {permission = mode; renderPermission();}
    },
    onNewConversation() {taskGeneration++; working = false; queued = []; messages = [{id: nextId('intro'), role: 'assistant', text: notice}]; app.workspace.updateApproval({approval: null}); render();},
    onSelectConversation() {app.workspace.setSidebarOpen(false);},
    onSelectWorkspace() {app.workspace.setSidebarOpen(false);},
    onImages(files) {announce(`模拟收到 ${files.length} 个图片附件；本参考应用不读取或上传图片内容。`);},
    onDropReferences(input) {app.workspace.insertReferences(input.paths);},
    onError(message) {announce(`模拟界面反馈：${message}`);},
  },
});

function renderMessages(): void {if (!destroyed) app.workspace.updateConversation({id: conversationId, messages, working});}
function announce(text: string): void {if (destroyed) return; messages = [...messages, {id: nextId('notice'), role: 'assistant', text, actions: {copy: true}}]; renderMessages();}
function renderQueue(): void {app.workspace.updatePending({items: queued, running: working, busy: false});}
function renderComposer(): void {
  app.workspace.updateComposer({
    action: working ? app.workspace.readDraft().trim() ? 'queue' : 'stop' : 'send',
    model: {label: selection.model === 'demo-fast' ? 'Fast Demo' : 'Balanced Demo', description: 'Choose model'},
    thinking: {options: (selection.model === 'demo-fast' ? ['off'] : ['off', 'medium', 'high']).map(value => ({value, label: value})), value: selection.thinkingLevel},
    placeholder: '模拟消息：发送后可排队、编辑和审批；不会访问真实模型。',
  });
}
function renderPermission(): void {app.workspace.updatePermission({mode: permission, description: '仅模拟权限状态，不授予真实文件或网络访问。'});}
function render(): void {
  app.workspace.updateShell({workspace: workspace.name, conversation: title});
  app.workspace.updateNavigation({groups: [{...workspace, selected: true, children: [{id: conversationId, title, active: true, status: {kind: working ? 'running' : 'idle'}, actions: {rename: true, history: true, export: true, delete: true}}]}], empty: null});
  renderMessages(); renderQueue(); renderComposer(); renderPermission();
  app.workspace.updateRuntime({visible: working, summary: '模拟任务 · 等待本页审批', duration: '0.5s', speed: '32', provider: '模拟提供商', thinkingLevel: selection.thinkingLevel, inputTokens: '120', outputTokens: '48', cacheRead: '0', cacheWrite: '0', contextTokens: '512', contextWindow: '128,000', compactions: '0', toolFailures: '0', recordedCost: '$0.000', latestCost: '$0.000'});
}
function submit(text: string): ActionResult {
  if (!text.trim()) return {ok: false, error: '请输入一条模拟消息。'};
  app.workspace.resetDraft('');
  if (working) {queued = [...queued, {id: nextId('queue'), mode: 'follow-up', text, imageCount: 0}]; renderQueue(); renderComposer(); return ok();}
  working = true; const generation = ++taskGeneration;
  const answer = nextId('answer');
  messages = [...messages, {id: nextId('user'), role: 'user', text, actions: {edit: true, copy: true}}, {id: answer, role: 'assistant', text: '模拟流式回复：', actions: {copy: true}}];
  render(); void streamTask(answer, generation); return ok();
}
async function streamTask(id: string, generation: number): Promise<void> {
  for (const token of ['我会保留现有行为，', '逐步检查这个方案。', '\n\n接下来演示一次文件修改审批；不会写入真实文件。']) {
    await pause(); if (destroyed || generation !== taskGeneration) return;
    messages = messages.map(message => message.id === id ? {...message, text: message.text + token} : message); renderMessages();
  }
  app.workspace.updateApproval({approval: {id: 'demo-approval', toolName: 'edit_file', canAlwaysAllow: true, argsText: JSON.stringify({path: '/demo/报告.md', change: 'old → verified'}, null, 2), preview: {kind: 'modify', path: '/demo/报告.md', diff: '--- a/报告.md\n+++ b/报告.md\n-old\n+verified\n'}}});
}
async function finishTask(generation: number): Promise<void> {
  await pause(); if (destroyed || generation !== taskGeneration) return;
  for (const item of queued) messages.push({id: nextId('queued-user'), role: 'user', text: item.text, actions: {edit: true, copy: true}});
  queued = []; working = false;
  messages = [...messages, {id: nextId('complete'), role: 'assistant', text: '模拟任务已完成。', actions: {copy: true, branch: {key: 'demo-finished'}}}];
  render();
}

function openModels(): void {
  const editor: NonNullable<ModelPickerState['editor']> = {
    providers: [{id: 'demo', name: '模拟提供商', model: selection.model, thinkingLevel: selection.thinkingLevel}],
    models: [
      {id: 'demo-balanced', name: 'Balanced Demo', provider: 'demo', supportsImages: true, contextWindow: 128000, maxTokens: 8192, thinkingLevels: ['off', 'medium', 'high']},
      {id: 'demo-fast', name: 'Fast Demo', provider: 'demo', supportsImages: false, contextWindow: 64000, maxTokens: 4096, thinkingLevels: ['off']},
    ], selection,
  };
  app.settings.openModels({editor, loading: false}, {onSubmit: value => {selection = value; renderComposer(); return ok();}}).focus();
}
function openSettings(): void {
  let state: SettingsPanelState = {baseUrl: settingsData.baseUrl, hasApiKey: true, ready: true, appearance: {mode: app.read().appearance}};
  let tests = 0, testGeneration = 0;
  const session = app.settings.openSettings(state, {
    onSubmit: async draft => {await pause(); if (!session.isOpen()) return {ok: false, error: '模拟设置已关闭。'}; settingsData = {...draft}; announce('模拟设置已保存；凭证只保留在内存。'); return ok();},
    onTest: async () => {
      const generation = ++testGeneration;
      state = {...state, testing: true, testResult: {message: '正在模拟连接测试…'}}; session.update(state);
      await pause(); if (!session.isOpen() || generation !== testGeneration) return;
      tests++; state = {...state, testing: false, testResult: {message: tests === 1 ? '模拟连接失败；输入已保留。再次测试可成功。' : '模拟连接测试成功。', ok: tests > 1}}; session.update(state);
    },
    onCancelTest() {testGeneration++; state = {...state, testing: false, testResult: {message: '模拟连接测试已取消。'}}; session.update(state);},
    onAppearanceChange(value) {app.setAppearance(value); state = {...state, appearance: {mode: value}}; session.update(state);},
    onProviderChange(provider) {testGeneration++; session.resetProvider({provider, baseUrl: settingsData.baseUrl, clearKey: true});},
    onRemoveKey() {settingsData.apiKey = ''; session.clearSecrets(); credential(); return ok();},
    onProviderAction(action) {
      if (action === 'login') openLogin(() => {signedIn = true; credential();});
      else if (action === 'logout') {signedIn = false; credential();}
      else if (action === 'custom') openCustomConnection();
      else {independent = {...independent, editing: false}; announce('模拟独立连接已移除。');}
      return ok();
    },
    onCreateConnection: openCustomConnection,
    onClose() {testGeneration++;},
    onDiagnostics() {announce('模拟诊断已生成；没有写入文件。');},
    onUpdateAction(action) {session.updateUpdates({version: '0.1.0-demo', enabled: true, phase: 'idle', availableVersion: action === 'check' ? '0.1.1-demo' : '', progress: 0, message: action === 'check' ? '模拟发现一个新版本；安装动作也仅为演示。' : '模拟更新完成。没有下载、安装或重启。'});},
  });
  function credential(): void {session.setCredential({status: signedIn ? '模拟账号已登录' : '模拟凭证 · 仅内存', hidden: false, required: false, placeholder: '仅输入模拟密钥，不要提供真实凭证', removeVisible: !!settingsData.apiKey, providerActions: {id: 'demo', oauth: true, signedIn, custom: true}});}
  session.setProviders([{id: 'demo', name: '模拟提供商'}], settingsData.provider); credential();
  session.updateUpdates({version: '0.1.0-demo', enabled: true, phase: 'idle', availableVersion: '', progress: 0, message: '模拟更新；不会下载或安装任何内容。'});
}
function openLogin(onComplete?: () => void): void {
  let step = 0;
  let state: ProviderLoginState = {phase: 'prompt', message: '模拟登录：输入 DEMO-1234，再选择一个模拟工作区。请勿输入真实凭证。', url: 'https://login.example.test/authorize', code: 'DEMO-1234', prompt: 'Verification code', promptType: 'text'};
  const session = app.settings.openProviderLogin(state, {onAnswer: async answer => {
    await pause(); if (!session.isOpen()) return {ok: false, error: '模拟登录已取消。'};
    if (step === 0 && answer !== 'DEMO-1234') return {ok: false, error: '模拟验证码不正确。请使用 DEMO-1234。'};
    step++;
    state = step === 1 ? {phase: 'prompt', message: '模拟追加问题：选择一个工作区。', prompt: '选择模拟工作区', options: [{id: 'personal', label: '个人测试'}, {id: 'team', label: '团队测试'}]} : {phase: 'complete', message: '模拟登录已完成。没有访问外部账号。'};
    session.update(state); if (step > 1) onComplete?.(); return ok();
  }});
}
function openCustomConnection(): void {
  const session = app.settings.openCustomConnection(independent, {onSubmit: async draft => {
    await pause(); if (!session.isOpen()) return {ok: false, error: '模拟独立连接窗口已关闭。'};
    if (!draft.models.length) return {ok: false, error: '请至少保留一个模拟模型。'};
    independent = {name: draft.name, baseUrl: draft.baseUrl, api: draft.api, editing: true, models: draft.models.map(model => ({id: model.id, name: model.name, contextWindow: model.contextWindow, maxTokens: model.maxTokens, reasoning: model.reasoning, input: model.images ? ['text', 'image'] : ['text']}))};
    announce('模拟独立连接和模型定义已保存。没有连接到提供商。'); return ok();
  }});
}

function openConnections(): void {
  let editGeneration = 0;
  const session = app.settings.openConnections({}, {
    onSubmit: async draft => {
      const generation = editGeneration;
      await pause(); if (!session.isOpen()) return {ok: false, error: '模拟连接窗口已关闭。'};
      let args: string[] = [];
      try {const value: unknown = JSON.parse(draft.args || '[]'); if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) throw new Error(); args = value;}
      catch {return {ok: false, error: '模拟命令参数必须为字符串 JSON 数组。'};}
      const item: MCPConnectionItem = {name: draft.name, type: draft.type, url: draft.url, command: draft.command, args, enabled: draft.enabled, oauth: draft.oauth, signedIn: false, status: 'idle', statusLabel: '模拟连接已保存 · 不连接真实服务器'};
      connections = [...connections.filter(value => value.name !== draft.name), item]; session.setConnections(connections);
      if (generation === editGeneration) {session.clearSecrets(); session.edit(); editGeneration++;} return ok();
    },
    onConnectionAction(action, target) {
      const item = connections.find(value => value.name === target.name); if (!item) return {ok: false, error: '模拟连接已移除。'};
      if (action === 'mcp-edit') {editGeneration++; session.edit(item);}
      else if (action === 'mcp-toggle') {item.enabled = !item.enabled; session.setConnections(connections);}
      else if (action === 'mcp-remove') {editGeneration++; connections = connections.filter(value => value.name !== item.name); session.setConnections(connections); session.edit();}
      else if (action === 'mcp-login') openLogin(() => {item.signedIn = true; session.setConnections(connections);});
      else {item.signedIn = false; session.setConnections(connections);}
      return ok();
    },
    onRefresh() {session.setConnections(connections);},
    onNew() {editGeneration++;},
  });
  session.setConnections(connections);
}

function openResources(): void {
  const session = app.resources.open(resources, {
    onRefresh: async () => {await pause(); if (session.isOpen()) session.update(resources);},
    onCreate: kind => openResourceEditor(kind),
    onEdit: target => openResourceEditor(target.kind, target),
    onUse(target) {resourceInventory?.close(); app.workspace.resetDraft(target.kind === 'skill' ? `/skill:${target.name} ` : `/${target.name} `); app.workspace.focusComposer();},
    onFileAction(action, target) {announce(`模拟文件动作：${action} ${target.path}；没有打开原生程序。`); return ok();},
  });
  resourceInventory = session;
}
const resourceList = (kind: AppResourceKind) => kind === 'instructions' ? 'instructions' : kind === 'skill' ? 'skills' : 'templates';
function openResourceEditor(kind: AppResourceKind, target?: AppResourceTarget): void {
  const list = resourceList(kind), entry = resources[list].find(value => value.path === target?.path);
  const editable = !target || target.path.startsWith(workspace.path + '/');
  const session = app.resources.openEditor({workspaceId: workspace.id, workspacePath: workspace.path, kind, path: target?.path, name: entry?.name, content: entry?.content ?? '', editable, workspaceBusy: false}, {
    onSubmit: async draft => {
      await pause(); if (!session.isOpen()) return {ok: false, error: '模拟资源目标已关闭。'};
      if (draft.content.includes('fail')) return {ok: false, error: '模拟保存失败；去掉 fail 后可重试。'};
      const name = entry?.name || (kind === 'instructions' ? 'AGENTS.md' : draft.name);
      const path = target?.path || (kind === 'instructions' ? '/demo/AGENTS.md' : kind === 'skill' ? `/demo/.pi/skills/${name}/SKILL.md` : `/demo/.pi/prompts/${name}.md`);
      const value: AppResourceEntry = {name, path, content: draft.content, description: draft.content.split('\n').find(line => line && !line.startsWith('#')) || ''};
      resources = {...resources, [list]: [...resources[list].filter(item => item.path !== path), value]}; resourceInventory?.update(resources); return ok();
    },
    onDelete: current => {resources = {...resources, [list]: resources[list].filter(item => item.path !== current.path)}; resourceInventory?.update(resources); session.close(); return ok();},
  });
}

const fileContents = new Map<string, {name: string; kind: 'markdown' | 'text' | 'diff' | 'image'; text?: string; imageSrc?: string}>([
  ['output/报告.md', {name: '报告.md', kind: 'markdown', text: '# 模拟报告\n\n这份报告只存在于本页内存。\n\n```ts\nconsole.log("pith-ui/app");\n```\n'}],
  ['output/change.diff', {name: 'change.diff', kind: 'diff', text: '--- a/report.txt\n+++ b/report.txt\n-old\n+verified\n'}],
  ['output/long.txt', {name: 'long.txt', kind: 'text', text: '模拟分页内容：中文与 emoji 🌱 保持完整。\n'.repeat(9000)}],
  ['output/pixel.png', {name: 'pixel.png', kind: 'image', imageSrc: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='}],
]);
function fileAction(action: AppFileAction, target: AppFileTarget): ActionResult {if (action === 'copy' || action === 'copy-path') clipboard = target.path; announce(`模拟文件动作：${action} ${target.path}；没有访问真实文件。`); return ok();}
function openPreview(target: AppFileTarget): void {
  const file = fileContents.get(target.path); if (!file) return;
  app.files.openPreview({...target, capabilities: {open: true, reveal: true, copyMode: 'path'}, content: {kind: file.kind, text: file.text, imageSrc: file.imageSrc, imageAlt: '模拟图片，可使用库内缩放查看。'}}, {onFileAction: fileAction});
}
function openHistory(): void {
  app.workspace.openHistory({nodes: [{id: 'demo-history', role: 'assistant', text: '之前的模拟分支', active: false}, {id: 'demo-current', role: 'assistant', text: '当前模拟分支', active: true}]}, {onContinue() {announce('已从选中的模拟历史节点继续。'); return ok();}});
}
function openWorkspace(): void {
  app.workspace.openWorkspacePicker({workspaces: [workspace]}, {onPick: async () => ({path: workspace.path}), onSelect() {announce('已选择模拟工作区；没有读取本机目录。');}, onSubmit: () => ok()});
}

render();
app.workspace.updateWelcome({workspace, hasApiKey: true, hasConnections: true, modelName: 'Balanced Demo'});
app.files.updateArtifacts({ownerId: conversationId, files: [...fileContents].map(([path, file]) => ({path, name: file.name})), loading: false, error: '', copyMode: 'path'}, {onPreview: openPreview, onFileAction: fileAction});

/** A host embedding this controller can dispose all simulated work explicitly. */
export function destroyReferenceApplication(): void {
  if (destroyed) return; destroyed = true; taskGeneration++;
  for (const [timer, resolve] of timers) {clearTimeout(timer); resolve();} timers.clear();
  clipboard = ''; settingsData.apiKey = ''; connections = []; queued = []; messages = []; app.destroy();
}
