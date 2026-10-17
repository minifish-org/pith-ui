import {iconElement} from '../dom.js';
import type {LayoutPart} from './layout.js';
import {assertOptions,createOwnedPart,isPartAlive,onPartDestroy,replacePartChildren,type Part} from './ownership.js';

function container(tag: 'article'|'div',className: string,options: {children: readonly Part[]}): LayoutPart {
  assertOptions(options,['children'],'toast content');const node = document.createElement(tag);node.className = className;
  const part = createOwnedPart<Omit<LayoutPart,keyof Part>>(node,{replace(children) {if (isPartAlive(part)) replacePartChildren(part,children);}},{children: options.children});return part;
}
/** A fixed, nonmodal notification stack. Content and its lifetime are owned once. */
export function createToastStackPart(options: {label: string;children: readonly Part[];onDispose?(): void}): LayoutPart {
  assertOptions(options,['label','children','onDispose'],'toast stack');
  if (typeof options.label !== 'string') throw new TypeError('Toast stack label must be text.');
  if (options.onDispose !== undefined && typeof options.onDispose !== 'function') throw new TypeError('Toast stack onDispose must be a callback.');
  const node = document.createElement('section');node.className = 'pui-completion-notices';node.setAttribute('aria-label',options.label);node.setAttribute('aria-live','polite');
  const part = createOwnedPart<Omit<LayoutPart,keyof Part>>(node,{replace(children) {if (isPartAlive(part)) replacePartChildren(part,children);}},{children: options.children});
  if (options.onDispose) onPartDestroy(part,options.onDispose);return part;
}
/** One native notification card; callers supply its actual small parts. */
export function createToastPart(options: {children: readonly Part[]}): LayoutPart {return container('article','pui-completion-notice',options);}
/** The flexible content slot leaves the emblem and dismissal as direct siblings. */
export function createToastBodyPart(options: {children: readonly Part[]}): LayoutPart {return container('div','pui-completion-content',options);}
/** A fixed success emblem. Shape, icon and size are library-owned. */
export function createEmblemPart(options: {tone: 'success'}): Part {
  assertOptions(options,['tone'],'emblem');if (options.tone !== 'success') throw new TypeError('Unknown emblem tone.');
  const node = document.createElement('span');node.className = 'pui-completion-check';node.setAttribute('aria-hidden','true');node.append(iconElement('check'));return createOwnedPart(node,{});
}
