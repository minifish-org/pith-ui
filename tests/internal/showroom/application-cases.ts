import type {MountedDemo, ShowcaseCase} from './types.js';

type ApplicationDemoScene = 'workspace' | 'settings' | 'resources' | 'files';

// Every entry embeds the same public-entry reference controller. Gallery DOM
// belongs to this harness; scene demos never assemble a parallel UI.
function mountReference(context: Parameters<ShowcaseCase['mount']>[0], scene?: ApplicationDemoScene): MountedDemo {
  const element = document.createElement('section');
  const link = document.createElement('a'); link.textContent = '打开完整参考应用';
  const url = new URL('/tests/internal/example/index.html', document.baseURI);
  url.searchParams.set('theme', context.host.closest('[data-appearance]')?.getAttribute('data-appearance') || 'system');
  if (scene) url.searchParams.set('scene', scene);
  link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
  const frame = document.createElement('iframe'); frame.title = '受限入口参考应用 · 模拟数据'; frame.src = url.href;
  frame.style.width = '100%'; frame.style.height = '760px'; frame.style.border = '0';
  element.append(link, frame);
  context.log(`pith-ui/app${scene ? ` · ${scene}` : ''}：同一完整模拟应用；关闭弹窗后可体验其他场景。所有操作仅使用内存数据。`);
  return {element, destroy() {frame.remove(); element.remove();}};
}

export const applicationCases: ShowcaseCase[] = [{
  id: 'application-reference', title: '受限入口参考应用 Application reference', layer: 'pages', category: '应用集成',
  description: '完整模拟应用仅消费 pith-ui/app 与公开 CSS。实际体验聊天、流式、队列、审批、模型、设置、登录、MCP、资源、文件和分支；不访问真实账号或文件。',
  states: ['normal'], controls: [],
  related: ['application-workspace', 'application-settings', 'application-resources', 'application-files', 'workspace-chat', 'workspace-approval', 'settings-login-page', 'resources-files-page'],
  code: `import {createApplication, type ConversationMessage} from 'pith-ui/app';\nimport 'pith-ui/styles.css';\n\nconst mount = document.getElementById('app');\nif (!(mount instanceof HTMLElement)) throw new Error('Missing mount');\nconst messages: ConversationMessage[] = [\n  {id: 'intro', role: 'assistant', text: '所有操作使用模拟数据。'},\n];\nconst app = createApplication(mount, {\n  brand: {name: 'Pith', qualifier: 'UI · 模拟应用'},\n  workspace: {onSubmit(text) {\n    messages.push({id: String(messages.length), role: 'user', text});\n    app.workspace.resetDraft('');\n    app.workspace.updateConversation({id: 'chat', messages, working: false});\n    return {ok: true};\n  }},\n});\napp.workspace.updateComposer({action: 'send'});\napp.workspace.updateConversation({id: 'chat', messages, working: false});\n// 完整可编译实现：tests/internal/example/main.ts`,
  mount: context => mountReference(context),
}, {
  id: 'application-workspace', title: '应用场景：工作区聊天 App workspace', layer: 'pages', category: '应用集成',
  description: 'pith-ui/app 的 workspace 场景：导航、消息阅读、输入与队列、权限、审批、运行详情和分支。通过完整参考应用体验；输入消息后可操作模拟流式回复与审批。所有数据仅在内存中。',
  states: ['normal'], controls: [],
  related: ['application-reference', 'application-settings', 'workspace-chat', 'workspace-approval'],
  code: `import {createApplication} from 'pith-ui/app';
import 'pith-ui/styles.css';
const mount = document.getElementById('app');
if (!(mount instanceof HTMLElement)) throw new Error('Missing mount');
const app = createApplication(mount, {brand: {name: 'Pith', qualifier: '模拟应用'}});
app.workspace.updateConversation({id: 'demo', messages: [
  {id: 'intro', role: 'assistant', text: '模拟会话，只使用内存数据。'},
], working: false});
// 接入发送、队列、审批等业务回调：tests/internal/example/main.ts`,
  mount: context => mountReference(context, 'workspace'),
}, {
  id: 'application-settings', title: '应用场景：设置与连接 App settings', layer: 'pages', category: '应用集成',
  description: 'pith-ui/app 的 settings 场景：外观、提供商、密钥、连接测试、模型与强度、独立连接、登录、MCP 和更新状态。打开即显示设置；第一次连接测试模拟失败并保留草稿。请勿填写真实凭证。',
  states: ['normal'], controls: [],
  related: ['application-reference', 'application-workspace', 'settings-login-page', 'model-picker', 'mcp-connections'],
  code: `import {createApplication} from 'pith-ui/app';
import 'pith-ui/styles.css';
const mount = document.getElementById('app');
if (!(mount instanceof HTMLElement)) throw new Error('Missing mount');
const app = createApplication(mount, {brand: {name: 'Pith', qualifier: '模拟应用'}});
const settings = app.settings.openSettings({ready: true, baseUrl: 'https://example.test/v1', hasApiKey: false}, {
  onSubmit: () => ({ok: true}), // 仅模拟；真实应用负责校验和保存。
});
settings.setProviders([{id: 'demo', name: '模拟提供商'}], 'demo');
// 模型、登录和 MCP 的完整回调：tests/internal/example/main.ts`,
  mount: context => mountReference(context, 'settings'),
}, {
  id: 'application-resources', title: '应用场景：工作区资源 App resources', layer: 'pages', category: '应用集成',
  description: 'pith-ui/app 的 resources 场景：指令、技能、模板、诊断、资源动作及原文编辑。打开即显示模拟资源清单；可编辑 review 技能，内容含 fail 时模拟保存失败。不会读取或修改真实文件。',
  states: ['normal'], controls: [],
  related: ['application-reference', 'application-files', 'resources-files-page', 'resource-editor'],
  code: `import {createApplication} from 'pith-ui/app';
import 'pith-ui/styles.css';
const mount = document.getElementById('app');
if (!(mount instanceof HTMLElement)) throw new Error('Missing mount');
const app = createApplication(mount, {brand: {name: 'Pith', qualifier: '模拟应用'}});
app.resources.open({
  workspace: {id: 'demo', name: '模拟工作区', path: '/demo'},
  instructions: [], skills: [], templates: [], diagnostics: [],
});
// 列表动作、只读和编辑保存：tests/internal/example/main.ts`,
  mount: context => mountReference(context, 'resources'),
}, {
  id: 'application-files', title: '应用场景：文件与预览 App files', layer: 'pages', category: '应用集成',
  description: 'pith-ui/app 的 files 场景：会话文件、文件动作、文本与差异分页、Markdown 预览、代码复制和图片缩放。打开即预览模拟报告；关闭后可从 Conversation files 选择其他样本。不会访问真实文件或剪贴板。',
  states: ['normal'], controls: [],
  related: ['application-reference', 'application-resources', 'resources-files-page', 'file-preview', 'image-viewer'],
  code: `import {createApplication} from 'pith-ui/app';
import 'pith-ui/styles.css';
const mount = document.getElementById('app');
if (!(mount instanceof HTMLElement)) throw new Error('Missing mount');
const app = createApplication(mount, {brand: {name: 'Pith', qualifier: '模拟应用'}});
app.files.openPreview({
  owner: {kind: 'artifact', id: 'demo'}, name: '报告.md', path: 'output/报告.md',
  capabilities: {open: false, reveal: false, copyMode: 'none'},
  content: {kind: 'markdown', text: '# 模拟报告'},
});
// 文件获取及原生动作由应用提供；完整示例：tests/internal/example/main.ts`,
  mount: context => mountReference(context, 'files'),
}];
