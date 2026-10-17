# Assemble runtime details

[`examples/assemblies/runtime.ts`](../../examples/assemblies/runtime.ts) is the
local consumer assembly for the runtime disclosure in `src/files/systems.ts`
and `src/app/workspace.ts` at `897f46a`. It is compiled, internal example code;
the package exports its small parts, not a runtime scene. Desk retains metric
formatting, timing, request fetching and session ownership.

## Part tree

```text
status DisclosurePart: runtime summary
└─ metrics ScrollAreaPart
   ├─ StackPart: stable runtime-value region
   │  ├─ DescriptionListPart: native DL with direct keyed DT / DD
   │  └─ paragraph TextPart: original metric explanation
   └─ breakdown DisclosurePart: Request breakdown
      └─ caller-owned cost-ledger Part
```

The library fixes the disclosure presentation, scrolling limits, typography,
spacing and definition layout. The recipe supplies the original labels and
formatted content. Optional provider and thinking-effort pairs disappear when
their content is empty. There is no row wrapper around native definition pairs.

## Attach and connect

The complete workspace passes its local cost-ledger composition as the opaque
child. This compiled example accepts that child without exposing a native node.

```ts
import {composeRuntime, type RuntimeState} from '../../examples/assemblies/runtime.js';
import {createStackPart, mountParts, type Part} from '../../src/parts/index.js';

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

Connect `onCostsChange` to Desk's existing lazy cost request. It is a native
disclosure-change intent, not a network action. Read `runtime.readCosts()` to
check both disclosures before fetching. Pass `updateCostsVisible` the existing
availability decision; hiding request breakdown retains its native open state.
`resetCosts()` closes request breakdown. The workspace also clears its separate
ledger composition when changing the target, as the old workspace did.

## Updates and lifetime

`update` applies the authoritative runtime snapshot. A visible snapshot builds
the original metric list lazily, then reconciles keyed native pairs. A hidden
snapshot changes visibility, summary, duration and speed while retaining the
last rendered remaining metric values. `updateTiming` changes only summary,
duration and speed. Unchanged pairs, native text selection and disclosure state
survive timing and optional-metric updates.

The existing labels cover provider, thinking effort, latest duration, average
output speed, session input/output, cache read/write, estimated context,
summaries, tool failures, recorded/latest costs and execution. The explanatory
paragraph remains the original copy. Business values arrive already formatted;
the library has no runtime or pricing DTO.

Use the application's single appearance owner. Destroying the parent retires
the assembly even when it has never rendered visible values; late snapshots
cannot create detached metrics. Explicit `destroy()` is idempotent and disposes
the supplied ledger with its owning tree.

## Maintained proof

```sh
npm run check
node scripts/verify-assemblies.ts
npx playwright test tests/parts-runtime.spec.ts
```

The suite passed 38 checks across Chromium and WebKit. Actual old workspace
states and the assembly have equal native structure, computed presentation and
geometry for basic, optional, empty, long and hidden metrics in light/dark,
both disclosure states and narrow/short windows. The formal scene uses the
same native parent context after retiring the old application's controllers.
Behavior covers selected native values, stable pairs, partial timing updates,
lazy cost intents, hidden/open retention, reset, shared appearance and terminal
parent disposal. Rejected duplicate or malformed definition entries leave the
previous pairs intact.
