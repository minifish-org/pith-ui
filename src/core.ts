/** An owned DOM instance. Call destroy before releasing or replacing its host. */
export interface UIBlock<State> {
  readonly element: HTMLElement;
  update(state: Readonly<State>): void;
  destroy(): void;
}

export type ActionResult = { ok: true } | { ok: false; error: string };
export type UIAction = () => void | ActionResult | Promise<void | ActionResult>;
export type Density = 'normal' | 'compact';
export type Intent = 'neutral' | 'primary' | 'warning' | 'danger';

/** Invalidates UI responses without cancelling an already-started business write. */
export class Generation {
  private revision = 0;
  private disposed = false;
  next(): number { return ++this.revision; }
  current(revision: number): boolean { return !this.disposed && revision === this.revision; }
  invalidate(): void { this.revision++; }
  destroy(): void { this.disposed = true; this.invalidate(); }
}

/** All listeners and observers belong to the instance, including document listeners. */
export class Lifetime {
  private cleanups: Array<() => void> = [];
  private disposed = false;
  add(cleanup: () => void): void {
    if (this.disposed) cleanup(); else this.cleanups.push(cleanup);
  }
  listen(target: EventTarget, type: string, listener: EventListenerOrEventListenerObject, options?: AddEventListenerOptions): void {
    target.addEventListener(type, listener, options);
    this.add(() => target.removeEventListener(type, listener, options));
  }
  destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const cleanup of this.cleanups.splice(0).reverse()) cleanup();
  }
}

/** Combine business availability with pending state owned by the control. */
export function controlDisabled(button: Pick<HTMLButtonElement, 'dataset'>, unavailable: boolean): boolean {
  return unavailable || !!button.dataset.controlPending || !!button.dataset.copyPending;
}

export function setControlPending(button: HTMLButtonElement, pending: boolean): void {
  if (pending) { button.dataset.controlPending = 'true'; button.disabled = true; }
  else delete button.dataset.controlPending;
}
