# Assemble a cancel-first confirmation

Import this region from `pith-ui/recipes`. Its single implementation is
[`src/recipes/confirmation.ts`](../../src/recipes/confirmation.ts); public state, callbacks and
handles are indexed in [API.md](../../API.md).

Supply display state and data callbacks from the host. Ordinary snapshots retain local interaction state. Explicit reset/target changes and parent disposal retire pending UI outcomes; business requests and write validity remain host responsibilities.

```ts
import {composeConfirmation, type ConfirmationResult} from 'pith-ui/recipes';

interface ConversationTarget {id: string; title: string}
export function attachRemovalConfirmation(
  originalTarget: ConversationTarget,
  deleteOriginalConversation: (target: ConversationTarget) => Promise<ConfirmationResult>,
  isUnavailable: (target: ConversationTarget) => boolean,
  clearOwnedConfirmation: (target: ConversationTarget) => void,
) {
  return composeConfirmation({
    title: 'Delete conversation?',
    message: {
      before: 'Permanently delete ',
      subject: originalTarget.title,
      after: ', including its saved history?',
    },
    hint: 'Deleted conversation data cannot be recovered.',
    confirmLabel: 'Delete conversation',
    disabled: isUnavailable(originalTarget),
  }, {
    onConfirm: () => isUnavailable(originalTarget)
      ? {ok: false, error: 'This action is no longer available.'}
      : deleteOriginalConversation(originalTarget),
    onClose: () => clearOwnedConfirmation(originalTarget),
  });
}
```

Attach the region to the existing ownership tree before opening it. See
[APP.md](../../APP.md) for shared mounting and dialog slots. The current
interaction assertions run in Chromium and WebKit in
[`parts-edit-confirm.spec.ts`](../../tests/parts-edit-confirm.spec.ts).
