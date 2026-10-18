# Assemble file preview

Import this region from `pith-ui/recipes`. Its single implementation is
[`src/recipes/file-preview.ts`](../../src/recipes/file-preview.ts); public state, callbacks and
handles are indexed in [API.md](../../API.md).

Read files in the host and pass preview data plus a frozen operation target. Page ranges use the one shared UTF-8 implementation. Supply an announcement from the same ownership tree; close retires pending UI.

```ts
import {createAnnouncementPart, createStackPart, mountParts} from 'pith-ui';
import {composeFilePreview, type PreviewInput, type PreviewCallbacks} from 'pith-ui/recipes';
import {composeImageViewer} from 'pith-ui/recipes';

export function attachFilePreview(
  mount: HTMLElement,
  input: PreviewInput,
  callbacks: PreviewCallbacks,
  appearance: 'light' | 'dark' | 'system',
) {
  const announcement = createAnnouncementPart({message: ''});
  const viewer = composeImageViewer();
  const preview = composeFilePreview(input, {
    ...callbacks,
    onImage: image => viewer.open(image),
    onClose() {viewer.close(); callbacks.onClose?.();},
  }, announcement);
  const owner = mountParts(mount, createStackPart({children: [
    announcement, preview.part, viewer.part,
  ]}), {appearance});
  preview.open();
  return {preview, viewer, setAppearance: owner.setAppearance, destroy: owner.destroy};
}
```

Attach the region to the existing ownership tree before opening it. See
[APP.md](../../APP.md) for shared mounting and dialog slots. The current
interaction assertions run in Chromium and WebKit in
[`parts-file-preview.spec.ts`](../../tests/parts-file-preview.spec.ts).
