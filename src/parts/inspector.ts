import {uniqueId} from '../dom.js';
import {installAnchoredSurface} from '../surface.js';
import {isButtonAvailable, isButtonPart, type ButtonPart} from './button.js';
import type {DialogPart} from './dialog.js';
import {assertOptions, assertUnownedParts, createOwnedPart, isPartAlive, nodeOf, onPartDestroy, replacePartChildren, type Part} from './ownership.js';

export interface InspectorHeadingState {title: string;count: string}
export interface InspectorHeadingPart extends Part {update(state: Readonly<InspectorHeadingState>): void}
const headings = new WeakMap<InspectorHeadingPart,HTMLHeadingElement>();
/** A compact heading with literal count content and a caller-owned action. */
export function createInspectorHeadingPart(options: InspectorHeadingState & {action: ButtonPart}): InspectorHeadingPart {
  assertOptions(options,['title','count','action'],'inspector heading');
  const validate = (state: Readonly<InspectorHeadingState>) => {assertOptions(state,['title','count'],'inspector heading state');if (typeof state.title !== 'string' || typeof state.count !== 'string') throw new TypeError('Inspector headings require title and count text.');};
  validate({title: options.title,count: options.count});
  if (!isButtonPart(options.action)) throw new TypeError('Inspector heading actions must be live Pith UI buttons.');assertUnownedParts([options.action]);
  const node = document.createElement('div');node.className = 'pui-artifacts-heading';
  const title = document.createElement('h2');title.id = uniqueId('pui-inspector-title');const caption = document.createTextNode(''),count = document.createElement('span');title.append(caption,count);
  const titlePart = createOwnedPart(title,{});let part: InspectorHeadingPart;
  try {part = createOwnedPart<Omit<InspectorHeadingPart,keyof Part>>(node,{update(state) {validate(state);if (!isPartAlive(part)) return;const value = `${state.title} `;if (caption.data !== value) caption.data = value;if (count.textContent !== state.count) count.textContent = state.count;}},{children: [titlePart,options.action]});}
  catch (error) {titlePart.destroy();throw error;}
  headings.set(part,title);part.update({title: options.title,count: options.count});return part;
}

export interface InspectorPartOptions {heading: InspectorHeadingPart;children: readonly Part[];relatedDialogs?: readonly DialogPart[]}
export interface InspectorPart extends Part {replace(children: readonly Part[]): void;open(trigger: ButtonPart): void;close(restoreFocus?: boolean): void;isOpen(): boolean}
export interface AnchoredGroupState {hidden?: boolean}
export interface AnchoredGroupOptions extends AnchoredGroupState {trigger: ButtonPart;surface: InspectorPart;onDispose?(): void}
export interface AnchoredGroupPart extends Part {update(state: Readonly<AnchoredGroupState>): void}
const inspectors = new WeakSet<Part>();
const groups = new WeakMap<InspectorPart,{group: AnchoredGroupPart;trigger: ButtonPart}>();

/** One native, nonmodal section. It supplies dismissal and fixed presentation;
 * callers independently compose its heading, status, scroll region and rows. */
export function createInspectorPart(options: InspectorPartOptions): InspectorPart {
  assertOptions(options,['heading','children','relatedDialogs'],'inspector');
  const title = headings.get(options.heading);
  if (!title || !isPartAlive(options.heading)) throw new TypeError('Inspector heading must be a live Pith UI inspector heading.');
  if (!Array.isArray(options.children)) throw new TypeError('Inspector children must be Pith UI parts.');
  if (options.relatedDialogs !== undefined && !Array.isArray(options.relatedDialogs)) throw new TypeError('Related dialogs must be an array of Pith UI dialog parts.');
  const relatedParts = options.relatedDialogs ?? [],related = relatedParts.map(dialog => {const node = nodeOf(dialog);if (!(node instanceof HTMLDialogElement)) throw new TypeError('Related dialogs must be Pith UI dialog parts.');return node;});
  const exclusions: Node[] = [...related];
  assertUnownedParts([options.heading,...options.children]);
  const node = document.createElement('section');node.id = uniqueId('pui-inspector');node.className = 'pui-artifacts-panel';node.hidden = true;node.tabIndex = -1;node.setAttribute('aria-labelledby',title.id);
  let surface: ReturnType<typeof installAnchoredSurface> | undefined;
  const cleanups: (() => void)[] = [];
  const part: InspectorPart = createOwnedPart<Omit<InspectorPart,keyof Part>>(node,{
    replace(children) {if (isPartAlive(part)) replacePartChildren(part,[options.heading,...children]);},
    open(trigger) {
      if (!isButtonPart(trigger)) throw new TypeError('Inspector triggers must be live Pith UI buttons.');if (!isPartAlive(part)) return;
      const pair = groups.get(part);if (!pair || pair.trigger !== trigger) throw new Error('An inspector opens from its composed anchored group trigger.');
      const group = nodeOf(pair.group) as HTMLElement;
      if (!surface) {
        const button = nodeOf(trigger) as HTMLButtonElement;
        exclusions.unshift(group);
        surface = installAnchoredSurface({trigger: button,panel: node,position: false,closeOnFocusOut: true,exclusions,
          canOpen: () => isPartAlive(part) && isPartAlive(pair.group) && !group.hidden && isButtonAvailable(trigger),
          canEscape: () => !node.ownerDocument.querySelector('dialog[open]'),onToggle(open) {if (open) node.focus({preventScroll: true});}});
        cleanups.push(onPartDestroy(trigger,() => {surface?.destroy();surface = undefined;}));
      }
      surface.open();
    },
    close(restoreFocus = false) {if (typeof restoreFocus !== 'boolean') throw new TypeError('Inspector focus restoration must be boolean.');if (isPartAlive(part)) surface?.close(restoreFocus);},isOpen: () => isPartAlive(part) && !!surface?.isOpen(),
  },{children: [options.heading,...options.children],dispose() {surface?.destroy();for (const cleanup of cleanups.splice(0)) cleanup();exclusions.length = 0;}});
  // Related dialogs are borrowed, never transferred or destroyed here.
  relatedParts.forEach((dialog,index) => {const node = related[index]!;cleanups.push(onPartDestroy(dialog,() => {const position = exclusions.indexOf(node);if (position >= 0) exclusions.splice(position,1);}));});
  inspectors.add(part);return part;
}

/** Only the original relative wrapper. Toggling remains caller assembly code. */
export function createAnchoredGroupPart(options: AnchoredGroupOptions): AnchoredGroupPart {
  assertOptions(options,['trigger','surface','hidden','onDispose'],'anchored group');
  const validate = (state: Readonly<AnchoredGroupState>) => {assertOptions(state,['hidden'],'anchored group state');if (state.hidden !== undefined && typeof state.hidden !== 'boolean') throw new TypeError('Anchored hidden state must be boolean.');};
  validate({hidden: options.hidden});
  if (options.onDispose !== undefined && typeof options.onDispose !== 'function') throw new TypeError('Anchored disposal must be a callback.');
  if (!isButtonPart(options.trigger) || !inspectors.has(options.surface) || !isPartAlive(options.surface)) throw new TypeError('Anchored groups require genuine live button and inspector parts.');
  assertUnownedParts([options.trigger,options.surface]);
  const node = document.createElement('div');node.className = 'pui-artifacts-control';
  const part: AnchoredGroupPart = createOwnedPart<Omit<AnchoredGroupPart,keyof Part>>(node,{update(state) {validate(state);if (isPartAlive(part)) {node.hidden = !!state.hidden;if (node.hidden) options.surface.close();}}},{children: [options.trigger,options.surface],dispose() {groups.delete(options.surface);}});
  groups.set(options.surface,{group: part,trigger: options.trigger});
  if (options.onDispose) onPartDestroy(part,options.onDispose);
  const trigger = nodeOf(options.trigger),surface = nodeOf(options.surface);trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',surface.id);
  part.update({hidden: options.hidden});return part;
}
