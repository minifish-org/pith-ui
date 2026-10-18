# Assemble saved-message branch history

Import this region from `pith-ui/recipes`. Its single implementation is
[`src/recipes/branch-history.ts`](../../src/recipes/branch-history.ts); public state, callbacks and
handles are indexed in [API.md](../../API.md).

Supply display state and data callbacks from the host. Ordinary snapshots retain local interaction state. Explicit reset/target changes and parent disposal retire pending UI outcomes; business requests and write validity remain host responsibilities.

```ts
import {
  composeBranchHistory, type HistoryState, type HistoryResult,
} from 'pith-ui/recipes';

interface ConversationTarget {id: string;revision: number}
export function buildHistory(
  originalTarget: ConversationTarget,
  initial: HistoryState,
  isCurrent: (target: ConversationTarget) => boolean,
  continueFrom: (target: ConversationTarget, nodeId: string) => Promise<HistoryResult>,
  clearOwnedHistory: () => void,
) {
  return composeBranchHistory(initial, {
    onContinue: nodeId => isCurrent(originalTarget)
      ? continueFrom(originalTarget,nodeId)
      : {ok: false,error: 'This conversation is no longer current.'},
    onClose: clearOwnedHistory,
  });
}
```

Attach the region to the existing ownership tree before opening it. See
[APP.md](../../APP.md) for shared mounting and dialog slots. The current
interaction assertions run in Chromium and WebKit in
[`parts-branch-history.spec.ts`](../../tests/parts-branch-history.spec.ts).
