# Assemble file preview

This is compiled application-owned assembly code in
[`examples/assemblies/file-preview.ts`](../../examples/assemblies/file-preview.ts),
not a package-exported file scene. Preservation sources at `897f46a` are
`src/files/panels.ts:createFilePreview`, `src/content/paged-preview.ts`,
`src/app/files.ts:openPreview`, and the native preview dialog in
`src/workspace.ts`. Desk's request generation, selected conversation, authenticated
reads, native file operations and Blob URL ownership remain application logic.

## Part tree

```text
DialogPart (purpose: preview; literal file name)
├─ TextPart (location; literal path)
├─ ContentViewportPart (preview; polite live content)
│  ├─ literal Loading / error text, or:
│  ├─ PaginationPart (only when there is more than one page)
│  ├─ MarkdownPart / PreformattedPart / ImagePart (preview)
│  └─ optional TextPart (footnote; truncated-file notice)
└─ TrailingActionsPart
   └─ CompactActionsPart
      ├─ ButtonPart (secondary; optional Open)
      ├─ ButtonPart (secondary; optional Reveal)
      └─ CopyButtonPart (secondary; optional Copy file / Copy path)

Shared frame siblings:
├─ AnnouncementPart (borrowed by copy controls)
└─ composed image-viewer DialogPart
```

The dialog owns its original heading and single inner container. The viewport
owns bounds, scrolling, border, background and padding. Its mixed literal and
part content keeps an error text node and optional footnote in the same native
root. The action layouts own wrapping, alignment and compact button sizes.
The recipe specifies no CSS, class, dimensions, animation timing or raw markup.

## Connect shared parts and application callbacks

```ts
import {createAnnouncementPart, createStackPart, mountParts} from '../../src/parts/index.js';
import {composeFilePreview, type PreviewInput, type PreviewCallbacks} from '../../examples/assemblies/file-preview.js';
import {composeImageViewer} from '../../examples/assemblies/image-viewer.js';

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

This standalone example has one owner and one appearance setting. In the full
application, put both dialog parts directly in the shared frame's layer children;
do not mount a second application root or put the image dialog inside preview.
The assembly oracle supplies the actual old flex application parent for exact
native-dialog geometry and computed-style comparisons.

`onFileAction(action,target)` receives one of `open`, `reveal`, `copy` or
`copy-path`, plus a frozen target and frozen nested owner. Capture the business
controller in this callback. Return `{ok:true}`, `{ok:false,error}`, or a promise;
native picker cancellation should retain the host's existing cancellation
handling. A UI callback never invents a browser fallback or re-reads another
conversation. `onCopyCode(text)` and `onImage({src,alt})` also contain data only.
No callback receives a DOM node or browser event.

## Content and state updates

Call `preview.update(state)` when a current request produces content. The input
may omit `content`; the initial viewport then shows `Loading preview…`.
`fail(message)` retains the current file identity and presents the error. A
later normal state clears the error and can change content kind. The original
name, path, capabilities and immutable owner target do not change through a
content snapshot.

The local recipe encodes source as UTF-8 and uses the original fixed 256 KiB
rendering windows, backing up to a character boundary and preferring a complete
line in the latter half of a window. This is a content algorithm, not a formal
component option or file acceptance limit. `PaginationPart` only receives the
current zero-based page, total, optional note and `onPage` callback. It never
owns source text or a configurable page size.

Single-page Markdown uses the sanitized Markdown part. Multi-page Markdown
uses literal preformatted source and the `Plain text preview` status so page
boundaries cannot change fenced-code meaning. Diff uses the diff part and
`Proposed file changes` accessible label. The truncated notice remains the
original first-8-MiB message. The host still determines what bytes are loaded.

Identical kind/text snapshots retain the current page, native content node,
selection and scroll. New source or kind rebuilds the corresponding content
and starts at its first page. Image snapshots keep the native image and route
activation to the shared image-viewer controller.

Open and Reveal share one pending operation and temporarily disable all file
action buttons. Copy has its own pending/copied feedback and leaves other file
actions available. Availability snapshots cannot erase a live copy operation
or the fixed copied presentation. The copy part owns the check/caption,
announcement and restoration timing.

The old `disabled` snapshot gates file actions. Markdown code-copy and image
activation remain available; the regression executes this behavior against the
actual old application as well as the assembly. Parent teardown and close
retire pending outcomes; they cannot change another file or display late errors.

## Disposal and verification

Close is terminal for this preview session, matching the old `openPreview`
lifetime. It retires its operation generation, destroys owned content/copy
feedback, releases the dialog and calls `onClose` once if it opened. Destroying
an unopened composition is silent. Destroy the shared parent to release every
sibling and its listeners. The borrowed announcement is not taken by a copy
button; disposing that required announcement also retires dependent copy
buttons. The application closes image zoom before revoking its Blob URL.

```sh
node scripts/verify-assemblies.ts
npx playwright test tests/parts-file-preview.spec.ts tests/parts-copy-button.spec.ts
```

The regression compares loading, errors, literal text, sanitized Markdown,
diff and image through actual `createApplication().files.openPreview`, in both
appearances and short/mobile viewports. It checks full meaningful-node geometry,
fonts, colors, layout, SVG, accessibility, UTF-8 paging, retained selection and
scroll, native callback targets, pending/copy feedback, recovery, close and late
outcomes. Native container regressions also prove atomic rejection without
destroying an existing literal text node or owned children.
