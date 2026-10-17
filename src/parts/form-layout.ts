import {uniqueId} from '../dom.js';
import {assertOptions,createOwnedPart,isPartAlive,replacePartChildren,type Part} from './ownership.js';
import type {LayoutPart} from './layout.js';

/** A grouped form's spacing scope; it supplies no headings, fields or actions. */
export function createFormLayoutPart(options: {children: readonly Part[]}): LayoutPart {
  assertOptions(options,['children'],'form layout');
  const node = document.createElement('div'); node.className = 'pui-settings-panel pui-form-layout';
  const part = createOwnedPart(node,{replace(children: readonly Part[]) {replacePartChildren(part,children);}},{children: options.children});
  return part;
}

/** Contiguous explanatory text and feedback, without additional paragraph gaps. */
export function createCopyGroupPart(options: {children: readonly Part[]}): LayoutPart {
  assertOptions(options,['children'],'copy group');
  const node = document.createElement('div'); node.className = 'pui-settings-copy';
  const part = createOwnedPart(node,{replace(children: readonly Part[]) {replacePartChildren(part,children);}},{children: options.children});
  return part;
}

export interface SectionPartState {title?: string; hidden?: boolean}
export interface SectionPart extends LayoutPart {update(state: Readonly<SectionPartState>): void}
function validateSection(state: Readonly<SectionPartState>): void {
  if (state.title !== undefined && typeof state.title !== 'string') throw new TypeError('Section title must be text.');
  if (state.hidden !== undefined && typeof state.hidden !== 'boolean') throw new TypeError('Section hidden must be boolean.');
}
/** One semantic section and its optional native heading, with fixed form rhythm. */
export function createSectionPart(options: SectionPartState & {children: readonly Part[]}): SectionPart {
  assertOptions(options,['title','hidden','children'],'section'); validateSection(options);
  const node = document.createElement('section'); node.className = 'pui-settings-section';
  let children = [...options.children],heading: HTMLHeadingElement | undefined,headingPart: Part | undefined;
  if (options.title !== undefined) {heading = document.createElement('h3'); heading.id = uniqueId('pui-section'); heading.textContent = options.title; headingPart = createOwnedPart(heading,{}); node.setAttribute('aria-labelledby',heading.id);}
  let part: SectionPart;
  const update = (state: Readonly<SectionPartState>) => {
    assertOptions(state,['title','hidden'],'section state'); validateSection(state); if (!isPartAlive(part)) return;
    node.hidden = !!state.hidden;
    if (state.title !== undefined) {
      if (!heading) {heading = document.createElement('h3'); heading.id = uniqueId('pui-section'); headingPart = createOwnedPart(heading,{}); replacePartChildren(part,[headingPart,...children]); node.setAttribute('aria-labelledby',heading.id);}
      if (heading.textContent !== state.title) heading.textContent = state.title;
    }
  };
  try {part = createOwnedPart<Omit<SectionPart,keyof Part>>(node,{update,replace(next: readonly Part[]) {replacePartChildren(part,headingPart ? [headingPart,...next] : next); children = [...next];}},{children: headingPart ? [headingPart,...children] : children});}
  catch (error) {headingPart?.destroy(); throw error;}
  update({hidden: options.hidden}); return part;
}

export interface FieldStackPartState {hidden?: boolean}
export interface FieldStackPart extends LayoutPart {update(state: Readonly<FieldStackPartState>): void}
/** A single label/control/feedback stack; no automatic field wrappers. */
export function createFieldStackPart(options: FieldStackPartState & {children: readonly Part[]}): FieldStackPart {
  assertOptions(options,['hidden','children'],'field stack');
  if (options.hidden !== undefined && typeof options.hidden !== 'boolean') throw new TypeError('Field stack hidden must be boolean.');
  const node = document.createElement('div'); node.className = 'pui-settings-field';
  let part: FieldStackPart;
  const update = (state: Readonly<FieldStackPartState>) => {
    assertOptions(state,['hidden'],'field stack state');
    if (state.hidden !== undefined && typeof state.hidden !== 'boolean') throw new TypeError('Field stack hidden must be boolean.');
    if (isPartAlive(part)) node.hidden = !!state.hidden;
  };
  part = createOwnedPart<Omit<FieldStackPart,keyof Part>>(node,{update,replace(children: readonly Part[]) {replacePartChildren(part,children);}},{children: options.children});
  try {update({hidden: options.hidden});} catch (error) {part.destroy(); throw error;} return part;
}
