import type { DemoContext, ShowcaseCase } from './types.js';
import { createFileActions, createArtifactPanel, createResourcesPanel, createFilePreview } from '../src/files/panels.js';
import { createCostLedger, createUpdatePanel, createCompletionNotices, createCopyFeedback, historyStatusMarkup, type CompletionNoticeDisplay } from '../src/files/systems.js';
import { createButton } from '../src/primitives.js';
import { createResourceActions } from '../src/forms/actions.js';

let sequence = 0;
const sampleFiles = [{ name: '报告 v1.md', path: 'output/报告 v1.md' }, { name: 'result.csv', path: 'output/result.csv' }];
function actions(context: DemoContext, kind: string, path: string) {
  return createFileActions({ kind, ownerId: 'demo-owner', path, preview: kind === 'artifact', copyMode: kind === 'artifact' ? 'path' : 'none', onAction: (action) => context.log(`${action} · ${path}`) });
}
export const filesCases: ShowcaseCase[] = [
  {
    id: 'file-actions', title: '文件操作栏', layer: 'components', category: '操作',
    description: '预览、打开、定位与复制采用统一间距；原生动作及权限由宿主决定。', states: ['normal', 'disabled', 'long'], related: ['artifact-panel', 'file-preview'],
    code: `const actions = createFileActions({ kind: 'artifact', ownerId, path, preview: true, copyMode: 'file', onAction: handleFileAction });`,
    mount(context) {
      const block = actions(context, 'artifact', context.state === 'long' ? 'output/很长的目录/'.repeat(10) + '报告.md' : 'output/报告.md');
      if (context.state === 'disabled') block.element.querySelectorAll('button').forEach((button) => { button.disabled = true; });
      return block;
    },
  },
  {
    id: 'artifact-panel', title: '会话文件面板', layer: 'blocks', category: '文件与预览',
    description: '文件数量、面板展开与关闭、加载和错误共用同一实现；无文件时收起入口。', states: ['normal', 'loading', 'error', 'empty', 'long'], related: ['file-actions', 'file-preview'],
    code: `const panel = createArtifactPanel({ container, control, toggle, count });\npanel.update({ ownerId, files, loading: false, error: '', copyMode: 'path' });\npanel.setOpen(true);`,
    mount(context) {
      const element = document.createElement('section'), control = document.createElement('div'), count = document.createElement('span');
      const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'pui-secondary-button'; toggle.append('Conversation files ', count); control.append(toggle);
      const container = document.createElement('section'); container.tabIndex = -1; container.className = 'artifacts';
      element.append(control, container);
      const panel = createArtifactPanel({ container, control, toggle, count });
      const files = context.state === 'empty' ? [] : context.state === 'long' ? Array.from({ length: 18 }, (_, index) => ({ name: `报告 ${index}.md`, path: `output/很长的路径/项目结果/${index}/报告.md` })) : sampleFiles;
      panel.update({ ownerId: 'demo-owner', files, loading: context.state === 'loading', error: context.state === 'error' ? '文件列表暂时无法读取，已有文件仍保留。' : '', copyMode: 'path' });
      panel.setOpen(true);
      const click = (event: Event) => {
        const target = (event.target as Element).closest<HTMLElement>('button');
        if (target === toggle) panel.setOpen(!panel.open);
        else if (target?.hasAttribute('data-artifacts-close')) panel.setOpen(false, true);
        else if (target?.dataset.fileAction || target?.dataset.previewPath) context.log(`${target.dataset.fileAction || 'preview'} · ${target.dataset.filePath || target.dataset.previewPath}`);
      };
      element.addEventListener('click', click);
      return { element, destroy() { element.removeEventListener('click', click); panel.destroy(); element.remove(); } };
    },
  },
  {
    id: 'resources-panel', title: '工作区资源', layer: 'blocks', category: '工作区资源',
    description: '指令、技能、模板和诊断分组展示；展开原文和使用、编辑动作可操作。', states: ['normal', 'loading', 'error', 'empty', 'long'], related: ['resource-editor', 'file-actions'],
    code: `const panel = createResourcesPanel({ container, titleId, dialogId, listId, errorId });\npanel.pui-open('Workspace', toolbarNode);\npanel.update({ instructions, skills, templates, diagnostics: [] });`,
    mount(context) {
      const element = document.createElement('div'), id = `demo-resources-${++sequence}`;
      const panel = createResourcesPanel({ container: element, titleId: `${id}-title`, dialogId: `${id}-dialog`, listId: `${id}-list`, errorId: `${id}-error` });
      const refresh = createButton({ label: 'Refresh', onAction: () => context.log('演示刷新；真实请求由应用拥有') });
      panel.open('Example workspace', refresh.element);
      const owned: Array<{ destroy(): void }> = [refresh];
      const entry = (kind: string, name: string, path: string) => {
        const file = kind === 'template' ? undefined : actions(context, 'resource', path);
        const resource = createResourceActions({ kind, resource: { name, path }, workspaceId: 'demo' }, { onAction: (action) => context.log(`${action}: ${name}`) });
        owned.push(resource); if (file) owned.push(file);
        return { name, path, description: '演示工作区中的可复用资源。', content: context.state === 'long' ? '# Instructions\n\n保留已有行为。\n'.repeat(30) : '# Instructions\n\n保留已有行为。', fileActions: file?.element, actions: resource.element };
      };
      if (context.state !== 'loading') panel.update({
        instructions: context.state === 'empty' ? [] : [entry('instructions', 'AGENTS.md', '/demo/AGENTS.md')],
        skills: context.state === 'empty' ? [] : [entry('skill', 'review', '/demo/.pi/skills/review/SKILL.md')],
        templates: context.state === 'empty' ? [] : [entry('template', 'summarize', '/demo/.pi/prompts/summarize.md')],
        diagnostics: context.state === 'error' ? ['A malformed skill was ignored; other resources remain usable.'] : [],
      });
      if (context.state === 'error') panel.setError('演示资源读取失败，可使用 Refresh 重试。');
      return { element, destroy() { owned.forEach((block) => block.destroy()); panel.destroy(); element.remove(); } };
    },
  },
  {
    id: 'file-preview', title: '文件预览框架', layer: 'blocks', category: '文件与预览',
    description: '路径、预览内容、截断提示和文件动作统一；读取和图片 URL 生命周期留给宿主。', states: ['normal', 'loading', 'error', 'empty', 'long'], related: ['paged-preview', 'image-viewer'],
    code: `const preview = createFilePreview({ container, titleId, dialogId, bodyId });\npreview.pui-open({ name: 'report.md', path, actions: fileActions.element });\npreview.update({ kind: 'markdown', text });`,
    mount(context) {
      const element = document.createElement('div'), id = `demo-preview-${++sequence}`;
      const file = actions(context, 'artifact', 'output/报告.md');
      const block = createFilePreview({ container: element, titleId: `${id}-title`, dialogId: `${id}-dialog`, bodyId: `${id}-body` });
      block.open({ name: '报告.md', path: '/demo/output/报告.md', actions: file.element });
      if (context.state !== 'loading') block.update({ kind: 'markdown', text: context.state === 'empty' ? '' : context.state === 'long' ? '# 中文 🙂\n\nLong file content\n'.repeat(20000) : '# 项目报告\n\n这里是**安全的 Markdown** 预览。', error: context.state === 'error' ? 'File changed before preview could finish. Reopen to retry.' : undefined, truncated: context.state === 'long' });
      return { element, destroy() { file.destroy(); block.destroy(); element.remove(); } };
    },
  },
  {
    id: 'cost-ledger', title: '请求费用明细', layer: 'blocks', category: '系统信息',
    description: '估算说明、已知与未知费用、缓存用量和费率来源；重绘保留展开项。', states: ['normal', 'loading', 'error', 'empty', 'long'], related: ['runtime-details'],
    code: `const ledger = createCostLedger();\nledger.update({ unknownRequests: 1, requests });\n// 请求、计算和懒加载由应用负责。`,
    mount(context) {
      const block = createCostLedger();
      if (context.state === 'loading') block.loading();
      else if (context.state === 'error') block.setError('Request breakdown could not be loaded. Reopen this section to retry.');
      else block.update({ unknownRequests: context.state === 'empty' ? 0 : 1, requests: context.state === 'empty' ? [] : Array.from({ length: context.state === 'long' ? 20 : 2 }, (_, index) => ({ id: `cost-${index}`, purpose: 'Agent request', status: 'done', provider: 'example', providerName: 'Example provider', model: 'example-model', modelName: 'Example model', time: '2026-10-16T00:00:00Z', source: 'Saved per-request rates · demonstration data', price: { input: 1, output: 3 }, known: index !== 1, usage: { input: 1024, output: 128, cacheRead: 512, cacheWrite: 0, reasoning: 64, cost: { total: 0.001408 } } })) });
      return block;
    },
  },
  {
    id: 'updates', controls: ['outcome'], title: '更新状态与安装进度', layer: 'blocks', category: '系统信息',
    description: '检查和安装动作可模拟成功、失败与迟到，轮询和版本判断由应用负责。', states: ['normal', 'loading', 'error', 'disabled', 'pending'], related: [],
    code: `const updates = createUpdatePanel({ productName: 'My app', onCheck, onInstall });\nupdates.update(status);\nupdates.setPending(true);`,
    mount(context) {
      let active = true;
      const state = { version: '0.1.0', enabled: context.state !== 'disabled', phase: ['loading', 'pending'].includes(context.state) ? 'installing' : 'available', availableVersion: '0.1.1', progress: 43, message: context.state === 'error' ? 'The application could not check for updates.' : 'Version 0.1.1 is available.' };
      const act = async (action: 'check' | 'install') => {
        panel.setPending(true); context.log(`模拟 ${action}`);
        const result = await context.action(); if (!active) return;
        panel.setPending(false);
        if (!result.ok) panel.setError(result.error);
        else panel.update({ ...state, phase: action === 'install' ? 'restarting' : 'available', message: action === 'install' ? 'Demonstration: ready to restart.' : 'Version 0.1.1 is available.' });
      };
      const panel = createUpdatePanel({ productName: 'Example app', onCheck: () => { void act('check'); }, onInstall: () => { void act('install'); } });
      panel.update(state);
      return { element: panel.element, destroy() { active = false; panel.destroy(); panel.element.remove(); } };
    },
  },
  {
    id: 'completion-notices', title: '完成通知与运行标记', layer: 'blocks', category: '系统信息',
    description: '通知可以打开或关闭；运行、待审批、未读为不同状态，已读确认由应用负责。', states: ['normal', 'empty', 'long'], related: ['workspace-navigation'],
    code: `const notices = createCompletionNotices({ onOpen: openConversation, onDismiss: dismiss });\nnotices.update([{ id, runID, title, workspace }]);`,
    mount(context) {
      const element = document.createElement('div');
      let notices: CompletionNoticeDisplay[] = context.state === 'empty' ? [] : [{ id: 'demo', runID: 'demo-run', title: context.state === 'long' ? '很长的任务标题，完成后仍应保持通知可读、操作可达。'.repeat(5) : '检查项目结构', workspace: 'Example workspace' }];
      const panel = createCompletionNotices({ onOpen: (id) => context.log(`打开会话 ${id}；不自动确认已读`), onDismiss: (runID) => { notices = notices.filter((notice) => notice.runID !== runID); panel.update(notices); context.log('已关闭演示通知'); } });
      panel.update(notices);
      const badges = document.createElement('div'); badges.className = 'pui-feature-toolbar'; badges.innerHTML = ['approval', 'running', 'unread', 'idle'].map((status) => `${historyStatusMarkup(status as 'approval' | 'running' | 'unread' | 'idle')}<span>${status}</span>`).join('');
      element.append(badges, panel.element);
      return { element, destroy() { panel.destroy(); element.remove(); } };
    },
  },
  {
    id: 'copy-feedback', controls: ['outcome'], title: '复制结果反馈', layer: 'components', category: '反馈',
    description: '异步复制有即时禁用、成功反馈与错误；宿主决定真正的复制方式。', states: ['normal', 'disabled'], related: ['file-actions', 'conversation-messages'],
    code: `const feedback = createCopyFeedback({ status, isDisabled, onError });\nawait feedback.copy(button, copyUsingHost, 'Copied');`,
    mount(context) {
      const element = document.createElement('div'), status = document.createElement('div'); status.setAttribute('role', 'status');
      const button = createButton({ label: '复制示例', disabled: context.state === 'disabled' });
      const feedback = createCopyFeedback({ status, isDisabled: () => context.state === 'disabled', onError: (error) => { status.textContent = String(error); context.log(String(error)); } });
      const click = () => { void feedback.copy(button.element, async () => { const result = await context.action(); if (!result.ok) throw new Error(result.error); }, '已复制演示内容'); };
      button.element.addEventListener('click', click); element.append(button.element, status);
      return { element, destroy() { button.element.removeEventListener('click', click); feedback.destroy(); button.destroy(); element.remove(); } };
    },
  },
];
