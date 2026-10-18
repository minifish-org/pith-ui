# Assemble completion notices

Import this region from `pith-ui/recipes`. Its single implementation is
[`src/recipes/completion-notices.ts`](../../src/recipes/completion-notices.ts); public state, callbacks and
handles are indexed in [API.md](../../API.md).

Supply display state and data callbacks from the host. Ordinary snapshots retain local interaction state. Explicit reset/target changes and parent disposal retire pending UI outcomes; business requests and write validity remain host responsibilities.

```ts
import {composeCompletionNotices, type CompletionNoticeDisplay} from 'pith-ui/recipes';
import {createStackPart, mountParts, type Part} from 'pith-ui';

export function attachCompletionNotices(
  mount: HTMLElement,
  workspace: Part,
  initial: readonly CompletionNoticeDisplay[],
  onOpen: (id: string) => void,
  onDismiss: (runID: string) => void,
) {
  const notices = composeCompletionNotices(initial, {onOpen, onDismiss});
  const owner = mountParts(mount, createStackPart({children: [workspace, notices.part]}));
  return {owner, notices};
}
```

Attach the region to the existing ownership tree before opening it. See
[APP.md](../../APP.md) for shared mounting and dialog slots. The current
interaction assertions run in Chromium and WebKit in
[`parts-completion-notices.spec.ts`](../../tests/parts-completion-notices.spec.ts).
