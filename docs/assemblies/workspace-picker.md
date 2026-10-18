# Assemble workspace selection and folder entry

Import this region from `pith-ui/recipes`. Its single implementation is
[`src/recipes/workspace-picker.ts`](../../src/recipes/workspace-picker.ts); public state, callbacks and
handles are indexed in [API.md](../../API.md).

Supply display state and data callbacks from the host. Ordinary snapshots retain local interaction state. Explicit reset/target changes and parent disposal retire pending UI outcomes; business requests and write validity remain host responsibilities.

```ts
import {
  composeWorkspacePicker, type WorkspacePickerState, type WorkspacePickerResult,
} from 'pith-ui/recipes';

interface WorkspaceController {
  unavailable(): boolean;
  add(path: string): Promise<WorkspacePickerResult>;
  pickFolder(): Promise<{path?: string;error?: string}>;
  select(id: string): void;
  closed(): void;
}
export function buildWorkspacePicker(initial: WorkspacePickerState,controller: WorkspaceController) {
  return composeWorkspacePicker(initial, {
    onSubmit: path => controller.unavailable()
      ? {ok: false,error: 'Another operation is in progress.'}
      : controller.add(path),
    onPick: () => controller.pickFolder(),
    onSelect: id => controller.select(id),
    onClose: () => controller.closed(),
  });
}
```

Attach the region to the existing ownership tree before opening it. See
[APP.md](../../APP.md) for shared mounting and dialog slots. The current
interaction assertions run in Chromium and WebKit in
[`parts-workspace-picker.spec.ts`](../../tests/parts-workspace-picker.spec.ts).
