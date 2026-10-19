import {assertOptions,createOwnedPart,isPartAlive,nodeOf,onPartDestroy,replacePartChildren,type Part} from './ownership.js';
import type {LayoutPart} from './layout.js';
export interface ComposerLayoutOptions {children: readonly Part[];onDispose?(): void}
function layout(options: ComposerLayoutOptions,className: string): LayoutPart {
  assertOptions(options,['children','onDispose'],'input layout');if (options.onDispose !== undefined && typeof options.onDispose !== 'function') throw new TypeError('Layout disposal must be a callback.');
  const node = document.createElement('div');node.className = className;const part = createOwnedPart(node,{replace(children: readonly Part[]) {if (isPartAlive(part)) replacePartChildren(part,children);}},{children: options.children});if (options.onDispose) onPartDestroy(part,options.onDispose);return part;
}
export function createComposerRegionPart(options: ComposerLayoutOptions): LayoutPart {return layout(options,'pui-composer-region');}
export function createComposerPanelsPart(options: ComposerLayoutOptions): LayoutPart {return layout(options,'pui-composer-panels');}
export function createInputToolbarPart(options: ComposerLayoutOptions): LayoutPart {
  const part = layout(options,'pui-composer-toolbar'),node = nodeOf(part);
  // WebKitGTK can evaluate container queries in device pixels when GTK's
  // text DPI and widget scale differ. Observe the actual CSS content width.
  const observer = new ResizeObserver(entries => {
    if (!isPartAlive(part)) return;
    const entry = entries.find(entry => entry.target === node);
    if (entry) node.classList.toggle('pui-composer-compact',entry.contentRect.width <= 680);
  });
  observer.observe(node);onPartDestroy(part,() => observer.disconnect());return part;
}
export function createInputContextPart(options: ComposerLayoutOptions): LayoutPart {return layout(options,'pui-composer-context');}
export function createInputActionsPart(options: ComposerLayoutOptions): LayoutPart {return layout(options,'pui-composer-actions');}
