import {focusableElements, uniqueId} from '../dom.js';
import {isButtonPart, type ButtonPart} from './button.js';
import type {LayoutPart} from './layout.js';
import {assertOptions, createOwnedPart, isPartAlive, nodeOf, onPartDestroy, replacePartChildren, type Part} from './ownership.js';

declare const frameRole: unique symbol;
export interface FramePart extends LayoutPart {readonly [frameRole]: 'frame';hasModal(): boolean}
export interface SideRailPart extends LayoutPart {readonly [frameRole]: 'rail'}
export interface MainPart extends LayoutPart {readonly [frameRole]: 'main'}
const frames = new WeakSet<Part>(), rails = new WeakSet<Part>(), mains = new WeakSet<Part>();
function layout(options: {children: readonly Part[]}, tag: 'div'|'aside'|'main'|'header', className: string): LayoutPart {
  assertOptions(options, ['children'], 'frame layout');
  if (!Array.isArray(options.children)) throw new TypeError('Frame children must be arrays of Pith UI parts.');
  const node = document.createElement(tag); node.className = className;
  const part = createOwnedPart(node, {replace(children: readonly Part[]) {if (isPartAlive(part)) replacePartChildren(part, children);}}, {children: options.children}); return part;
}
/** Viewport layout only: callers supply every region and dialog as child parts. */
export function createFramePart(options: {children: readonly Part[];titlebar?: 'overlay';onDispose?(): void;onModalChange?(open: boolean): void}): FramePart {
  assertOptions(options, ['children','titlebar','onDispose','onModalChange'], 'frame');
  if (options.titlebar !== undefined && options.titlebar !== 'overlay') throw new TypeError('Unknown frame titlebar mode.');
  if (options.onDispose !== undefined && typeof options.onDispose !== 'function') throw new TypeError('Frame disposal must be a callback.');
  if (options.onModalChange !== undefined && typeof options.onModalChange !== 'function') throw new TypeError('Frame modal change must be a callback.');
  if (!Array.isArray(options.children)) throw new TypeError('Frame children must be arrays of Pith UI parts.');
  const node = document.createElement('div');node.className = 'pui-app pui-viewport-frame';let lastModal = false;
  if (options.titlebar === 'overlay') {
    node.classList.add('pui-titlebar-overlay');
    const titlebar = document.createElement('div');titlebar.className = 'pui-native-titlebar';titlebar.setAttribute('aria-hidden','true');node.append(titlebar);
  }
  const hasModal = () => isPartAlive(part) && !!node.querySelector('dialog[open]');
  const changed = () => {const next = hasModal();if (next !== lastModal) {lastModal = next;options.onModalChange?.(next);}};
  const observer = new MutationObserver(changed);
  const part: FramePart = createOwnedPart<Omit<FramePart,keyof Part|typeof frameRole>>(node,{replace(children: readonly Part[]) {if (isPartAlive(part)) replacePartChildren(part,children);},hasModal},{children: options.children}) as FramePart;
  observer.observe(node,{subtree: true,childList: true,attributes: true,attributeFilter: ['open']});
  frames.add(part);if (options.onDispose) onPartDestroy(part,options.onDispose);
  onPartDestroy(part,() => {observer.disconnect();if (lastModal) {lastModal = false;options.onModalChange?.(false);}});return part;
}
export function createSideRailPart(options: {children: readonly Part[]}): SideRailPart {const part = layout(options, 'aside', 'pui-sidebar') as SideRailPart; nodeOf(part).id = uniqueId('pui-side-rail'); rails.add(part); return part;}
export function createMainPart(options: {children: readonly Part[]}): MainPart {const part = layout(options, 'main', 'pui-main') as MainPart; mains.add(part); return part;}
export function createTopbarPart(options: {children: readonly Part[]}): LayoutPart {return layout(options, 'header', 'pui-topbar');}
/** A trailing header action group. Children remain caller-owned content. */
export function createTopbarActionsPart(options: {children: readonly Part[]}): LayoutPart {return layout(options, 'div', 'pui-conversation-actions');}
export function createRailFooterPart(options: {children: readonly Part[]}): LayoutPart {return layout(options, 'div', 'pui-sidebar-bottom');}

export interface RailHeadingPart extends Part {update(state: {label: string}): void}
export function createRailHeadingPart(options: {label: string; actions: readonly ButtonPart[]}): RailHeadingPart {
  assertOptions(options, ['label', 'actions'], 'rail heading');
  if (typeof options.label !== 'string') throw new TypeError('Rail heading must be text.');
  if (!Array.isArray(options.actions) || options.actions.some(action => !isButtonPart(action))) throw new TypeError('Rail heading actions must be live Pith UI buttons.');
  const node = document.createElement('div'); node.className = 'pui-sidebar-section-label';
  const caption = document.createTextNode(options.label + ' '); node.append(caption);
  const part = createOwnedPart(node, {update(state: {label: string}) {
    assertOptions(state, ['label'], 'rail heading state'); if (typeof state.label !== 'string') throw new TypeError('Rail heading must be text.');
    if (isPartAlive(part) && caption.data !== state.label + ' ') caption.data = state.label + ' ';
  }}, {children: options.actions}); return part;
}

export interface DrawerPart extends Part {setOpen(open: boolean): void; isOpen(): boolean}
/** The native scrim and fixed mobile drawer behavior. References are borrowed;
 * the frame's ordinary child tree owns rail, main, trigger, scrim and dialogs. */
export function createDrawerPart(options: {scope: FramePart; panel: SideRailPart; content: MainPart; trigger: ButtonPart}): DrawerPart {
  assertOptions(options, ['scope', 'panel', 'content', 'trigger'], 'drawer');
  if (!frames.has(options.scope) || !rails.has(options.panel) || !mains.has(options.content) || !isButtonPart(options.trigger)) throw new TypeError('A drawer requires genuine frame, rail, main and button parts.');
  const scope = nodeOf(options.scope), panel = nodeOf(options.panel) as HTMLElement, content = nodeOf(options.content) as HTMLElement, trigger = nodeOf(options.trigger) as HTMLButtonElement;
  const node = document.createElement('div'); node.className = 'pui-sidebar-scrim'; node.setAttribute('aria-hidden', 'true');
  const narrow = matchMedia('(max-width: 720px)'), originalPanelInert = panel.inert, originalContentInert = content.inert;
  const originalControls = trigger.getAttribute('aria-controls'), originalExpanded = trigger.getAttribute('aria-expanded');
  let opened = false, disposed = false, part: DrawerPart;
  const stops: Array<() => void> = [];
  const sync = () => {
    if (disposed) return;
    content.inert = narrow.matches && opened; panel.inert = narrow.matches && !opened;
    trigger.setAttribute('aria-controls', panel.id); trigger.setAttribute('aria-expanded', String(opened)); panel.classList.toggle('pui-open', opened); node.classList.toggle('pui-visible', opened);
  };
  const setOpen = (open: boolean) => {
    if (typeof open !== 'boolean') throw new TypeError('Drawer open state must be boolean.');
    if (disposed || !isPartAlive(part)) return;
    if (open && (!scope.isConnected || !scope.contains(panel) || !scope.contains(content) || !content.contains(trigger))) throw new Error('A drawer must be assembled in its mounted frame before opening.');
    const wasOpen = opened; opened = open;
    if (!open && narrow.matches && panel.contains(document.activeElement)) {content.inert = false; trigger.focus({preventScroll: true});}
    sync(); if (narrow.matches && open && !wasOpen) focusableElements(panel)[0]?.focus({preventScroll: true});
  };
  const breakpoint = () => {
    if (disposed) return;
    if (narrow.matches && !opened && panel.contains(document.activeElement)) {content.inert = false; trigger.focus({preventScroll: true});} sync();
  };
  const keydown = (event: Event) => {
    const key = event as KeyboardEvent;
    if (!narrow.matches || !opened || key.defaultPrevented || scope.querySelector('dialog[open]')) return;
    if (key.key === 'Escape') {key.preventDefault(); key.stopPropagation(); setOpen(false); return;}
    if (key.key !== 'Tab') return;
    const controls = focusableElements(panel), first = controls[0], last = controls.at(-1);
    if (key.shiftKey && document.activeElement === first) {key.preventDefault(); last?.focus();}
    else if (!key.shiftKey && document.activeElement === last) {key.preventDefault(); first?.focus();}
  };
  const toggle = (event: Event) => {if (!trigger.disabled) {event.stopPropagation(); setOpen(!opened);}};
  const dismiss = (event: Event) => {event.stopPropagation(); setOpen(false);};
  const dispose = () => {
    if (disposed) return; disposed = true; opened = false;
    narrow.removeEventListener('change', breakpoint); scope.removeEventListener('keydown', keydown); trigger.removeEventListener('click', toggle); node.removeEventListener('click', dismiss);
    panel.inert = originalPanelInert; content.inert = originalContentInert; panel.classList.remove('pui-open'); node.classList.remove('pui-visible');
    if (originalControls === null) trigger.removeAttribute('aria-controls'); else trigger.setAttribute('aria-controls', originalControls);
    if (originalExpanded === null) trigger.removeAttribute('aria-expanded'); else trigger.setAttribute('aria-expanded', originalExpanded);
    for (const stop of stops.splice(0)) stop();
  };
  part = createOwnedPart<Omit<DrawerPart, keyof Part>>(node, {setOpen, isOpen: () => !disposed && opened}, {dispose});
  narrow.addEventListener('change', breakpoint); scope.addEventListener('keydown', keydown); trigger.addEventListener('click', toggle); node.addEventListener('click', dismiss);
  for (const source of [options.scope, options.panel, options.content, options.trigger]) stops.push(onPartDestroy(source, () => part.destroy()));
  sync(); return part;
}
