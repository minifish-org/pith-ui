import type { DemoContext, MountedDemo, ShowcaseCase } from './types.js';
import { element, uniqueId } from '../src/dom.js';
import { setAppearance } from '../src/theme.js';
import { createButton, createCheckbox, createIcon, createKeyValue, createSelect, createTextArea, createTextInput, createToolbar } from '../src/primitives.js';
import { createConversationView } from '../src/content/conversation-view.js';

type Owned = { destroy(): void };
function exhibit(title: string): HTMLElement {
  const root = element('section', 'pui-demo-foundation'); root.setAttribute('aria-label', title);
  root.style.display = 'grid'; root.style.gap = '16px';
  return root;
}
function panel(title: string): HTMLElement {
  const root = element('section', 'pui-demo-foundation-panel', element('h3', '', title));
  Object.assign(root.style, { padding: '16px', border: '1px solid var(--pui-border)', borderRadius: '10px', minWidth: '0' });
  return root;
}
function mounted(root: HTMLElement, owned: readonly Owned[] = [], measure?: () => void): MountedDemo {
  const frame = measure ? requestAnimationFrame(measure) : 0;
  return { element: root, destroy() { cancelAnimationFrame(frame); owned.forEach(block => block.destroy()); root.remove(); } };
}
const mixed = '一致、简洁 · Consistent and simple · 0123456789 · !?，。 /workspace/报告 v1.ts · 🐟';
const families = '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export const foundationCases: ShowcaseCase[] = [
  {
    id: 'foundation-colors', title: '颜色与语义 Palette', layer: 'foundations', category: '颜色',
    description: '明暗主题并排显示真实变量、色值与文字背景搭配。点击样本在操作日志中查看名称。', states: ['normal'], related: ['status', 'notice', 'button'],
    code: `import { setAppearance } from 'pith-ui';\nsetAppearance(previewRoot, 'dark');\n// Components use --pui-text, --pui-surface, --pui-accent and semantic feedback colors.`,
    mount(context) {
      const root = exhibit('Color foundations'); root.style.gridTemplateColumns = 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))';
      const owned: Owned[] = []; const measurements: Array<() => void> = [];
      const tokens = ['bg-main', 'bg-sidebar', 'surface', 'surface-subtle', 'surface-hover', 'surface-selected', 'surface-input', 'surface-code', 'text', 'muted', 'border', 'accent', 'accent-foreground', 'warning-text', 'warning-surface', 'error-text', 'error-surface', 'overlay'] as const;
      for (const appearance of ['light', 'dark'] as const) {
        const theme = panel(appearance === 'light' ? 'Light / 明亮' : 'Dark / 暗色'); setAppearance(theme, appearance);
        const grid = element('div'); grid.style.display = 'grid'; grid.style.gap = '8px';
        for (const token of tokens) {
          const label = `--pui-${token}`; const value = element('code'); const swatch = element('span');
          Object.assign(swatch.style, { display: 'inline-block', width: '36px', height: '28px', borderRadius: '5px', background: `var(${label})`, border: '1px solid var(--pui-border-strong)', flexShrink: '0' });
          const action = createButton({ label, density: 'compact', onAction: () => context.log(`${appearance} ${label}: ${getComputedStyle(theme).getPropertyValue(label).trim()}`) });
          const row = element('div', 'pui-demo-color-row', swatch, action.element, value);
          Object.assign(row.style, { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' });
          value.style.fontSize = '11px'; owned.push(action); grid.append(row);
          measurements.push(() => { value.textContent = getComputedStyle(theme).getPropertyValue(label).trim(); });
        }
        const primary = createButton({ label: 'Primary action / 主要操作', intent: 'primary' }); owned.push(primary); grid.append(primary.element); theme.append(grid); root.append(theme);
      }
      return mounted(root, owned, () => measurements.forEach(measure => measure()));
    },
  },
  {
    id: 'foundation-typography', title: '字体与排版 Typography', layer: 'foundations', category: '字体与排版',
    description: '混排样本可编辑，比较系统字体、代码字体、字号、字重、行高和字间距；显示浏览器计算值。实际字形字体无法可靠自动识别。', states: ['normal', 'long'], related: ['text-input', 'text-area', 'conversation-messages'],
    code: `import { createTextInput } from 'pith-ui';\nconst input = createTextInput({ label: 'Name' });\n// Ordinary fields: 13px / 20px. Conversation: 14px / 21px.\n// System font stack; no font files are downloaded.`,
    mount(context) {
      const root = exhibit('Typography foundations'); const rows: Array<{ sample: HTMLElement; spec: HTMLElement }> = [];
      const text = context.state === 'long' ? mixed.repeat(4) : mixed;
      const editor = createTextArea({ label: '编辑混排样本 Edit sample', value: text, onInput(value) { rows.forEach(row => { row.sample.textContent = value; }); } });
      root.append(editor.element, element('p', 'pui-muted', `字体栈：${families}。下列 font-family 是计算后的栈，不代表每个字形实际采用的字体。`));
      for (const size of [11, 12, 13, 14, 18, 20, 24, 36]) for (const weight of size === 13 || size === 14 ? [400, 500, 600] : [400]) {
        const row = panel(`${size}px · weight ${weight}`); const sample = element('div', 'pui-demo-type-sample', text); const spec = element('code');
        Object.assign(sample.style, { fontFamily: families, fontSize: `${size}px`, fontWeight: String(weight), lineHeight: `${size <= 14 ? size === 14 ? 21 : 20 : Math.ceil(size * 1.4)}px`, letterSpacing: '0px', overflowWrap: 'anywhere' });
        spec.style.fontSize = '11px'; row.append(sample, spec); rows.push({ sample, spec }); root.append(row);
      }
      const codeRow = panel('Code / 等宽字体'); const code = element('code', '', 'const path = "/workspace/报告 v1.ts"; // 中文 🐟');
      Object.assign(code.style, { display: 'block', fontSize: '12px', lineHeight: '18px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', overflowWrap: 'anywhere' }); codeRow.append(code); root.append(codeRow);
      return mounted(root, [editor], () => rows.forEach(({ sample, spec }) => {
        const style = getComputedStyle(sample); spec.textContent = `计算：${style.fontSize} / ${style.lineHeight} · weight ${style.fontWeight} · spacing ${style.letterSpacing} · ${style.fontFamily}`;
      }));
    },
  },
  {
    id: 'foundation-spacing', title: '间距 Spacing', layer: 'foundations', category: '间距',
    description: '显示 CSS px 刻度、控件内部间距和真实组件之间的间距，可切换组合样本的 gap。', states: ['normal'], related: ['actions', 'form-section', 'toolbar'],
    code: `import { createActions, createButton } from 'pith-ui';\nconst first = createButton({ label: 'Cancel' });\nconst second = createButton({ label: 'Save' });\nconst row = createActions({ children: [first.element, second.element] });\n// The action row owns its standard 9 CSS px gap.`,
    mount() {
      const root = exhibit('Spacing foundations');
      for (const gap of [0, 4, 6, 8, 9, 12, 16, 20, 24, 32]) {
        const scale = element('div', '', element('code', '', `${gap} CSS px`)); const bar = element('span');
        Object.assign(scale.style, { display: 'grid', gridTemplateColumns: '100px 1fr', alignItems: 'center', gap: '12px' });
        Object.assign(bar.style, { width: `${gap}px`, height: '14px', background: 'var(--pui-accent)', borderInlineStart: gap === 0 ? '1px solid var(--pui-border-strong)' : '0' });
        scale.append(bar); root.append(scale);
      }
      const first = createButton({ label: 'Cancel' }); const second = createButton({ label: 'Save', intent: 'primary' });
      const toolbar = createToolbar({ label: 'Spacing example', children: [first.element, second.element] });
      const value = element('output', '', 'gap: 9 CSS px');
      const select = createSelect({ label: '体验组合间距（仅展厅）', value: '9', options: [6, 9, 12, 16].map(gap => ({ value: String(gap), label: `${gap} CSS px` })), onChange(gap) { toolbar.element.style.gap = `${gap}px`; value.textContent = `gap: ${gap} CSS px`; } });
      root.append(select.element, value, toolbar.element);
      return mounted(root, [first, second, toolbar, select]);
    },
  },
  {
    id: 'foundation-sizing', title: '尺寸与密度 Sizes', layer: 'foundations', category: '尺寸与密度',
    description: '真实普通/紧凑按钮、输入和图标并排对照；多行选择列表单独展示，尺寸以浏览器测量为准。', states: ['normal'], related: ['button', 'icon-button', 'select'],
    code: `import { createButton } from 'pith-ui';\nconst normal = createButton({ label: 'Normal', density: 'normal' });\nconst compact = createButton({ label: 'Compact', density: 'compact' });\n// 40px ordinary controls; 30px compact buttons; 14px / 18px icons.`,
    mount() {
      const root = exhibit('Size and density foundations'); const owned: Owned[] = []; const measurements: Array<{ node: HTMLElement; output: HTMLElement }> = [];
      for (const density of ['normal', 'compact'] as const) {
        const row = panel(density); const button = createButton({ label: `${density} action`, density, intent: 'primary' }); const input = createTextInput({ label: `${density} input`, value: '中文 Example', density }); const output = element('code');
        row.append(button.element, input.element, output); root.append(row); owned.push(button, input); measurements.push({ node: button.element, output });
      }
      const icons = element('div'); icons.style.display = 'flex'; icons.style.alignItems = 'center'; icons.style.gap = '20px';
      for (const size of ['small', 'normal'] as const) { const icon = createIcon({ name: 'file', size, label: `${size} file icon` }); icons.append(element('span', '', icon.element, size === 'small' ? ' 14 × 14 CSS px' : ' 18 × 18 CSS px')); owned.push(icon); }
      const multi = createSelect({ label: '多行模型列表 · 5 visible rows', size: 5, options: Array.from({ length: 8 }, (_, index) => ({ value: String(index), label: `Model ${index + 1}` })) });
      root.append(icons, multi.element, element('p', 'pui-muted', 'CSS px 是布局单位。设备像素比由右侧规格面板显示；浏览器缩放请人工确认。')); owned.push(multi);
      return mounted(root, owned, () => measurements.forEach(({ node, output }) => { const rect = node.getBoundingClientRect(); const style = getComputedStyle(node); output.textContent = `实测 ${rect.width.toFixed(1)} × ${rect.height.toFixed(1)} CSS px · padding ${style.padding} · ${style.fontSize} / ${style.lineHeight}`; }));
    },
  },
  {
    id: 'foundation-borders', title: '边框与圆角 Borders', layer: 'foundations', category: '边框与圆角',
    description: '对比 1px 边框、强边框、错误边框以及常用圆角，明确边界与焦点环是不同层。', states: ['normal'], related: ['foundation-focus', 'text-input'],
    code: `// Components own the border and radius.\n// --pui-border: normal boundary; --pui-border-strong: stronger boundary.\n// --pui-error-border: validation feedback.`,
    mount() {
      const root = exhibit('Border foundations'); root.style.gridTemplateColumns = 'repeat(auto-fit, minmax(150px, 1fr))';
      for (const radius of [4, 7, 8, 10, 14]) for (const border of ['border', 'border-strong', 'error-border']) {
        const box = element('div', '', `${radius}px radius`, element('br'), element('code', '', `1px --pui-${border}`));
        Object.assign(box.style, { border: `1px solid var(--pui-${border})`, borderRadius: `${radius}px`, padding: '16px', background: 'var(--pui-surface)', minHeight: '84px' }); root.append(box);
      }
      return mounted(root);
    },
  },
  {
    id: 'foundation-surfaces', title: '表面、阴影与层次 Surfaces', layer: 'foundations', category: '表面与层次',
    description: '主背景、侧栏、内容面、局部面板和浮层使用真实主题变量，明暗主题可并排体验。', states: ['normal'], related: ['popover', 'dialog', 'foundation-colors'],
    code: `import { setAppearance } from 'pith-ui';\nsetAppearance(root, 'light');\n// --pui-bg-main → --pui-surface → --pui-shadow / --pui-modal-shadow.`,
    mount() {
      const root = exhibit('Surface foundations'); root.style.gridTemplateColumns = 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))';
      for (const appearance of ['light', 'dark'] as const) {
        const theme = panel(appearance); setAppearance(theme, appearance); theme.style.background = 'var(--pui-bg-sidebar)';
        const main = panel('Main · --pui-bg-main'); main.style.background = 'var(--pui-bg-main)';
        const surface = panel('Surface · --pui-surface'); surface.style.background = 'var(--pui-surface)';
        const overlay = panel('Floating surface · --pui-shadow'); overlay.style.boxShadow = 'var(--pui-shadow)'; overlay.append(element('p', 'pui-muted', '同一主题内的内容与浮层，边框仍能辨认。'));
        surface.append(overlay); main.append(surface); theme.append(main); root.append(theme);
      }
      return mounted(root);
    },
  },
  {
    id: 'foundation-focus', title: '焦点与可访问性 Focus', layer: 'foundations', category: '焦点与可访问性',
    description: '请用 Tab、Shift+Tab 和空格体验焦点顺序、可见焦点、禁用项跳过及标签关联。', states: ['normal'], related: ['text-input', 'checkbox', 'menu', 'dialog'],
    code: `import { createTextInput, createCheckbox } from 'pith-ui';\nconst name = createTextInput({ label: 'Name' });\nconst enable = createCheckbox({ label: 'Enabled' });\n// Native labels, disabled semantics and :focus-visible remain intact.`,
    mount(context) {
      const root = exhibit('Focus foundations'); const start = createButton({ label: '从这里开始，然后按 Tab' }); const input = createTextInput({ label: '工作区名称', value: 'Example workspace' });
      const checked = createCheckbox({ label: 'Enable connection', checked: true }); const unavailable = createButton({ label: 'Disabled · should be skipped', disabled: true }); const save = createButton({ label: 'Save', intent: 'primary', onAction: () => context.action() });
      start.element.id = uniqueId('pui-demo-focus-start'); save.element.id = uniqueId('pui-demo-focus-save');
      const status = element('output', 'pui-muted', '点击起点后按 Tab。鼠标与键盘的焦点提示由 :focus-visible 区分。');
      const abort = new AbortController(); root.addEventListener('focusin', event => { const target = event.target as HTMLElement; status.textContent = `焦点：${target.getAttribute('aria-label') || target.id || target.tagName} · ${target.matches(':focus-visible') ? 'focus-visible' : 'pointer focus'}`; }, { signal: abort.signal });
      root.append(start.element, input.element, checked.element, unavailable.element, save.element, status);
      return mounted(root, [start, input, checked, unavailable, save, { destroy: () => abort.abort() }]);
    },
  },
  {
    id: 'foundation-motion', title: '动效与减少动态效果 Motion', layer: 'foundations', category: '动效',
    description: '实际运行 Working 指示器和控件反馈。支持重播、慢放、暂停、连续切换及减少动态效果；这些调速能力仅在展厅。', states: ['normal'], related: ['conversation-messages', 'button', 'disclosure'],
    code: `import { createConversationView } from 'pith-ui';\nconst view = createConversationView();\nview.update({ id: 'demo', messages: [], working: true });\n// Production feedback honors prefers-reduced-motion.`,
    mount(context) {
      const root = exhibit('Motion foundations'); const view = createConversationView(); let working = true; let reduced = false;
      view.update({ id: 'motion-example', messages: [], working });
      const spec = createKeyValue({ items: [{ key: 'buttons', label: 'Button feedback', value: 'CSS transition; inspect current computed duration below' }, { key: 'dots', label: 'Working indicator', value: 'Actual library CSS animation' }, { key: 'reduced', label: 'Reduced motion', value: 'No animation required for understanding the state' }] });
      const observed = element('code');
      function animations(): Animation[] { return view.element.getAnimations({ subtree: true }); }
      function applyReduced(): void { view.element.querySelectorAll<HTMLElement>('*').forEach(node => { if (reduced) node.style.animation = 'none'; else node.style.removeProperty('animation'); }); }
      const replay = (): void => { animations().forEach(animation => { animation.currentTime = 0; animation.play(); }); context.log('重播实际动效'); };
      const replayButton = createButton({ label: 'Replay', onAction: replay }); const slow = createButton({ label: 'Slow ×0.25', onAction() { animations().forEach(animation => { animation.playbackRate = .25; }); } });
      const normal = createButton({ label: 'Normal ×1', onAction() { animations().forEach(animation => { animation.playbackRate = 1; animation.play(); }); } });
      const pause = createButton({ label: 'Pause / resume', onAction() { animations().forEach(animation => { if (animation.playState === 'paused') animation.play(); else animation.pause(); }); } });
      const toggle = createButton({ label: '连续切换 Working', onAction() { working = !working; view.update({ id: 'motion-example', messages: [], working }); applyReduced(); } });
      const reduce = createCheckbox({ label: '模拟减少动态效果（仅本样本）', onChange(value) { reduced = value; applyReduced(); } });
      const toolbar = createToolbar({ label: 'Motion controls', children: [replayButton.element, slow.element, normal.element, pause.element, toggle.element] });
      root.append(spec.element, view.element, toolbar.element, reduce.element, observed);
      const mountedBlock = mounted(root, [view, spec, replayButton, slow, normal, pause, toggle, reduce, toolbar], () => { const style = getComputedStyle(replayButton.element); const dot = view.element.querySelector('i'); observed.textContent = `按钮 transition: ${style.transitionDuration} ${style.transitionTimingFunction} · 指示器 animation: ${dot ? getComputedStyle(dot).animationDuration : 'none'} · OS reduced-motion: ${matchMedia('(prefers-reduced-motion: reduce)').matches}`; });
      return { ...mountedBlock, replay };
    },
  },
];
