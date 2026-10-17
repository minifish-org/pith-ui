# Frozen Pi Desk rc.27 / Pith UI 0.2.2 contract

The oracle was captured and replayed against a separate unchanged checkout of
`897f46a83c637a3385adf91e281161cec157cf13`. Desk call sites were audited at
`3f1ee2418674d0010948e1138ebad33de216094a`.

`baseline.json` preserves 224 browser/theme/viewport contracts: 51 seeded scenes,
five additional short-window variants, light and dark themes, and Chromium and
WebKit. The fixture invokes every one of the 17 scene-opening methods used by
Desk, together with its embedded workspace regions. The scenarios exercise
collapsed and expanded tool results, command failures, streaming and interrupted
responses, image loading and zoom, send/queue/stop, file and command approvals,
runtime and request costs, settings loading/probing, HTTP and stdio connections,
provider prompts, resource creation/read-only content, artifacts and all four
preview content kinds.

This is deterministic library assembly evidence using representative state,
not acceptance against the user's live configuration or conversations. Existing
behavior tests remain necessary for callbacks, races, pending operations, draft
ownership, selection, scroll anchors, retries and disposal.

## Compare without recording

```sh
npx playwright test tests/rc27-contract.spec.ts
```

Normal execution only reads the oracle. Playwright's `--update-snapshots` does
not modify it. The fixture is type-checked by the repository's regular TypeScript
check. Browser runs also require the mount to be empty after destruction.

## Explicit baseline recording

Record only from the verified baseline checkout. Copy the four contract fixture,
spec and data-helper files into that checkout without modifying its `src` files.
Use an isolated test-server port/configuration if another checkout is running.

```sh
RC27_UPDATE_CONTRACT=1 npx playwright test tests/rc27-contract.spec.ts
RC27_UPDATE_CONTRACT=1 node --experimental-strip-types tests/rc27-contract-data.ts --update
```

The first command writes isolated captures under the ignored
`artifacts/rc27-contract-captures` directory. The finalizer requires all 224
captures, deduplicates them without changing values, and writes the maintained
oracle. Verification must then pass again without `RC27_UPDATE_CONTRACT`.

## Data format

The single JSON file shares full computed-style defaults, exact style deltas,
and DOM trees. A tree contains readable node records with depth, tag, attributes,
direct text and control state. Each case stores a tree reference, its local style
references, focus/modal state, viewport/body size, and measurement tuples:

```text
[node index, local style index, [x, y, width, height], optional scroll dimensions]
```

The decoder reconstructs the original per-case record before comparison. The
original captures were all checked against decoded records with strict deep
equality. Generated IDs and every corresponding IDREF share one deterministic
mapping; unresolved references remain visible instead of being discarded. SVG
paths and geometry remain in the tree. Native form values, selected options,
disabled/read-only/checked/open states, overflow, typography, colors, spacing,
borders, focus presentation and normal motion parameters remain in the record.
Finite transitions are finished and infinite animations are paused at frame zero
to eliminate sampling-time noise without overriding library CSS.

When validating primitive assemblies, change the fixture's implementation to
those assemblies while retaining these scenario inputs and the frozen oracle.
The production export must never expose this validation fixture as an application
or scene API.
