# Assemble request costs

[`examples/assemblies/cost-ledger.ts`](../../examples/assemblies/cost-ledger.ts)
copies the consumer assembly and business formatting from
`src/files/systems.ts:createCostLedger` at `897f46a` into formal parts. It is
local compiled example code, not a public ledger scene or pricing API.

## Part tree

```text
plain ContentViewportPart: direct literal loading / error, or report children
├─ paragraph TextPart: original estimate explanation
└─ TablePart: fixed native horizontal viewport and table
   ├─ native THEAD / TR / text TH cells
   └─ native TBODY
      └─ keyed TableRowPart: direct TD cells
         ├─ first TD
         │  ├─ strong TextPart: purpose · status
         │  ├─ LineBreakPart
         │  ├─ TextPart: provider / model
         │  ├─ LineBreakPart
         │  ├─ small TextPart: saved time
         │  └─ plain DisclosurePart: price source and rates
         │     ├─ paragraph TextPart: saved source
         │     ├─ plain PreformattedPart: literal saved-price JSON
         │     └─ optional paragraph TextPart: reasoning tokens
         └─ literal TD cells: input / output / cache read-write / estimate
```

The table accepts genuine rows and explicit native cells. Opaque first-cell
parts cannot be overwritten through the literal-cell update method. Headers,
empty text and row content are supplied by the recipe; font, cell spacing,
wrapping and scrolling remain library-owned. There is no row wrapper, HTML,
CSS or dimension option in this composition.

## Connect to runtime

```ts
import {composeCostLedger, type CostLedgerState} from '../../examples/assemblies/cost-ledger.js';
import {composeRuntime, type RuntimeState} from '../../examples/assemblies/runtime.js';

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

Give the returned opaque part to the existing application's owner. Desk still
fetches costs lazily after checking the two native disclosures. The original
error/loading/report precedence and visibility decision remain in the caller.
`formatCost` is a local business helper beside this recipe for the recorded
and latest-task labels; it is not exported from the UI package.

## State and lifetime

The initial region is empty. `loading()` supplies direct literal text only
before a report exists, including after a direct-text error. An existing
report, including an empty report, remains visible during loading. `setError`
clears previous report children and writes the literal message. `clear()`
returns to an empty region.

`update` retains rows by request ID and updates their current native text.
Unchanged rows keep their price disclosure, native selection and reading
position. Removed rows are disposed. Empty/null request lists use the one
native row whose empty cell spans all five columns. Price JSON and labels stay
literal; unknown prices, fallback provider/model names and optional reasoning
tokens preserve the original behavior. Saved time is displayed as supplied.

The library receives no request-domain object. The recipe retains the old
number/currency formatting and estimate explanation, including unknown-request
counts and the statement that these figures are not a provider bill.
Parent disposal retires both initially empty and populated ledger handles before
late updates; destroying runtime also destroys its owned ledger.

## Maintained proof

```sh
npm run check
node scripts/verify-assemblies.ts
npx playwright test tests/parts-cost-ledger.spec.ts
```

The suite passed 36 Chromium/WebKit checks. It compares the actual old workspace
ledger's native elements, direct text, computed presentation and geometry in
light/dark for known/unknown, empty/null and multiple long requests, expanded
price details, loading, error, clear and a narrow viewport. The old application
is destroyed before formal parts replace its cloned native context. Both
implementations exercise stable rows, selected text, open prices, loading over
existing and empty reports, error recovery and clear. Additional checks cover
genuine row/cell validation, atomic rejected updates, absence of DOM/style
ports and shared-parent disposal.
