# Pending-message list assembly

This executable local composition covers contract [09](../contracts/rc27-ui-022.md#09-pending-message-queue):
[`pending-messages.ts`](../../examples/assemblies/pending-messages.ts).
It is documentation and internal validation code, not a public scene factory.

```text
ScrollList (native section, fixed scroll limit and live label)
├─ Text (section-title: direct literal DIV)
└─ CompactRow (caller-keyed native DIV)
   ├─ Badge (filled, Instruction content, conditional visibility)
   ├─ CompactRowBody
   │  ├─ RowText (preview: fixed two-line truncation, full-text title)
   │  └─ RowText (count: native SMALL, optional image-count content)
   └─ CompactRowActions
      ├─ Button (quiet-action, steer icon and caption)
      ├─ Button (quiet-icon, edit)
      └─ Button (quiet-icon, trash)
```

Every part maps to an existing native element. The list supplies no automatic
heading, item rendering, Instruction label, image grammar, or queue policy.
The local recipe chooses these contents and projects busy/running/mode state.
Fonts, padding, colors, truncation, spacing and scroll limits belong to the
library and have no consumer overrides.

```ts
import {
  composePendingMessages,
  type PendingState,
  type PendingCallbacks,
} from '../../examples/assemblies/pending-messages.js';

export function buildPendingMessages(state: PendingState, callbacks: PendingCallbacks) {
  // Place the returned opaque part in the caller's composer-panels layout.
  return composePendingMessages(state, callbacks);
}
```

`update` reconciles by stable pending ID. It retains each row, preview, count,
badge and action, then projects text/title and legal visibility/disabled states.
Only follow-up items while running expose Steer. Steer items expose Instruction;
image-only items show the original fallback text. Busy state disables every
action without replacing the row or clearing scroll and text selection.
Callbacks carry only the action name and stable ID. They create no local
asynchronous pending policy: the host owns subsequent queue state and editing.

Parent disposal invokes the list's lifecycle callback before its children are
destroyed, making the local map and future updates terminal. Direct `destroy`
uses the same lifetime. The outer frame owns mounting and appearance.

`tests/parts-pending-messages.spec.ts` compares actual old application geometry,
computed styles, content, icons and native controls in both themes, running/
idle/busy/empty/many states and narrow/short layouts. It also checks fixed
truncation, selected text, row/action identity, focus, independent scroll,
stable action payloads and disposal in Chromium and WebKit.
