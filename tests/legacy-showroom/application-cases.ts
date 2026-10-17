import type {MountedDemo, ShowcaseCase} from './types.js';

export const applicationCases: ShowcaseCase[] = [{
  id: 'application-reference', title: '受限入口参考应用 Application reference', layer: 'pages', category: '应用集成',
  description: '完整模拟应用仅消费 pith-ui/app 与公开 CSS。实际体验聊天、流式、队列、审批、模型、设置、登录、MCP、资源、文件和分支；不访问真实账号或文件。',
  states: ['normal'], controls: [],
  related: ['workspace-chat', 'workspace-approval', 'settings-login-page', 'resources-files-page'],
  code: `import {createApplication, type ConversationMessage} from 'pith-ui/app';\nimport 'pith-ui/styles.css';\n\nconst mount = document.getElementById('app');\nif (!(mount instanceof HTMLElement)) throw new Error('Missing mount');\nconst messages: ConversationMessage[] = [\n  {id: 'intro', role: 'assistant', text: '所有操作使用模拟数据。'},\n];\nconst app = createApplication(mount, {\n  brand: {name: 'Pith', qualifier: 'UI · 模拟应用'},\n  workspace: {onSubmit(text) {\n    messages.push({id: String(messages.length), role: 'user', text});\n    app.workspace.resetDraft('');\n    app.workspace.updateConversation({id: 'chat', messages, working: false});\n    return {ok: true};\n  }},\n});\napp.workspace.updateComposer({action: 'send'});\napp.workspace.updateConversation({id: 'chat', messages, working: false});\n// 完整可编译实现：examples/application/main.ts`,
  mount(context): MountedDemo {
    // The gallery owns this harness. No harness DOM or measurement code enters
    // the reference controller or the application package.
    const element = document.createElement('section');
    const link = document.createElement('a'); link.textContent = '打开完整参考应用';
    const url = new URL('/examples/application/index.html', document.baseURI);
    url.searchParams.set('theme', context.host.closest('[data-appearance]')?.getAttribute('data-appearance') || 'system');
    link.href = url.href; link.target = '_blank'; link.rel = 'noopener noreferrer';
    const frame = document.createElement('iframe'); frame.title = '受限入口参考应用 · 模拟数据'; frame.src = url.href;
    frame.style.width = '100%'; frame.style.height = '760px'; frame.style.border = '0';
    element.append(link, frame);
    context.log('完整模拟应用已打开；所有状态在 iframe 中独立运行。');
    return {element, destroy() {frame.remove(); element.remove();}};
  },
}];
