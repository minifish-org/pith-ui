# Conversation body assembly

Import this region from `pith-ui/recipes`. Its single implementation is
[`src/recipes/conversation-body.ts`](../../src/recipes/conversation-body.ts); public state, callbacks and
handles are indexed in [API.md](../../API.md).

Pass already projected message availability and scoped local-file state. The host validates local links and supplies image data. The library sanitizes Markdown and retires stale images and action outcomes.

```ts
import {
  composeConversationBody,
  type ConversationBodyState,
  type ConversationBodyCallbacks,
} from 'pith-ui/recipes';
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

Attach the region to the existing ownership tree before opening it. See
[APP.md](../../APP.md) for shared mounting and dialog slots. The current
interaction assertions run in Chromium and WebKit in
[`parts-conversation-body.spec.ts`](../../tests/parts-conversation-body.spec.ts).
