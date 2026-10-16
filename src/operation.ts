import { Generation } from './core.js';

/** One owned operation. Invalidating UI never retries or cancels a business write. */
export function createOperation(options: {
  unavailable?: () => boolean;
  onPending?: (pending: boolean) => void;
  onError?: (message: string) => void;
} = {}) {
  const generation = new Generation();
  let pending = false, disposed = false;
  const message = (error: unknown) => error instanceof Error ? error.message : String(error);
  return {
    get pending(): boolean { return pending; },
    run<Value>(task: () => Value | PromiseLike<Value>, onResult?: (value: Value) => void): boolean {
      if (disposed || pending || options.unavailable?.()) return false;
      const sequence = generation.next(); pending = true; options.onPending?.(true);
      const finish = () => { if (generation.current(sequence)) { pending = false; options.onPending?.(false); } };
      const complete = (value: Value) => { if (generation.current(sequence)) onResult?.(value); };
      const fail = (error: unknown) => { if (generation.current(sequence)) options.onError?.(message(error)); };
      try {
        const result = task();
        if (result != null && typeof result === 'object' && 'then' in result) {
          void Promise.resolve(result).then(complete).catch(fail).finally(finish);
        } else { complete(result as Value); finish(); }
      } catch (error) { try { fail(error); } finally { finish(); } }
      return true;
    },
    invalidate(): void { if (disposed) return; generation.invalidate(); pending = false; options.onPending?.(false); },
    destroy(): void { if (disposed) return; disposed = true; generation.destroy(); pending = false; },
  };
}
