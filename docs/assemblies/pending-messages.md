# Pending-message list assembly

Import this region from `pith-ui/recipes`. Its single implementation is
[`src/recipes/pending-messages.ts`](../../src/recipes/pending-messages.ts); public state, callbacks and
handles are indexed in [API.md](../../API.md).

Supply display state and data callbacks from the host. Ordinary snapshots retain local interaction state. Explicit reset/target changes and parent disposal retire pending UI outcomes; business requests and write validity remain host responsibilities.

```ts
import {
  composePendingMessages,
  type PendingState,
  type PendingCallbacks,
} from 'pith-ui/recipes';

export function buildPendingMessages(state: PendingState, callbacks: PendingCallbacks) {
  // Place the returned opaque part in the caller's composer-panels layout.
  return composePendingMessages(state, callbacks);
}
```

Attach the region to the existing ownership tree before opening it. See
[APP.md](../../APP.md) for shared mounting and dialog slots. The current
interaction assertions run in Chromium and WebKit in
[`parts-pending-messages.spec.ts`](../../tests/parts-pending-messages.spec.ts).
