import '../src/styles.css';
import './showroom.css';
import { createButton, createSearchInput, createSelect, setControlAppearance } from './controls.js';
import { element } from '../src/dom.js';
import { setAppearance } from '../src/theme.js';
import { catalog } from './catalog.js';
import type { DemoContext, DemoState, MountedDemo, Outcome, ShowcaseLayer } from './types.js';
import packageMetadata from '../package.json' with { type: 'json' };

const params = new URLSearchParams(location.search);
const choices = <T extends string>(name: string, values: readonly T[], fallback: T): T => values.includes(params.get(name) as T) ? params.get(name) as T : fallback;
const state = {
  item: catalog.find(item => item.id === params.get('item'))?.id ?? 'button-parts',
  theme: choices('theme', ['light', 'dark', 'system'], 'system'),
  scene: params.get('state') ?? 'normal',
  width: Math.max(280, Math.min(1440, Number(params.get('width')) || 800)),
  outcome: choices<Outcome>('outcome', ['success', 'failure', 'late', 'invalid'], 'success'),
  // Legacy density parameters normalize to the one standard presentation.
  compare: choices('compare', ['none', 'theme', 'size'], 'none'),
  motion: choices('motion', ['normal', 'slow', 'reduced'], 'normal'),
  rulers: params.get('rulers') === '1',
};
if (!catalog.some(item => item.id === state.item)) state.item = catalog[0].id;
const layerNames: Record<ShowcaseLayer, string> = { foundations: '设计基础', components: '基础组件', blocks: '组合积木', pages: '完整界面' };
const sceneNames: Record<string, string> = { normal: '正常', loading: '加载', error: '错误', disabled: '禁用', empty: '空状态', long: '长内容', pending: '提交中', 'local-file-disabled': '本地文件不可用', 'copy-busy': '复制反馈忙碌' };
setAppearance(document.documentElement, state.theme);setControlAppearance(state.theme);
const app = document.getElementById('showroom')!;
const title = element('h1', '', 'Pith UI');
const version = element('span', 'gallery-version', packageMetadata.version);
const subtitle = element('p', '', '经过验证的原生 TypeScript 积木 · 展厅数据均为模拟');
const header = element('header', 'gallery-header', element('div', '', element('div', 'gallery-wordmark', title, version), subtitle));
const theme = createSelect({ label: '主题', value: state.theme, options: [{ value: 'system', label: '跟随系统' }, { value: 'light', label: '明亮' }, { value: 'dark', label: '深色' }], onChange: value => { state.theme = value as typeof state.theme; setAppearance(document.documentElement, state.theme);setControlAppearance(state.theme); render(); } });
header.append(theme.element);
const nav = element('nav', 'gallery-nav'); nav.setAttribute('aria-label', '积木分类');
const search = createSearchInput({ label: '搜索积木', placeholder: '名称、用途、分类…', onInput: () => renderNavigation() });
const navigation = element('div', 'gallery-navigation');
nav.append(search.element, element('p', 'gallery-count', `${catalog.length} 项零件与区域组合`), navigation);
const heading = element('div', 'gallery-heading');
const controls = element('div', 'gallery-controls');
const preview = element('div', 'gallery-preview'); preview.setAttribute('aria-label', '真实交互体验');
const emptyPreview = element('p', 'gallery-destroyed', '实例已销毁。点击“重新创建”恢复体验。');
const eventLog = element('ol', 'gallery-events'); eventLog.setAttribute('aria-label', '交互事件'); eventLog.setAttribute('aria-live', 'polite');
const specBody = element('dl', 'gallery-spec-values');
const specs = element('aside', 'gallery-specs', element('h2', '', '规格与当前测量'), element('p', '', '单位为 CSS px。设备像素比与屏幕物理像素、浏览器缩放不同；浏览器缩放请自行确认。'), specBody);
const chooseTarget = createButton({ label: '选择测量目标', onAction: () => { inspecting = !inspecting; chooseTarget.update({ label: inspecting ? '点击体验区中的元素…' : '选择测量目标' }); } });
specs.insertBefore(chooseTarget.element, specBody);
const related = element('div', 'gallery-related');
const code = element('code'); const codePre = element('pre', 'gallery-code', code);
const docs = element('section', 'gallery-docs', element('h2', '', '使用示例'), element('p', '', '示例展示公开 API。请求、目标校验、草稿、凭证和原生能力由应用提供。'), codePre, element('h3', '', '关联积木'), related);
const actions = element('div', 'gallery-live-actions');
const replay = createButton({ label: '重播 / 重新创建', onAction: () => { if (mounted[0]?.replay) mounted.forEach(item => item.replay?.()); else mountPreview(); applyMotion(); } });
const destroy = createButton({ label: '销毁实例', onAction: () => { disposePreview(); preview.replaceChildren(emptyPreview); measure(); } });
const rulerButton = createButton({ label: '显示标尺', onAction: () => { state.rulers = !state.rulers; updateURL(); mountPreview(); } });
const share = createButton({ label: '复制体验链接', onAction: async () => { await navigator.clipboard.writeText(location.href); log('已复制当前场景链接'); return { ok: true }; }, onError: message => log(message) });
actions.append(replay.element, destroy.element, rulerButton.element, share.element);
const experience = element('section', 'gallery-experience', heading, controls, actions, preview, element('details', 'gallery-event-details', element('summary', '', '交互事件（临时）'), eventLog), docs);
const main = element('main', 'gallery-main', experience, specs);
app.append(header, element('div', 'gallery-layout', nav, main));
let mounted: MountedDemo[] = [];
let navigationButtons: ReturnType<typeof createButton>[] = [];
let controlBlocks: { destroy(): void }[] = [];
let epoch = 0;
let observing: ResizeObserver | undefined;
let target: HTMLElement | undefined;
let inspecting = false;
let inspectedActivation = false;
let measuring = false;
function log(message: string): void {
  const entry = element('li', '', message); eventLog.prepend(entry);
  while (eventLog.children.length > 12) eventLog.lastElementChild?.remove();
}
function updateURL(): void {
  const next = new URLSearchParams({ item: state.item, theme: state.theme, state: state.scene, width: String(state.width), outcome: state.outcome, compare: state.compare, motion: state.motion });
  if (state.rulers) next.set('rulers', '1');
  history.replaceState(null, '', `${location.pathname}?${next}`);
}
function renderNavigation(): void {
  navigationButtons.forEach(button => button.destroy()); navigationButtons = [];
  navigation.replaceChildren();
  const query = search.getValue().trim().toLocaleLowerCase();
  for (const layer of Object.keys(layerNames) as ShowcaseLayer[]) {
    const items = catalog.filter(item => item.layer === layer && `${item.id} ${item.title} ${item.description} ${item.category}`.toLocaleLowerCase().includes(query));
    if (!items.length) continue;
    const group = element('section', 'gallery-nav-layer', element('h2', '', layerNames[layer]));
    for (const category of new Set(items.map(item => item.category))) {
      group.append(element('h3', '', category));
      for (const item of items.filter(item => item.category === category)) {
        const button = createButton({ label: item.title, onAction: () => { state.item = item.id; state.scene = 'normal'; render(); } });
        button.element.dataset.item = item.id;
        if (item.id === state.item) button.element.setAttribute('aria-current', 'page');
        group.append(button.element); navigationButtons.push(button);
      }
    }
    navigation.append(group);
  }
  if (!navigation.children.length) navigation.append(element('p', '', '没有找到匹配的积木。'));
}
function renderControls(): void {
  controlBlocks.forEach(block => block.destroy()); controlBlocks = []; controls.replaceChildren();
  const selected = catalog.find(item => item.id === state.item)!;
  const states = selected.states ?? ['normal'];
  if (!states.includes(state.scene as DemoState)) state.scene = states[0];
  function select(label: string, value: string, values: readonly {value: string; label: string}[], change: (value: string) => void): void {
    const input = createSelect({ label, value, options: values, onChange: value => { change(value); updateURL(); mountPreview(); } });
    controls.append(input.element); controlBlocks.push(input);
  }
  select('合法状态', state.scene, states.map(value => ({ value, label: sceneNames[value] })), value => { state.scene = value; });
  select('容器宽度', String(state.width), [...new Set([320, 600, 800, 900, 1280, 1440, state.width])].sort((a,b) => a-b).map(value => ({ value: String(value), label: `${value} CSS px` })), value => { state.width = Number(value); });
  select('并排比较', state.compare, [{value:'none',label:'单项体验'}, {value:'theme',label:'明亮 / 深色'}, {value:'size',label:'320 / 800 CSS px'}], value => { state.compare = value as typeof state.compare; });
  if (selected.controls?.includes('outcome')) select('模拟异步结果', state.outcome, [{value:'success',label:'成功 · 600ms'}, {value:'failure',label:'失败 · 保留输入'}, {value:'late',label:'迟到 · 5秒'}, {value:'invalid',label:'目标失效'}], value => { state.outcome = value as Outcome; });
  select('动效体验', state.motion, [{value:'normal',label:'正常速度'}, {value:'slow',label:'慢放 ×0.2'}, {value:'reduced',label:'减少动态效果'}], value => { state.motion = value as typeof state.motion; });
}
function disposePreview(): void {
  epoch++; observing?.disconnect(); observing = undefined;
  mounted.forEach(item => item.destroy()); mounted = []; target = undefined;
}
function applyMotion(): void {
  preview.classList.toggle('gallery-reduced-motion', state.motion === 'reduced');
  for (const animation of preview.getAnimations({ subtree: true })) animation.playbackRate = state.motion === 'slow' ? 0.2 : 1;
}
function mountPreview(): void {
  disposePreview(); preview.replaceChildren();
  const selected = catalog.find(item => item.id === state.item)!;
  const generation = epoch;
  const variants = state.compare === 'theme' ? [{theme:'light',width:state.width,label:'明亮'}, {theme:'dark',width:state.width,label:'深色'}] : state.compare === 'size' ? [{theme:state.theme,width:320,label:'320 CSS px'}, {theme:state.theme,width:800,label:'800 CSS px'}] : [{theme:state.theme,width:state.width,label:`${state.width} CSS px`}];
  for (const variant of variants) {
    const canvas = element('div', 'pui gallery-canvas'); setAppearance(canvas, variant.theme as typeof state.theme);
    canvas.style.width = `${variant.width}px`; canvas.style.maxWidth = '100%';
    const host = element('div', 'gallery-demo-host'); canvas.append(host);
    const context: DemoContext = { host, state: state.scene as DemoState, intent: 'primary', outcome: state.outcome,
      log: message => { if (generation === epoch) { log(message); queueMeasure(); } },
      action: async () => {
        const outcome = state.outcome;
        log(`模拟提交：${outcome === 'late' ? '5 秒后返回，可现在关闭或销毁' : outcome}`);
        await new Promise(resolve => setTimeout(resolve, outcome === 'late' ? 5000 : 600));
        if (generation === epoch) log(`模拟结果：${outcome === 'success' || outcome === 'late' ? '成功' : '失败'}`);
        return outcome === 'success' || outcome === 'late' ? {ok:true} : {ok:false,error:outcome === 'invalid' ? '演示目标已失效；请重新打开，输入保留。' : '演示保存失败，输入保留。'};
      },
    };
    const demo = selected.mount(context); mounted.push(demo); host.append(demo.element);
    const frame = element('div', 'gallery-frame', element('div', 'gallery-frame-label', `目标宽度 ${variant.label} · 受可用空间约束 · 模拟数据`), canvas);
    if (state.rulers) frame.classList.add('gallery-rulers');
    preview.append(frame);
  }
  rulerButton.update({label:state.rulers ? '隐藏标尺' : '显示标尺'});
  target = Array.from(preview.querySelectorAll<HTMLElement>('button,input,textarea,select,[data-measure]')).find(node =>
    !node.closest('[hidden],[aria-hidden="true"]') && node.getClientRects().length > 0 && getComputedStyle(node).visibility === 'visible')
    ?? preview.querySelector<HTMLElement>('.gallery-demo-host > *') ?? undefined;
  observing = new ResizeObserver(queueMeasure); if (target) observing.observe(target); observing.observe(preview);
  applyMotion(); queueMeasure(); updateURL();
}
function queueMeasure(): void { if (measuring) return; measuring = true; requestAnimationFrame(() => { measuring = false; measure(); }); }
function measure(): void {
  specBody.replaceChildren();
  preview.querySelectorAll('.gallery-ruler-layer').forEach(node => node.remove());
  if (!target?.isConnected) { specBody.append(element('dd', '', '当前没有可测量实例。')); return; }
  const rect = target.getBoundingClientRect(), css = getComputedStyle(target);
  const container = target.closest('.gallery-canvas')?.getBoundingClientRect();
  if (state.rulers && container) {
    const canvas = target.closest<HTMLElement>('.gallery-canvas')!;
    const layer = element('div', 'gallery-ruler-layer');
    const box = element('div', 'gallery-measure-box');
    Object.assign(box.style, {left:`${rect.left-container.left}px`,top:`${rect.top-container.top}px`,width:`${rect.width}px`,height:`${rect.height}px`});
    const label=element('span','gallery-measure-label',`${rect.width.toFixed(1)} × ${rect.height.toFixed(1)} CSS px · padding ${css.padding}`);
    box.append(label);
    for (const side of ['top','right','bottom','left'] as const) {
      const value=Number.parseFloat(css.getPropertyValue(`padding-${side}`)); if (!value) continue;
      const padding=element('div',`gallery-padding gallery-padding-${side}`);
      Object.assign(padding.style,side==='top'||side==='bottom'?{height:`${value}px`,left:'0',right:'0',[side]:'0'}:{width:`${value}px`,top:'0',bottom:'0',[side]:'0'});
      box.append(padding);
    }
    if (css.gap!=='normal') label.textContent+=` · gap ${css.gap}`;
    layer.append(box);canvas.append(layer);
  }
  const values: [string,string][] = [
    ['目标', `${target.tagName.toLowerCase()}${target.className ? `.${String(target.className).trim().split(/\s+/).join('.')}` : ''}`],
    ['实测宽 × 高', `${rect.width.toFixed(2)} × ${rect.height.toFixed(2)} CSS px`],
    ['容器宽 × 高', `${container?.width.toFixed(2)} × ${container?.height.toFixed(2)} CSS px`],
    ['最小 / 最大宽', `${css.minWidth} / ${css.maxWidth}`], ['最小 / 最大高', `${css.minHeight} / ${css.maxHeight}`],
    ['内边距 上右下左', `${css.paddingTop} ${css.paddingRight} ${css.paddingBottom} ${css.paddingLeft}`],
    ['外边距 上右下左', `${css.marginTop} ${css.marginRight} ${css.marginBottom} ${css.marginLeft}`],
    ['布局间距', `${css.rowGap} / ${css.columnGap}`], ['边框', `${css.borderTopWidth} ${css.borderTopStyle} ${css.borderTopColor}`],
    ['圆角', css.borderRadius], ['字体栈', css.fontFamily], ['实际字形字体', '未检测：浏览器通用 API 无法可靠识别每个字形的回退字体。'],
    ['字号 / 行高', `${css.fontSize} / ${css.lineHeight}`], ['字重 / 字间距', `${css.fontWeight} / ${css.letterSpacing}`],
    ['实测文本颜色', css.color], ['实测背景颜色', css.backgroundColor], ['透明度', css.opacity], ['阴影', css.boxShadow],
    ['--pui-accent', css.getPropertyValue('--pui-accent').trim()], ['--pui-control-height', css.getPropertyValue('--pui-control-height').trim()],
    ['设备像素比 DPR', String(devicePixelRatio)], ['动效', state.motion === 'slow' ? '展厅慢放 0.2×，不进入应用包' : state.motion === 'reduced' ? '展厅减少动态效果' : '系统偏好 + 正常速度'],
  ];
  for (const [name,value] of values) specBody.append(element('dt','',name),element('dd','',value));
}
function render(): void {
  const selected = catalog.find(item => item.id === state.item)!;
  heading.replaceChildren(element('p', 'gallery-breadcrumb', `${layerNames[selected.layer]} / ${selected.category} / ${selected.id}`), element('h2', '', selected.title), element('p', '', selected.description));
  code.textContent = selected.code;
  related.replaceChildren();
  const parents = catalog.filter(item => item.related?.includes(selected.id));
  for (const item of [...new Set([...(selected.related ?? []), ...parents.map(item => item.id)])].map(id => catalog.find(item => item.id === id)).filter(item => !!item)) {
    const link = element('a', '', `${item.title} · ${layerNames[item.layer]}`); link.href = `?item=${encodeURIComponent(item.id)}&theme=${state.theme}`; related.append(link);
  }
  if (!related.children.length) related.append(element('p', '', '可在左侧分类中继续查找。'));
  renderControls(); renderNavigation(); mountPreview();
}
function inspectTarget(event: Event): boolean {
  const node = event.target instanceof HTMLElement ? event.target : event.target instanceof Element ? event.target.parentElement : null;
  if (!inspecting || !node?.closest('.gallery-demo-host')) return false;
  event.preventDefault(); event.stopImmediatePropagation();
  if (target) observing?.unobserve(target);
  target = node; observing?.observe(target); inspecting = false;
  chooseTarget.update({label:'选择测量目标'}); measure();
  return true;
}
preview.addEventListener('pointerdown', event => {
  inspectedActivation = inspectTarget(event);
}, true);
preview.addEventListener('click', event => {
  // Prevent the complete activation, including the click after pointerdown.
  // Keyboard-generated clicks select a measurement target through the same path.
  if (inspectedActivation) {inspectedActivation=false;event.preventDefault();event.stopImmediatePropagation();}
  else inspectTarget(event);
}, true);
preview.addEventListener('transitionrun', applyMotion);
preview.addEventListener('animationstart', applyMotion);
preview.addEventListener('input', queueMeasure);
preview.addEventListener('click', queueMeasure);
window.addEventListener('resize', queueMeasure);
window.addEventListener('pagehide', () => { disposePreview(); search.destroy(); theme.destroy(); navigationButtons.forEach(button => button.destroy()); controlBlocks.forEach(block => block.destroy()); [replay,destroy,rulerButton,share,chooseTarget].forEach(button => button.destroy()); }, {once:true});
render();
