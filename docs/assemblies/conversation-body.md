# Conversation body assembly

This covers the text and tool-disclosure subsections of contract [06](../contracts/rc27-ui-022.md#06-conversation-messages-tools-and-rich-content).
The executable implementation is
[`examples/assemblies/conversation-body.ts`](../../examples/assemblies/conversation-body.ts).
Reader/find coordination still requires its separate proof before the complete
conversation contract is met.
This local example is not a public scene API.

```text
ReadingColumn (caller controls empty-state visibility)
├─ Bubble (self, reading key)
│  └─ intrinsic body
│     ├─ ImageGroup → independently keyed native Images (when supplied)
│     ├─ Text (bubble: literal pre-wrapped text)
│     └─ MessageFooter
│        ├─ Timestamp
│        └─ MessageActions → independently composed icon buttons
├─ Bubble (agent, reading key)
│  └─ intrinsic body
│     ├─ Markdown
│     ├─ Text (interrupted, only when present)
│     └─ MessageFooter → Timestamp, MessageActions
├─ ReadingNote (system, reading key)
├─ CompoundDisclosure (group, stable fold key)
│  ├─ intrinsic summary: Icon, Metadata label/count/state, Icon
│  └─ DisclosureBody (group)
│     └─ CompoundDisclosure (result, reading and fold keys)
│        ├─ intrinsic summary: Icon, Text, trailing Metadata, Icon
│        ├─ DisclosureBody (details, when command exists)
│        │  ├─ Metadata field label, Preformatted command
│        │  └─ CodeProperty (directory label and literal code)
│        └─ DisclosureBody (output, for commands) → label, Preformatted
└─ WorkingIndicator (optional, library-owned dots and animation)

Frame sibling: shared Announcement (borrowed by message CopyButtons)
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
import type {AnnouncementPart} from 'pith-ui';

export function buildConversationText(
  state: ConversationBodyState,
  callbacks: ConversationBodyCallbacks,
  announcement: AnnouncementPart,
) {
  // Attach the opaque result.part beneath the application's reading region.
  // The application, rather than this local assembly, owns mount and theme.
  // The frame also owns this shared announcement as a direct sibling.
  return composeConversationBody(state, callbacks, announcement);
}
```

The local map uses stable message IDs. Ordinary updates retain the text part,
timestamp, footer and action buttons while projecting content, interrupted state
and action availability. Changing conversation ID explicitly disposes the prior
contents. A role change replaces that item's composition. System text is
literal; assistant Markdown uses the library sanitizer, code-copy behavior and
retained DOM patching. User text uses a prefix-preserving native Text update,
which retains a selected unchanged prefix through appended content.

[`tool-disclosures.ts`](../../examples/assemblies/tool-disclosures.ts) contains
the executable small-part composition for consecutive tool messages. Its local
data algorithm chooses group prose and counts, reuses a group through a retained
member, and avoids colliding with a still-owned historical key. Neither the
disclosure nor any metadata part interprets tool data. Each native details keeps
its own open state; before an update or conversation switch, the local body
records those booleans by fold key. Explicit supplied folds take precedence.
Results keep their keyed details and literal output part during streaming, so
selected unchanged text and output scroll survive group growth. Command text,
directory and output labels are explicitly composed; an ordinary tool result
uses a direct Preformatted child. Library variants own all padding, border,
color and native disclosure sizing.

The caller chooses copy/edit/branch eligibility in each message and projects
their independent disabled states through `updateAvailability`. Each callback
receives a frozen target captured from the current keyed row. Timestamp labels
and native ISO/date attributes use the same browser locale formatting as the
baseline; invalid or absent instants omit the timestamp. The caller controls
empty visibility just as the old application did, including an empty working
conversation.

Copy actions use the genuine CopyButton with the shared Announcement: pending,
check glyph, accessible success text and its fixed restoration interval survive
unrelated snapshots. Edit and branch dispatch their captured targets without
inventing a pending button state; their host errors report only while the local
body remains alive. The default local announcement is returned as
`body.announcement` for an outer frame to own; passing the application's shared
announcement avoids creating another live region. Direct body disposal retires
its own default announcement, while a borrowed announcement remains host owned.

[`conversation-images.ts`](../../examples/assemblies/conversation-images.ts)
keeps image targets, Blob resolution, generation checks, MIME allowlist, URL
cache and revocation in caller coordination. A native ImagePart owns its source,
accessible loading/unavailable/ready state and click/Enter/Space activation.
User and tool galleries are explicit ImageGroup + Image children. A failed
resolution is retried on a later projection; successful images retain native
identity, decoding and focus. Conversation switching retires pending results
and releases the previous URLs. The caller connects `onImage` to its independently
composed image-viewer dialog, owned by the same frame.

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
the same old application. `tests/parts-tool-disclosure.spec.ts` compares all
group-label categories, result/command running/done/error and exit labels,
literal output, counts, both themes and narrow open/closed layouts. It also
checks retained folds, group growth, prepended history, overlapping group keys,
selected output and scroll. Whole-conversation acceptance remains pending the
additional subsections named above.

`tests/parts-conversation-actions.spec.ts` compares actual copy pending/check/
restoration and non-copy dispatch behavior against the old application.
`tests/parts-conversation-images.spec.ts` compares user/tool galleries in both
themes and loading/unavailable/ready states, frozen data targets, retries,
retained decoded image focus, all native activation paths and URL disposal.
These fixtures retire all original controllers before mounting new parts, so
an old global delegate cannot make an incomplete assembly pass.
