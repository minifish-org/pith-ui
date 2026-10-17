import { mount, createStack, createText, createPromptInput, createImage, createMessage, createMarkdown, createCopyButton, createReadingArea, createDropArea, createDocument, createURLInput, createSecretTextArea } from '../src/index.js';
import type { Control } from '../src/index.js';
import type { ShowcaseCase, MountedDemo } from './types.js';
function show(children: Control[]): MountedDemo { const element = document.createElement('div'); const owner = mount(element, createStack({ children })); return { element, destroy: owner.destroy }; }
const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="160"><rect width="240" height="160" rx="12" fill="#86b6f2"/><circle cx="120" cy="80" r="36" fill="#fff"/></svg>');
export const consumerCases: ShowcaseCase[] = [
    { id: 'prompt-input', title: '自适应输入 Prompt input', layer: 'components', category: '输入', description: '只负责多行输入、输入法、光标、粘贴图片与 Enter 提交意图；不创建发送按钮、模型、权限或队列。', states: ['normal', 'disabled', 'error'], controls: ['outcome'], related: ['text-area', 'form', 'drop-area'],
        code: `import {mount,createPromptInput} from 'pith-ui';
const host=document.getElementById('app');if(!(host instanceof HTMLElement))throw new Error('Missing mount');
const input=createPromptInput({label:'Message',onSubmit:async text=>{console.log(text);return {ok:true};}});mount(host,input);`,
        mount(c) { return show([createPromptInput({ label: 'Message', placeholder: 'Type a message; Shift+Enter adds a line', disabled: c.state === 'disabled', error: c.state === 'error' ? 'Simulated failure; input is retained.' : '', onSubmit: () => c.action(), onImages: files => c.log('演示粘贴：' + files.map(file => file.name).join(', ')) })]); } },
    { id: 'image', title: '图片与缩放 Image', layer: 'components', category: '展示', description: '图片、附件缩略图和品牌图片各有固定用途；缩放、关闭与销毁归积木，不开放尺寸或 CSS 参数。', states: ['normal', 'disabled'], controls: ['outcome'], related: ['message', 'dialog'],
        code: `import {mount,createImage} from 'pith-ui';
const host=document.getElementById('app');if(!(host instanceof HTMLElement))throw new Error('Missing mount');
mount(host,createImage({label:'Photo',source:'/photo.png'}));`,
        mount(c) { return show([createImage({ label: '示例图片', source: image }), createImage({ label: '示例附件', purpose: 'attachment', source: image, removeDisabled: c.state === 'disabled', onRemove: () => c.action() })]); } },
    { id: 'message', title: '消息容器 Message', layer: 'components', category: '展示', description: '一个消息容器只持有内容、元数据和操作积木；会话、流式请求、身份和复制资格由应用决定。', related: ['markdown', 'copy-feedback', 'reading-area'],
        code: `import {mount,createMessage,createMarkdown} from 'pith-ui';
const host=document.getElementById('app');if(!(host instanceof HTMLElement))throw new Error('Missing mount');
mount(host,createMessage({role:'assistant',content:createMarkdown({text:'A **response**'})}));`,
        mount(c) { return show([createMessage({ role: 'user', content: createText({ text: '用户输入 Example input' }) }), createMessage({ role: 'assistant', content: createMarkdown({ text: 'A **response** with safe Markdown.' }), actions: createCopyButton({ value: 'A response', onCopy: () => c.action() }) })]); } },
    { id: 'reading-area', title: '内容阅读与查找 Reading area', layer: 'components', category: '布局', description: '只管理内容项的阅读位置、查找与跟随最新。应用提供稳定 key、内容版本与积木，不包含工作区或聊天业务。', related: ['scroll-area', 'message', 'list'],
        code: `import {mount,createReadingArea,createText} from 'pith-ui';
const host=document.getElementById('app');if(!(host instanceof HTMLElement))throw new Error('Missing mount');
const reader=createReadingArea({label:'Reading',identity:'document-1',items:[{key:'p1',revision:'1',content:createText({text:'A paragraph'})}]});mount(host,reader);reader.find();`,
        mount() { const items = Array.from({ length: 30 }, (_, i) => ({ key: String(i), revision: '1', content: createText({ text: 'Item ' + (i + 1) + ' · 中文 English /workspace/file.ts' }) })); const reader = createReadingArea({ label: 'Demonstration reading', identity: 'example', items }); const shown = show([reader]); return { ...shown, replay: () => reader.find() }; } },
    { id: 'drop-area', title: '拖放区域 Drop area', layer: 'components', category: '输入', description: '由一个内容积木组成的拖放区域。只报告文件、路径和 URI 输入，原生命中范围与拖放反馈由库负责，解析和请求由应用负责。', states: ['normal', 'disabled'], related: ['prompt-input', 'image'],
        code: `import {mount,createDropArea,createText} from 'pith-ui';
const host=document.getElementById('app');if(!(host instanceof HTMLElement))throw new Error('Missing mount');
mount(host,createDropArea({content:createText({text:'Drop here'}),onDrop:input=>console.log(input.files.length)}));`,
        mount(c) { return show([createDropArea({ disabled: c.state === 'disabled', content: createText({ text: 'Drop files here · 只显示演示日志，不上传文件。' }), onDrop: input => c.log('演示拖放：' + input.files.map(file => file.name).join(', ')) })]); } },
    { id: 'document', title: '文本文档与分页 Document', layer: 'components', category: '展示', description: '安全显示普通文本、Markdown 或差异。大内容按 UTF-8 边界分页，不改变文件接受上限；不包含下载、文件身份或原生动作。', related: ['markdown', 'diff', 'reading-area'],
        code: `import {mount,createDocument} from 'pith-ui';
const host=document.getElementById('app');if(!(host instanceof HTMLElement))throw new Error('Missing mount');
mount(host,createDocument({text:'A large document',format:'text'}));`,
        mount() { return show([createDocument({ text: '中文 English 🐟 /workspace/file.ts\n'.repeat(16000), format: 'text' })]); } },
    { id: 'url-input', title: '网址输入 URL input', layer: 'components', category: '输入', description: '固定网址语义，使用浏览器原生 URL 校验；不开放任意输入类型或样式。', states: ['normal', 'disabled', 'error'], related: ['text-input', 'form'], code: `import {mount,createURLInput,createForm} from 'pith-ui';
const host=document.getElementById('app');if(!(host instanceof HTMLElement))throw new Error('Missing mount');
const endpoint=createURLInput({label:'Endpoint',required:true,value:'https://example.com'});mount(host,createForm({children:[endpoint],onSubmit:async()=>({ok:true})}));`, mount(c) { return show([createURLInput({ label: 'Endpoint', value: 'https://example.com/v1', disabled: c.state === 'disabled', error: c.state === 'error' ? 'Simulated invalid endpoint.' : '' })]); } },
    { id: 'secret-text-area', title: '多行密钥 Secret textarea', layer: 'components', category: '输入', description: '多行敏感文本默认遮盖，支持显隐；显式重置会重新遮盖，销毁会清空。', states: ['normal', 'disabled'], related: ['secret-input', 'text-area'], code: `import {mount,createSecretTextArea} from 'pith-ui';
const host=document.getElementById('app');if(!(host instanceof HTMLElement))throw new Error('Missing mount');
const secret=createSecretTextArea({label:'Environment',value:'{"TOKEN":"demo"}'});mount(host,secret);`, mount(c) { return show([createSecretTextArea({ label: 'Environment JSON', value: '{"TOKEN":"simulated-secret"}', disabled: c.state === 'disabled' })]); } },
];
