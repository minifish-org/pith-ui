# Assemble the conversation file control

Import this region from `pith-ui/recipes`. Its single implementation is
[`src/recipes/artifacts.ts`](../../src/recipes/artifacts.ts); public state, callbacks and
handles are indexed in [API.md](../../API.md).

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
