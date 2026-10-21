import type {DialogPart} from '../parts/index.js';
import {assertOptions, onPartDestroy} from '../parts/ownership.js';
import type {FrameComposition} from './frame.js';

export interface DialogOpening {
  readonly part: DialogPart;
  isOpen(): boolean;
  close(): void;
  destroy(): void;
}
export interface DialogHostOptions {
  persistentDialogs?: readonly DialogPart[];
  onChange?(): void;
  onError?(error: unknown): void;
}
export interface DialogHost {
  open<T extends DialogOpening>(slot: string, create: (onClose: () => void) => T, activate: (opening: T) => void, onClose?: () => void): T;
  close(slot: string): void;
  destroy(): void;
}

/** Owns dialog lifetimes only. Slot names and business callbacks belong to the host. */
export function createDialogHost(frame: FrameComposition, options: DialogHostOptions = {}): DialogHost {
  assertOptions(options, ['persistentDialogs', 'onChange', 'onError'], 'dialog host');
  let alive = true, sequence = 0;
  const slots = new Map<string, DialogOpening>(), attempts = new Map<string, number>();
  const overlays = new Set<DialogPart>();
  const notify = (callback?: () => void) => {try {callback?.();} catch (error) {try {options.onError?.(error);} catch {}}};
  const changed = () => notify(options.onChange);
  function sync(): void {
    if (alive) frame.replaceOverlays([...options.persistentDialogs ?? [], ...overlays]);
    changed();
  }
  function destroy(): void {
    if (!alive) return;
    alive = false;
    const current = [...slots.values()];slots.clear();attempts.clear();overlays.clear();
    for (const opening of current) notify(() => opening.destroy());
    detach();changed();
  }
  const detach = onPartDestroy(frame.part, destroy);
  return {
    open(slot, create, activate, onClose) {
      const attempt = ++sequence;attempts.set(slot, attempt);
      let local: ReturnType<typeof create> | undefined, released = false;
      const release = () => {
        if (released) return;
        released = true;
        if (local) {overlays.delete(local.part);if (slots.get(slot) === local) slots.delete(slot);}
        sync();notify(onClose);
      };
      local = create(release);
      if (!alive) {local.destroy();return local;}
      slots.get(slot)?.destroy();
      if (!alive || released || attempts.get(slot) !== attempt) {local.destroy();release();return local;}
      slots.set(slot, local);overlays.add(local.part);
      try {
        sync();frame.closeNavigationOverlay();activate(local);changed();
        if (!local.isOpen()) release();
      } catch (error) {local.destroy();release();throw error;}
      return local;
    },
    close(slot) {slots.get(slot)?.close();},
    destroy,
  };
}
