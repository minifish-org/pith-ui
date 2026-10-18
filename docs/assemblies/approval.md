# Assemble tool approval

Import this region from `pith-ui/recipes`. Its single implementation is
[`src/recipes/approval.ts`](../../src/recipes/approval.ts); public state, callbacks and
handles are indexed in [API.md](../../API.md).

Supply display state and data callbacks from the host. Ordinary snapshots retain local interaction state. Explicit reset/target changes and parent disposal retire pending UI outcomes; business requests and write validity remain host responsibilities.

```ts
import {
  composeApproval, type ApprovalState,
} from 'pith-ui/recipes';
import {createStackPart, mountParts, type Part} from 'pith-ui';

interface ApprovalController {
  approve(id: string, action: 'deny' | 'always' | 'allow'): void;
}

export function attachApproval(
  mount: HTMLElement,
  sibling: Part,
  initial: ApprovalState,
  controller: ApprovalController,
  appearance: 'light' | 'dark' | 'system',
) {
  const approval = composeApproval(initial, {
    onAction: (id, action) => controller.approve(id, action),
  });
  const owner = mountParts(mount, createStackPart({children: [sibling, approval.part]}), {appearance});
  return {owner, approval};
}
```

Attach the region to the existing ownership tree before opening it. See
[APP.md](../../APP.md) for shared mounting and dialog slots. The current
interaction assertions run in Chromium and WebKit in
[`parts-approval.spec.ts`](../../tests/parts-approval.spec.ts).
