import type {LayoutPart} from './layout.js';
import {assertOptions, createOwnedPart, isPartAlive, onPartDestroy, replacePartChildren, type Part} from './ownership.js';

export type ContentViewportContent = string | readonly Part[] | {readonly message: string; readonly children: readonly Part[]};
export interface ContentViewportPart extends Part {replace(content: ContentViewportContent): void}
export interface ContentViewportOptions {purpose: 'preview' | 'inspector' | 'plain'; onDispose?(): void; content: ContentViewportContent; announce?: 'none' | 'polite'}
/** A bounded content region. Literal loading/error text adds no wrapper. */
export function createContentViewportPart(options: ContentViewportOptions): ContentViewportPart {
  assertOptions(options, ['purpose', 'content', 'announce', 'onDispose'], 'content viewport');
  if (!['preview','inspector','plain'].includes(options.purpose)) throw new TypeError('Unknown content viewport purpose.');
  if (options.announce !== undefined && !['none', 'polite'].includes(options.announce)) throw new TypeError('Unknown content announcement mode.');
  if (options.onDispose !== undefined && typeof options.onDispose !== 'function') throw new TypeError('Viewport onDispose must be a callback.');
  const node = document.createElement('div');node.className = options.purpose === 'inspector' ? 'pui-artifacts-content' : options.purpose === 'plain' ? '' : 'pui-file-preview-body';
  if (options.announce === 'polite' || options.purpose === 'preview' && options.announce !== 'none') node.setAttribute('aria-live', 'polite');
  let literalNode: Text | undefined;
  const replace = (content: ContentViewportContent): void => {
    let message: string | undefined,children: readonly Part[];
    if (typeof content === 'string') {message = content;children = [];}
    else if (Array.isArray(content)) children = content;
    else {
      assertOptions(content, ['message', 'children'], 'literal viewport content');
      const mixed = content as {readonly message: string;readonly children: readonly Part[]};
      if (typeof mixed.message !== 'string' || !Array.isArray(mixed.children)) throw new TypeError('Viewport content must be literal text and Pith UI parts.');
      message = mixed.message;children = mixed.children;
    }
    if (!isPartAlive(part)) return;
    // Ownership validation completes before the existing literal node changes.
    replacePartChildren(part, children);
    if (message === undefined) {literalNode?.remove();literalNode = undefined;}
    else if (literalNode) {if (literalNode.data !== message) literalNode.data = message;}
    else {literalNode = document.createTextNode(message);node.prepend(literalNode);}
  };
  const part = createOwnedPart(node, {replace});
  try {replace(options.content);} catch (error) {part.destroy();throw error;}
  if (options.onDispose) onPartDestroy(part,options.onDispose);
  return part;
}

/** A trailing row owns only placement; callers compose their own action group. */
export function createTrailingActionsPart(options: {children: readonly Part[]}): LayoutPart {
  assertOptions(options, ['children'], 'trailing actions');
  const node = document.createElement('div');node.className = 'pui-file-preview-actions';
  const part = createOwnedPart(node, {replace(children: readonly Part[]) {replacePartChildren(part, children);}}, {children: options.children});
  return part;
}
