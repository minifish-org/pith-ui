# Assemble image zoom

Import this region from `pith-ui/recipes`. Its single implementation is
[`src/recipes/image-viewer.ts`](../../src/recipes/image-viewer.ts); public state, callbacks and
handles are indexed in [API.md](../../API.md).

Supply display state and data callbacks from the host. Ordinary snapshots retain local interaction state. Explicit reset/target changes and parent disposal retire pending UI outcomes; business requests and write validity remain host responsibilities.

```ts
import {createImagePart, createStackPart, mountParts} from 'pith-ui';
import {composeImageViewer} from 'pith-ui/recipes';

export function attachPreviewImage(
  mount: HTMLElement,
  initial: {src: string; alt: string},
  appearance: 'light' | 'dark' | 'system',
) {
  const viewer = composeImageViewer();
  const preview = createImagePart({
    purpose: 'preview', src: initial.src, alt: initial.alt, status: 'ready',
    onActivate: image => viewer.open(image),
  });
  const owner = mountParts(mount, createStackPart({children: [preview, viewer.part]}), {appearance});
  return {preview, viewer, setAppearance: owner.setAppearance, destroy: owner.destroy};
}
```

Attach the region to the existing ownership tree before opening it. See
[APP.md](../../APP.md) for shared mounting and dialog slots. The current
interaction assertions run in Chromium and WebKit in
[`parts-image-viewer.spec.ts`](../../tests/parts-image-viewer.spec.ts).
