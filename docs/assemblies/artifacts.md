# Assemble the conversation file control

Import this region from `pith-ui/recipes`. Its single implementation is
[`src/recipes/artifacts.ts`](../../src/recipes/artifacts.ts); public state, callbacks and
handles are indexed in [API.md](../../API.md).

The host controls file-action visibility with `state.fileActions`, for example
`{reveal: false}` for a browser runtime. Omit it to retain Open and Reveal.
Updates preserve the keyed rows, pending actions and file count.

Hosts can supply `openLabel` and `copyPathLabel` in `fileActions`, e.g.
`{reveal: false, openLabel: 'Download', copyPathLabel: 'Copy server path'}`.
Labels change presentation only; the original `open` and `copy-path` intents
and owner targets stay the same. Preview accepts the same labels; resources
can label their open intent `Copy server path` when that is the host action.

The host owns file operations and original conversation targets. Row removal and owner changes retire pending feedback. Borrowed related dialogs preserve inspector focus without transferring ownership.

```ts
import {createAnnouncementPart, createStackPart, mountParts} from 'pith-ui';
import {composeArtifacts, type ArtifactsCallbacks, type ArtifactsState} from 'pith-ui/recipes';
import {composeImageViewer} from 'pith-ui/recipes';

export function attachFiles(
  mount: HTMLElement,
  state: ArtifactsState,
  callbacks: ArtifactsCallbacks,
  appearance: 'light' | 'dark' | 'system',
) {
  const announcement = createAnnouncementPart({message: ''});
  const viewer = composeImageViewer();
  const artifacts = composeArtifacts(state, callbacks, {
    announcement,
    relatedDialogs: [viewer.part],
  });
  const owner = mountParts(mount, createStackPart({children: [
    artifacts.part, announcement, viewer.part,
  ]}), {appearance});
  return {artifacts, viewer, setAppearance: owner.setAppearance, destroy: owner.destroy};
}
```

Attach the region to the existing ownership tree before opening it. See
[APP.md](../../APP.md) for shared mounting and dialog slots. The current
interaction assertions run in Chromium and WebKit in
[`parts-artifacts.spec.ts`](../../tests/parts-artifacts.spec.ts).
