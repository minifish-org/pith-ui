# Assemble conversation reading and find

Import this region from `pith-ui/recipes`. Its single implementation is
[`src/recipes/conversation-reader.ts`](../../src/recipes/conversation-reader.ts); public state, callbacks and
handles are indexed in [API.md](../../API.md).

Retain position, selection and tool folds by conversation identity. Search, history reading and automatic following stay in the reader. Prune retired conversations explicitly.

```ts
import {mountParts} from 'pith-ui';
import {composeFrame, type FrameState} from 'pith-ui/recipes';
import {composeConversationReader} from 'pith-ui/recipes';
import {type ConversationBodyState, type ConversationBodyCallbacks} from 'pith-ui/recipes';

export function attachConversation(
  mount: HTMLElement,
  frameState: FrameState,
  conversation: ConversationBodyState,
  callbacks: ConversationBodyCallbacks,
  appearance: 'light' | 'dark' | 'system',
) {
  const reader = composeConversationReader(conversation, callbacks);
  const frame = composeFrame(frameState, {}, {
    main: [reader.find, reader.region],
    siblings: [reader.announcement],
  });
  const owner = mountParts(mount, frame.part, {appearance});
  return {reader, setAppearance: owner.setAppearance, destroy: owner.destroy};
}
```

Attach the region to the existing ownership tree before opening it. See
[APP.md](../../APP.md) for shared mounting and dialog slots. The current
interaction assertions run in Chromium and WebKit in
[`parts-conversation-reader.spec.ts`](../../tests/parts-conversation-reader.spec.ts).
