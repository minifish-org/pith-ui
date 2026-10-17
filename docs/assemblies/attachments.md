# Assemble the existing image attachments

This local recipe proves contract unit [10a](../contracts/rc27-ui-022.md).
The compiled implementation is
[`examples/assemblies/attachments.ts`](../../examples/assemblies/attachments.ts).
Preservation sources are `src/composer.ts:createAttachments` and its actual
`src/app/workspace.ts` use at `897f46a`, projected by Desk at `3f1ee24`.
The package exposes native thumbnail parts; attachment identity, removal and
viewer orchestration remain local application code.

```text
ThumbnailStripPart (label: Image attachments, hidden when empty)
└─ keyed ThumbnailPart (native figure)
   ├─ ImagePart (purpose: attachment, status: ready)
   ├─ CaptionPart (native figcaption, literal filename)
   └─ overlay-close ButtonPart (close icon, label: Remove + filename)
```

The existing native wrappers are retained: one horizontal DIV, one FIGURE per
attachment, and its IMG, FIGCAPTION and BUTTON children. No extra caption or
icon wrappers are added. The library fixes dimensions, cropping, border,
ellipsis, spacing, close-button position and horizontal scrolling.

```ts
import {composeAttachments,type AttachmentsState} from '../../examples/assemblies/attachments.js';
import {composeImageViewer} from '../../examples/assemblies/image-viewer.js';

export function buildAttachmentParts(state: AttachmentsState,removeAttachment: (id: string) => void) {
  const viewer = composeImageViewer();
  const attachments = composeAttachments(state,{
    onRemove: id => removeAttachment(id),
    onOpen: image => viewer.open(image),
  });
  return {attachments,viewer};
}
```

Compose `attachments.part` directly into the existing composer region before
its image guidance. Compose `viewer.part` into the same outer frame as the
other dialogs, then mount the frame once. Both share its appearance and
lifetime. Preserve Desk's existing viewer instance when the complete frame
already supplies one; the example shows data callback wiring only.

`update({items,disabled})` keys figures by attachment ID. Metadata changes keep
the native image, caption and removal button, update the current filename and
accessible label, and avoid assigning an unchanged source again. Reordering
retains each keyed figure. Removed items are disposed by the strip, and an
empty item array clears and hides it. The local callback closes over the
immutable ID; no data attributes or selectors are part of the public API.

`disabled` controls removal only. Click, Enter and Space can still open images.
Composition keys are ignored; repeated Enter/Space prevent native scrolling
without reopening the viewer. The attachment ImagePart remains `ready` even
when its URL fails to decode, matching the old native image's ability to send
that source and filename to the viewer. Image callbacks contain frozen
`{src,alt}` data, with no image node or event.

`destroy()` releases the strip and descendants. Parent destruction or
replacement first retires the local map and callbacks; later snapshots and
events on detached images/buttons stay quiet. Business state is changed only
by the existing removal callback.

`tests/parts-attachments.spec.ts` compares the actual old composer subtree in
light and dark appearance at desktop and phone widths: populated, empty,
disabled and horizontally overflowing lists. It verifies native structure,
geometry, computed styles, exact SVGs, literal filenames, removal/opening,
broken sources, keyboard handling, keyed identity and shared-parent disposal.
