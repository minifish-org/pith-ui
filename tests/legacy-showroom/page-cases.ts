import type { DemoContext, MountedDemo, ShowcaseCase } from './types.js';
import { element, uniqueId } from '../../src/dom.js';
import { Lifetime } from '../../src/core.js';
import { createButton, createDialog, createNotice, createTextEditDialog, createToolbar } from '../../src/primitives.js';
import { createWorkspaceShell } from '../../src/workspace.js';
import { createWorkspaceNavigation } from '../../src/navigation/navigation.js';
import { createContextMenu } from '../../src/navigation/context-menu.js';
import { createConversationView } from '../../src/content/conversation-view.js';
import type { ConversationMessage } from '../../src/content/conversation-view.js';
import { installConversationReader } from '../../src/content/conversation-reader.js';
import { createPendingMessages } from '../../src/composer.js';
import { createApprovalPanel } from '../../src/tasks/approval.js';
import { createRuntimePanel } from '../../src/tasks/runtime.js';
import { createPermissionControl } from '../../src/tasks/permission.js';
import { createSettingsPanel, type SettingsPanelState } from '../../src/forms/panels.js';
import { createProviderActions } from '../../src/forms/actions.js';
import { createProviderLoginPanel } from '../../src/forms/provider-login.js';
import { createModelEditor } from '../../src/forms/model-editor.js';
import { createResourcesPanel, createFileActions, createFilePreview } from '../../src/files/panels.js';
import { createUpdatePanel } from '../../src/files/systems.js';

type Owned = { destroy(): void };
const prose = '## 可复用的积木\n\n保留已有的**输入、焦点与阅读位置**，再逐步提炼界面。\n\n- 接口明确\n- 失败可恢复\n- 组件统一维护\n\n```ts\nconst message = "中文 example 🐟";\nconsole.log(message);\n```';
function pageRoot(label: string): HTMLElement {
  const root = element('section', 'pui-demo-page'); root.setAttribute('aria-label', label);
  Object.assign(root.style, { border: '1px solid var(--pui-border)', borderRadius: '10px', background: 'var(--pui-bg-main)', minWidth: '0', overflow: 'auto' });
  return root;
}
function brand(): HTMLElement { const mark = element('span', 'pui-logo-mark'); for (let index = 0; index < 4; index++) mark.append(element('i')); mark.setAttribute('aria-hidden', 'true'); return mark; }
function fixtureMessages(prefix: string, count = 3): ConversationMessage[] {
  return Array.from({ length: count }, (_, index) => ({ id: `${prefix}-message-${index}`, role: index % 2 ? 'assistant' : 'user', text: index % 2 ? prose : `请阅读项目并保留已经验证的行为。消息 ${index + 1} · literal a+b · 中文 🐟`, timestamp: 1792108800000 + index * 60000,
    status: 'done', actions: { copy: index % 2 ? 'Copy response' : 'Copy message', edit: index % 2 === 0, branch: index % 2 ? { key: `${prefix}-branch-${index}` } : undefined } }));
}

function workspacePage(context: DemoContext, mode: 'chat' | 'reading' | 'task'): MountedDemo {
  const root = pageRoot('Interactive workspace composition'); const prefix = uniqueId('pui-page') + '-'; const life = new Lifetime(); const owned: Owned[] = [];
  let submitDraft: ((text: string) => Promise<void>) | undefined;
  const shell = createWorkspaceShell({ brand: brand(), prefix, onSearch(value) { query = value.toLowerCase(); navigation.update(navState()); }, composer: { onSubmit: text => submitDraft?.(text), onModel: () => picker.open(), onThinkingChange: value => context.log(`Effort: ${value}`) } }); owned.push(shell);
  shell.element.style.height = '660px'; shell.element.style.minHeight = '520px'; shell.element.style.minWidth = '760px';
  root.append(shell.element); shell.part('welcome').hidden = true;
  const workspaceId = `${prefix}workspace`; const a = `${prefix}conversation-a`; const b = `${prefix}conversation-b`; let activeId = a; let expanded = true; let query = ''; let live = true;
  let messages = context.state === 'empty' ? [] : fixtureMessages(prefix, mode === 'reading' || context.state === 'long' ? 48 : 4);
  const alternate = fixtureMessages(prefix + 'other', 2); const original = messages;
  const status = createNotice({ message: context.state === 'error' ? 'Demonstration: the last action failed; existing content is kept.' : '' }); owned.push(status); shell.part('inline-error').replaceWith(status.element);
  const reader = installConversationReader(shell.part('chat-scroll'), shell.part('messages'), shell.part('conversation-find'), shell.part('back-to-latest'), { keyboardTarget: root }); owned.push(reader);
  const editor = createTextEditDialog({ title: 'Edit message', onSubmit: async value => {
    const submittedTarget = editTarget;
    const result = await context.action(); if (!live || !result.ok) return result;
    const target = messages.find(message => message.id === submittedTarget); if (target) target.text = value; render(); return result;
  } }); owned.push(editor); let editTarget = '';
  const view = createConversationView({ container: shell.part('messages'), onAction(action) {
    if (action.action === 'edit') { editTarget = action.messageId; editor.open({ value: messages.find(message => message.id === editTarget)?.text ?? '' }); }
    else context.log(`${action.action}: ${action.messageId}`);
  }, onCopyCode: text => context.log(`Copied demonstration code: ${text.length} characters`) }); owned.push(view);
  const render = (): void => { reader.beforeRender(activeId); view.update({ id: activeId, messages, working: mode === 'task' && context.state === 'loading' }); reader.afterRender(); };
  const conversations = [{ id: a, title: mode === 'reading' ? 'Long conversation / 长会话' : 'Review existing behavior', active: true }, ...(mode === 'task' ? [] : [{ id: b, title: 'Another conversation', active: false }])];
  const navState = () => ({ groups: [{ id: workspaceId, name: 'Example workspace', path: '/demo/workspace', expanded, selected: true, children: conversations.filter(item => item.title.toLowerCase().includes(query)).map(item => ({ ...item, active: item.id === activeId })) }], empty: (query && !conversations.some(item => item.title.toLowerCase().includes(query)) ? 'search' : null) as 'search' | null, disabled: context.state === 'disabled' });
  const contextMenu = createContextMenu({onAction:item=>{context.log(`Demonstration navigation action: ${item.action}`);contextMenu.close(true);}});owned.push(contextMenu);root.append(contextMenu.element);
  const navigation = createWorkspaceNavigation(navState(), { element: shell.part('history-list'), onToggle() { expanded = !expanded; navigation.update(navState()); }, onSelect(id) { activeId = id; messages = id === a ? original : alternate; navigation.update(navState()); shell.update({ conversation: conversations.find(item => item.id === id)?.title ?? 'Conversation' }); render(); },onAction(event) {
    if(event.action==='workspace-menu') contextMenu.open(event.trigger,{label:'Example workspace actions',items:[{id:'rename',label:'Rename workspace',action:'rename-workspace'},{id:'remove',label:'Remove workspace',action:'remove-workspace',danger:true}]});
    else if(event.action==='conversation-menu') contextMenu.open(event.trigger,{label:'Example conversation actions',items:[{id:'rename',label:'Rename conversation',action:'rename-conversation'},{id:'delete',label:'Delete conversation',action:'delete-conversation',danger:true}]});
    else context.log(event.action==='new-conversation'?`Demonstration new conversation in ${event.workspaceId}`:'Demonstration add workspace');
  } }); owned.push(navigation);
  shell.update({ workspace: 'Example workspace', conversation: conversations[0]!.title, reconnecting: context.state === 'loading' });
  const permission = createPermissionControl({ mode: 'ask', description: 'Demonstration: changes and commands require approval.', disabled: context.state === 'disabled' }, { element: shell.part('permission-control'), descriptionElement: shell.part('permission-description'), onChange: mode => context.log(`Demonstration permissions: ${mode}`) }); owned.push(permission);
  const model = createModelEditor({ providers: [{ id: 'example', name: 'Example provider' }], models: [{ id: 'example-model', provider: 'example', name: 'Example model', thinkingLevels: ['low', 'medium', 'high'], supportsImages: true, contextWindow: 128000, maxTokens: 16000 }], selection: { provider: 'example', model: 'example-model', thinkingLevel: 'high' } }, { prefix: prefix + 'model', onChange: selection => context.log(`Model: ${selection.model}; effort: ${selection.thinkingLevel}`) }); owned.push(model);
  const composerState = { disabled: context.state === 'disabled', action: mode === 'task' ? 'queue' as const : 'send' as const, actionDisabled: context.state === 'disabled' || context.state === 'pending', model: { label: 'Example model', description: '' }, thinking: { options: ['low', 'medium', 'high'].map(value => ({ value, label: value })), value: 'high' } };
  const useModel = createButton({ label: 'Use model', intent: 'primary', onAction() { const selection = model.read(); composerState.thinking.value = selection.thinkingLevel; shell.composer.update(composerState); picker.close(); } }); owned.push(useModel);
  const picker = createDialog({ title: 'Choose model', content: model.element, actions: useModel.element }); owned.push(picker);
  shell.composer.update(composerState);
  let queueSubmission: ((text: string) => void) | undefined;
  submitDraft = async text => {
    if (!text.trim()) return;
    const destination = messages; const submittedConversation = activeId;
    await context.action().then(result => {
      if (!live) return;
      if (!result.ok) status.update({ message: result.error, tone: 'error' });
      else { if (queueSubmission) queueSubmission(text); else destination.push({ id: uniqueId(prefix + 'sent'), role: 'user', text, actions: { copy: 'Copy message', edit: true } }); if (activeId === submittedConversation && shell.composer.getValue() === text) shell.composer.reset(''); render(); }
    });
  };
  const find = createButton({ label: 'Find / 查找', onAction: reader.openFind }); owned.push(find);
  const append = createButton({ label: 'Append a response', onAction() { messages.push({ id: uniqueId(prefix + 'append'), role: 'assistant', text: `新增回复 · a+b · ${prose}`, status: 'done', actions: { copy: 'Copy response' } }); render(); context.log('Appended. Scroll to history and repeat to verify reading position.'); } }); owned.push(append);
  const controls = createToolbar({ label: 'Composition simulation', children: [find.element, append.element] }); owned.push(controls); root.prepend(controls.element);
  if (mode === 'task') {
    let queued = [{ id: `${prefix}queued-a`, mode: 'follow-up', text: '完成后再检查错误处理。', imageCount: 1 }, { id: `${prefix}queued-b`, mode: 'steer', text: 'Keep the current behavior.', imageCount: 0 }];
    const queueEditor = createTextEditDialog({ title: 'Edit pending message', submitLabel: 'Save message', onSubmit: async value => {
      const submittedTarget = queuedTarget;
      const result = await context.action(); if (!live || !result.ok) return result; const item = queued.find(item => item.id === submittedTarget); if (item) item.text = value; updateQueue(); return result;
    } }); owned.push(queueEditor); let queuedTarget = '';
    const queue = createPendingMessages({ container: shell.part('queued-messages'), onAction(action, id) {
      const item = queued.find(item => item.id === id); if (!item) return;
      if (action === 'edit') { queuedTarget = id; queueEditor.open({ value: item.text, note: item.imageCount ? '1 attached image will be kept.' : '' }); }
      else if (action === 'delete') { queued = queued.filter(item => item.id !== id); updateQueue(); }
      else { item.mode = 'steer'; updateQueue(); context.log('Pending message will steer the demonstration task.'); }
    } }); owned.push(queue);
    function updateQueue(): void { queue.update({ items: queued, running: true, busy: context.state === 'disabled' }); }
    queueSubmission = text => { queued.push({ id: uniqueId(prefix + 'queued'), mode: 'follow-up', text, imageCount: 0 }); updateQueue(); };
    updateQueue();
    const approval = createApprovalPanel({ approval: { id: `${prefix}approval`, toolName: 'edit_file', canAlwaysAllow: true, argsText: JSON.stringify({ path: 'result.md', edits: [{ oldText: 'old', newText: 'new 中文' }] }, null, 2), preview: { kind: 'modify', path: 'result.md', diff: '--- a/result.md\n+++ b/result.md\n-old line\n+new 中文 line\n'.repeat(context.state === 'long' ? 30 : 1) } }, disabled: context.state === 'disabled' }, { element: shell.part('approval'), onAction: (_id, action) => { context.log(`Approval: ${action}`); approval.update({ approval: null }); } }); owned.push(approval);
    const runtime = createRuntimePanel({ visible: true, summary: 'Waiting for approval · 12s', duration: '12s', speed: '24', provider: 'Example provider', thinkingLevel: 'high', inputTokens: '4,096', outputTokens: '288', cacheRead: '1,024', cacheWrite: '0', contextTokens: '8,192', contextWindow: '128,000', compactions: '0', toolFailures: '0', recordedCost: '$0.012', latestCost: '$0.003' }); owned.push(runtime);
    shell.part('run-status').replaceWith(runtime.element);
  }
  const initial = requestAnimationFrame(render);
  return { element: root, replay: () => { reader.followLatest(); render(); }, destroy() { live = false; cancelAnimationFrame(initial); life.destroy(); owned.reverse().forEach(block => block.destroy()); root.remove(); } };
}

function settingsPage(context: DemoContext): MountedDemo {
  const root = pageRoot('Settings and provider login composition'); root.style.padding = 'var(--pui-space-lg)'; const prefix = uniqueId('pui-settings-page') + '-'; const life = new Lifetime(); const owned: Owned[] = []; let live = true; let loginGeneration = 0;
  let settingsState: SettingsPanelState = { baseUrl: 'https://example.test/v1', hasApiKey: true, ready: true, error: context.state === 'error' ? 'Demonstration: provider save failed. Existing values are kept.' : '', disabled: context.state === 'disabled' };
  const settings = createSettingsPanel(settingsState, { idPrefix: prefix, onSubmit: () => context.action(), onAppearanceChange: value => context.log(`Appearance choice: ${value}. Global theme is controlled by the showroom toolbar.`), onTest: async () => {
    settingsState = {...settingsState, testing: true, testResult: {message: 'Testing demonstration connection…'}}; settings.update(settingsState);
    const result = await context.action(); if (!live) return;
    settingsState = {...settingsState, testing: false, testResult: {message: result.ok ? 'Demonstration connection succeeded.' : result.error, ok: result.ok}}; settings.update(settingsState);
  } }); owned.push(settings);
  settings.setProviders([{id:'example',name:'Example provider'}], 'example');
  const update = createUpdatePanel({ container: settings.updates, productName: 'Example app', onCheck: () => context.log('Demonstration: checking available version') }); update.update({ version: '0.1.0', enabled: false, phase: 'disabled', availableVersion: '', progress: 0, message: 'Showroom only. No updates are downloaded.' }); owned.push(update);
  const loginRegion = element('section', 'pui-demo-login-composition'); loginRegion.hidden = true;
  let loginState = { phase: 'prompt', message: 'Demonstration sign-in. Enter any verification code.', prompt: 'Verification code', promptType: 'text', code: 'DEMO-1234', disabled: context.state === 'disabled', error: '' };
  const login = createProviderLoginPanel(loginState, { onAnswer: async answer => {
    const seq = ++loginGeneration;
    login.update({ ...loginState, disabled: true }); const result = await context.action(); if (!live || seq !== loginGeneration) return;
    loginState = { ...loginState, phase: result.ok ? 'complete' : 'prompt', message: result.ok ? `Demonstration sign-in completed for code ${answer}.` : 'Sign-in needs another attempt.', disabled: false, error: result.ok ? '' : result.error }; login.update(loginState);
    if (result.ok) actions.update({ id: 'example', oauth: true, signedIn: true, custom: true });
  }, onCancel() { loginGeneration++; loginRegion.hidden = true; context.log('Cancelled the demonstration login.'); }, onClose() { loginGeneration++; loginRegion.hidden = true; } }); owned.push(login); loginRegion.append(login.element);
  const actions = createProviderActions({ id: 'example', oauth: true, signedIn: false, custom: true }, { onAction(action) { if (action === 'login') { loginGeneration++; loginState = { ...loginState, phase: 'prompt', message: 'Demonstration sign-in. Enter any verification code.', disabled: false, error: '' }; loginRegion.hidden = false; login.update(loginState); } else if (action === 'logout') { loginGeneration++; actions.update({ id: 'example', oauth: true, signedIn: false, custom: true }); context.log('Demonstration: signed out.'); } else context.log(`Provider action: ${action}`); } }); owned.push(actions);
  settings.setCredential({status:'Configured',hidden:false,required:false,placeholder:'Leave blank to keep your current key',removeVisible:false,actions:actions.element});
  life.listen(settings.element, 'click', event => { if ((event.target as Element).closest('[data-close]')) context.log('Close settings requested; this inline composition stays visible.'); });
  root.append(settings.element, loginRegion);
  return { element: root, destroy() { live = false; life.destroy(); owned.reverse().forEach(block => block.destroy()); root.remove(); } };
}

function resourcesPage(context: DemoContext): MountedDemo {
  const root = pageRoot('Resources and file preview composition'); root.style.padding = 'var(--pui-space-lg)'; const prefix = uniqueId('pui-resources-page') + '-'; const owned: Owned[] = []; const life = new Lifetime();
  const preview = createFilePreview({ titleId: prefix + 'preview-title', dialogId: prefix + 'preview-dialog', bodyId: prefix + 'preview-body', onClose() { preview.element.hidden = true; } }); owned.push(preview); preview.element.hidden = true;
  const path = '/demo/output/报告.md';
  const previewActions = createFileActions({ kind: 'artifact', ownerId: prefix, path, preview: false, copyMode: 'path', onAction: action => context.log(`File action: ${action} ${path}`) }); owned.push(previewActions);
  const fileActions = createFileActions({ kind: 'artifact', ownerId: prefix, path, preview: true, copyMode: 'path', onAction(action) {
    if (action === 'preview') { preview.element.hidden = false; preview.open({ name: '报告.md', path, actions: previewActions.element }); preview.update({ kind: 'markdown', text: context.state === 'long' ? prose.repeat(1000) : prose }); }
    else context.log(`File action: ${action} ${path}`);
  } }); owned.push(fileActions);
  const fileHeader = element('section', 'pui-file-card', element('strong', '', '报告.md'), fileActions.element);
  const refresh = createButton({ label: 'Refresh resources', onAction: () => context.action() }); owned.push(refresh);
  const resources = createResourcesPanel({ titleId: prefix + 'resources-title', dialogId: prefix + 'resources-dialog', listId: prefix + 'resources-list', errorId: prefix + 'resources-error', onClose: () => context.log('Close resources requested; this inline composition stays visible.') }); owned.push(resources);
  resources.open('Example workspace', refresh.element);
  const instructionsAction = createFileActions({ kind: 'resource', ownerId: prefix, path: '/demo/AGENTS.md', preview: false, copyMode: 'none', onAction: action => context.log(`${action} /demo/AGENTS.md`) }); owned.push(instructionsAction);
  if (context.state !== 'loading') resources.update({ instructions: context.state === 'empty' ? [] : [{ name: 'AGENTS.md', path: '/demo/AGENTS.md', content: '# Instructions\n\nPreserve existing behavior.', fileActions: instructionsAction.element }], skills: context.state === 'empty' ? [] : [{ name: 'review', path: '/demo/.pi/skills/review/SKILL.md', description: 'Read the source and verify behavior before changes.' }], templates: context.state === 'empty' ? [] : [{ name: 'summarize', path: '/demo/.pi/prompts/summarize.md', description: 'A concise source-based summary.' }], diagnostics: context.state === 'error' ? ['Demonstration: a malformed resource was ignored; other entries remain usable.'] : [] });
  if (context.state === 'error') resources.setError('Demonstration resources could not be refreshed.');
  root.append(resources.element, element('h3', '', 'Conversation files'), fileHeader, preview.element);
  return { element: root, destroy() { life.destroy(); owned.reverse().forEach(block => block.destroy()); root.remove(); } };
}

export const pageCases: ShowcaseCase[] = [
  { id: 'workspace-chat', title: '工作区与聊天 Workspace chat', layer: 'pages', category: '工作区与会话', description: '真实导航、搜索、模型选择、权限、消息编辑和发送组合，使用演示数据与可控异步结果。', states: ['normal', 'error', 'disabled', 'empty', 'long'], controls: ['outcome'], related: ['workspace-navigation', 'conversation-messages', 'text-edit-dialog'], code: `const shell = createWorkspaceShell({ brand, prefix: 'my-workspace-' });\nconst view = createConversationView({ container: shell.part('messages') });\nview.update({ id: 'chat', messages, working: false });`, mount: context => workspacePage(context, 'chat') },
  { id: 'workspace-reading', title: '长会话与历史阅读 Long reading', layer: 'pages', category: '工作区与会话', description: '滚动历史、选择文字、横向滚动代码、查找 a+b、追加回复，再检查阅读位置和焦点是否保持。', states: ['normal', 'long'], controls: [], related: ['conversation-reader', 'conversation-messages'], code: `const reader = installConversationReader(scroll, messagesHost, findBar, latest, { keyboardTarget: shell.element });\nreader.beforeRender(conversationId);\nview.update(nextState);\nreader.afterRender();`, mount: context => workspacePage(context, 'reading') },
  { id: 'workspace-approval', title: '任务、审批与队列 Tasks and queue', layer: 'pages', category: '任务与审批', description: '长审批、运行详情、待发送消息和输入区共存。可以批准、拒绝、编辑待发送内容并切换阅读位置。', states: ['normal', 'loading', 'disabled', 'long'], controls: ['outcome'], related: ['approval-panel', 'runtime-panel', 'text-edit-dialog'], code: `const approval = createApprovalPanel({ approval: display }, { onAction: handleApproval });\nconst queue = createPendingMessages({ onAction: handleQueuedMessage });\nqueue.update({ items, running: true, busy: false });`, mount: context => workspacePage(context, 'task') },
  { id: 'settings-login-page', title: '设置、连接与登录 Settings and login', layer: 'pages', category: '设置与连接', description: '真实设置表单、密钥、连接测试与登录过程组合。可模拟成功、失败和迟到；不访问真实提供商。', states: ['normal', 'error', 'disabled'], controls: ['outcome'], related: ['settings-panel', 'provider-login', 'updates'], code: `const settings = createSettingsPanel({ baseUrl, hasApiKey: true }, { idPrefix: 'settings-demo-' });\nconst login = createProviderLoginPanel(display, { onAnswer, onCancel });`, mount: settingsPage },
  { id: 'resources-files-page', title: '资源与文件 Resources and files', layer: 'pages', category: '资源与文件', description: '指令、技能、模板、文件动作和 Markdown 分页预览组合。展开原文、打开预览、关闭预览均可操作。', states: ['normal', 'loading', 'error', 'empty', 'long'], related: ['resources-panel', 'file-preview', 'file-actions'], code: `const resources = createResourcesPanel({ titleId, dialogId, listId, errorId });\nresources.open('Workspace', refreshButton);\nresources.update(display);\nconst preview = createFilePreview();`, mount: resourcesPage },
];
