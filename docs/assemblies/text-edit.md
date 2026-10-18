# Assemble message and pending-message editors

Import this region from `pith-ui/recipes`. Its single implementation is
[`src/recipes/text-edit.ts`](../../src/recipes/text-edit.ts); public state, callbacks and
handles are indexed in [API.md](../../API.md).

Supply display state and data callbacks from the host. Ordinary snapshots retain local interaction state. Explicit reset/target changes and parent disposal retire pending UI outcomes; business requests and write validity remain host responsibilities.

```ts
import {composeTextEditor, type TextEditorResult} from 'pith-ui/recipes';

interface MessageTarget {conversationId: string; messageId: string; expectedLastMessageId: string; text: string}
export function attachMessageEditor(
  originalTarget: MessageTarget,
  saveEditedMessage: (target: MessageTarget, text: string) => Promise<TextEditorResult>,
  refreshAvailability: () => void,
  clearOwnedEditor: (target: MessageTarget) => void,
) {
  return composeTextEditor({
    title: 'Edit message',
    value: originalTarget.text,
    submitLabel: 'Send again',
    note: 'Send again to replace this message and its following replies.',
  }, {
    purpose: 'message',
    onInput: refreshAvailability,
    onSubmit: text => saveEditedMessage(originalTarget, text),
    onClose: () => clearOwnedEditor(originalTarget),
  });
}
```

Attach the region to the existing ownership tree before opening it. See
[APP.md](../../APP.md) for shared mounting and dialog slots. The current
interaction assertions run in Chromium and WebKit in
[`parts-edit-confirm.spec.ts`](../../tests/parts-edit-confirm.spec.ts).
