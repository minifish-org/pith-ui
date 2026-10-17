# Assemble a cancel-first confirmation

This application-owned recipe is compiled at
[`examples/assemblies/confirmation.ts`](../../examples/assemblies/confirmation.ts).
It imports only the formal parts staging entry and is not exported from the
package as a whole-dialog API.

The old contract comes from `src/primitives.ts:createConfirmDialog` and
`src/app/workspace.ts:openConfirmation` at `897f46a`, together with Desk's
`frontend/src/confirmation.ts` and its conversation/workspace/provider/resource
callers at `3f1ee24`. The actual application creates a new generic dialog for
each owned confirmation; the shell's fixed delete container is unused here.

## Part tree

```text
DialogPart (purpose: prompt; title, optional description)
└─ FormPart (purpose: confirmation)
   ├─ TextFlowPart (role: description; literal before/strong subject/after)
   ├─ TextPart (role: hint)
   ├─ FeedbackPart (presentation: notice; tone: error)
   └─ ActionsPart
      ├─ ButtonPart (purpose: prompt; Cancel)
      └─ ButtonPart (purpose: prompt; destructive submit)
```

The text-flow part owns the inline text/strong nodes. Callers supply literal content,
not HTML or DOM fragments. The form purpose chooses the original separated
action row. The library chooses dialog, control and danger-action appearance;
the application supplies no CSS, size or animation values.

## Connect business ownership

Copy the compiled composition into the application presentation layer and keep
the target identity in the application controller:

```ts
import {mountConfirmation, type ConfirmationResult} from '../../examples/assemblies/confirmation.js';

interface ConversationTarget {id: string; title: string}
export function attachRemovalConfirmation(
  mount: HTMLElement,
  originalTarget: ConversationTarget,
  deleteOriginalConversation: (target: ConversationTarget) => Promise<ConfirmationResult>,
  isUnavailable: (target: ConversationTarget) => boolean,
  clearOwnedConfirmation: (target: ConversationTarget) => void,
  currentAppearance: 'light' | 'dark' | 'system',
) {
  return mountConfirmation(mount, {
    title: 'Delete conversation?',
    message: {
      before: 'Permanently delete ',
      subject: originalTarget.title,
      after: ', including its saved history?',
    },
    hint: 'Deleted conversation data cannot be recovered.',
    confirmLabel: 'Delete conversation',
    disabled: isUnavailable(originalTarget),
  }, {
    onConfirm: () => isUnavailable(originalTarget)
      ? {ok: false, error: 'This action is no longer available.'}
      : deleteOriginalConversation(originalTarget),
    onClose: () => clearOwnedConfirmation(originalTarget),
  }, {appearance: currentAppearance});
}
```

The business callback must recheck the original target and availability before
writing. It returns `{ok: true}` or `{ok: false, error: '...'}`. A successful
result closes only the same still-current opening. Failure remains in that
opening's feedback surface and permits an explicit retry. The recipe does not
retry or replay mutations itself.

Pass the application's current finite appearance choice to the mount argument
so an explicit dark/light setting is retained independently of the operating
system. The formal mount part applies the library's theme tokens.

`update(state)` projects content, hints, label, errors and current availability.
`disabled` blocks submission, `pending` adds external pending state, and
`closeDisabled` guards Cancel, the close icon and Escape. Snapshot updates never
override the form's own local pending guard. `open(nextState)` deliberately
retargets the confirmation, clears prior error state and retires earlier UI
results. Every opening focuses Cancel first.

## Close and destroy

`close()` cancels the current opening without a business write and retains the
tree for explicit reuse. A standalone prompt ignores backdrop clicks, matching
the old confirmation. Focus returns through the native dialog lifecycle.
`onClose` runs once for each owned opening.

Use `destroy()` when discarding the controller. It releases the complete tree
and its form/dialog/action listeners; repeated calls are harmless. Earlier
asynchronous results cannot display an error in, or close, a later opening.
Closing presentation does not cancel an already-started business write.

## Executable evidence

```sh
npx tsc --noEmit
npx playwright test tests/parts-edit-confirm.spec.ts
```

The regression compares the old factory and actual application scene against
the composition's geometry, typography, colors, SVG, action order and literal
emphasis. Separate cases verify Cancel performs no write, pending remains
single across snapshots, failures stay retryable, retargeted results are stale,
focus starts on Cancel, and destruction retires all owned UI.
