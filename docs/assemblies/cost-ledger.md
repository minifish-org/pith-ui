# Assemble request costs

Import this region from `pith-ui/recipes`. Its single implementation is
[`src/recipes/cost-ledger.ts`](../../src/recipes/cost-ledger.ts); public state, callbacks and
handles are indexed in [API.md](../../API.md).

Supply display state and data callbacks from the host. Ordinary snapshots retain local interaction state. Explicit reset/target changes and parent disposal retire pending UI outcomes; business requests and write validity remain host responsibilities.

```ts
import {composeCostLedger, type CostLedgerState} from 'pith-ui/recipes';
import {composeRuntime, type RuntimeState} from 'pith-ui/recipes';

export function composeCostRegion(initial: RuntimeState, fetchCosts: () => void) {
  const ledger = composeCostLedger();
  const runtime = composeRuntime(initial, {costLedger: ledger.part, onCostsChange: fetchCosts});
  return {
    part: runtime.part,
    updateCosts(state: {visible: boolean; report?: CostLedgerState; loading?: boolean; error?: string}) {
      runtime.updateCostsVisible(state.visible);
      if (state.error) ledger.setError(state.error);
      else if (state.loading) ledger.loading();
      else if (state.report) ledger.update(state.report);
    },
    readCosts: runtime.readCosts,
    resetCosts() {ledger.clear(); runtime.resetCosts();},
    destroy: runtime.destroy,
  };
}
```

Attach the region to the existing ownership tree before opening it. See
[APP.md](../../APP.md) for shared mounting and dialog slots. The current
interaction assertions run in Chromium and WebKit in
[`parts-cost-ledger.spec.ts`](../../tests/parts-cost-ledger.spec.ts).
