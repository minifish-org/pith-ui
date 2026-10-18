# Assemble runtime details

Import this region from `pith-ui/recipes`. Its single implementation is
[`src/recipes/runtime.ts`](../../src/recipes/runtime.ts); public state, callbacks and
handles are indexed in [API.md](../../API.md).

Supply display state and data callbacks from the host. Ordinary snapshots retain local interaction state. Explicit reset/target changes and parent disposal retire pending UI outcomes; business requests and write validity remain host responsibilities.

The host supplies the compact summary, including any directly visible speed. Optional provider, model and thinking effort appear in the expanded details alongside usage and cost.

```ts
import {composeRuntime, type RuntimeState} from 'pith-ui/recipes';
import {createStackPart, mountParts, type Part} from 'pith-ui';

export function attachRuntime(
  mount: HTMLElement,
  initial: RuntimeState,
  ledger: Part,
  fetchVisibleCosts: () => void,
  appearance: 'light' | 'dark' | 'system',
) {
  const runtime = composeRuntime(initial, {
    costLedger: ledger,
    onCostsChange: fetchVisibleCosts,
  });
  const owner = mountParts(mount, createStackPart({children: [runtime.part]}), {appearance});
  return {owner, runtime};
}
```

Attach the region to the existing ownership tree before opening it. See
[APP.md](../../APP.md) for shared mounting and dialog slots. The current
interaction assertions run in Chromium and WebKit in
[`parts-runtime.spec.ts`](../../tests/parts-runtime.spec.ts).
