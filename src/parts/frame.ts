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
  // Mobile keyboards can shrink only the visual viewport. Keep the input and
  // scrollable panels inside it; pinch zoom must retain ordinary browser panning.
  const view = node.ownerDocument.defaultView!,viewport = view.visualViewport;
  const fit = () => {
    const height = viewport?.scale === 1 ? viewport.height : view.innerHeight;
    const top = viewport?.scale === 1 ? viewport.pageTop : 0;
    node.style.setProperty('--pui-viewport-height', `${height}px`);
    node.style.setProperty('--pui-viewport-top', `${top}px`);
    node.style.setProperty('--pui-visual-top', `${viewport?.scale === 1 ? viewport.offsetTop : 0}px`);
  };
  viewport?.addEventListener('resize',fit);viewport?.addEventListener('scroll',fit);view.addEventListener('resize',fit);fit();
  onPartDestroy(part,() => {viewport?.removeEventListener('resize',fit);viewport?.removeEventListener('scroll',fit);view.removeEventListener('resize',fit);});
  frames.add(part);if (options.onDispose) onPartDestroy(part,options.onDispose);
  onPartDestroy(part,() => {observer.disconnect();if (lastModal) {lastModal = false;options.onModalChange?.(false);}});return part;
}
export function createSideRailPart(options: {children: readonly Part[];side?: 'right';label?: string}): SideRailPart {
  assertOptions(options,['children','side','label'],'side rail');
  if (options.side !== undefined && options.side !== 'right') throw new TypeError('Unknown side rail position.');
  if (options.label !== undefined && typeof options.label !== 'string') throw new TypeError('Side rail label must be text.');
  const part = layout({children: options.children},'aside',options.side === 'right' ? 'pui-sidebar pui-tools' : 'pui-sidebar') as SideRailPart;
  nodeOf(part).id = uniqueId('pui-side-rail');if (options.label) nodeOf(part).setAttribute('aria-label',options.label);rails.add(part);return part;
}
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

export interface DrawerPart extends Part {setOpen(open: boolean): void; isOpen(): boolean;closeOverlay(): void}
type DrawerPeer = {overlay(): boolean;closeOverlay(): void};
const drawerPeers = new WeakMap<FramePart,Set<DrawerPeer>>();
/** The native scrim and fixed mobile drawer behavior. References are borrowed;
 * the frame's ordinary child tree owns rail, main, trigger, scrim and dialogs. */
export function createDrawerPart(options: {scope: FramePart; panel: SideRailPart; content: MainPart; trigger: ButtonPart;desktop?: 'collapsible';close?: ButtonPart;onToggle?(open: boolean): void}): DrawerPart {
  assertOptions(options, ['scope', 'panel', 'content', 'trigger','desktop','close','onToggle'], 'drawer');
  if (!frames.has(options.scope) || !rails.has(options.panel) || !mains.has(options.content) || !isButtonPart(options.trigger)) throw new TypeError('A drawer requires genuine frame, rail, main and button parts.');
  if (options.desktop !== undefined && options.desktop !== 'collapsible') throw new TypeError('Unknown desktop drawer behavior.');
  if (options.close && !isButtonPart(options.close) || options.onToggle !== undefined && typeof options.onToggle !== 'function') throw new TypeError('Invalid drawer controls.');
  const scope = nodeOf(options.scope), panel = nodeOf(options.panel) as HTMLElement, content = nodeOf(options.content) as HTMLElement, trigger = nodeOf(options.trigger) as HTMLButtonElement;
  const close = options.close ? nodeOf(options.close) as HTMLButtonElement : undefined;
  const node = document.createElement('div'); node.className = 'pui-sidebar-scrim'; node.setAttribute('aria-hidden', 'true');
  const narrow = matchMedia('(max-width: 720px)'), originalPanelInert = panel.inert, originalContentInert = content.inert;
  const originalControls = trigger.getAttribute('aria-controls'), originalExpanded = trigger.getAttribute('aria-expanded');
  const collapsible = options.desktop === 'collapsible',right = panel.classList.contains('pui-tools');
  let opened = false,desktopOpen = !right,disposed = false,part: DrawerPart;
  const peers = drawerPeers.get(options.scope) ?? new Set<DrawerPeer>();drawerPeers.set(options.scope,peers);
  const peer: DrawerPeer = {overlay: () => !disposed && narrow.matches && opened,closeOverlay};peers.add(peer);
  if (collapsible) trigger.classList.add('pui-sidebar-trigger');
  close?.classList.add('pui-sidebar-close');
  const stops: Array<() => void> = [];
  const isOpen = () => !disposed && (narrow.matches || !collapsible ? opened : desktopOpen);
  const sync = () => {
    if (disposed) return;
    content.inert = [...peers].some(peer => peer.overlay());panel.inert = narrow.matches ? !opened : collapsible && !desktopOpen;
    trigger.setAttribute('aria-controls', panel.id);trigger.setAttribute('aria-expanded', String(isOpen()));
    panel.classList.toggle('pui-open',narrow.matches && opened);node.classList.toggle('pui-visible',narrow.matches && opened);
    panel.classList.toggle('pui-overlay-closed',narrow.matches && !opened);
    panel.classList.toggle('pui-collapsed',collapsible && !narrow.matches && !desktopOpen);
    if (collapsible && !right) scope.classList.toggle('pui-navigation-collapsed',!narrow.matches && !desktopOpen);
  };
  const setOpen = (open: boolean) => {
    if (typeof open !== 'boolean') throw new TypeError('Drawer open state must be boolean.');
    if (disposed || !isPartAlive(part)) return;
    if (open && (!scope.isConnected || !scope.contains(panel) || !scope.contains(content) || !content.contains(trigger))) throw new Error('A drawer must be assembled in its mounted frame before opening.');
    const wasOpen = isOpen(),hadFocus = panel.contains(document.activeElement);
    if (open && narrow.matches) for (const other of peers) if (other !== peer) other.closeOverlay();
    if (narrow.matches || !collapsible) opened = open;else desktopOpen = open;
    sync();
    if (!open && wasOpen && (narrow.matches || hadFocus) && !scope.querySelector('dialog[open]')) trigger.focus({preventScroll: true});
    if (narrow.matches && open && !wasOpen) (close ?? focusableElements(panel)[0])?.focus({preventScroll: true});
    if (wasOpen !== isOpen()) options.onToggle?.(isOpen());
  };
  function closeOverlay(): void {if (narrow.matches) setOpen(false);}
  const breakpoint = () => {
    if (disposed) return;
    const hadFocus = panel.contains(document.activeElement);opened = false;sync();
    if (hadFocus && !isOpen()) trigger.focus({preventScroll: true});
    options.onToggle?.(isOpen());
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
  const toggle = (event: Event) => {if (!trigger.disabled) {event.stopPropagation(); setOpen(!isOpen());}};
  const dismiss = (event: Event) => {event.stopPropagation(); setOpen(false);};
  const dispose = () => {
    if (disposed) return; disposed = true; opened = false;
    peers.delete(peer);if (!peers.size) drawerPeers.delete(options.scope);
    narrow.removeEventListener('change', breakpoint); scope.removeEventListener('keydown', keydown); trigger.removeEventListener('click', toggle); node.removeEventListener('click', dismiss);close?.removeEventListener('click',dismiss);
    panel.inert = originalPanelInert;content.inert = peers.size ? [...peers].some(peer => peer.overlay()) : originalContentInert;
    panel.classList.remove('pui-open','pui-collapsed','pui-overlay-closed');node.classList.remove('pui-visible');trigger.classList.remove('pui-sidebar-trigger');close?.classList.remove('pui-sidebar-close');
    if (collapsible && !right) scope.classList.remove('pui-navigation-collapsed');
    if (originalControls === null) trigger.removeAttribute('aria-controls'); else trigger.setAttribute('aria-controls', originalControls);
    if (originalExpanded === null) trigger.removeAttribute('aria-expanded'); else trigger.setAttribute('aria-expanded', originalExpanded);
    for (const stop of stops.splice(0)) stop();
  };
  part = createOwnedPart<Omit<DrawerPart, keyof Part>>(node, {setOpen,isOpen,closeOverlay}, {dispose});
  narrow.addEventListener('change', breakpoint); scope.addEventListener('keydown', keydown); trigger.addEventListener('click', toggle); node.addEventListener('click', dismiss);
  close?.addEventListener('click',dismiss);
  for (const source of [options.scope, options.panel, options.content, options.trigger,...options.close ? [options.close] : []]) stops.push(onPartDestroy(source, () => part.destroy()));
  sync(); return part;
}
