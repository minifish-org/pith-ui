# Assemble tool approval

The local assembly in
[`examples/assemblies/approval.ts`](../../examples/assemblies/approval.ts)
reproduces `src/tasks/approval.ts` and its workspace use at `897f46a` with formal
parts. It is not a package export or public approval scene. Desk retains the
approval request, tool identity and policy in
`frontend/src/task-controls.ts:renderApproval` at `3f1ee24`.

## Part tree

```text
StackPart: existing approval region
└─ warning CalloutPart: Tool approval required
   ├─ CalloutHeadingPart
   │  ├─ shield IconPart
   │  ├─ StackPart: strong title / text subtitle
   │  └─ code BadgePart: tool name
   ├─ warning paragraph TextPart
   ├─ location CodePropertyPart: Create/Modify file + code path
   ├─ note FeedbackPart: preview error
   ├─ StackPart: optional diff PaginationPart + diff PreformattedPart
   ├─ footnote TextPart: shortened preview
   ├─ FoldingPart: optional native Tool arguments disclosure
   │  └─ StackPart: optional PaginationPart + literal PreformattedPart
   ├─ scope note TextPart
   └─ CalloutActionsPart: Deny / caution Always / check-icon Allow
```

All words, IDs, arguments, paths and diff content come from the assembly state.
The library owns native elements, warning treatment, font, spacing, width,
overflow, icon sizing and wrapping. No HTML, CSS or presentation values occur
in the recipe. The folding part retains its one body when switching between
native details and always-visible arguments; it adds no body wrapper.

## Attach to the existing workspace

The compiled invocation below shows ownership and callback connection. The
full workspace uses its existing composer panel slot for `approval.part`.

```ts
import {
  composeApproval, type ApprovalState,
} from '../../examples/assemblies/approval.js';
import {createStackPart, mountParts, type Part} from '../../src/parts/index.js';

interface ApprovalController {
  approve(id: string, action: 'deny' | 'always' | 'allow'): void;
}

export function attachApproval(
  mount: HTMLElement,
  sibling: Part,
  initial: ApprovalState,
  controller: ApprovalController,
  appearance: 'light' | 'dark' | 'system',
) {
  const approval = composeApproval(initial, {
    onAction: (id, action) => controller.approve(id, action),
  });
  const owner = mountParts(mount, createStackPart({children: [sibling, approval.part]}), {appearance});
  return {owner, approval};
}
```

Forward Desk's original pending approval ID and action to its existing request.
Desk continues to decide the fallback command warning and whether workspace
changes may be permanently allowed. `canAlwaysAllow` only controls the existing
scope note and Always action; it does not grant permission itself.

## State and review continuity

`approval: null` clears the region. A new approval ID creates a fresh card,
resets preview pages and closes Tool arguments unless its initial preview has
an error. Metadata updates for the same ID keep the card, actions, disclosure
state and unchanged argument/diff pages.

Arguments render immediately without a preview. A normal preview keeps them
lazy until expanded. A fresh preview error expands them; a later error for the
same ID keeps the user's existing disclosure choice. Changing between preview
and no preview keeps the same argument body, page and preformatted content.
As in the original native DOM move, that change clears native text selection.
Metadata updates without moving the body preserve selection.

Create and modify labels, missing-content fallback, preview error and shortened
note remain distinct. The diff is hidden on preview error. Changing diff or
argument source resets only that source's page. Pages retain the original
256 KiB UTF-8 window and prefer complete lines without splitting a character.
Page changes replace the preformatted view at the native reading start; no
scroll pixels or page-size presentation knobs escape to consumers.

`disabled` disables only Deny, Always and Allow. Reading, disclosure and paging
remain available. Each action sends the current approval ID and its original
action string once. Removed targets and hidden Always actions cannot deliver
a new action. The assembly adds no request or local pending policy.

## Lifetime and verification

Use the one application owner for appearance. Clearing or replacing an
approval disposes its old card and callbacks. Destroying the outer parent also
retires an empty approval region, so late snapshots cannot create an orphaned
review. Destruction is idempotent. A folding body destroyed directly retires
its folding owner as well.

```sh
npm run check
node scripts/verify-assemblies.ts
npx playwright test tests/parts-approval.spec.ts
```

The maintained suite passed 66 checks across Chromium and WebKit. It compares
actual old workspace reviews in light/dark,
including no approval, argument-only, create/modify, warnings, preview errors,
empty diff, shortening, disabled state, literal content and long paths. It also
checks narrow/short layouts, native structure, SVGs, computed presentation and
geometry. The formal side uses a cloned native context after destroying the
old application. Both old and assembled behavior exercise large Unicode pages,
body identity, selection, mode switches, source/target reset and disabled
reading. Additional cases cover lazy arguments, action IDs, atomic rejected
states and terminal empty/parent/body disposal.
