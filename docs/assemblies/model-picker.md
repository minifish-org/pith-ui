# Assemble the model catalog picker

Import this region from `pith-ui/recipes`. Its single implementation is
[`src/recipes/model-picker.ts`](../../src/recipes/model-picker.ts); public state, callbacks and
handles are indexed in [API.md](../../API.md).

The ordinary provider/effort selectors share the basic controls; the specialized model list remains native and multi-row. Catalog updates retain search and selection; reset explicitly changes target.

```ts
import {
  composeModelPicker, type ModelSelection, type ModelPickerState,
} from 'pith-ui/recipes';

type ModelWriteResult = {ok: true} | {ok: false; error: string};
interface ConversationTarget {id: string; revision: number}

export function attachModelPicker(
  originalTarget: ConversationTarget,
  initial: ModelPickerState,
  saveSelection: (target: ConversationTarget, selection: ModelSelection) => Promise<ModelWriteResult>,
  isCurrent: (target: ConversationTarget) => boolean,
  clearOwnedPicker: () => void,
) {
  return composeModelPicker(initial, {
    onSubmit: selection => isCurrent(originalTarget)
      ? saveSelection(originalTarget, selection)
      : {ok: false, error: 'This conversation is no longer current.'},
    onClose: clearOwnedPicker,
  });
}
```

Attach the region to the existing ownership tree before opening it. See
[APP.md](../../APP.md) for shared mounting and dialog slots. The current
interaction assertions run in Chromium and WebKit in
[`parts-model-picker.spec.ts`](../../tests/parts-model-picker.spec.ts).
