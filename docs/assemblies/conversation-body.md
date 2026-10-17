# Conversation text body assembly

This is the text-message subsection of contract [06](../contracts/rc27-ui-022.md#06-conversation-messages-tools-and-rich-content).
The executable implementation is
[`examples/assemblies/conversation-body.ts`](../../examples/assemblies/conversation-body.ts).
Tool groups, images, copy success feedback, and reader/find coordination still
require their separate proof before the complete conversation contract is met.
This local example is not a public scene API.

```text
ReadingColumn (caller controls empty-state visibility)
├─ Bubble (self, reading key)
│  └─ intrinsic body
│     ├─ Text (bubble: literal pre-wrapped text)
│     └─ MessageFooter
│        ├─ Timestamp
│        └─ MessageActions → independently composed icon buttons
├─ Bubble (agent, reading key)
│  └─ intrinsic body
│     ├─ Markdown
│     ├─ Text (interrupted, conditionally hidden)
│     └─ MessageFooter → Timestamp, MessageActions
├─ ReadingNote (system, reading key)
└─ WorkingIndicator (optional, library-owned dots and animation)
```

The bubble owns only its article and existing intrinsic body. It creates no
message text, timestamps or business actions. The reading column owns only its
native container and reading/live-region presentation. Footer and action rows
remain separate small layout parts. There is no wrapper around every text or
icon.

```ts
import {
  composeConversationBody,
  type ConversationBodyState,
  type ConversationBodyCallbacks,
} from '../../examples/assemblies/conversation-body.js';

export function buildConversationText(
  state: ConversationBodyState,
  callbacks: ConversationBodyCallbacks,
) {
  // Attach the opaque result.part beneath the application's reading region.
  // The application, rather than this local assembly, owns mount and theme.
  return composeConversationBody(state, callbacks);
}
```

The local map uses stable message IDs. Ordinary updates retain the text part,
timestamp, footer and action buttons while projecting content, interrupted state
and action availability. Changing conversation ID explicitly disposes the prior
contents. A role change replaces that item's composition. System text is
literal; assistant Markdown uses the library sanitizer, code-copy behavior and
retained DOM patching. User text uses a prefix-preserving native Text update,
which retains a selected unchanged prefix through appended content.

The caller chooses copy/edit/branch eligibility in each message and projects
their independent disabled states through `updateAvailability`. Each callback
receives a frozen target captured from the current keyed row. Timestamp labels
and native ISO/date attributes use the same browser locale formatting as the
baseline; invalid or absent instants omit the timestamp. The caller controls
empty visibility just as the old application did, including an empty working
conversation.

The reading column's disposal callback retires the local map before descendants
are destroyed. Parent-owned destruction and direct destruction share the same
terminal guard. No raw element, Event, HTML, selector or presentation parameter
crosses the recipe's formal entry boundary.

`tests/parts-conversation-body.spec.ts` compares text-only actual application
messages in both themes/opposite OS appearance, both browser engines, mobile
and short viewports, including rich content, literal unsafe text, interruption,
timestamps, actions, empty and working states. Separate checks preserve selected
streaming text, a genuinely overflowing code block's scroll position and focused
actions. WebKit's native button focus clears a content selection, so selection
and focused-action retention are checked in separate rendering phases against
the same old application. Whole-conversation acceptance remains pending the
additional subsections named above.
