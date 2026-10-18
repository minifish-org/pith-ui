# Assemble independent connection loading and model editing

Import this region from `pith-ui/recipes`. Its single implementation is
[`src/recipes/custom-connection.ts`](../../src/recipes/custom-connection.ts); public state, callbacks and
handles are indexed in [API.md](../../API.md).

Use customModelDefaults for a new model only. The library owns form rows and private drafts; the host validates definitions and stores credentials. Failure retains the form.

```ts
import {
  composeCustomConnection, composeCustomConnectionLoading,
  type CustomConnectionDraft, type CustomConnectionState, type RecipeResult as Result,
} from 'pith-ui/recipes';
import {createStackPart, mountParts, type Part} from 'pith-ui';

interface ConnectionController {
  load(): Promise<CustomConnectionState>;
  save(draft: CustomConnectionDraft): Promise<Result>;
  loadingClosed(): void;
  editorClosed(): void;
}

export async function attachIndependentConnection(
  mount: HTMLElement,
  applicationBody: Part,
  editing: boolean,
  controller: ConnectionController,
  appearance: 'light' | 'dark' | 'system',
) {
  const loading = composeCustomConnectionLoading({editing}, {
    onClose: () => controller.loadingClosed(),
  });
  const root = createStackPart({children: [applicationBody, loading.part]});
  const owner = mountParts(mount, root, {appearance});
  loading.open();
  try {
    const initial = await controller.load();
    if (!loading.isOpen()) return {owner};
    const editor = composeCustomConnection(initial, {
      onSubmit: draft => controller.save(draft),
      onClose: () => controller.editorClosed(),
    });
    root.replace([applicationBody, editor.part]);
    editor.open();
    return {owner, editor};
  } catch (error) {
    loading.fail(error instanceof Error ? error.message : String(error));
    return {owner};
  }
}
```

Attach the region to the existing ownership tree before opening it. See
[APP.md](../../APP.md) for shared mounting and dialog slots. The current
interaction assertions run in Chromium and WebKit in
[`parts-custom-connection.spec.ts`](../../tests/parts-custom-connection.spec.ts).
