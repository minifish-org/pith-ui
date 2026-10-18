# Assemble the existing image attachments

Import this region from `pith-ui/recipes`. Its single implementation is
[`src/recipes/attachments.ts`](../../src/recipes/attachments.ts); public state, callbacks and
handles are indexed in [API.md](../../API.md).

Supply display state and data callbacks from the host. Ordinary snapshots retain local interaction state. Explicit reset/target changes and parent disposal retire pending UI outcomes; business requests and write validity remain host responsibilities.

```ts
import {composeAttachments,type AttachmentsState} from 'pith-ui/recipes';
import {composeImageViewer} from 'pith-ui/recipes';

export function buildAttachmentParts(state: AttachmentsState,removeAttachment: (id: string) => void) {
  const viewer = composeImageViewer();
  const attachments = composeAttachments(state,{
    onRemove: id => removeAttachment(id),
    onOpen: image => viewer.open(image),
  });
  return {attachments,viewer};
}
```

Attach the region to the existing ownership tree before opening it. See
[APP.md](../../APP.md) for shared mounting and dialog slots. The current
interaction assertions run in Chromium and WebKit in
[`parts-attachments.spec.ts`](../../tests/parts-attachments.spec.ts).
