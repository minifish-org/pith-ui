# Assemble message and pending-message editors

This is an application-owned composition recipe. It is not a package export or
a replacement whole-dialog API. The compiled implementation is
[`examples/assemblies/text-edit.ts`](../../examples/assemblies/text-edit.ts); it
imports only the staging entry for the formal parts.

The preservation sources are `src/primitives.ts:createTextEditDialog` and
`src/app/workspace.ts:openEditor` at UI commit `897f46a`. Desk uses the message
opening in `frontend/src/message-editor.ts` and the pending opening in
`frontend/src/composer.ts` at `3f1ee24`. The application scene creates a fresh
generic dialog; it does not reuse the shell's unused fixed editor containers.

## Part tree

```text
DialogPart (purpose: prompt; title, description, close availability)
└─ FormPart (purpose: text-entry; pending/error/submit callbacks)
   ├─ FieldGroupPart
   │  ├─ FieldLabelPart (associated with the textarea)
   │  └─ TextareaPart (purpose: message or queue-message)
   ├─ TextPart (role: muted-paragraph; note)
   ├─ FeedbackPart (presentation: notice; tone: error)
   └─ ActionsPart
      ├─ ButtonPart (purpose: prompt; Cancel)
      └─ ButtonPart (purpose: prompt; primary submit)
```

The field group contributes the single original label/control wrapper. The
library chooses typography, colors, padding, control geometry, dialog size,
message/queue textarea shape, error surface, button presentation and transitions.
No recipe chooses classes, CSS, dimensions or animation parameters.

## Connect application state and callbacks

Copy the compiled recipe into the application's presentation layer, then supply
the ordinary mount container, current content and business callbacks:

```ts
import {mountTextEditor, type TextEditorResult} from '../../examples/assemblies/text-edit.js';

interface MessageTarget {conversationId: string; messageId: string; expectedLastMessageId: string; text: string}
export function attachMessageEditor(
  mount: HTMLElement,
  originalTarget: MessageTarget,
  saveEditedMessage: (target: MessageTarget, text: string) => Promise<TextEditorResult>,
  refreshAvailability: () => void,
  clearOwnedEditor: (target: MessageTarget) => void,
  currentAppearance: 'light' | 'dark' | 'system',
) {
  return mountTextEditor(mount, {
    title: 'Edit message',
    value: originalTarget.text,
    submitLabel: 'Send again',
    note: 'Send again to replace this message and its following replies.',
  }, {
    purpose: 'message',
    onInput: refreshAvailability,
    onSubmit: text => saveEditedMessage(originalTarget, text),
    onClose: () => clearOwnedEditor(originalTarget),
  }, {appearance: currentAppearance});
}
```

For a pending message, choose `purpose: 'queue-message'`, the label
`Edit pending message`, and the action `Save message`. The purpose is semantic;
the textarea's dimensions remain library decisions.

Forward the application's finite appearance choice through the last mount
argument. This preserves an explicit dark/light preference even when the
operating system has a different preference; no theme CSS is added by the caller.

The caller retains the original conversation/message identity and verifies it
again before writing. `onSubmit` returns `{ok: true}` or
`{ok: false, error: '...'}`. A rejected promise is also shown through the owned
feedback part. Success closes only the still-current opening; failure preserves
its draft. The recipe never performs persistence or retries a business write.

| Input | Ownership and update rule |
| --- | --- |
| Initial `value` | Becomes the owned textarea draft. |
| `update(state)` | Projects metadata, error and availability; never replaces the draft or textarea node. |
| `read()` | Returns the current draft, including after close or destruction. |
| `reset(value)` | Explicitly replaces the draft and retires the previous submit outcome. |
| `open(input)` | Opens or retargets the owned dialog, clears old error state and resets the value explicitly. |
| `disabled` | Blocks submission while preserving the field's existing availability. |
| `inputDisabled` | Independently disables the native field when the application requires it. |
| `pending` | Adds external pending state to the form's own local pending guard. |
| `closeDisabled` | Guards the close icon, Cancel and native Escape dismissal. |

Repeated availability updates cannot clear the form's local pending guard. A
close, reset, retarget or destruction invalidates UI ownership of older results.
It does not cancel or replay a write that the business callback already started.
The native field retains composition, selection and focus across metadata-only
updates. Explicit reset is the operation that changes its value.

## Close and dispose

`close()` closes the current opening and returns focus through the dialog
lifecycle, retaining the owned tree for an explicit later `open()`. A standalone
prompt ignores backdrop clicks, matching the original editor. Native Escape and
the close icon use the same lifecycle. `onClose` is delivered once for an owned
opening.

Call `destroy()` when the application discards the editor. It releases the
mounted tree, form operation, native field controller, buttons and dialog
listeners. Repeated destruction is harmless, and later results cannot update or
reopen it. Destroying presentation does not undo an application write.

## Executable evidence

```sh
npx tsc --noEmit
npx playwright test tests/parts-edit-confirm.spec.ts
```

The tests compare both the old factory and the actual `createApplication`
message/queue scenes with the assembly, including layout, typography, colors,
error surface, icons, labels and native textarea purpose. They separately verify
draft/composition/selection preservation, pending guards, failures, explicit
reset, target replacement, close guards, focus return and teardown. The frozen
rc.27 oracle remains unchanged.
