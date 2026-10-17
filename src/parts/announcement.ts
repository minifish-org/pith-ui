import {assertOptions, createOwnedPart, isPartAlive, type Part} from './ownership.js';

export interface AnnouncementPartState {message: string}
export interface AnnouncementPart extends Part {update(state: Readonly<AnnouncementPartState>): void}
const announcements = new WeakSet<Part>();
/** Internal capability check for borrowed live-region dependencies. */
export function isAnnouncementPart(part: Part): part is AnnouncementPart {return announcements.has(part) && isPartAlive(part);}

/** A native polite live region with library-owned screen-reader presentation. */
export function createAnnouncementPart(initial: AnnouncementPartState): AnnouncementPart {
  const validate = (state: Readonly<AnnouncementPartState>): void => {
    assertOptions(state, ['message'], 'announcement');
    if (typeof state.message !== 'string') throw new TypeError('Announcement message must be text.');
  };
  validate(initial);
  const node = document.createElement('span');
  node.className = 'pui-sr-only'; node.setAttribute('role', 'status'); node.setAttribute('aria-live', 'polite');
  const part = createOwnedPart(node, {update(state: Readonly<AnnouncementPartState>) {
    validate(state);
    if (isPartAlive(part) && node.textContent !== state.message) node.textContent = state.message;
  }});
  announcements.add(part); part.update(initial);
  return part;
}
