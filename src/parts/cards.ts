import {uniqueId} from '../dom.js';
import type {LayoutPart} from './layout.js';
import {assertOptions, assertUnownedParts, createOwnedPart, isPartAlive, onPartDestroy, replacePartChildren, type Part} from './ownership.js';

export type ContentSectionTone = 'standard' | 'warning';
export interface ContentSectionPartState {title?: string; tone?: ContentSectionTone; hidden?: boolean}
export interface ContentSectionPart extends LayoutPart {update(state: Readonly<ContentSectionPartState>): void}
function validateSection(state: Readonly<ContentSectionPartState>): void {
  if (state.title !== undefined && typeof state.title !== 'string') throw new TypeError('Content section title must be text.');
  if (state.tone !== undefined && !['standard', 'warning'].includes(state.tone)) throw new TypeError('Unknown content section tone.');
  if (state.hidden !== undefined && typeof state.hidden !== 'boolean') throw new TypeError('Content section hidden must be boolean.');
}
/** A content section with a native heading and the library's fixed vertical rhythm. */
export function createContentSectionPart(options: ContentSectionPartState & {children: readonly Part[]}): ContentSectionPart {
  assertOptions(options, ['title', 'tone', 'hidden', 'children'], 'content section'); validateSection(options);
  if (!Array.isArray(options.children)) throw new TypeError('Content section children must be Pith UI parts.');
  const node = document.createElement('section');
  let children = [...options.children], heading: HTMLHeadingElement | undefined, headingPart: Part | undefined, part: ContentSectionPart;
  const makeHeading = (title: string) => {
    heading = document.createElement('h3'); heading.id = uniqueId('pui-content-section'); heading.textContent = title;
    headingPart = createOwnedPart(heading, {}); node.setAttribute('aria-labelledby', heading.id);
  };
  if (options.title !== undefined) makeHeading(options.title);
  const update = (state: Readonly<ContentSectionPartState>) => {
    assertOptions(state, ['title', 'tone', 'hidden'], 'content section state'); validateSection(state); if (!isPartAlive(part)) return;
    node.className = `pui-resource-section${state.tone === 'warning' ? ' pui-resource-diagnostics' : ''}`; node.hidden = !!state.hidden;
    if (state.title !== undefined) {
      if (!heading) {makeHeading(state.title); children = children.filter(isPartAlive); replacePartChildren(part, [headingPart!, ...children]);}
      else if (heading.textContent !== state.title) heading.textContent = state.title;
    }
  };
  try {part = createOwnedPart<Omit<ContentSectionPart, keyof Part>>(node, {update, replace(next: readonly Part[]) {
    if (!Array.isArray(next)) throw new TypeError('Content section children must be Pith UI parts.');
    replacePartChildren(part, headingPart ? [headingPart, ...next] : next); children = [...next];
  }}, {children: headingPart ? [headingPart, ...children] : children});}
  catch (error) {headingPart?.destroy(); throw error;}
  update({tone: options.tone, hidden: options.hidden}); return part;
}

export interface CardPart extends LayoutPart {}
export interface CardBodyPart extends LayoutPart {}
export interface CompactActionsPart extends LayoutPart {}
function container(options: {children: readonly Part[]}, tag: 'article' | 'div', className: string): LayoutPart {
  assertOptions(options, ['children'], 'card container');
  if (!Array.isArray(options.children)) throw new TypeError('Card children must be arrays of Pith UI parts.');
  const node = document.createElement(tag); node.className = className;
  const part = createOwnedPart(node, {replace(children: readonly Part[]) {replacePartChildren(part, children);}}, {children: options.children});
  return part;
}
/** One native card. Icons, text, and actions are composed as direct children. */
export function createCardPart(options: {children: readonly Part[];purpose?: 'row' | 'stacked'}): CardPart {
  assertOptions(options,['children','purpose'],'card');
  if (options.purpose !== undefined && !['row','stacked'].includes(options.purpose)) throw new TypeError('Unknown card purpose.');
  return container({children: options.children}, 'article', options.purpose === 'stacked' ? 'pui-connection-card' : 'pui-file-card');
}
/** A wrapping summary row. Callers compose their own text, status and actions. */
export function createCardHeadingPart(options: {children: readonly Part[]}): LayoutPart {return container(options,'div','pui-connection-card-heading');}
/** Flexible card information. It supplies no implicit text, icon or action. */
export function createCardBodyPart(options: {children: readonly Part[]}): CardBodyPart {return container(options, 'div', 'pui-file-info');}
/** A compact action row with fixed button sizes and natural wrapping. */
export function createCompactActionsPart(options: {children: readonly Part[]}): CompactActionsPart {return container(options, 'div', 'pui-file-actions');}

export interface GroupedCardPart extends LayoutPart {replaceSummary(children: readonly Part[]): void}
/** A card with a summary row and following composed content. The single
 * intrinsic summary container is the existing native card structure. */
export function createGroupedCardPart(options: {summary: readonly Part[]; children: readonly Part[]}): GroupedCardPart {
  assertOptions(options, ['summary', 'children'], 'grouped card');
  if (!Array.isArray(options.summary) || !Array.isArray(options.children)) throw new TypeError('Grouped card slots must be arrays of Pith UI parts.');
  const summary = [...options.summary], children = [...options.children]; assertUnownedParts([...summary, ...children]);
  const node = document.createElement('article'); node.className = 'pui-resource-card';
  const body = container({children: summary}, 'div', 'pui-file-card');
  let part: GroupedCardPart;
  try {part = createOwnedPart<Omit<GroupedCardPart, keyof Part>>(node, {
    replaceSummary(next: readonly Part[]) {body.replace(next);},
    replace(next: readonly Part[]) {
      if (!Array.isArray(next)) throw new TypeError('Grouped card children must be Pith UI parts.');
      replacePartChildren(part, [body, ...next]);
    },
  }, {children: [body, ...children]});}
  catch (error) {body.destroy(); throw error;}
  return part;
}

export interface CalloutPartState {tone?: 'neutral'|'warning';label?: string;announce?: 'none'|'polite';hidden?: boolean}
export interface CalloutPartOptions extends CalloutPartState {children: readonly Part[];onDispose?(): void}
export interface CalloutPart extends LayoutPart {update(state: Readonly<CalloutPartState>): void}
/** A bounded native surface. Every heading, message, icon and action remains
 * an independently composed child; this part supplies no application content. */
export function createCalloutPart(options: CalloutPartOptions): CalloutPart {
  const validate = (state: Readonly<CalloutPartState>) => {
    assertOptions(state,['tone','label','announce','hidden'],'callout state');
    if (state.tone !== undefined && !['neutral','warning'].includes(state.tone)) throw new TypeError('Unsupported callout tone.');
    if (state.label !== undefined && typeof state.label !== 'string') throw new TypeError('Callout label must be text.');
    if (state.announce !== undefined && !['none','polite'].includes(state.announce)) throw new TypeError('Unsupported callout announcement.');
    if (state.hidden !== undefined && typeof state.hidden !== 'boolean') throw new TypeError('Callout hidden must be boolean.');
  };
  assertOptions(options,['tone','label','announce','hidden','children','onDispose'],'callout');
  const initial = {tone: options.tone,label: options.label,announce: options.announce,hidden: options.hidden};validate(initial);
  if (options.onDispose !== undefined && typeof options.onDispose !== 'function') throw new TypeError('Callout onDispose must be a callback.');
  const node = document.createElement('section');let part: CalloutPart;
  const update = (state: Readonly<CalloutPartState>) => {
    validate(state);if (!isPartAlive(part)) return;
    node.className = state.tone === 'warning' ? 'pui-approval-card' : 'pui-task-failure';node.hidden = !!state.hidden;
    if (state.label !== undefined) node.setAttribute('aria-label',state.label);else node.removeAttribute('aria-label');
    if (state.announce === 'polite') node.setAttribute('role','status');else node.removeAttribute('role');
  };
  part = createOwnedPart<Omit<CalloutPart,keyof Part>>(node,{update,replace(children: readonly Part[]) {if (isPartAlive(part)) replacePartChildren(part,children);}}, {children: options.children});
  if (options.onDispose) onPartDestroy(part,options.onDispose);update(initial);return part;
}
