import { mount, createText, createTextInput, createSecretInput, createNumberInput, createSelect, createCheckbox, createFormSection, createForm, createStack, createNotice, createButton, createToolbar, createCopyButton, createPopover, createTextEditDialog, createConfirmDialog, createContextMenu } from '../src/index.js';
import type { ShowcaseCase } from './types.js';
export const controlPageCases: ShowcaseCase[] = [{
        id: 'controls-form-page', title: '小积木组合：连接表单', layer: 'examples', category: '小积木组合', entry: 'pith-ui',
        description: '只使用 pith-ui 的小积木组成表单，不创建完整 app。字体、间距、字段、按钮、校验、失败保留和异步提交来自库；保存只操作模拟数据。',
        states: ['normal', 'error', 'disabled', 'long'], controls: ['outcome'], related: ['form', 'form-section', 'text-input', 'select', 'number-input'],
        code: `import {mount,createTextInput,createSelect,createFormSection,createForm} from 'pith-ui';\nimport 'pith-ui/styles.css';\nconst host=document.getElementById('app');\nif(!(host instanceof HTMLElement))throw new Error('Missing mount');\nconst name=createTextInput({label:'Name',value:'Demo'});\nconst provider=createSelect({label:'Provider',options:[{value:'demo',label:'Demo'}]});\nconst section=createFormSection({title:'Connection',children:[name,provider]});\nconst form=createForm({children:[section],submitLabel:'Save',onSubmit:async()=>{console.log(name.read(),provider.read());return {ok:true};}});\nmount(host,form);`,
        mount(context) {
            const host = document.createElement('section');
            const name = createTextInput({ label: 'Connection name', value: context.state === 'long' ? '示例连接与很长的名字 '.repeat(8) : 'Demo connection', required: true });
            const endpoint = createTextInput({ label: 'Endpoint', value: 'https://example.test/v1', description: '模拟地址，不会访问网络。', required: true });
            const provider = createSelect({ label: 'Provider', options: [{ value: 'demo', label: 'Demo provider' }, { value: 'other', label: 'Another provider' }] });
            const key = createSecretInput({ label: 'API key', description: '只输入模拟内容，不要提供真实凭证。' });
            const tokens = createNumberInput({ label: 'Maximum tokens', value: '8192', min: 1, max: 128000, step: 1 });
            const images = createCheckbox({ label: 'Accepts images', description: '模拟能力，不代表真实提供商支持。' });
            const notice = createNotice({ message: '演示数据 · 不保存真实配置、不访问账号或文件。', tone: 'info' });
            const section = createFormSection({ title: 'Connection', description: '无需选择字体、字号、密度和间距。', children: [name, endpoint, provider, key, tokens, images] });
            const form = createForm({ children: [section], submitLabel: 'Save connection', disabled: context.state === 'disabled', error: context.state === 'error' ? '模拟保存失败；当前草稿保留。' : '', onSubmit: async () => {
                    const result = await context.action();
                    if (result.ok) {
                        notice.update({ message: `模拟保存完成：${name.read()} · ${provider.read()}`, tone: 'success' });
                        key.reset('');
                    }
                    return result;
                } });
            const mounted = mount(host, createStack({ children: [notice, form] }));
            return { element: host, destroy: mounted.destroy };
        },
    }, {
        id: 'controls-actions-page', title: '小积木组合：操作与弹层', layer: 'examples', category: '小积木组合', entry: 'pith-ui',
        description: '按钮、复制、上下文菜单、Popover、文本编辑和确认框通过小积木组合。只传内容与回调，不访问内部节点；所有动作均为模拟。',
        states: ['normal', 'disabled', 'long'], controls: ['outcome'], related: ['button', 'context-menu', 'popover', 'text-edit-dialog', 'confirmation', 'copy-feedback'],
        code: `import {mount,createButton,createText,createDialog,createStack} from 'pith-ui';\nimport 'pith-ui/styles.css';\nconst host=document.getElementById('app');\nif(!(host instanceof HTMLElement))throw new Error('Missing mount');\nconst dialog=createDialog({title:'Details',content:createText({text:'Reviewed content'})});\nconst button=createButton({label:'Details',onAction:()=>dialog.open()});\nmount(host,createStack({children:[button,dialog]}));`,
        mount(context) {
            const host = document.createElement('section');
            let value = '示例资源';
            const notice = createNotice({ message: '演示操作 · 不修改真实资源、不访问剪贴板。', tone: 'info' });
            const title = createText({ role: 'heading', text: value });
            const editor = createTextEditDialog({ title: 'Edit resource', label: 'Resource name', onSubmit: async (text) => { const result = await context.action(); if (result.ok) {
                    value = text;
                    title.update({ role: 'heading', text: value });
                    copy.update({ value, label: '复制名称' });
                } return result; } });
            const confirm = createConfirmDialog({ title: 'Delete resource?', message: '只模拟删除，不修改真实文件。', onConfirm: async () => { const result = await context.action(); if (result.ok)
                    notice.update({ message: '模拟删除完成。', tone: 'success' }); return result; } });
            const menu = createContextMenu({ label: 'Resource actions', items: [{ id: 'edit', label: 'Edit resource', onAction: () => editor.open({ value }) }, { id: 'delete', label: 'Delete resource', intent: 'danger', onAction: () => confirm.open() }] });
            const trigger = createButton({ label: '资源操作', disabled: context.state === 'disabled', onAction: () => menu.open(trigger) });
            const copy = createCopyButton({ label: '复制名称', value, disabled: context.state === 'disabled', onCopy: async (text) => { context.log(`模拟复制：${text}`); return context.action(); }, onError: message => notice.update({ message, tone: 'error' }) });
            const popover = createPopover({ label: 'Details', disabled: context.state === 'disabled', content: createTextInput({ label: 'Local note', value: '可编辑的局部内容', description: '关闭面板后再打开仍保留输入。' }) });
            const toolbar = createToolbar({ label: 'Resource tools', children: [trigger, copy, popover] });
            const mounted = mount(host, createStack({ children: [notice, title, toolbar, menu, editor, confirm] }));
            return { element: host, destroy: mounted.destroy };
        },
    }];
