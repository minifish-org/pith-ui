import {
  createActions, createButton, createCheckbox, createCollectionState, createConfirmDialog,
  createDialog, createDisclosure, createDivider, createFormSection, createIcon,
  createIconButton, createKeyValue, createListRow, createMenu, createNotice,
  createNumberInput, createPopover, createProgress, createScrollArea, createSearchInput,
  createSecretInput, createSelect, createStatus, createTextAction, createTextArea,
  createTextEditDialog, createTextInput, createToolbar,
} from '../src/primitives.js';
import { element } from '../src/dom.js';
import type { DemoContext, MountedDemo, ShowcaseCase } from './types.js';

type Owned = { element: HTMLElement; destroy(): void };
const states = ['normal', 'disabled', 'long'] as const;
const inputStates = ['normal', 'error', 'disabled', 'long'] as const;
function sample(context: DemoContext, value: string): string { return context.state === 'long' ? `${value} 中文 English 012345 /Users/example/project/a-long-file-name.ts `.repeat(5) : value; }
function disabled(context: DemoContext): boolean { return context.state === 'disabled'; }
function group(blocks: readonly Owned[], replay?: () => void): MountedDemo {
  const root = element('div', 'pui-form-section'); root.append(...blocks.map(block => block.element));
  return { element: root, replay, destroy() { for (const block of blocks) block.destroy(); } };
}
function field(context: DemoContext, label: string) {
  return { label, value: sample(context, 'Example value 中文'), density: context.density,
    disabled: disabled(context), description: 'Use Tab and Shift+Tab to check keyboard focus.',
    error: context.state === 'error' ? 'The value could not be saved. Your input is retained.' : '',
    onInput: (value: string) => context.log(`Input: ${value}`) };
}

export const primitiveCases: ShowcaseCase[] = [
  {
    id: 'button', title: '按钮 Button', layer: 'components', category: '操作',
    description: '普通、主要与危险操作。异步操作期间保留 pending，快照更新不会提前启用。',
    states: ['normal', 'loading', 'pending', 'disabled', 'long'], related: ['icon-button', 'actions', 'confirmation'],
    code: `import { createButton } from 'pith-ui';\nconst button = createButton({ label: 'Save', intent: 'primary', onAction: async () => ({ ok: true }) });\ndocument.body.append(button.element);`,
    mount(context) {
      const buttons = (['neutral', 'primary', 'danger'] as const).map(intent => createButton({
        label: sample(context, intent === 'neutral' ? 'Cancel' : intent === 'primary' ? 'Save changes' : 'Delete'),
        intent, density: context.density, disabled: disabled(context), pending: context.state === 'pending' || context.state === 'loading',
        onAction: () => context.action(), onError: message => context.log(message),
      }));
      buttons.push(createButton({ label: sample(context, 'Secondary action'), appearance: 'secondary', density: context.density, disabled: disabled(context), pending: context.state === 'pending' || context.state === 'loading', onAction: () => context.action(), onError: message => context.log(message) }));
      const toolbar = createToolbar({ label: 'Button variants', children: buttons.map(button => button.element) });
      return group([{ ...toolbar, destroy() { toolbar.destroy(); buttons.forEach(button => button.destroy()); } }]);
    },
  },
  {
    id: 'icon-button', title: '图标按钮 Icon button', layer: 'components', category: '操作',
    description: '紧凑操作具有可访问名称，悬停说明与键盘焦点。', states, related: ['button', 'icons'],
    code: `import { createIconButton } from 'pith-ui';\nconst copy = createIconButton({ label: 'Copy message', icon: 'copy', onAction: () => {} });\ndocument.body.append(copy.element);`,
    mount(context) {
      const blocks = ['copy', 'edit', 'trash', 'close'].map(icon => createIconButton({ label: `${icon} action`, icon, title: `${icon} action`, disabled: disabled(context), onAction: () => context.action(), onError: message => context.log(message) }));
      const toolbar = createToolbar({ label: 'Icon actions', children: blocks.map(block => block.element) });
      return group([{ ...toolbar, destroy() { toolbar.destroy(); blocks.forEach(block => block.destroy()); } }]);
    },
  },
  {
    id: 'text-action', title: '文字操作 Text action', layer: 'components', category: '操作',
    description: '较轻的辅助操作仍使用原生 button，不意外提交表单。', states, related: ['button', 'secret-input'],
    code: `import { createTextAction } from 'pith-ui';\nconst change = createTextAction({ label: 'Change', onAction: () => {} });\ndocument.body.append(change.element);`,
    mount(context) { return group([createTextAction({ label: sample(context, 'Change workspace'), disabled: disabled(context), onAction: () => context.action() })]); },
  },
  {
    id: 'text-input', title: '文本输入 Text input', layer: 'components', category: '输入',
    description: '标签、说明、错误与原生输入框。普通 update 不覆盖用户值和选区。', states: inputStates, related: ['form-section', 'text-area'],
    code: `import { createTextInput } from 'pith-ui';\nconst name = createTextInput({ label: 'Name', value: 'My workspace' });\ndocument.body.append(name.element);\nname.update({ label: 'Name', error: 'Please choose another name' });`,
    mount(context) { return group([createTextInput(field(context, 'Workspace name'))]); },
  },
  {
    id: 'number-input', title: '数字输入 Number input', layer: 'components', category: '输入',
    description: '原生 number 约束、步进、键盘和字段错误。', states: inputStates, related: ['text-input'],
    code: `import { createNumberInput } from 'pith-ui';\nconst limit = createNumberInput({ label: 'Maximum tokens', value: '4096', min: 1, step: 1 });\ndocument.body.append(limit.element);`,
    mount(context) { return group([createNumberInput({ ...field(context, 'Maximum tokens'), value: '4096', min: 1, max: 131072, step: 1 })]); },
  },
  {
    id: 'search-input', title: '搜索输入 Search input', layer: 'components', category: '输入',
    description: '使用原生搜索输入，支持清空、键盘和输入回调。', states: inputStates, related: ['collection-state'],
    code: `import { createSearchInput } from 'pith-ui';\nconst search = createSearchInput({ label: 'Search models', placeholder: 'Name or provider', onInput: value => console.log(value) });\ndocument.body.append(search.element);`,
    mount(context) { return group([createSearchInput({ ...field(context, 'Search conversations'), value: '', placeholder: 'Search by name or content' })]); },
  },
  {
    id: 'secret-input', title: '密钥输入 Secret input', layer: 'components', category: '输入',
    description: 'Show/Hide 是 type=button，切换不提交表单、不清空内容，禁用时同步不可操作。', states: inputStates, related: ['text-action', 'form-section'],
    code: `import { createSecretInput } from 'pith-ui';\nconst key = createSecretInput({ label: 'API key', description: 'Leave empty to retain the saved key' });\ndocument.body.append(key.element);`,
    mount(context) { return group([createSecretInput({ ...field(context, 'API key'), value: 'sk-example-for-demonstration-only', description: 'Demonstration value. Empty retains a saved key only when the application implements that policy.' })]); },
  },
  {
    id: 'text-area', title: '多行输入 Text area', layer: 'components', category: '输入',
    description: '长文本、换行、可调整高度；状态更新保留内容与选区。', states: inputStates, related: ['text-edit-dialog'],
    code: `import { createTextArea } from 'pith-ui';\nconst prompt = createTextArea({ label: 'Instructions', value: 'First paragraph\\n\\nSecond paragraph' });\ndocument.body.append(prompt.element);`,
    mount(context) { return group([createTextArea({ ...field(context, 'Instructions'), value: sample(context, '第一段中文。\n\nSecond paragraph with `code` and emoji 🐟.') })]); },
  },
  {
    id: 'select', title: '选择器 Select', layer: 'components', category: '输入',
    description: '单选下拉复用统一浮层、选中状态与键盘导航；多行列表保留原生列表操作。可体验禁用选项、错误与长内容。', states: inputStates, related: ['permission-control', 'model-picker', 'popover'],
    code: `import { createSelect } from 'pith-ui';\nconst provider = createSelect({\n  label: '提供商', value: 'pith',\n  options: [\n    { value: 'pith', label: 'Pith' },\n    { value: 'unavailable', label: '暂不可用', disabled: true },\n    { value: 'example', label: '示例提供商' },\n  ],\n  onChange: value => console.log(value),\n});\ndocument.body.append(provider.element);\n// 多行或多选列表显式使用 size / multiple，保持原生列表交互。\n// 调用 provider.focus() 聚焦实际可操作的选择器。`,
    mount(context) {
      const options = Array.from({ length: context.state === 'long' ? 20 : 6 }, (_, index) => ({ value: String(index), label: sample(context, `Model ${index + 1}`) }));
      const providerOptions = [
        { value: 'pith', label: sample(context, 'Pith') },
        { value: 'unavailable', label: 'Unavailable provider · 暂不可用', disabled: true },
        { value: 'example', label: sample(context, 'Example provider · 示例提供商') },
        ...(context.state === 'long' ? options.map(option => ({ ...option, value: `provider-${option.value}` })) : []),
      ];
      const error = context.state === 'error' ? '演示读取失败；当前选择保留，可以重新选择。' : '';
      return group([createSelect({ label: 'Provider', description: '单选下拉：点击或按 Enter 打开；方向键移动，Enter 确认，Esc 取消。禁用项不可选择。', value: 'pith', options: providerOptions, density: context.density, disabled: disabled(context), error, onChange: value => context.log(`Provider: ${value}`) }),
        createSelect({ label: 'Models (multi-row)', description: '原生多选列表：使用系统键盘与修饰键选择多项。', options, size: 5, multiple: true, disabled: disabled(context), error, onChange: value => context.log(`Model: ${value}`) })]);
    },
  },
  {
    id: 'checkbox', title: '复选框 Checkbox', layer: 'components', category: '输入',
    description: '原生复选框，点击标签与空格切换，说明文字与状态保持关联。', states, related: ['form-section'],
    code: `import { createCheckbox } from 'pith-ui';\nconst images = createCheckbox({ label: 'Accepts image input', checked: true });\ndocument.body.append(images.element);`,
    mount(context) { return group([createCheckbox({ label: sample(context, 'Accepts image input'), description: 'Enable this capability for the model.', checked: true, disabled: disabled(context), onChange: value => context.log(`Images: ${value}`) })]); },
  },
  {
    id: 'icons', title: '图标 Icons', layer: 'components', category: '展示',
    description: '封闭 SVG 注册表、14px 和 18px 两种尺寸；装饰图标与有名称图标分别处理。', states: ['normal'], related: ['icon-button'],
    code: `import { createIcon } from 'pith-ui';\nconst file = createIcon({ name: 'file', label: 'File', size: 'normal' });\ndocument.body.append(file.element);`,
    mount() {
      const blocks = ['chat', 'folder', 'settings', 'file', 'terminal', 'copy', 'edit', 'trash', 'search', 'plug', 'shield', 'branch'].flatMap(name => [createIcon({ name, label: `${name} normal` }), createIcon({ name, label: `${name} small`, size: 'small' })]);
      const toolbar = createToolbar({ label: 'Icon sizes', children: blocks.map(block => block.element) });
      return group([{ ...toolbar, destroy() { blocks.forEach(block => block.destroy()); } }]);
    },
  },
  {
    id: 'status', title: '状态标记 Status', layer: 'components', category: '展示',
    description: '中性、成功、警告与错误色义。状态文字作为文本，不充当动作。', states: ['normal', 'long'], related: ['notice', 'list-row'],
    code: `import { createStatus } from 'pith-ui';\nconst status = createStatus({ label: 'Connected', tone: 'success' });\ndocument.body.append(status.element);`,
    mount(context) { return group((['neutral', 'success', 'warning', 'error'] as const).map(tone => createStatus({ label: sample(context, tone), tone }))); },
  },
  {
    id: 'list-row', title: '列表行 List row', layer: 'components', category: '展示',
    description: '标题、说明、元信息、图标和调用方动作插槽，长路径可换行。', states, related: ['collection-state', 'text-action'],
    code: `import { createListRow } from 'pith-ui';\nconst row = createListRow({ title: 'SKILL.md', description: '/workspace/.pi/skills/example/SKILL.md', icon: 'file', meta: 'Read only' });\ndocument.body.append(row.element);`,
    mount(context) {
      const action = createButton({ label: 'Preview', disabled: disabled(context), onAction: () => context.action() });
      const row = createListRow({ title: 'SKILL.md', description: sample(context, '/workspace/.pi/skills/example/SKILL.md'), icon: 'file', meta: 'Read only', actions: action.element, selected: true });
      return group([{ ...row, destroy() { row.destroy(); action.destroy(); } }]);
    },
  },
  {
    id: 'key-value', title: '键值信息 Key/value', layer: 'components', category: '展示',
    description: '语义化 dl/dt/dd 展示参数、费用或状态摘要，更新保持稳定行。', states: ['normal', 'long'], related: ['divider'],
    code: `import { createKeyValue } from 'pith-ui';\nconst details = createKeyValue({ items: [{ key: 'phase', label: 'Phase', value: 'Running' }] });\ndocument.body.append(details.element);`,
    mount(context) { return group([createKeyValue({ items: [{ key: 'phase', label: 'Phase', value: 'Running' }, { key: 'path', label: 'Path', value: sample(context, '/workspace/project/src/index.ts') }, { key: 'tokens', label: 'Tokens', value: '4,096' }] })]); },
  },
  {
    id: 'divider', title: '分隔线 Divider', layer: 'components', category: '展示',
    description: '有标签与无标签分隔，对比真实间距与边框。', states: ['normal'], related: ['form-section'],
    code: `import { createDivider } from 'pith-ui';\nconst divider = createDivider({ label: 'Advanced' });\ndocument.body.append(divider.element);`,
    mount() { return group([createDivider(), createDivider({ label: 'Advanced settings' })]); },
  },
  {
    id: 'progress', title: '进度 Progress', layer: 'components', category: '展示',
    description: '原生 progress 的确定与不确定状态，名称与数值一起展示。', states: ['normal', 'loading'], related: ['collection-state'],
    code: `import { createProgress } from 'pith-ui';\nconst progress = createProgress({ label: 'Downloading update', value: 42, max: 100 });\ndocument.body.append(progress.element);`,
    mount(context) { return group([createProgress({ label: 'Downloading update (demonstration)', value: context.state === 'loading' ? undefined : 42 })]); },
  },
  {
    id: 'notice', title: '反馈提示 Notice', layer: 'components', category: '反馈',
    description: '提示、成功、警告、错误。警告与错误采用 alert，其他状态使用 status。', states: ['normal', 'error', 'long'], related: ['status', 'collection-state'],
    code: `import { createNotice } from 'pith-ui';\nconst error = createNotice({ message: 'Could not save. Your draft is retained.', tone: 'error' });\ndocument.body.append(error.element);`,
    mount(context) { return group((['info', 'success', 'warning', 'error'] as const).map(tone => createNotice({ message: sample(context, `${tone}: this is demonstration feedback.`), tone }))); },
  },
  {
    id: 'collection-state', title: '集合状态 Collection state', layer: 'components', category: '反馈',
    description: 'ready、loading、empty、error 外壳；请求归调用方，Retry 只触发回调。', states: ['normal', 'loading', 'empty', 'error'], related: ['list-row', 'notice'],
    code: `import { createCollectionState } from 'pith-ui';\nconst list = createCollectionState({ status: 'error', message: 'Could not load resources', onRetry: async () => ({ ok: true }) });\ndocument.body.append(list.element);`,
    mount(context) {
      const row = createListRow({ title: 'Example resource', description: 'Demonstration data', icon: 'file' });
      const collection = createCollectionState({ status: context.state === 'loading' ? 'loading' : context.state === 'empty' ? 'empty' : context.state === 'error' ? 'error' : 'ready', content: row.element,
        onRetry: async () => { const result = await context.action(); if (result.ok) collection.update({ status: 'ready' }); return result; } });
      return group([{ ...collection, destroy() { collection.destroy(); row.destroy(); } }]);
    },
  },
  {
    id: 'dialog', title: '普通弹窗 Dialog', layer: 'components', category: '浮层',
    description: '原生 dialog 的模态、Esc、焦点恢复和可滚动内容，业务内容通过 DOM 插槽传入。', states, related: ['text-edit-dialog', 'confirmation'],
    code: `import { createDialog } from 'pith-ui';\nconst content = document.createElement('p'); content.textContent = 'Dialog content';\nconst dialog = createDialog({ title: 'Details', content });\ndialog.open();`,
    mount(context) {
      const content = element('p', '', sample(context, 'This is real dialog content. Use Tab, Shift+Tab and Escape.'));
      const dialog = createDialog({ title: 'Details', description: 'Demonstration dialog', content });
      const button = createButton({ label: 'Open dialog', disabled: disabled(context), onAction: () => dialog.open() });
      return group([button, dialog], () => dialog.open());
    },
  },
  {
    id: 'text-edit-dialog', title: '文本编辑弹窗 Text edit', layer: 'components', category: '浮层',
    description: '保存失败保留文本，快照保留选区，关闭重开后丢弃旧结果。模拟结果由展厅控制。', states: ['normal', 'error', 'disabled', 'pending', 'long'], related: ['text-area', 'dialog'],
    code: `import { createTextEditDialog } from 'pith-ui';\nconst editor = createTextEditDialog({ title: 'Edit message', onSubmit: async text => ({ ok: true }) });\neditor.open({ value: 'Original message' });`,
    mount(context) {
      const editor = createTextEditDialog({ title: 'Edit message', onSubmit: () => context.action() });
      const open = (): void => {
        editor.open({ value: sample(context, 'First paragraph 中文。\n\nSecond paragraph with emoji 🐟.') });
        editor.update({ title: 'Edit message', note: 'Demonstration only. Failed writes retain the text.', disabled: disabled(context) || context.outcome === 'invalid', pending: context.state === 'pending', error: context.state === 'error' ? 'Previous save failed. Your text is kept.' : '' });
      };
      const button = createButton({ label: 'Edit text', onAction: open });
      return group([button, editor], open);
    },
  },
  {
    id: 'confirmation', title: '危险操作确认 Confirmation', layer: 'components', category: '浮层',
    description: '打开先聚焦 Cancel；危险操作 pending 时禁止重复，关闭后忽略迟到反馈。', states: ['normal', 'error', 'disabled', 'pending', 'long'], related: ['dialog', 'button'],
    code: `import { createConfirmDialog } from 'pith-ui';\nconst confirm = createConfirmDialog({ title: 'Delete resource?', message: 'This permanently removes the resource.', onConfirm: async () => ({ ok: true }) });\nconfirm.open();`,
    mount(context) {
      const confirm = createConfirmDialog({ title: 'Delete resource?', onConfirm: () => context.action() });
      const open = (): void => confirm.open({ title: 'Delete resource?', message: sample(context, 'Remove the selected resource permanently? Demonstration data only.'), disabled: disabled(context), pending: context.state === 'pending', error: context.state === 'error' ? 'Removal failed. Please try again.' : '' });
      return group([createButton({ label: 'Open confirmation', intent: 'danger', onAction: open }), confirm], open);
    },
  },
  {
    id: 'menu', title: '菜单 Menu', layer: 'components', category: '浮层',
    description: '支持上下方向键、Home、End、Esc；跳过禁用项，保留稳定项目。', states, related: ['popover', 'text-action'],
    code: `import { createMenu } from 'pith-ui';\nconst menu = createMenu({ label: 'Actions', items: [{ id: 'rename', label: 'Rename', onAction: () => {} }, { id: 'delete', label: 'Delete', intent: 'danger', onAction: async () => ({ ok: true }) }] });\ndocument.body.append(menu.element);`,
    mount(context) { return group([createMenu({ label: 'Open actions', disabled: disabled(context), items: [{ id: 'rename', label: sample(context, 'Rename workspace'), onAction: () => context.action() }, { id: 'current', label: 'Current workspace', checked: true, onAction: () => context.action() }, { id: 'unavailable', label: 'Unavailable while running', disabled: true, onAction() {} }, { id: 'delete', label: 'Delete workspace', intent: 'danger', onAction: () => context.action() }] })]); },
  },
  {
    id: 'popover', title: '弹出面板 Popover', layer: 'components', category: '浮层',
    description: '非模态局部面板，外部点击与焦点离开关闭，Esc 返回入口。', states, related: ['menu', 'dialog'],
    code: `import { createPopover } from 'pith-ui';\nconst content = document.createElement('p'); content.textContent = 'More details';\nconst popover = createPopover({ label: 'Details', content });\ndocument.body.append(popover.element);`,
    mount(context) {
      const input = createTextInput({ label: 'Panel input', value: sample(context, 'Editable details') });
      const popover = createPopover({ label: 'Open details', content: input.element, disabled: disabled(context) });
      return group([{ ...popover, destroy() { popover.destroy(); input.destroy(); } }], () => popover.open());
    },
  },
  {
    id: 'form-section', title: '表单分组 Form section', layer: 'components', category: '布局',
    description: '标题、说明、字段和操作区，间距集中维护，业务验证归应用。', states: inputStates, related: ['text-input', 'actions'],
    code: `import { createFormSection, createTextInput } from 'pith-ui';\nconst name = createTextInput({ label: 'Name' });\nconst section = createFormSection({ title: 'Connection', description: 'Configure this provider', content: name.element });\ndocument.body.append(section.element);`,
    mount(context) {
      const name = createTextInput(field(context, 'Connection name'));
      const endpoint = createTextInput({ ...field(context, 'Endpoint'), value: 'https://example.test/v1' });
      const content = element('div', 'pui-form-section', name.element, endpoint.element);
      const section = createFormSection({ title: 'Connection', description: sample(context, 'Configure the provider. These fields are demonstration data.'), content });
      return group([{ ...section, destroy() { section.destroy(); name.destroy(); endpoint.destroy(); } }]);
    },
  },
  {
    id: 'actions', title: '操作栏 Actions', layer: 'components', category: '布局',
    description: '开始、结束和两端对齐，窄容器自动换行，保留点击目标。', states, related: ['button', 'form-section'],
    code: `import { createActions, createButton } from 'pith-ui';\nconst cancel = createButton({ label: 'Cancel' });\nconst save = createButton({ label: 'Save', intent: 'primary' });\nconst actions = createActions({ children: [cancel.element, save.element], align: 'end' });\ndocument.body.append(actions.element);`,
    mount(context) {
      const owned: Owned[] = [];
      for (const align of ['start', 'end', 'between'] as const) {
        const cancel = createButton({ label: `Cancel (${align})`, density: context.density, disabled: disabled(context) });
        const save = createButton({ label: sample(context, 'Save changes'), intent: context.intent, density: context.density, disabled: disabled(context), onAction: () => context.action() });
        const actions = createActions({ align, children: [cancel.element, save.element] });
        owned.push({ ...actions, destroy() { actions.destroy(); cancel.destroy(); save.destroy(); } });
      }
      return group(owned);
    },
  },
  {
    id: 'toolbar', title: '工具栏 Toolbar', layer: 'components', category: '布局',
    description: '工具区使用紧凑与普通间距，可在窄容器换行。', states, related: ['icon-button', 'actions'],
    code: `import { createToolbar, createButton } from 'pith-ui';\nconst refresh = createButton({ label: 'Refresh' });\nconst toolbar = createToolbar({ label: 'Resources', children: [refresh.element], density: 'compact' });\ndocument.body.append(toolbar.element);`,
    mount(context) {
      const refresh = createButton({ label: 'Refresh', density: context.density, disabled: disabled(context), onAction: () => context.action() });
      const add = createIconButton({ label: 'Add resource', icon: 'plus', disabled: disabled(context), onAction: () => context.action() });
      const toolbar = createToolbar({ label: 'Resource tools', density: context.density, children: [refresh.element, add.element] });
      return group([{ ...toolbar, destroy() { toolbar.destroy(); refresh.destroy(); add.destroy(); } }]);
    },
  },
  {
    id: 'disclosure', title: '折叠区 Disclosure', layer: 'components', category: '布局',
    description: '原生 details/summary，展开状态不被普通 update 覆盖，保留键盘操作。', states, related: ['scroll-area'],
    code: `import { createDisclosure } from 'pith-ui';\nconst content = document.createElement('p'); content.textContent = 'Tool arguments';\nconst disclosure = createDisclosure({ title: 'Arguments', content });\ndocument.body.append(disclosure.element);`,
    mount(context) {
      const content = element('pre', '', sample(context, '{ "path": "src/index.ts", "mode": "read" }'));
      const disclosure = createDisclosure({ title: 'Tool arguments', description: 'Use Enter or Space to expand', content, disabled: disabled(context), onToggle: open => context.log(`Expanded: ${open}`) });
      return group([disclosure], () => disclosure.setOpen(!disclosure.isOpen()));
    },
  },
  {
    id: 'scroll-area', title: '滚动区域 Scroll area', layer: 'components', category: '布局',
    description: '有名称和键盘入口的局部滚动区，不把长内容挤出窗口。', states: ['normal', 'long'], related: ['disclosure', 'list-row'],
    code: `import { createScrollArea } from 'pith-ui';\nconst content = document.createElement('p'); content.textContent = 'Long content';\nconst area = createScrollArea({ label: 'Output', size: 'small', content });\ndocument.body.append(area.element);`,
    mount(context) {
      const content = element('div'); for (let index = 1; index <= (context.state === 'long' ? 80 : 20); index++) content.append(element('p', '', `Line ${index}: Demonstration output 中文 🐟`));
      return group([createScrollArea({ label: 'Demonstration output', size: 'small', content })]);
    },
  },
];
