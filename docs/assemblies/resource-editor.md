# Assemble resource loading and editing

Import this region from `pith-ui/recipes`. Its single implementation is
[`src/recipes/resource-editor.ts`](../../src/recipes/resource-editor.ts); public state, callbacks and
handles are indexed in [API.md](../../API.md).

The host computes workspace/save availability and checks the original workspace/path before writes. A failed save retains the draft. A successful write stays successful if a subsequent inventory refresh fails.

```ts
import {mountParts} from 'pith-ui';
import {
  composeResourceEditor, type ResourceDraft, type ResourceEditorAssembly,
  type ResourceResult, type ResourceState,
} from 'pith-ui/recipes';

export function attachResourceEditor(
  mount: HTMLElement,
  original: Readonly<ResourceState>,
  writeOriginal: (target: Readonly<ResourceState>, draft: ResourceDraft) => Promise<ResourceResult>,
  refreshInventory: () => Promise<void>,
  reportRefreshFailure: (error: unknown) => void,
  clearOwnedEditor: () => void,
  appearance: 'light' | 'dark' | 'system',
): ResourceEditorAssembly {
  let editor: ReturnType<typeof composeResourceEditor>;
  editor = composeResourceEditor(original, {
    async onSubmit(draft) {
      const result = await writeOriginal(original, draft);
      if (!result.ok) return result;
      // A committed write stays successful if this following read fails.
      if (editor.isOpen()) {
        editor.close();
        try {await refreshInventory();} catch (error) {reportRefreshFailure(error);}
      }
      return result;
    },
    onClose: clearOwnedEditor,
  });
  mountParts(mount,editor.part,{appearance});editor.open();
  return editor;
}
```

```ts
import {createStackPart, mountParts} from 'pith-ui';
import {
  composeResourceEditor, composeResourceLoading,
  type ResourceCallbacks, type ResourceState,
} from 'pith-ui/recipes';

export function attachResourceLayers(
  mount: HTMLElement,
  initial: Readonly<ResourceState>,
  callbacks: ResourceCallbacks,
  appearance: 'light' | 'dark' | 'system',
) {
  const editor = composeResourceEditor(initial, callbacks);
  const loading = composeResourceLoading({kind: initial.kind, path: initial.path});
  const owner = mountParts(mount, createStackPart({children: [editor.part, loading.part]}), {appearance});
  // The caller chooses loading.open() or editor.open() after mounting, and
  // checks its own request-generation token before changing the active layer.
  return {editor, loading, setAppearance: owner.setAppearance, destroy: owner.destroy};
}
```

Attach the region to the existing ownership tree before opening it. See
[APP.md](../../APP.md) for shared mounting and dialog slots. The current
interaction assertions run in Chromium and WebKit in
[`parts-resource-editor.spec.ts`](../../tests/parts-resource-editor.spec.ts).
