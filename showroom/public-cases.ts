import { mount, createStack, createButton, createContextMenu, createCopyButton, createSlot, createPane, createSplitPane, createList, createText, createTextInput, createMarkdown, createDiff } from '../src/index.js';
import type { Control } from '../src/index.js';
import type { ShowcaseCase, MountedDemo } from './types.js';
function show(controls: Control[]): MountedDemo { const element = document.createElement('div'); const owner = mount(element, createStack({ children: controls })); return { element, destroy: owner.destroy }; }
export const publicCases: ShowcaseCase[] = [
    { id: 'context-menu', title: '上下文菜单 Context menu', layer: 'components', category: '浮层', description: '贴近触发积木；键盘导航、异步失败和关闭由菜单管理。', states: ['normal', 'disabled'], controls: ['outcome'], related: ['menu', 'button'],
        code: `import {mount,createStack,createButton,createContextMenu} from 'pith-ui';
const host=document.getElementById('app');if(!(host instanceof HTMLElement))throw new Error('Missing mount');
const menu=createContextMenu({label:'Actions',items:[{id:'rename',label:'Rename',onAction:()=>{}}]});
const action=createButton({label:'More',onAction:()=>menu.open(action)});
mount(host,createStack({children:[action,menu]}));`,
        mount(c) { const menu = createContextMenu({ label: 'Actions', disabled: c.state === 'disabled', items: [{ id: 'rename', label: 'Rename', onAction: () => c.action() }, { id: 'remove', label: 'Remove', intent: 'danger', onAction: () => c.action() }] }); const trigger = createButton({ label: 'Open context menu', onAction: () => menu.open(trigger) }); return show([trigger, menu]); } },
    { id: 'copy-feedback', title: '复制反馈 Copy', layer: 'components', category: '反馈', description: '复制操作、重复点击保护与结果反馈属于一个积木。', states: ['normal', 'disabled'], controls: ['outcome'], related: ['button'],
        code: `import {mount,createCopyButton} from 'pith-ui';
const host=document.getElementById('app');if(!(host instanceof HTMLElement))throw new Error('Missing mount');
mount(host,createCopyButton({value:'Example',onCopy:async text=>{await navigator.clipboard.writeText(text);return {ok:true};}}));`,
        mount(c) { return show([createCopyButton({ value: '演示文本 Example', disabled: c.state === 'disabled', onCopy: () => c.action() })]); } },
    { id: 'slot', title: '动态插槽 Slot', layer: 'components', category: '布局', description: '替换一个正式子积木，自动销毁旧实例。', related: ['list', 'pane'],
        code: `import {mount,createSlot,createText} from 'pith-ui';
const host=document.getElementById('app');if(!(host instanceof HTMLElement))throw new Error('Missing mount');
const slot=createSlot({content:createText({text:'First'})});mount(host,slot);slot.set(createText({text:'Next'}));`,
        mount() { const slot = createSlot({ content: createText({ text: 'Initial content' }) }); let n = 0; return show([slot, createButton({ label: 'Replace content', onAction: () => slot.set(createText({ text: 'Content ' + (++n) })) })]); } },
    { id: 'list', title: '稳定列表 Keyed list', layer: 'components', category: '布局', description: '按稳定 key 组合子积木；重排保留输入、选区与焦点，移除时销毁。', related: ['slot', 'text-input'],
        code: `import {mount,createList,createTextInput} from 'pith-ui';
const host=document.getElementById('app');if(!(host instanceof HTMLElement))throw new Error('Missing mount');
const first=createTextInput({label:'First'}),second=createTextInput({label:'Second'});
const list=createList({items:[{key:'first',content:first},{key:'second',content:second}]});mount(host,list);
list.update({items:[{key:'second',content:second},{key:'first',content:first}]});`,
        mount() { const a = createTextInput({ label: 'First', value: '保留输入' }), b = createTextInput({ label: 'Second', value: 'Other' }); let reverse = false; const list = createList({ items: [{ key: 'a', content: a }, { key: 'b', content: b }] }); return show([createButton({ label: 'Reorder', onAction: () => { reverse = !reverse; list.update({ items: reverse ? [{ key: 'b', content: b }, { key: 'a', content: a }] : [{ key: 'a', content: a }, { key: 'b', content: b }] }); } }), list]); } },
    { id: 'pane', title: '分区 Pane', layer: 'components', category: '布局', description: '应用自己传入页首、内容和页尾积木，布局固定，不包含业务场景。', related: ['split-pane', 'toolbar', 'slot'],
        code: `import {mount,createPane,createText} from 'pith-ui';
const host=document.getElementById('app');if(!(host instanceof HTMLElement))throw new Error('Missing mount');
mount(host,createPane({header:createText({role:'heading',text:'Title'}),content:createText({text:'Content'}),footer:createText({role:'description',text:'Footer'})}));`,
        mount() { return show([createPane({ header: createText({ role: 'heading', text: 'Title' }), content: createText({ text: 'The application chooses its contents.' }), footer: createText({ role: 'description', text: 'Footer' }) })]); } },
    { id: 'split-pane', title: '双栏布局 Split pane', layer: 'components', category: '布局', description: '只负责双栏与窄屏导航开关；不创建工作区、会话或设置。', related: ['pane', 'slot'],
        code: `import {mount,createSplitPane,createText} from 'pith-ui';
const host=document.getElementById('app');if(!(host instanceof HTMLElement))throw new Error('Missing mount');
mount(host,createSplitPane({navigation:createText({text:'Navigation'}),content:createText({text:'Content'})}));`,
        mount() { return show([createSplitPane({ navigation: createText({ text: 'Navigation' }), content: createText({ text: 'Content supplied by the application' }) })]); } },
    { id: 'markdown', title: 'Markdown 内容', layer: 'components', category: '展示', description: '安全清洗、代码样式、原位更新和复制；禁用与局部待处理状态合并，旧内容的结果不会覆盖新内容。',states:['normal','disabled'],controls:['outcome'], related: ['text', 'copy-feedback'],
        code: `import {mount,createMarkdown} from 'pith-ui';
const host=document.getElementById('app');if(!(host instanceof HTMLElement))throw new Error('Missing mount');
mount(host,createMarkdown({text:'# Title\\n\\n**Markdown** and code.'}));`,
        mount(c) { return show([createMarkdown({disabled:c.state==='disabled',onError:message=>c.log(message), text: '# Markdown 中文\n\nText with **emphasis** and `inline code`.\n\n```ts\nconst value = 1;\n```', onCopy: () => c.action(), onLink: url => { c.log(url); } })]); } },
    { id: 'diff', title: '差异内容 Diff', layer: 'components', category: '展示', description: '按固定增删语义显示纯文本差异，文件内容安全输出。', related: ['markdown', 'text'],
        code: `import {mount,createDiff} from 'pith-ui';
const host=document.getElementById('app');if(!(host instanceof HTMLElement))throw new Error('Missing mount');
mount(host,createDiff({text:'--- old\\n+++ new\\n-old\\n+new'}));`,
        mount() { return show([createDiff({ text: '--- old.ts\n+++ new.ts\n@@ -1 +1 @@\n-const value = 1;\n+const value = 2;' })]); } },
];
