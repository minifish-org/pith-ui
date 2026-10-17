import type { DemoContext, MountedDemo, ShowcaseCase } from './types.js';
import { element, uniqueId } from '../../src/dom.js';
import { setAppearance } from '../../src/theme.js';
import { createButton, createCheckbox, createIcon, createKeyValue, createMenu, createSelect, createTextArea, createTextInput, createToolbar } from '../../src/primitives.js';
import { createConversationView } from '../../src/content/conversation-view.js';

type Owned = { destroy(): void };
function exhibit(title: string): HTMLElement {
  const root = element('section', 'pui-demo-foundation'); root.setAttribute('aria-label', title);
  root.style.display = 'grid'; root.style.gap = 'var(--pui-space-lg)';
  return root;
}
function panel(title: string): HTMLElement {
  const root = element('section', 'pui-demo-foundation-panel', element('h3', '', title));
  Object.assign(root.style, { padding: 'var(--pui-space-lg)', border: '1px solid var(--pui-border)', borderRadius: '10px', minWidth: '0' });
  return root;
}
function mounted(root: HTMLElement, owned: readonly Owned[] = [], measure?: () => void): MountedDemo {
  const frame = measure ? requestAnimationFrame(measure) : 0;
  return { element: root, destroy() { cancelAnimationFrame(frame); owned.forEach(block => block.destroy()); root.remove(); } };
}
const mixed = '一致、简洁 · Consistent and simple · 0123456789 · !?，。 /workspace/报告 v1.ts · 🐟';

export const foundationCases: ShowcaseCase[] = [
  {
    id: 'foundation-colors', title: '颜色与语义 Palette', layer: 'foundations', category: '颜色',
    description: '明暗主题并排显示真实变量、色值与文字背景搭配。点击样本在操作日志中查看名称。', states: ['normal'], related: ['status', 'notice', 'button'],
    code: `import { setAppearance } from 'pith-ui';\nsetAppearance(previewRoot, 'dark');\n// Components use --pui-text, --pui-surface, --pui-accent and semantic feedback colors.`,
    mount(context) {
      const root = exhibit('Color foundations'); root.style.gridTemplateColumns = 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))';
      const owned: Owned[] = []; const measurements: Array<() => void> = [];
      const tokens = ['bg-main', 'bg-sidebar', 'surface', 'surface-subtle', 'surface-hover', 'surface-selected', 'surface-input', 'surface-code', 'text', 'muted', 'border', 'accent', 'accent-foreground', 'warning-text', 'warning-surface', 'error-text', 'error-surface', 'diff-add', 'diff-add-bg', 'diff-remove', 'diff-remove-bg', 'overlay'] as const;
      for (const appearance of ['light', 'dark'] as const) {
        const theme = panel(appearance === 'light' ? 'Light / 明亮' : 'Dark / 暗色'); setAppearance(theme, appearance);
        const grid = element('div'); grid.style.display = 'grid'; grid.style.gap = 'var(--pui-space-sm)';
        for (const token of tokens) {
          const label = `--pui-${token}`; const value = element('code'); const swatch = element('span');
          Object.assign(swatch.style, { display: 'inline-block', width: '36px', height: '28px', borderRadius: '5px', background: `var(${label})`, border: '1px solid var(--pui-border-strong)', flexShrink: '0' });
          const action = createButton({ label, onAction: () => context.log(`${appearance} ${label}: ${getComputedStyle(theme).getPropertyValue(label).trim()}`) });
          const row = element('div', 'pui-demo-color-row', swatch, action.element, value);
          Object.assign(row.style, { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--pui-space-sm)' });
          value.style.fontSize = 'var(--pui-text-small)'; owned.push(action); grid.append(row);
          measurements.push(() => { value.textContent = getComputedStyle(theme).getPropertyValue(label).trim(); });
        }
        const primary = createButton({ label: 'Primary action / 主要操作', intent: 'primary' }); owned.push(primary); grid.append(primary.element); theme.append(grid); root.append(theme);
      }
      return mounted(root, owned, () => measurements.forEach(measure => measure()));
    },
  },
  {
    id: 'foundation-typography', title: '字体与排版 Typography', layer: 'foundations', category: '字体与排版',
    description: '固定小 12、中 14、大 16 CSS px，常规 400、强调 600，统一 1.5 倍行高。系统界面字体和等宽代码字体按用途自动使用，不需要选字体。', states: ['normal', 'long'], related: ['text-input', 'text-area', 'conversation-messages'],
    code: `import { createTextInput } from 'pith-ui';\nconst input = createTextInput({ label: 'Name' });\n// The block supplies typography automatically.\n// Small / medium / large: 12 / 14 / 16 CSS px.\n// Regular / strong: 400 / 600. One line-height: 1.5.\n// UI text uses the system font; code uses the system monospace font.`,
    mount(context) {
      const root = exhibit('Typography foundations'); const rows: Array<{ sample: HTMLElement; spec: HTMLElement }> = [];
      const text = context.state === 'long' ? mixed.repeat(4) : mixed;
      const editor = createTextArea({ label: '编辑混排样本 Edit sample', value: text, onInput(value) { rows.forEach(row => { row.sample.textContent = value; }); } });
      root.append(editor.element, element('p', 'pui-muted', '只有两种字体用途。下列 font-family 是浏览器计算的字体栈，不代表每个字形实际采用的字体；中文、emoji 等回退字体不能可靠自动识别。'));
      for (const role of [{label:'系统界面字体',token:'--pui-font-ui'},{label:'等宽代码字体',token:'--pui-font-code'}]) {
        const section=element('section','pui-demo-font-role',element('h3','',role.label));section.setAttribute('aria-label',role.label);
        for (const size of [{label:'小',name:'small',value:12},{label:'中 · 默认',name:'medium',value:14},{label:'大',name:'large',value:16}]) for (const weight of [{label:'常规',name:'regular',value:400},{label:'强调',name:'strong',value:600}]) {
          const row = panel(`${size.label} ${size.value} CSS px · ${weight.label} ${weight.value}`); const sample = element('div', 'pui-demo-type-sample', text); const spec = element('code');
          Object.assign(sample.style, { fontFamily: `var(${role.token})`, fontSize: `var(--pui-text-${size.name})`, fontWeight: `var(--pui-weight-${weight.name})`, lineHeight:'var(--pui-line-height)', overflowWrap: 'anywhere' });
          spec.style.fontSize = 'var(--pui-text-small)'; row.append(sample, spec); rows.push({ sample, spec }); section.append(row);
        }
        root.append(section);
      }
      return mounted(root, [editor], () => rows.forEach(({ sample, spec }) => {
        const style = getComputedStyle(sample); spec.textContent = `计算：${style.fontSize} / ${style.lineHeight} · weight ${style.fontWeight} · spacing ${style.letterSpacing} · ${style.fontFamily}`;
      }));
    },
  },
  {
    id: 'foundation-spacing', title: '间距 Spacing', layer: 'foundations', category: '间距',
    description: '只使用 4、8、12、16、24 CSS px 五档间距。组件按关系自动安排内边距与分组，展厅展示正式规格和当前实测值。', states: ['normal'], related: ['actions', 'form-section', 'toolbar'],
    code: `import { createActions, createButton } from 'pith-ui';\nconst first = createButton({ label: 'Cancel' });\nconst second = createButton({ label: 'Save' });\nconst row = createActions({ children: [first.element, second.element] });\n// The block owns its spacing; no gap or CSS override is needed.`,
    mount() {
      const root = exhibit('Spacing foundations');
      for (const [name,gap] of [['xs',4],['sm',8],['md',12],['lg',16],['xl',24]] as const) {
        const scale = element('div', '', element('code', '', `${gap} CSS px`)); const bar = element('span');
        Object.assign(scale.style, { display: 'grid', gridTemplateColumns: '100px 1fr', alignItems: 'center', gap: 'var(--pui-space-md)' });
        Object.assign(bar.style, { width: `var(--pui-space-${name})`, height: '14px', background: 'var(--pui-accent)' });
        scale.append(bar); root.append(scale);
      }
      const first = createButton({ label: 'Cancel' }); const second = createButton({ label: 'Save', intent: 'primary' });
      const toolbar = createToolbar({ label: 'Spacing example', children: [first.element, second.element] });
      const value = element('output', 'pui-muted');
      root.append(toolbar.element,value);
      return mounted(root, [first, second, toolbar],()=>{value.textContent=`真实工具栏间距：${getComputedStyle(toolbar.element).gap}；由积木自动维护。`;});
    },
  },
  {
    id: 'foundation-sizing', title: '尺寸与密度 Sizes', layer: 'foundations', category: '尺寸与密度',
    description: '展示标准控件与内部紧凑操作的固定尺寸。紧凑样本用于兼容与密集工具区，不是每次使用组件都要选择的样式。', states: ['normal'], related: ['button', 'icon-button', 'select'],
    code: `import { createButton } from 'pith-ui';\nconst action = createButton({ label: 'Save' });\n// Standard presentation is automatic.\n// Compact actions are a retained compatibility/internal composition option,\n// demonstrated here without adding a general style chooser.`,
    mount() {
      const root = exhibit('Size and density foundations'); const owned: Owned[] = []; const measurements: Array<{ node: HTMLElement; output: HTMLElement }> = [];
      for (const density of ['normal', 'compact'] as const) {
        const row = panel(density); const button = createButton({ label: `${density} action`, density, intent: 'primary' }); const input = createTextInput({ label: `${density} input`, value: '中文 Example', density }); const output = element('code');
        row.append(button.element, input.element, output); root.append(row); owned.push(button, input); measurements.push({ node: button.element, output });
      }
      const icons = element('div'); icons.style.display = 'flex'; icons.style.alignItems = 'center'; icons.style.gap = 'var(--pui-space-lg)';
      for (const size of ['small', 'normal'] as const) { const icon = createIcon({ name: 'file', size, label: `${size} file icon` }); const output=element('code');icons.append(element('span', '', icon.element,` ${size} `,output));owned.push(icon);measurements.push({node:icon.element,output}); }
      const multi = createSelect({ label: '多行模型列表 · 5 visible rows', size: 5, options: Array.from({ length: 8 }, (_, index) => ({ value: String(index), label: `Model ${index + 1}` })) });
      root.append(icons, multi.element, element('p', 'pui-muted', 'CSS px 是布局单位。设备像素比由右侧规格面板显示；浏览器缩放请人工确认。')); owned.push(multi);
      return mounted(root, owned, () => measurements.forEach(({ node, output }) => { const rect = node.getBoundingClientRect(); const style = getComputedStyle(node); output.textContent = `实测 ${rect.width.toFixed(1)} × ${rect.height.toFixed(1)} CSS px · padding ${style.padding} · ${style.fontSize} / ${style.lineHeight}`; }));
    },
  },
  {
    id: 'foundation-borders', title: '边框与圆角 Borders', layer: 'foundations', category: '边框与圆角',
    description: '对比 1px 边框、强边框、错误边框以及常用圆角。正常边界与错误反馈保留，获得焦点不额外高亮边框。', states: ['normal'], related: ['foundation-focus', 'text-input'],
    code: `// Components own the border and radius.\n// --pui-border: normal boundary; --pui-border-strong: stronger boundary.\n// --pui-error-border: validation feedback.`,
    mount() {
      const root = exhibit('Border foundations'); root.style.gridTemplateColumns = 'repeat(auto-fit, minmax(150px, 1fr))';
      for (const radius of [4, 7, 8, 10, 14]) for (const border of ['border', 'border-strong', 'error-border']) {
        const box = element('div', '', `${radius}px radius`, element('br'), element('code', '', `1px --pui-${border}`));
        Object.assign(box.style, { border: `1px solid var(--pui-${border})`, borderRadius: `${radius}px`, padding: 'var(--pui-space-lg)', background: 'var(--pui-surface)', minHeight: '84px' }); root.append(box);
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
    description: '点击或用 Tab、Shift+Tab、方向键和空格体验真实焦点与操作。不绘制焦点框、光晕或边框高亮，也不新增背景提示；下方观测文字仅用于展厅检查。', states: ['normal'], related: ['text-input', 'select', 'checkbox', 'menu', 'dialog'],
    code: `import { createTextInput, createCheckbox, createSelect, createMenu } from 'pith-ui';\nconst name = createTextInput({ label: 'Name' });\nconst enable = createCheckbox({ label: 'Enabled' });\nconst choice = createSelect({ label: 'Scope', options: [{ value: 'workspace', label: 'Workspace' }] });\nconst menu = createMenu({ label: 'Actions', items: [{ id: 'open', label: 'Open', onAction: openWorkspace }] });\n// Focus, Tab traversal and keyboard activation remain native.\n// Focus adds no outline, glow or border-color highlight; no replacement background.\n// Existing hover, caret, text selection and business states remain.`,
    mount(context) {
      const root = exhibit('Focus foundations'); const start = createButton({ label: '从这里开始，然后按 Tab' }); const input = createTextInput({ label: '工作区名称', value: 'Example workspace' });
      const checked = createCheckbox({ label: 'Enable connection', checked: true }); const unavailable = createButton({ label: 'Disabled · should be skipped', disabled: true }); const save = createButton({ label: 'Save', intent: 'primary', onAction: () => context.action() });
      const select = createSelect({label:'工作区范围',value:'workspace',options:[{value:'workspace',label:'当前工作区'},{value:'all',label:'全部工作区'},{value:'unavailable',label:'不可用范围',disabled:true}],onChange:value=>context.log(`演示范围：${value}`)});
      const menu = createMenu({label:'操作菜单 · 方向键选择',items:[{id:'open',label:'Open workspace',onAction:()=>context.log('演示打开工作区')},{id:'disabled',label:'Unavailable action',disabled:true,onAction:()=>{}},{id:'copy',label:'Copy path',onAction:()=>context.log('演示复制路径')}]});
      start.element.id = uniqueId('pui-demo-focus-start'); save.element.id = uniqueId('pui-demo-focus-save');
      const status = element('output', 'pui-muted', '展厅观测：点击起点后按 Tab，查看实际焦点；控件不额外绘制焦点框。');
      const abort = new AbortController(); root.addEventListener('focusin', event => { const target = event.target as HTMLElement; const labels = target instanceof HTMLInputElement || target instanceof HTMLSelectElement ? target.labels?.[0]?.textContent : ''; status.textContent = `展厅观测 · 当前焦点：${target.getAttribute('aria-label') || labels || target.textContent?.trim() || target.id || target.tagName}`; }, { signal: abort.signal });
      root.append(element('p','pui-muted','焦点不绘制描边、光晕或改变边框色，不新增替代背景提示。既有导航、菜单的焦点背景和操作显隐保持原样；保留悬停、输入光标、文字选区和选中、错误、权限等状态。下方文字用于观测焦点，并非应用内提示。'),start.element, input.element, select.element, checked.element, unavailable.element, menu.element, save.element, status);
      return mounted(root, [start, input, select, checked, unavailable, menu, save, { destroy: () => abort.abort() }]);
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
