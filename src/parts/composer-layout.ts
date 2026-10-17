import {assertOptions,createOwnedPart,isPartAlive,onPartDestroy,replacePartChildren,type Part} from './ownership.js';
import type {LayoutPart} from './layout.js';
export interface ComposerLayoutOptions {children: readonly Part[];onDispose?(): void}
function layout(options: ComposerLayoutOptions,className: string): LayoutPart {
  assertOptions(options,['children','onDispose'],'input layout');if (options.onDispose !== undefined && typeof options.onDispose !== 'function') throw new TypeError('Layout disposal must be a callback.');
  const node = document.createElement('div');node.className = className;const part = createOwnedPart(node,{replace(children: readonly Part[]) {if (isPartAlive(part)) replacePartChildren(part,children);}},{children: options.children});if (options.onDispose) onPartDestroy(part,options.onDispose);return part;
}
export function createComposerRegionPart(options: ComposerLayoutOptions): LayoutPart {return layout(options,'pui-composer-region');}
export function createComposerPanelsPart(options: ComposerLayoutOptions): LayoutPart {return layout(options,'pui-composer-panels');}
export function createInputToolbarPart(options: ComposerLayoutOptions): LayoutPart {return layout(options,'pui-composer-toolbar');}
export function createInputContextPart(options: ComposerLayoutOptions): LayoutPart {return layout(options,'pui-composer-context');}
export function createInputActionsPart(options: ComposerLayoutOptions): LayoutPart {return layout(options,'pui-composer-actions');}
