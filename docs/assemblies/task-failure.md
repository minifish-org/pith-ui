# Assemble task failure and recovery actions

This application-owned recipe composes a bounded callout and ordinary text and
buttons. It is not a package export or public recovery scene. Its executable
source is [`examples/assemblies/task-failure.ts`](../../examples/assemblies/task-failure.ts).
The recipe imports only formal parts and creates no DOM, HTML or CSS.

The old contract is `src/tasks/permission.ts:createTaskFailure` and
`src/app/workspace.ts` at `897f46a`. Desk renders the state from
`frontend/src/task-controls.ts:renderRuntime` at `3f1ee24`. Recovery, model
configuration, diagnostics delivery and availability remain controller work.

## Part tree and state

```text
neutral CalloutPart: native section, polite status
├─ strong TextPart: failure message
├─ paragraph TextPart: advice
└─ StackPart: existing native action div
   ├─ secondary ButtonPart: Review and continue / Check model settings
   └─ secondary ButtonPart: Save diagnostics
```

The library owns the surface, padding, border, fonts, paragraph rhythm and
action spacing. The natural action div keeps the old parent layout without a
wrapper around each button. Message and advice are literal text, including
angle brackets or other provider content.

An initially hidden failure has no content children. The first visible update
creates them. Later hidden updates retain the existing text/action nodes;
showing it again updates the visible state. The diagnostics action is keyed
independently, so switching between Continue and Settings preserves its node
and focus. Repeated updates do not rebuild unchanged actions.

## Attach and connect callbacks

The full workspace places the opaque part in its existing composer panels.
This compiled example shows that part alongside another owned region:

```ts
import {
  composeTaskFailure, type FailureAction, type TaskFailureState, type Result,
} from '../../examples/assemblies/task-failure.js';
import {createStackPart, mountParts, type Part} from '../../src/parts/index.js';

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

`update` receives visibility, message, advice, `canContinue` and the current
workspace ID. Continue sends that workspace ID from the visible state at the
time of activation. Settings and Diagnostics send only their action. Preserve
the controller's original selected-workspace and activity checks before
recovery or export; a UI action does not grant permission to act on a different
workspace.

The original actions leave business pending/availability with the controller.
The composition therefore adds no local pending lock: a diagnostics callback
may remain unresolved while the button stays enabled. The existing activity
guard decides whether a repeated request is valid. Failed results and thrown
errors reach `onError`; they do not replace failure advice or invent a second
error surface. State changes keep the original recovery behavior.

## Lifetime and verification

The shared owner controls appearance. Destroying the local composition removes
only the failure subtree, preserving siblings. Destroying its parent retires
the local callback outcome before releasing its children. Late results and
updates cannot restore the section or report stale UI errors. Disposal is
idempotent, and an unattached composition should be destroyed when discarded.

```sh
npm run check
node scripts/verify-assemblies.ts
npx playwright test tests/parts-task-failure.spec.ts
```

The permanent suite passed 42 checks across Chromium and WebKit. It compares
actual old application failure regions in both
themes with the opposite OS theme: continue/settings, empty advice, literal
content, long advice and hidden state, plus 390/720px layouts. It compares
native structure, geometry, status semantics, text and computed presentation.
The formal side uses the actual cloned native parent after destroying the old
application. Behavioral cases cover keyed action identity/focus, hidden/show
retention, updated workspace scope, the old controller-owned pending/error
behavior, sibling preservation and parent teardown. Direct part cases preserve
caller ownership on rejected constructors, reject presentation escapes and
verify disposal once before a child password is wiped.
