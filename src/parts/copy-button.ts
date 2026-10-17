import type {UIAction} from '../core.js';
import {createCopyFeedback} from '../files/systems.js';
import {isAnnouncementPart, type AnnouncementPart} from './announcement.js';
import {createButtonPart, isButtonAvailable, type ButtonPart, type ButtonPartOptions} from './button.js';
import {assertOptions, isPartAlive, nodeOf, onPartDestroy} from './ownership.js';

type CopyOptions<Options> = Options extends unknown ? Omit<Options, 'onAction' | 'onError'> & {
  /** Borrowed: mount the live region in the same tree as the button. */
  announcement: AnnouncementPart;
  successMessage: string | (() => string);
  onCopy: UIAction;
  onError?: (message: string) => void;
} : never;
export type CopyButtonPartOptions = CopyOptions<ButtonPartOptions>;

/** The retained native button owns its pending and fixed-lived copied feedback. */
export function createCopyButtonPart(options: CopyButtonPartOptions): ButtonPart {
  assertOptions(options, ['label', 'variant', 'icon', 'disabled', 'pending', 'title', 'hidden', 'accessibleLabel', 'menuExpanded', 'count', 'purpose', 'type', 'announcement', 'successMessage', 'onCopy', 'onError'], 'copy button');
  if (!isAnnouncementPart(options.announcement)) throw new TypeError('Copy feedback requires a live announcement part.');
  if (typeof options.successMessage !== 'string' && typeof options.successMessage !== 'function') throw new TypeError('Copy success message must be text or a synchronous text provider.');
  if (typeof options.onCopy !== 'function') throw new TypeError('Copy requires a callback.');
  if (options.onError !== undefined && typeof options.onError !== 'function') throw new TypeError('Copy error must be a callback.');
  const {announcement, successMessage, onCopy, onError, ...buttonOptions} = options;
  let feedback: ReturnType<typeof createCopyFeedback>;
  const part = createButtonPart({...buttonOptions, onAction() {
    let message: string;
    try {
      message = typeof successMessage === 'function' ? successMessage() : successMessage;
      if (typeof message !== 'string') throw new TypeError('Copy success message must be text.');
    } catch (error) {onError?.(error instanceof Error ? error.message : String(error));return;}
    // Keep the copy lifecycle separate from the ordinary synchronous action.
    // Returning this promise would add a second pending owner to the button.
    void feedback.copy(button, async () => {
      const result = await onCopy();
      if (result && !result.ok) throw new Error(result.error);
    }, message);
  }} as ButtonPartOptions);
  const button = nodeOf(part) as HTMLButtonElement;
  feedback = createCopyFeedback({
    status: nodeOf(announcement) as HTMLElement,
    isDisabled: () => !isButtonAvailable(part),
    iconOnly: node => node.classList.contains('pui-quiet-icon') || node.classList.contains('pui-icon-button'),
    onError(error) {if (isPartAlive(part)) onError?.(error instanceof Error ? error.message : String(error));},
  });
  const releaseAnnouncement = onPartDestroy(announcement, () => part.destroy());
  onPartDestroy(part, () => {releaseAnnouncement(); feedback.destroy();});
  return part;
}
