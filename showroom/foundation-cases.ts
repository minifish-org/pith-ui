import { mount, createStack, createText, createButton, createTextInput, createNotice, createToolbar, createKeyValue, createCheckbox, createSelect, createMenu, createPopover } from '../src/index.js';
import type { Control } from '../src/index.js';
import type { ShowcaseCase, DemoContext, MountedDemo } from './types.js';
function sample(context: DemoContext, children: Control[], tokens: readonly string[]): MountedDemo {
    const element = document.createElement('div');
    const specs = createKeyValue({ items: tokens.map(key => ({ key, label: key, value: 'Measuring…' })) });
    const owner = mount(element, createStack({ children: [...children, specs] }));
    const frame = requestAnimationFrame(() => { const style = getComputedStyle(element); specs.update({ items: tokens.map(key => ({ key, label: key, value: style.getPropertyValue(key).trim() || 'Defined by component' })) }); });
    return { element, destroy() { cancelAnimationFrame(frame); owner.destroy(); } };
}
const code = `import {mount,createStack,createText,createButton} from 'pith-ui';
import 'pith-ui/styles.css';
const host=document.getElementById('app');
if(!(host instanceof HTMLElement))throw new Error('Missing mount');
mount(host,createStack({children:[createText({role:'heading',text:'Fixed design rules'}),createText({text:'中文 English 012345，标点 /workspace/file.ts 🐟'}),createButton({label:'Action'})]}));`;
const tokens: Record<string, readonly string[]> = {
    colors: ['bg-main', 'bg-sidebar', 'surface', 'surface-subtle', 'surface-hover', 'surface-selected', 'surface-input', 'surface-code', 'text', 'muted', 'border', 'accent', 'accent-foreground', 'warning-text', 'warning-surface', 'error-text', 'error-surface', 'diff-add', 'diff-add-bg', 'diff-remove', 'diff-remove-bg', 'overlay'],
    typography: ['font-ui', 'font-code', 'text-small', 'text-medium', 'text-large', 'weight-regular', 'weight-strong', 'line-height'],
    spacing: ['space-xs', 'space-sm', 'space-md', 'space-lg', 'space-xl'],
    sizing: ['control-height'], borders: ['border', 'border-strong', 'error-border'], surfaces: ['bg-main', 'bg-sidebar', 'surface', 'shadow', 'modal-shadow'], focus: [], motion: [],
};
const rules = [
    ['colors', '颜色与语义 Palette', '颜色', '现有明暗配色，按普通、主要、危险、成功和错误等语义使用。'],
    ['typography', '字体与排版 Typography', '字体与排版', '系统界面和等宽代码两种用途；字号 12/14/16 CSS px，字重 400/600，行高 1.5。'],
    ['spacing', '间距 Spacing', '间距', '4、8、12、16、24 CSS px，由积木根据结构自动安排。'],
    ['sizing', '控件尺寸 Sizes', '尺寸', '控件采用库内固定尺寸，使用时不选择密度或像素。'],
    ['borders', '边框与圆角 Borders', '边框与圆角', '边框、圆角由积木固定管理，不提供覆盖参数。'],
    ['surfaces', '表面与层次 Surfaces', '表面与层次', '表面和层次按积木用途统一管理。'],
    ['focus', '焦点与可访问性 Focus', '焦点与可访问性', '不绘制焦点框、光晕或焦点边框高亮；保留原生光标、文字选区及既有状态。'],
    ['motion', '动效与减少动态效果 Motion', '动效', '保留必要反馈，遵循减少动态效果；慢放仅用于展厅。'],
] as const;
export const foundationCases: ShowcaseCase[] = rules.map(([id, title, category, description]) => ({ id: 'foundation-' + id, title, category, description, layer: 'foundations', entry: 'pith-ui', states: ['normal', 'long'], code, related: ['text', 'button', 'text-input', 'toolbar'], mount(context) {
        const text = context.state === 'long' ? '中文 English 012345，标点 /workspace/file.ts 🐟 '.repeat(8) : '中文 English 012345，标点 /workspace/file.ts 🐟';
        const children: Control[] = [createText({ role: 'heading', text: title }), createText({ text: description }), createText({ text }), createText({ role: 'description', text: '说明文字 · supporting information' }), createText({ role: 'code', text: '/workspace/src/index.ts' })];
        if (id === 'typography')
            children.push(createKeyValue({ items: [{ key: 'font', label: '字体用途', value: 'System UI / monospace' }, { key: 'sizes', label: '字号 CSS px', value: '12 / 14 / 16' }, { key: 'weights', label: '字重', value: '400 / 600' }, { key: 'line', label: '默认行高', value: '1.5' }] }));
        if (id === 'spacing')
            children.push(createKeyValue({ items: [4, 8, 12, 16, 24].map(value => ({ key: String(value), label: '间距 CSS px', value: String(value) })) }));
        children.push(createTextInput({ label: 'Example input', value: '保持光标与选区' }), createToolbar({ label: 'Actions', children: [createButton({ label: 'Cancel' }), createButton({ label: 'Save', intent: 'primary', onAction: () => context.action() }), createButton({ label: 'Remove', intent: 'danger' })] }));
        if (id === 'colors' || id === 'surfaces')
            children.push(...(['info', 'success', 'warning', 'error'] as const).map(tone => createNotice({ tone, message: tone + ' · 语义反馈' })));
        if (id === 'typography')
            children.push(createText({ role: 'description', text: '上表 font-family 是计算字体栈；中文和 emoji 实际字形的回退字体无法可靠自动识别。字号、间距使用 CSS px；设备像素比见右侧测量，浏览器缩放请人工确认。' }));
        if (id === 'borders')
            children.push(createTextInput({ label: 'Validation boundary', error: 'Existing error state is retained.' }));
        if (id === 'focus')
            children.push(createCheckbox({ label: 'Enabled', checked: true }), createSelect({ label: 'Scope', options: [{ value: 'one', label: 'Current' }, { value: 'all', label: 'All' }] }), createMenu({ label: 'Actions', items: [{ id: 'open', label: 'Open', onAction: () => context.action() }] }));
        if (id === 'surfaces')
            children.push(createPopover({ label: 'Inspect floating surface', content: createText({ text: 'The same public popover owns its border, surface and shadow.' }) }));
        return sample(context, children, (tokens[id] ?? []).map(name => '--pui-' + name));
    } }));
