import {
  createActions, createButton, createCheckbox, createCollectionState, createConfirmDialog,
  createDialog, createDisclosure, createDivider, createFormSection, createIcon, createSurface,
  createIconButton, createKeyValue, createListRow, createMenu, createNotice,
  createNumberInput, createPopover, createProgress, createScrollArea, createSearchInput,
  createSecretInput, createSelect, createListSelect, createStatus, createTextAction, createTextArea, createStack, createText, createForm, mount,
  createTextEditDialog, createTextInput, createToolbar,
} from '../src/index.js';
import type {Control, IconName} from '../src/index.js';
import { element } from '../src/dom.js';
import type { DemoContext, MountedDemo, ShowcaseCase } from './types.js';

type Owned = Control;
const states = ['normal', 'disabled', 'long'] as const;
const inputStates = ['normal', 'error', 'disabled', 'long'] as const;
function sample(context: DemoContext, value: string): string { return context.state === 'long' ? `${value} 中文 English 012345 /Users/example/project/a-long-file-name.ts `.repeat(5) : value; }
function disabled(context: DemoContext): boolean { return context.state === 'disabled'; }
function group(blocks: readonly Owned[], replay?: () => void): MountedDemo {
  const root = element('div', 'pui-form-section');
  const mounted = mount(root, createStack({children: blocks}));
  return {element: root, replay, destroy: mounted.destroy};
}
function field(context: DemoContext, label: string) {
  return { label, value: sample(context, 'Example value 中文'),
    disabled: disabled(context), description: 'Tab and Shift+Tab move focus; typing, caret and text selection remain native.',
    error: context.state === 'error' ? 'The value could not be saved. Your input is retained.' : '',
    onInput: (value: string) => context.log(`Input: ${value}`) };
}

export const primitiveCases: ShowcaseCase[] = [
  {
    id:'text',title:'语义文本 Text',layer:'components',category:'展示',
    description:'正文、说明、标题和代码按用途选用既定排版；不开放字体、字号、字重、行距和颜色。',states:['normal','long'],related:['foundation-typography','form-section'],
    code:`import {mount,createText,createStack} from 'pith-ui';\nconst host=document.getElementById('app');\nif(!(host instanceof HTMLElement))throw new Error('Missing mount');\nmount(host,createStack({children:[createText({role:'heading',text:'Connection'}),createText({text:'Body text'}),createText({role:'description',text:'Supporting information'})]}));`,
    mount(context){return group([createText({role:'heading',text:'Connection'}),createText({text:sample(context,'正文 Body text 012345，标点与 emoji 🐟')}),createText({role:'description',text:'说明文字 Supporting information'}),createText({role:'code',text:'/workspace/src/index.ts'})]);},
  },
  {
    id:'stack',title:'纵向组合 Stack',layer:'components',category:'布局',
    description:'组合库创建的小积木；统一间距，自动拥有并销毁子积木。拒绝任意 DOM、重复使用和样式参数。',states:['normal','long'],related:['form','toolbar'],
    code:`import {mount,createStack,createText,createButton} from 'pith-ui';\nconst host=document.getElementById('app');\nif(!(host instanceof HTMLElement))throw new Error('Missing mount');\nconst view=createStack({children:[createText({text:'Details'}),createButton({label:'Continue'})]});\nconst mounted=mount(host,view);\n// mounted.destroy() releases the entire tree.`,
    mount(context){return group([createStack({label:'Example composition',children:[createText({text:sample(context,'同一套小积木可以组合在不同应用中。')}),createButton({label:'Continue',onAction:()=>context.action()})]})]);},
  },
  {
    id:'form',title:'表单与提交 Form',layer:'components',category:'布局',
    description:'原生校验、提交按钮、错误与异步 pending 由表单管理。失败保留草稿，连续点击不重复写入，关闭所属弹窗后忽略旧结果。',states:['normal','error','disabled','long'],controls:['outcome'],related:['form-section','text-input','number-input','select'],
    code:`import {mount,createTextInput,createForm} from 'pith-ui';\nconst host=document.getElementById('app');\nif(!(host instanceof HTMLElement))throw new Error('Missing mount');\nconst name=createTextInput({label:'Name',required:true});\nconst form=createForm({children:[name],submitLabel:'Save',onSubmit:async()=>{console.log(name.read());return {ok:true};}});\nmount(host,form);`,
    mount(context){const name=createTextInput({...field(context,'Connection name'),required:true});const form=createForm({auxiliaryActions:createButton({label:'Delete',intent:'danger',onAction:()=>context.action()}),onCancel(){},children:[name],submitLabel:'Save connection',disabled:disabled(context),error:context.state==='error'?'演示保存失败，草稿保留。':'',onSubmit:()=>context.action()});return group([form]);},
  },
  {
    id: 'button', title: '按钮 Button', layer: 'components', category: '操作',
    description: '普通、主要与危险操作。异步操作期间保留 pending，快照更新不会提前启用。',
    states: ['normal', 'loading', 'pending', 'disabled', 'long'], related: ['icon-button', 'actions', 'confirmation'],
    code: `import {mount, createButton} from 'pith-ui';\nimport 'pith-ui/styles.css';\nconst host = document.getElementById('app');\nif (!(host instanceof HTMLElement)) throw new Error('Missing mount');\nconst block = createButton({label:'Save',intent:'primary',onAction:async()=>({ok:true})});\nconst mounted = mount(host,block);\n// mounted.destroy() releases the complete owned tree.`,
    mount(context) {
      const buttons = (['neutral', 'primary', 'danger'] as const).map(intent => createButton({
        label: sample(context, intent === 'neutral' ? 'Cancel' : intent === 'primary' ? 'Save changes' : 'Delete'),
        intent, disabled: disabled(context), pending: context.state === 'pending' || context.state === 'loading',
        onAction: () => context.action(), onError: message => context.log(message),
      }));
      const toolbar = createToolbar({ label: 'Button variants', children: buttons });
      return group([toolbar]);
    },
  },
  {
    id: 'icon-button', title: '图标按钮 Icon button', layer: 'components', category: '操作',
    description: '紧凑操作具有可访问名称和悬停说明，支持键盘聚焦与激活，不绘制焦点框。', states, related: ['button', 'icons'],
    code: `import {mount, createIconButton} from 'pith-ui';\nimport 'pith-ui/styles.css';\nconst host = document.getElementById('app');\nif (!(host instanceof HTMLElement)) throw new Error('Missing mount');\nconst block = createIconButton({label:'Copy message',icon:'copy',onAction:()=>{}});\nconst mounted = mount(host,block);\n// mounted.destroy() releases the complete owned tree.`,
    mount(context) {
      const blocks = (['copy', 'edit', 'trash', 'close'] as const).map(icon => createIconButton({ label: `${icon} action`, icon, title: `${icon} action`, disabled: disabled(context), onAction: () => context.action(), onError: message => context.log(message) }));
      const toolbar = createToolbar({ label: 'Icon actions', children: blocks });
      return group([toolbar]);
    },
  },
  {
    id: 'text-action', title: '文字操作 Text action', layer: 'components', category: '操作',
    description: '较轻的辅助操作仍使用原生 button，不意外提交表单。', states, related: ['button', 'secret-input'],
    code: `import {mount, createTextAction} from 'pith-ui';\nimport 'pith-ui/styles.css';\nconst host = document.getElementById('app');\nif (!(host instanceof HTMLElement)) throw new Error('Missing mount');\nconst block = createTextAction({label:'Change',onAction:()=>{}});\nconst mounted = mount(host,block);\n// mounted.destroy() releases the complete owned tree.`,
    mount(context) { return group([createTextAction({ label: sample(context, 'Change workspace'), disabled: disabled(context), onAction: () => context.action() }),createTextAction({context:'link',label:'Open running conversation',disabled:disabled(context),onAction:()=>context.action()})]); },
  },
  {
    id: 'text-input', title: '文本输入 Text input', layer: 'components', category: '输入',
    description: '标签、说明、错误与原生输入框。普通 update 不覆盖用户值和选区。', states: inputStates, related: ['form-section', 'text-area'],
    code: `import {mount, createTextInput} from 'pith-ui';\nimport 'pith-ui/styles.css';\nconst host = document.getElementById('app');\nif (!(host instanceof HTMLElement)) throw new Error('Missing mount');\nconst block = createTextInput({label:'Name',value:'My workspace'});\nblock.update({label:'Name',error:'Please choose another name'});\nconst mounted = mount(host,block);\n// mounted.destroy() releases the complete owned tree.`,
    mount(context) { return group([createTextInput(field(context, 'Workspace name'))]); },
  },
  {
    id: 'number-input', title: '数字输入 Number input', layer: 'components', category: '输入',
    description: '原生 number 约束、步进、键盘和字段错误。', states: inputStates, related: ['text-input'],
    code: `import {mount, createNumberInput} from 'pith-ui';\nimport 'pith-ui/styles.css';\nconst host = document.getElementById('app');\nif (!(host instanceof HTMLElement)) throw new Error('Missing mount');\nconst block = createNumberInput({label:'Maximum tokens',value:'4096',min:1,step:1});\nconst mounted = mount(host,block);\n// mounted.destroy() releases the complete owned tree.`,
    mount(context) { return group([createNumberInput({ ...field(context, 'Maximum tokens'), value: '4096', min: 1, max: 131072, step: 1 })]); },
  },
  {
    id: 'search-input', title: '搜索输入 Search input', layer: 'components', category: '输入',
    description: '使用原生搜索输入，支持清空、键盘和输入回调。', states: inputStates, related: ['collection-state'],
    code: `import {mount, createSearchInput} from 'pith-ui';\nimport 'pith-ui/styles.css';\nconst host = document.getElementById('app');\nif (!(host instanceof HTMLElement)) throw new Error('Missing mount');\nconst block = createSearchInput({label:'Search models',onInput:value=>console.log(value)});\nconst mounted = mount(host,block);\n// mounted.destroy() releases the complete owned tree.`,
    mount(context) { return group([createSearchInput({ ...field(context, 'Search conversations'), value: '', placeholder: 'Search by name or content' })]); },
  },
  {
    id: 'secret-input', title: '密钥输入 Secret input', layer: 'components', category: '输入',
    description: 'Show/Hide 是 type=button，切换不提交表单、不清空内容，禁用时同步不可操作。', states: inputStates, related: ['text-action', 'form-section'],
    code: `import {mount, createSecretInput} from 'pith-ui';\nimport 'pith-ui/styles.css';\nconst host = document.getElementById('app');\nif (!(host instanceof HTMLElement)) throw new Error('Missing mount');\nconst block = createSecretInput({label:'API key',description:'Only use demonstration credentials here.'});\nconst mounted = mount(host,block);\n// mounted.destroy() releases the complete owned tree.`,
    mount(context) { return group([createSecretInput({ ...field(context, 'API key'), value: 'sk-example-for-demonstration-only', description: 'Demonstration value. Empty retains a saved key only when the application implements that policy.' })]); },
  },
  {
    id: 'text-area', title: '多行输入 Text area', layer: 'components', category: '输入',
    description: '长文本、换行、可调整高度；状态更新保留内容与选区。', states: inputStates, related: ['text-edit-dialog'],
    code: `import {mount, createTextArea} from 'pith-ui';\nimport 'pith-ui/styles.css';\nconst host = document.getElementById('app');\nif (!(host instanceof HTMLElement)) throw new Error('Missing mount');\nconst block = createTextArea({label:'Instructions',value:'First paragraph'});\nconst mounted = mount(host,block);\n// mounted.destroy() releases the complete owned tree.`,
    mount(context) { return group([createTextArea({ ...field(context, 'Instructions'), value: sample(context, '第一段中文。\n\nSecond paragraph with `code` and emoji 🐟.') }),createTextArea({purpose:'form',label:'Structured form data',value:'["--help"]'}),createTextArea({purpose:'document',label:'Document editor',value:'# Demonstration document'})]); },
  },
  {
    id: 'select', title: '选择器 Select', layer: 'components', category: '输入',
    description: '单选下拉复用统一浮层、选中状态与键盘导航；多行列表使用 16 CSS px 字体并保留原生操作。WebKit 原生行距由系统绘制，不能保证与 Chromium 的 32 CSS px 行高一致。', states: inputStates, related: ['permission-control', 'model-picker', 'popover'],
    code: `import {mount, createSelect, createListSelect, createStack} from 'pith-ui';\nimport 'pith-ui/styles.css';\nconst host = document.getElementById('app');\nif (!(host instanceof HTMLElement)) throw new Error('Missing mount');\nconst provider = createSelect({label:'Provider',value:'demo',options:[{value:'demo',label:'Demo'}]});\nconst models = createListSelect({label:'Models',multiple:true,values:['a'],options:[{value:'a',label:'A'},{value:'b',label:'B'}],onChange:values=>console.log(values)});\nconst block = createStack({children:[provider,models]});\nmodels.reset(['b']); // Explicit reset; no user-change callback.\nconst mounted = mount(host,block);\n// mounted.destroy() releases the complete owned tree.`,
    mount(context) {
      const options = Array.from({ length: context.state === 'long' ? 20 : 6 }, (_, index) => ({ value: String(index), label: sample(context, `Model ${index + 1}`) }));
      const providerOptions = [
        { value: 'pith', label: sample(context, 'Pith') },
        { value: 'unavailable', label: 'Unavailable provider · 暂不可用', disabled: true },
        { value: 'example', label: sample(context, 'Example provider · 示例提供商') },
        ...(context.state === 'long' ? options.map(option => ({ ...option, value: `provider-${option.value}` })) : []),
      ];
      const error = context.state === 'error' ? '演示读取失败；当前选择保留，可以重新选择。' : '';
      return group([createSelect({ label: 'Provider', description: '单选下拉：点击或按 Enter 打开；方向键移动，Enter 确认，Esc 取消。禁用项不可选择。', value: 'pith', options: providerOptions, disabled: disabled(context), error, onChange: value => context.log(`Provider: ${value}`) }),
        createListSelect({ label: 'Models (multi-row)', description: '16 CSS px 原生多选列表，使用系统键盘与修饰键；WebKit 不应用选项内边距，行距由平台决定。回调提供全部选中项，初始选中 Model 1、Model 3。', options, multiple: true, values:['0','2'], disabled: disabled(context), error, onChange: values => context.log(`演示所选模型：${values.join(', ') || '未选择'}`) }),createListSelect({purpose:'catalog',label:'Model catalog (six rows)',options,value:'0'})]);
    },
  },
  {
    id: 'checkbox', title: '复选框 Checkbox', layer: 'components', category: '输入',
    description: '原生复选框，点击标签与空格切换，说明文字与状态保持关联。', states, related: ['form-section'],
    code: `import {mount, createCheckbox} from 'pith-ui';\nimport 'pith-ui/styles.css';\nconst host = document.getElementById('app');\nif (!(host instanceof HTMLElement)) throw new Error('Missing mount');\nconst block = createCheckbox({label:'Accepts images',checked:true});\nconst mounted = mount(host,block);\n// mounted.destroy() releases the complete owned tree.`,
    mount(context) { return group([createCheckbox({ label: sample(context, 'Accepts image input'), description: 'Enable this capability for the model.', checked: true, disabled: disabled(context), onChange: value => context.log(`Images: ${value}`) })]); },
  },
  {
    id: 'icons', title: '图标 Icons', layer: 'components', category: '展示',
    description: '封闭图标名称与固定默认尺寸；装饰图标与有名称图标分别处理，不开放字号或尺寸参数。', states: ['normal'], related: ['icon-button'],
    code: `import {mount, createIcon} from 'pith-ui';\nimport 'pith-ui/styles.css';\nconst host = document.getElementById('app');\nif (!(host instanceof HTMLElement)) throw new Error('Missing mount');\nconst block = createIcon({name:'file',label:'File'});\nconst mounted = mount(host,block);\n// mounted.destroy() releases the complete owned tree.`,
    mount() {
      const blocks = (['chat', 'folder', 'settings', 'file', 'terminal', 'copy', 'edit', 'trash', 'search', 'plug', 'shield', 'branch'] as const).map(name => createIcon({name, label: name}));
      const toolbar = createToolbar({ label: 'Icon sizes', children: blocks });
      return group([toolbar]);
    },
  },
  {
    id: 'status', title: '状态标记 Status', layer: 'components', category: '展示',
    description: '中性、成功、警告与错误色义。状态文字作为文本，不充当动作。', states: ['normal', 'long'], related: ['notice', 'list-row'],
    code: `import {mount, createStatus} from 'pith-ui';\nimport 'pith-ui/styles.css';\nconst host = document.getElementById('app');\nif (!(host instanceof HTMLElement)) throw new Error('Missing mount');\nconst block = createStatus({label:'Connected',tone:'success'});\nconst mounted = mount(host,block);\n// mounted.destroy() releases the complete owned tree.`,
    mount(context) { return group((['neutral', 'success', 'warning', 'error'] as const).map(tone => createStatus({ label: sample(context, tone), tone }))); },
  },
  {
    id: 'list-row', title: '列表行 List row', layer: 'components', category: '展示',
    description: '标题、说明、元信息与独立操作积木；主操作使用原生按钮，长路径可换行。', states, related: ['collection-state', 'text-action'],
    code: `import {mount, createListRow, createButton} from 'pith-ui';\nimport 'pith-ui/styles.css';\nconst host = document.getElementById('app');\nif (!(host instanceof HTMLElement)) throw new Error('Missing mount');\nconst block = createListRow({title:'SKILL.md',description:'/demo/SKILL.md',icon:'file',onAction:async()=>({ok:true}),actions:createButton({label:'Preview'})});\nconst mounted = mount(host,block);\n// mounted.destroy() releases the complete owned tree.`,
    mount(context) {
      const action = createButton({ label: 'Preview', disabled: disabled(context), onAction: () => context.action() });
      const row = createListRow({onAction:()=>context.action(),onError:message=>context.log(message),disabled:context.state==='disabled', title: 'SKILL.md', description: sample(context, '/workspace/.pi/skills/example/SKILL.md'), icon: 'file', meta: 'Read only', actions: action, selected: true });
      return group([row,createListRow({context:'resource',title:'AGENTS.md',icon:'file',meta:'/workspace/AGENTS.md',details:createDisclosure({title:'View instructions',content:createText({role:'code',text:'# Demonstration instructions'})}),actions:createButton({context:'inline',label:'Open',onAction:()=>context.action()})})]);
    },
  },
  {
    id: 'key-value', title: '键值信息 Key/value', layer: 'components', category: '展示',
    description: '语义化 dl/dt/dd 展示参数、费用或状态摘要，更新保持稳定行。', states: ['normal', 'long'], related: ['divider'],
    code: `import {mount, createKeyValue} from 'pith-ui';\nimport 'pith-ui/styles.css';\nconst host = document.getElementById('app');\nif (!(host instanceof HTMLElement)) throw new Error('Missing mount');\nconst block = createKeyValue({items:[{key:'phase',label:'Phase',value:'Running'}]});\nconst mounted = mount(host,block);\n// mounted.destroy() releases the complete owned tree.`,
    mount(context) { return group([createKeyValue({ items: [{ key: 'phase', label: 'Phase', value: 'Running' }, { key: 'path', label: 'Path', value: sample(context, '/workspace/project/src/index.ts') }, { key: 'tokens', label: 'Tokens', value: '4,096' }] })]); },
  },
  {
    id: 'divider', title: '分隔线 Divider', layer: 'components', category: '展示',
    description: '有标签与无标签分隔，对比真实间距与边框。', states: ['normal'], related: ['form-section'],
    code: `import {mount, createDivider} from 'pith-ui';\nimport 'pith-ui/styles.css';\nconst host = document.getElementById('app');\nif (!(host instanceof HTMLElement)) throw new Error('Missing mount');\nconst block = createDivider({label:'Advanced'});\nconst mounted = mount(host,block);\n// mounted.destroy() releases the complete owned tree.`,
    mount() { return group([createDivider(), createDivider({ label: 'Advanced settings' })]); },
  },
  {
    id: 'progress', title: '进度 Progress', layer: 'components', category: '展示',
    description: '原生 progress 的确定与不确定状态，名称与数值一起展示。', states: ['normal', 'loading'], related: ['collection-state'],
    code: `import {mount, createProgress} from 'pith-ui';\nimport 'pith-ui/styles.css';\nconst host = document.getElementById('app');\nif (!(host instanceof HTMLElement)) throw new Error('Missing mount');\nconst block = createProgress({label:'Download',value:42,max:100});\nconst mounted = mount(host,block);\n// mounted.destroy() releases the complete owned tree.`,
    mount(context) { return group([createProgress({ label: 'Downloading update (demonstration)', value: context.state === 'loading' ? undefined : 42 })]); },
  },
  {
    id: 'notice', title: '反馈提示 Notice', layer: 'components', category: '反馈',
    description: '提示、成功、警告、错误。警告与错误采用 alert，其他状态使用 status。', states: ['normal', 'error', 'long'], related: ['status', 'collection-state'],
    code: `import {mount, createNotice} from 'pith-ui';\nimport 'pith-ui/styles.css';\nconst host = document.getElementById('app');\nif (!(host instanceof HTMLElement)) throw new Error('Missing mount');\nconst block = createNotice({message:'Could not save. Draft retained.',tone:'error'});\nconst mounted = mount(host,block);\n// mounted.destroy() releases the complete owned tree.`,
    mount(context) { return group([ ...(['info', 'success', 'warning', 'error'] as const).map(tone => createNotice({ message: sample(context, `${tone}: this is demonstration feedback.`), tone })),createNotice({presentation:'inline',message:'Plain status: demonstration connection test.',tone:'info'}),createNotice({presentation:'caption',message:'Plain error: the demonstration request failed.',tone:'error'}),createNotice({presentation:'compact',message:'Compact error: draft retained.',tone:'error'})]); },
  },
  {
    id: 'collection-state', title: '集合状态 Collection state', layer: 'components', category: '反馈',
    description: 'ready、loading、empty、error 外壳；请求归调用方，Retry 只触发回调。', states: ['normal', 'loading', 'empty', 'error'], related: ['list-row', 'notice'],
    code: `import {mount, createCollectionState, createText} from 'pith-ui';\nimport 'pith-ui/styles.css';\nconst host = document.getElementById('app');\nif (!(host instanceof HTMLElement)) throw new Error('Missing mount');\nconst block = createCollectionState({status:'ready',content:createText({text:'Example resource'})});\nconst mounted = mount(host,block);\n// mounted.destroy() releases the complete owned tree.`,
    mount(context) {
      const row = createListRow({ title: 'Example resource', description: 'Demonstration data', icon: 'file' });
      const collection = createCollectionState({ status: context.state === 'loading' ? 'loading' : context.state === 'empty' ? 'empty' : context.state === 'error' ? 'error' : 'ready', content: row,
        onRetry: async () => { const result = await context.action(); if (result.ok) collection.update({ status: 'ready' }); return result; } });
      return group([collection]);
    },
  },
  {
    id: 'dialog', title: '普通弹窗 Dialog', layer: 'components', category: '浮层',
    description: '原生 dialog 的模态、Esc、焦点恢复和可滚动内容，只接受库创建的积木作为内容。', states, related: ['text-edit-dialog', 'confirmation'],
    code: `import {mount, createDialog, createText} from 'pith-ui';\nimport 'pith-ui/styles.css';\nconst host = document.getElementById('app');\nif (!(host instanceof HTMLElement)) throw new Error('Missing mount');\nconst block = createDialog({title:'Details',content:createText({text:'Dialog content'})});\nconst mounted = mount(host,block);\nblock.open();\n// mounted.destroy() releases the complete owned tree.`,
    mount(context) {
      const content = createText({text: sample(context, 'This is real dialog content. Use Tab, Shift+Tab and Escape.')});
      const dialog = createDialog({ title: 'Details', description: 'Demonstration dialog', content });
      const button = createButton({ label: 'Open dialog', disabled: disabled(context), onAction: () => dialog.open() });
      return group([button, dialog], () => dialog.open());
    },
  },
  {
    id: 'text-edit-dialog', title: '文本编辑弹窗 Text edit', layer: 'components', category: '浮层',
    description: '普通消息固定 8 行，待发送消息固定 5 行；保存失败保留文本与选区，关闭重开丢弃旧结果。模拟结果由展厅控制。', states: ['normal', 'error', 'disabled', 'pending', 'long'], related: ['text-area', 'dialog'],
    code: `import {mount, createTextEditDialog} from 'pith-ui';\nimport 'pith-ui/styles.css';\nconst host = document.getElementById('app');\nif (!(host instanceof HTMLElement)) throw new Error('Missing mount');\nconst block = createTextEditDialog({title:'Edit message',purpose:'message',onSubmit:async text=>({ok:true})});\nconst mounted = mount(host,block);\nblock.open({value:'Original message'});\n// mounted.destroy() releases the complete owned tree.`,
    mount(context) {
      const editor = createTextEditDialog({ title: 'Edit message', onSubmit: () => context.action() });
      const open = (): void => {
        editor.open({ value: sample(context, 'First paragraph 中文。\n\nSecond paragraph with emoji 🐟.') });
        editor.update({ title: 'Edit message', note: 'Demonstration only. Failed writes retain the text.', disabled: disabled(context) || context.outcome === 'invalid', pending: context.state === 'pending', error: context.state === 'error' ? 'Previous save failed. Your text is kept.' : '' });
      };
      const button = createButton({ label: 'Edit text', onAction: open });
      const pending = createTextEditDialog({title:'Edit pending message',purpose:'pending-message',onSubmit:()=>context.action()});
      const pendingButton = createButton({label:'Edit pending message',onAction:()=>pending.open({value:'Pending message 中文'})});
      return group([button, pendingButton, editor, pending], open);
    },
  },
  {
    id: 'confirmation', title: '危险操作确认 Confirmation', layer: 'components', category: '浮层',
    description: '打开先聚焦 Cancel；危险操作 pending 时禁止重复，关闭后忽略迟到反馈。', states: ['normal', 'error', 'disabled', 'pending', 'long'], related: ['dialog', 'button'],
    code: `import {mount, createConfirmDialog} from 'pith-ui';\nimport 'pith-ui/styles.css';\nconst host = document.getElementById('app');\nif (!(host instanceof HTMLElement)) throw new Error('Missing mount');\nconst block = createConfirmDialog({title:'Delete resource?',message:'This permanently removes the resource.',onConfirm:async()=>({ok:true})});\nconst mounted = mount(host,block);\nblock.open();\n// mounted.destroy() releases the complete owned tree.`,
    mount(context) {
      const confirm = createConfirmDialog({ title: 'Delete resource?', onConfirm: () => context.action() });
      const open = (): void => confirm.open({ title: 'Delete resource?', message: sample(context, 'Remove the selected resource permanently? Demonstration data only.'), disabled: disabled(context), pending: context.state === 'pending', error: context.state === 'error' ? 'Removal failed. Please try again.' : '' });
      const warning=createConfirmDialog({purpose:'form',tone:'warning',eyebrow:'DEMONSTRATION',title:'Enable access?',confirmLabel:'Enable access',content:createSurface({purpose:'notice',tone:'warning',content:createActions({children:[createIcon({name:'shield',context:'notice'}),createText({text:'Connected services can perform actions.'})]})}),onConfirm:()=>context.action()});
      return group([createButton({ label: 'Open confirmation', intent: 'danger', onAction: open }),createButton({label:'Open warning confirmation',onAction:()=>warning.open()}), confirm,warning], open);
    },
  },
  {
    id: 'menu', title: '菜单 Menu', layer: 'components', category: '浮层',
    description: '支持上下方向键、Home、End、Esc；跳过禁用项，保留稳定项目。', states, related: ['popover', 'text-action'],
    code: `import {mount, createMenu} from 'pith-ui';\nimport 'pith-ui/styles.css';\nconst host = document.getElementById('app');\nif (!(host instanceof HTMLElement)) throw new Error('Missing mount');\nconst block = createMenu({label:'Actions',items:[{id:'rename',label:'Rename',onAction:()=>{}},{id:'delete',label:'Delete',intent:'danger',onAction:async()=>({ok:true})}]});\nconst mounted = mount(host,block);\nblock.open();\n// mounted.destroy() releases the complete owned tree.`,
    mount(context) { return group([createMenu({ label: 'Open actions', disabled: disabled(context), items: [{ id: 'rename', label: sample(context, 'Rename workspace'), onAction: () => context.action() }, { id: 'current', label: 'Current workspace', checked: true, onAction: () => context.action() }, { id: 'unavailable', label: 'Unavailable while running', disabled: true, onAction() {} }, { id: 'delete', label: 'Delete workspace', intent: 'danger', onAction: () => context.action() }] })]); },
  },
  {
    id: 'popover', title: '弹出面板 Popover', layer: 'components', category: '浮层',
    description: '非模态局部面板，外部点击与焦点离开关闭，Esc 返回入口。', states, related: ['menu', 'dialog'],
    code: `import {mount, createPopover, createText} from 'pith-ui';\nimport 'pith-ui/styles.css';\nconst host = document.getElementById('app');\nif (!(host instanceof HTMLElement)) throw new Error('Missing mount');\nconst block = createPopover({label:'Details',content:createText({text:'More details'})});\nconst mounted = mount(host,block);\nblock.open();\n// mounted.destroy() releases the complete owned tree.`,
    mount(context) {
      const input = createTextInput({ label: 'Panel input', value: sample(context, 'Editable details') });
      const popover = createPopover({ label: 'Open details', content: input, disabled: disabled(context) });
      return group([popover], () => popover.open());
    },
  },
  {
    id: 'form-section', title: '表单分组 Form section', layer: 'components', category: '布局',
    description: '标题、说明、字段和操作区，间距集中维护，业务验证归应用。', states: inputStates, related: ['text-input', 'actions'],
    code: `import {mount, createFormSection, createTextInput} from 'pith-ui';\nimport 'pith-ui/styles.css';\nconst host = document.getElementById('app');\nif (!(host instanceof HTMLElement)) throw new Error('Missing mount');\nconst block = createFormSection({title:'Connection',children:[createTextInput({label:'Name'})]});\nconst mounted = mount(host,block);\n// mounted.destroy() releases the complete owned tree.`,
    mount(context) {
      const name = createTextInput(field(context, 'Connection name'));
      const endpoint = createTextInput({ ...field(context, 'Endpoint'), value: 'https://example.test/v1' });
      const children = [name, endpoint];
      const section = createFormSection({ title: 'Connection', description: sample(context, 'Configure the provider. These fields are demonstration data.'), children });
      return group([section,createFormSection({context:'editor',title:'',children:[createToolbar({label:'Editor section',leading:createText({role:'label',text:'Add connection'}),trailing:createButton({label:'New connection',onAction:()=>context.action()})}),createTextInput({label:'Name'})]})]);
    },
  },
  {
    id: 'actions', title: '操作栏 Actions', layer: 'components', category: '布局',
    description: '开始、结束和两端对齐，窄容器自动换行，保留点击目标。', states, related: ['button', 'form-section'],
    code: `import {mount, createActions, createButton} from 'pith-ui';\nimport 'pith-ui/styles.css';\nconst host = document.getElementById('app');\nif (!(host instanceof HTMLElement)) throw new Error('Missing mount');\nconst block = createActions({children:[createButton({label:'Cancel'}),createButton({label:'Save',intent:'primary'})]});\nconst mounted = mount(host,block);\n// mounted.destroy() releases the complete owned tree.`,
    mount(context) {
      const owned: Owned[] = [];
      for (const align of ['start', 'end', 'between'] as const) {
        const cancel = createButton({ label: `Cancel (${align})`, disabled: disabled(context) });
        const save = createButton({ label: sample(context, 'Save changes'), intent: context.intent, disabled: disabled(context), onAction: () => context.action() });
        const actions = createActions({ align, children: [cancel, save] });
        owned.push(actions);
      }
      return group(owned);
    },
  },
  {
    id: 'toolbar', title: '工具栏 Toolbar', layer: 'components', category: '布局',
    description: '工具区自动使用统一间距，在窄容器中换行；不需要额外选择密度。', states, related: ['icon-button', 'actions'],
    code: `import {mount, createToolbar, createButton} from 'pith-ui';\nimport 'pith-ui/styles.css';\nconst host = document.getElementById('app');\nif (!(host instanceof HTMLElement)) throw new Error('Missing mount');\nconst block = createToolbar({label:'Resources',children:[createButton({label:'Refresh'})]});\nconst mounted = mount(host,block);\n// mounted.destroy() releases the complete owned tree.`,
    mount(context) {
      const refresh = createButton({ label: 'Refresh', disabled: disabled(context), onAction: () => context.action() });
      const add = createIconButton({ label: 'Add resource', icon: 'plus', disabled: disabled(context), onAction: () => context.action() });
      const toolbar = createToolbar({ label: 'Resource tools', children: [refresh, add] });
      return group([toolbar]);
    },
  },
  {
    id: 'disclosure', title: '折叠区 Disclosure', layer: 'components', category: '布局',
    description: '原生 details/summary，展开状态不被普通 update 覆盖，保留键盘操作。', states, related: ['scroll-area'],
    code: `import {mount, createDisclosure, createText} from 'pith-ui';\nimport 'pith-ui/styles.css';\nconst host = document.getElementById('app');\nif (!(host instanceof HTMLElement)) throw new Error('Missing mount');\nconst block = createDisclosure({title:'Arguments',content:createText({role:'code',text:'Tool arguments'})});\nconst mounted = mount(host,block);\n// mounted.destroy() releases the complete owned tree.`,
    mount(context) {
      const content = createText({role:'code',text:sample(context, '{ "path": "src/index.ts", "mode": "read" }')});
      const disclosure = createDisclosure({ title: 'Tool arguments', description: 'Use Enter or Space to expand', content, disabled: disabled(context), onToggle: open => context.log(`Expanded: ${open}`) });
      return group([disclosure], () => disclosure.setOpen(!disclosure.isOpen()));
    },
  },
  {
    id: 'scroll-area', title: '滚动区域 Scroll area', layer: 'components', category: '布局',
    description: '有名称和键盘入口的局部滚动区，不把长内容挤出窗口。', states: ['normal', 'long'], related: ['disclosure', 'list-row'],
    code: `import {mount, createScrollArea, createText} from 'pith-ui';\nimport 'pith-ui/styles.css';\nconst host = document.getElementById('app');\nif (!(host instanceof HTMLElement)) throw new Error('Missing mount');\nconst block = createScrollArea({label:'Output',content:createText({text:'Long content'})});\nconst mounted = mount(host,block);\n// mounted.destroy() releases the complete owned tree.`,
    mount(context) {
      const content = createStack({children:Array.from({length: context.state === 'long' ? 80 : 20},(_, index)=>createText({text:`Line ${index + 1}: Demonstration output 中文 🐟`}))});
      return group([createScrollArea({ label: 'Demonstration output', viewport: 'bounded', content })]);
    },
  },
];
