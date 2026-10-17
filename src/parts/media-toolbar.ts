import {assertOptions, assertUnownedParts, createOwnedPart, isPartAlive, nodeOf, replacePartChildren, type Part} from './ownership.js';
import {isTextPart, type TextPart} from './text.js';

export interface MediaToolbarPart extends Part {replaceActions(actions: readonly Part[]): void}
/** A media status and action group. The one inner DIV is the existing layout. */
export function createMediaToolbarPart(options: {status: TextPart; actions: readonly Part[]}): MediaToolbarPart {
  assertOptions(options,['status','actions'],'media toolbar');
  if (!isTextPart(options.status)) throw new TypeError('A media toolbar requires genuine status text.');
  if (!Array.isArray(options.actions)) throw new TypeError('Media actions must be Pith UI parts.');
  const actions = [...options.actions];assertUnownedParts([options.status,...actions]);
  const node = document.createElement('div');node.className = 'pui-image-viewer-toolbar';
  const group = createOwnedPart(document.createElement('div'),{},{children: actions});
  let part: MediaToolbarPart;
  try {part = createOwnedPart<Omit<MediaToolbarPart,keyof Part>>(node,{replaceActions(next: readonly Part[]) {if (isPartAlive(part)) replacePartChildren(group,next);}},{children: [options.status,group]});}
  catch (error) {group.destroy();throw error;}
  const status = nodeOf(options.status);status.setAttribute('role','status');(status as HTMLElement).dataset.imageScale = '';
  return part;
}
