# Assemble task failure and recovery actions

Import this region from `pith-ui/recipes`. Its single implementation is
[`src/recipes/task-failure.ts`](../../src/recipes/task-failure.ts); public state, callbacks and
handles are indexed in [API.md](../../API.md).

Supply display state and data callbacks from the host. Ordinary snapshots retain local interaction state. Explicit reset/target changes and parent disposal retire pending UI outcomes; business requests and write validity remain host responsibilities.

```ts
import {
  composeTaskFailure, type FailureAction, type TaskFailureState, type RecipeResult as Result,
} from 'pith-ui/recipes';
import {createStackPart, mountParts, type Part} from 'pith-ui';

interface RecoveryController {
  act(action: FailureAction, workspaceID?: string): Promise<Result>;
  reportError(message: string): void;
}

export function attachTaskFailure(
  mount: HTMLElement,
  sibling: Part,
  initial: TaskFailureState,
  controller: RecoveryController,
  appearance: 'light' | 'dark' | 'system',
) {
  const failure = composeTaskFailure(initial, {
    onAction: (action, workspaceID) => controller.act(action, workspaceID),
    onError: message => controller.reportError(message),
  });
  const owner = mountParts(mount, createStackPart({children: [sibling, failure.part]}), {appearance});
  return {owner, failure};
}
```

Attach the region to the existing ownership tree before opening it. See
[APP.md](../../APP.md) for shared mounting and dialog slots. The current
interaction assertions run in Chromium and WebKit in
[`parts-task-failure.spec.ts`](../../tests/parts-task-failure.spec.ts).
