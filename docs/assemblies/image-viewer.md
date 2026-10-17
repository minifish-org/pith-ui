# Assemble image zoom

This is a compiled application-owned recipe, not a package export or a public
image-viewer scene. The implementation is
[`examples/assemblies/image-viewer.ts`](../../examples/assemblies/image-viewer.ts).
Its preservation sources are `src/content/image-viewer.ts`, the image dialog in
`src/workspace.ts`, and `src/app/files.ts:openPreview` at UI commit `897f46a`.
Desk's image URL, preview request and conversation ownership stay in its existing
application controllers at `3f1ee24`.

## Part tree

```text
DialogPart (purpose: image; title; Close image)
├─ ZoomImagePart (one viewport and its native image)
└─ MediaToolbarPart
   ├─ TextPart (owned status; library marks the live media status)
   └─ actions: ButtonPart ×4
      ├─ secondary; − / accessible label Zoom out
      ├─ secondary; + / accessible label Zoom in
      ├─ secondary; Fit
      └─ secondary; Original size
```

The toolbar adds exactly the original intrinsic action-group `div`. The image
part owns viewport bounds, fitting, natural size, fixed zoom steps, resize
observation and shortcut handling. It emits an already formatted status label;
the application does not receive pixel dimensions or choose scale factors.
The modal part chooses the original wide image-modal geometry and heading.

## Connect a native image part

```ts
import {createImagePart, createStackPart, mountParts} from '../../src/parts/index.js';
import {composeImageViewer} from '../../examples/assemblies/image-viewer.js';

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

The viewer is constructed unopened. Put its genuine dialog part directly among
the application's other layers under the shared root and call `open({src,alt})`
from the image activation callback. The callback contains data only. Pointer and
Enter/Space activation and the originating image's focus restoration belong to
the library's image/dialog lifecycle; no native element is passed to the app.
`mountImageViewer` is a standalone validation adapter and creates no new package
API.

The shared parent owns the single appearance setting. Its appearance changes
apply to both thumbnail and modal without replacing either native image. The
current full geometry comparison supplies the actual baseline application
parent; the complete application-shell composition remains a separate proof.

## State and disposal

| Action or state | Rule |
| --- | --- |
| ImagePart `content` / `attachment` / `preview` purpose | Selects the native image's fixed presentation and activation semantics. No wrapper is added to that image. |
| Ready snapshot with the same source | Keeps the native decoded image and avoids assigning the source again. |
| Content image unavailable | Keeps the image identity, marks it unavailable and blocks activation. A later ready state can recover without refetching an already successful source. |
| Source change | Retires old decode callbacks. The application separately retains its request-generation and target checks. |
| `viewer.open({src,alt})` | Uses the new literal title, resets to fit and resets viewport scroll. Empty source does not open. |
| Fit | Never enlarges an image above its natural size and follows viewport resizing. |
| Original size / zoom buttons | Use library-owned natural size and fixed steps. |
| +, =, − keyboard actions | Apply only inside this image's owning modal; composition, modifiers and editable input are ignored. |
| Close | Clears source and internal image sizing, returns focus and retains the dialog/image parts for reuse. |
| Destroy or parent disposal | Retires decode results, disconnects observers/listeners, releases the tree and cannot reopen. |

The application owns Blob URL creation and revocation. Close an active viewer
before retiring its URL or changing the conversation, as Desk already does.
No image part performs authenticated file loading or retries a business read.
Only image URL schemes are accepted; presentation options and arbitrary zoom
parameters are rejected by the formal parts.

```sh
node scripts/verify-assemblies.ts
npx playwright test tests/parts-image.spec.ts tests/parts-image-viewer.spec.ts
```

The regression compares the actual old application image modal reached through
file-preview activation, including full modal/viewport/image/status/button
geometry, fonts, colors, SVG close icon, tiny/large images, fit/original/zoom,
opposite operating-system appearance and short/mobile viewports. Independent
part checks cover retained decode identity, source guards, unavailable recovery,
finite options, data-only callbacks, keyboard scope, resizing and disposal.
