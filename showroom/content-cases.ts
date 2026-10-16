import type { ShowcaseCase } from './types.js';
import { createConversationView, type ConversationMessage } from '../src/content/conversation-view.js';
import { createPagedPreview } from '../src/content/paged-preview.js';
import { createImageViewer } from '../src/content/image-viewer.js';
import { createWelcomeView } from '../src/content/welcome.js';
import { installConversationReader } from '../src/content/conversation-reader.js';
import { createButton } from '../src/primitives.js';

const prose = '# 原生积木 · Native blocks\n\n中文、English、123，路径 `/workspace/报告 v1.md` 与 emoji 🙂。\n\n**保持阅读位置**，同时更新另一条消息。\n\n```ts\nconst view = createConversationView();\nview.update({ id: "demo", messages: [], working: false });\n```\n\n[安全外链](https://example.com) · <script>alert("blocked")</script>';
const illustration = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><rect width="1200" height="800" fill="#eaf2ff"/><rect x="100" y="100" width="1000" height="600" rx="40" fill="#87b4ec"/><text x="600" y="420" text-anchor="middle" font-size="70" font-family="sans-serif" fill="#172b46">Pith UI · 1200 × 800</text></svg>')}`;

export const contentCases: ShowcaseCase[] = [
  {
    id: 'conversation-messages', title: '消息与工具调用', layer: 'blocks', category: '会话阅读',
    description: '用户、助手、系统、命令和工具分组共用稳定节点；操作资格由宿主提供。',
    states: ['normal', 'loading', 'error', 'disabled', 'empty', 'long'], related: ['markdown-content', 'conversation-reader'],
    code: `const view = createConversationView({ onAction: ({ action, messageId }) => handle(action, messageId) });\nview.update({ id: 'chat-1', messages, working: false });\ncontainer.append(view.element);`,
    mount(context) {
      const block = createConversationView({ onAction: (action) => context.log(`${action.action}: ${action.messageId}`), onCopyCode: (text) => context.log(`复制代码：${text.length} 字符`) });
      const messages: ConversationMessage[] = context.state === 'empty' ? [] : [
        { id: 'question', role: 'user', text: '帮我检查这个项目，并解释修改。', timestamp: 1792108800000, actions: { copy: 'Copy message', edit: true } },
        { id: 'note', role: 'system', text: '演示数据 · 不连接真实工作区' },
        { id: 'tool', role: 'tool', toolName: 'run_command', status: context.state === 'loading' ? 'running' : context.state === 'error' ? 'error' : 'done', text: context.state === 'error' ? 'Command failed: missing fixture' : 'All checks passed', command: { text: 'npm run check', cwd: '/demo/workspace', exitCode: context.state === 'error' ? 1 : 0 } },
        { id: 'response', role: 'assistant', status: context.state === 'loading' ? 'streaming' : 'done', text: context.state === 'long' ? `${prose}\n\n${'长内容检验 · long-content/报告.md\n\n'.repeat(30)}` : prose, actions: { copy: context.state === 'loading' ? false : 'Copy response', branch: { key: 'demo-branch' } } },
      ];
      block.update({ id: 'demo', messages, working: context.state === 'loading', folds: new Map([['group-0', true], ['group-0-tool-tool', true]]) });
      block.updateActionAvailability({copy:context.state==='disabled',edit:context.state==='disabled',branch:context.state==='disabled'});
      return block;
    },
  },
  {
    id: 'markdown-content', title: 'Markdown 与代码块', layer: 'blocks', category: '会话阅读',
    description: '统一清洗富文本，禁止脚本、嵌入媒体与表单；代码块提供复制回调。', states: ['normal', 'empty', 'long'], related: ['conversation-messages', 'paged-preview'],
    code: `const preview = createPagedPreview({ text: markdown, kind: 'markdown', onCopyCode: copyText });\ncontainer.append(preview.element);`,
    mount(context) { return createPagedPreview({ text: context.state === 'empty' ? '' : context.state === 'long' ? prose.repeat(1000) : prose, kind: 'markdown', onCopyCode: (text) => context.log(`复制 ${text.length} 字符`) }); },
  },
  {
    id: 'paged-preview', title: 'UTF-8 分页与差异预览', layer: 'blocks', category: '文件与预览',
    description: '256 KiB 阅读窗口保留 Unicode 边界；大 Markdown 降为原文，完整内容仍可翻页。', states: ['normal', 'empty', 'long'], related: ['markdown-content', 'file-preview'],
    code: `const preview = createPagedPreview({ text: diff, kind: 'diff' });\npreview.update({ text: nextDiff, kind: 'diff' });\npreview.destroy();`,
    mount(context) {
      const text = context.state === 'empty' ? '' : ['--- a/报告.md', '+++ b/报告.md', '@@ -1 +1 @@', '-旧内容', '+新的中文 🙂 内容', ' unchanged'].join('\n');
      return createPagedPreview({ text: context.state === 'long' ? text.repeat(7000) : text, kind: 'diff' });
    },
  },
  {
    id: 'image-viewer', title: '图片缩放与焦点恢复', layer: 'blocks', category: '文件与预览',
    description: '打开后可适应窗口、查看原图和连续缩放；关闭恢复来源焦点，空白区域不会关闭。', states: ['normal'], related: ['file-preview'],
    code: `const viewer = createImageViewer();\ndocument.body.append(viewer.element);\nviewer.open({ src: imageURL, alt: 'Generated diagram', returnFocus: trigger });\nviewer.destroy();`,
    mount(context) {
      const element = document.createElement('div');
      const viewer = createImageViewer();
      const trigger = createButton({ label: '打开图片 · 1200 × 800', onAction: () => { viewer.open({ src: illustration, alt: '图片演示 · 1200 × 800', returnFocus: trigger.element }); context.log('已打开图片，可用 + / − 缩放'); } });
      const thumbnail = document.createElement('img'); thumbnail.src = illustration; thumbnail.alt = '图片预览'; thumbnail.style.maxWidth = '320px'; thumbnail.style.display = 'block';
      element.append(thumbnail, trigger.element, viewer.element);
      return { element, destroy() { viewer.destroy(); trigger.destroy(); element.remove(); } };
    },
  },
  {
    id: 'conversation-reader', title: '查找、阅读锚点与跟随最新', layer: 'blocks', category: '会话阅读',
    description: '体验字面查找、Enter 上下跳转、工具结果展开，以及滚动历史时保留位置。', states: ['normal', 'long'], related: ['conversation-messages'],
    code: `const reader = installConversationReader(scroll, messages, findBar, latest, { keyboardTarget: scroll });\nreader.beforeRender('chat-1');\nview.update(state);\nreader.afterRender();`,
    mount(context) {
      const element = document.createElement('section');
      const find = document.createElement('div'); find.className = 'pui-conversation-find';
      find.innerHTML = '<input aria-label="Find in conversation" placeholder="搜索 a+b / 截图 / code"><span data-find-count></span><button type="button" data-find-previous aria-label="Previous match">↑</button><button type="button" data-find-next aria-label="Next match">↓</button><button type="button" data-find-close>Close</button>';
      const scroll = document.createElement('div'); scroll.tabIndex = 0; scroll.style.height = '360px'; scroll.style.overflow = 'auto';
      const view = createConversationView(); scroll.append(view.element);
      const latest = document.createElement('button'); latest.type = 'button'; latest.className = 'pui-secondary-button'; latest.textContent = 'Back to latest';
      const reader = installConversationReader(scroll, view.element, find, latest, { keyboardTarget: element });
      let revision = 0;
      const messages: ConversationMessage[] = Array.from({ length: context.state === 'long' ? 60 : 12 }, (_, index) => ({ id: `reader-${index}`, role: index % 2 ? 'assistant' : 'user', text: `消息 ${index + 1} · 截图 😀 · literal a+b\n\n${index % 2 ? 'Code code：阅读历史时增加新内容，位置应保持。' : '请检查这个结果。'}` }));
      const render = () => { reader.beforeRender('reader-demo'); view.update({ id: 'reader-demo', messages, working: false }); reader.afterRender(); };
      const append = createButton({ label: '追加一条消息', onAction: () => { messages.push({ id: `appended-${++revision}`, role: 'assistant', text: `新增 ${revision} · a+b · 截图` }); render(); context.log('已追加，历史阅读位置保持'); } });
      const search = createButton({ label: '查找', onAction: reader.openFind });
      element.append(search.element, append.element, find, scroll, latest);
      const initialFrame = requestAnimationFrame(render);
      return { element, replay: render, destroy() { cancelAnimationFrame(initialFrame); reader.destroy(); view.destroy(); append.destroy(); search.destroy(); element.remove(); } };
    },
  },
  {
    id: 'welcome', title: '欢迎与工作区引导', layer: 'blocks', category: '应用与导航',
    description: '连接、模型、工作区的步骤由宿主状态驱动，品牌标记通过 DOM 节点传入。', states: ['normal', 'empty', 'long'], related: ['workspace-chat'],
    code: `const welcome = createWelcomeView({ logo: brandNode, onAction: openSetup, onPrompt: beginDraft });\nwelcome.update({ hasApiKey: true, hasConnections: true, modelName: 'Example model', workspace });`,
    mount(context) {
      const block = createWelcomeView({ onAction: (action) => context.log(`打开 ${action}`), onPrompt: (text) => context.log(`填入输入区：${text}`) });
      block.update({ hasApiKey: context.state !== 'empty', hasConnections: context.state !== 'empty', modelName: 'Example model', workspace: context.state === 'empty' ? undefined : { name: context.state === 'long' ? '很长的工作区名称 · Long workspace name'.repeat(3) : 'Example workspace', path: '/demo/workspace' } });
      return block;
    },
  },
];
