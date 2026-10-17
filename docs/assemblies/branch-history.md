# Assemble saved-message branch history

This local recipe implements contract unit [23](../contracts/rc27-ui-022.md).
Its compiled source is
[`examples/assemblies/branch-history.ts`](../../examples/assemblies/branch-history.ts).
It imports only formal parts and creates no DOM, HTML or CSS. The package does
not export a history dialog or interpret conversation/branch IDs.

The old contract is `src/forms/history.ts:createBranchHistory` and
`src/app/workspace.ts:openHistory` at `897f46a`, called by Desk's
`frontend/src/history.ts` at `3f1ee24`. The library owns the feature dialog dimensions,
card geometry, typography, selection rule and ordinary action behavior.

```text
DialogPart (feature; Conversation branches)
├─ StackPart (natural native body)
│  ├─ TextPart description
│  ├─ StackPart (keyed native rows)
│  │  ├─ SelectableCardPart (one native article)
│  │  │  ├─ CardHeadingPart
│  │  │  │  ├─ strong TextPart: role + optional current-branch suffix
│  │  │  │  └─ secondary ButtonPart: Continue here
│  │  │  └─ paragraph TextPart: original bounded preview
│  │  └─ optional paragraph TextPart: No history yet.
│  └─ paragraph FeedbackPart: action failure, hidden while empty
└─ paragraph FeedbackPart: independent frame failure

Loading / catalog failure replaces the natural body's contents with:
└─ plain FeedbackPart (native unadorned div, status or alert)
```

The article, heading, paragraph and natural containers correspond to existing
native nodes. A selectable card owns only the article and its selection state;
it creates no title, text or business action. Plain feedback preserves the
baseline's unadorned status shape, with native status/alert semantics and empty
collapse. Callers do not choose CSS, colors, dimensions or animation values.

```ts
import {
  composeBranchHistory, type HistoryState, type HistoryResult,
} from '../../examples/assemblies/branch-history.js';

interface ConversationTarget {id: string;revision: number}
export function buildHistory(
  originalTarget: ConversationTarget,
  initial: HistoryState,
  isCurrent: (target: ConversationTarget) => boolean,
  continueFrom: (target: ConversationTarget, nodeId: string) => Promise<HistoryResult>,
  clearOwnedHistory: () => void,
) {
  return composeBranchHistory(initial, {
    onContinue: nodeId => isCurrent(originalTarget)
      ? continueFrom(originalTarget,nodeId)
      : {ok: false,error: 'This conversation is no longer current.'},
    onClose: clearOwnedHistory,
  });
}
```

Attach the returned opaque `part` beneath the application's frame and call
`open()` after its single outer mount is connected. The
[frame recipe](frame-navigation.md) demonstrates direct dialog ownership and
one shared appearance owner. `mountBranchHistory` is only the standalone
internal adapter: compose, mount and open. The host keeps its current
conversation identity, persistence, continuation protocol and refresh logic.

`update(state)` projects loading, catalog errors and saved nodes. Loading takes
precedence over an error and destroys obsolete rows. Returning to normal
content restores description, list and action feedback. `nodes: null` without
loading/error has the same empty behavior as an empty array.

Normal updates key cards by the original node ID, retain their action buttons
through reorder, preserve focus during metadata updates, and update
role/text/selected state in place. The
active role receives the literal ` · current branch` suffix. Preview text uses
the original 360-character bound and `(Image or empty reply)` fallback. All
content, including role names and errors, remains literal text.

Continue clears the action error and returns the existing business callback's
outcome to that button. Its local pending survives metadata snapshots and
prevents a duplicate click. An explicit failure or rejected promise remains in
the action error and permits retry. A successful current continuation closes
the owned dialog once. `fail(message)` reports the independent feature-frame
failure; it does not replace the list or its live action.

`close()` releases this opening. `destroy()` is idempotent. Parent destruction
or replacement retires local maps and asynchronous outcomes before descendants
are disposed. Late snapshots, continuations and open attempts stay quiet.
Destroying presentation does not undo or replay a write already started by the
business callback. Create a new local composition for another opening.

`tests/parts-branch-history.spec.ts` compares the actual old application scene
in Chromium and WebKit for populated, empty, loading and error states, in both
themes at desktop and mobile widths. It checks every visible native node's
geometry, typography, paint, margins, borders and text, plus card classes and
SVG. Separate tests cover bounded primitives, literal/truncated text, retained
keyed actions, duplicate prevention, failure/retry, exactly-once success and
shared-parent disposal during a pending continuation.
