# Assemble workspace selection and folder entry

This local recipe proves contract unit [20](../contracts/rc27-ui-022.md). The
compiled implementation is
[`examples/assemblies/workspace-picker.ts`](../../examples/assemblies/workspace-picker.ts).
It imports only formal parts and creates no DOM, HTML or CSS. It is not a
package workspace-picker API.

The baseline is `src/navigation/navigation.ts:createWorkspacePicker` and
`src/app/workspace.ts:openWorkspacePicker` at `897f46a`, as called by Desk's
`frontend/src/conversations.ts` at `3f1ee24`. The application owns workspace
identity, native folder selection and all writes.

```text
DialogPart: Workspaces / A PLACE TO WORK
├─ description TextPart
├─ OptionGroupPart
│  └─ keyed OptionActionPart
│     ├─ library icon
│     ├─ intrinsic span: strong label + small description
│     └─ library chevron
└─ SeparatedGroupPart
   ├─ picker ButtonPart: folder / Choose a folder…
   ├─ LabelledDividerPart: or enter a folder path
   └─ FormPart
      ├─ screen-reader FieldLabelPart
      ├─ path InputPart
      ├─ hint TextPart
      ├─ error FeedbackPart
      └─ FooterPart: Cancel / primary Add workspace submit
```

Option groups accept only genuine option action handles. Each option remains a
single native button with the original useful intrinsic caption nodes. The
separated group and divider correspond to the existing native layout nodes;
ordinary fields gain no wrapper. Path purpose selects a native text field with
spellchecking disabled. The library owns all geometry, dashed action styling,
spacing, colors, typography and transitions. There are no arbitrary visual
options or raw DOM callbacks.

```ts
import {
  composeWorkspacePicker, type WorkspacePickerState, type WorkspacePickerResult,
} from '../../examples/assemblies/workspace-picker.js';

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

Attach the returned opaque `part` directly beneath the application's frame,
then call `open()` after the single outer mount is connected. The
[frame recipe](frame-navigation.md) demonstrates shared dialog/theme ownership.
`mountWorkspacePicker` is only the standalone internal adapter that composes,
mounts and opens. Preserve the original controller's close/select/new-conversation
wiring in the business callbacks.

`update(state)` reconciles workspace buttons by ID and updates labels, paths,
availability and feedback without replacing the input or its selection.
An omitted `error` retains the current error. Native selection calls
`onSelect(id)` independently of picker or submit; the host decides when to close
and select that workspace. The library receives no workspace ID data model.

`read()` returns the full live `{path}` draft, including leading/trailing spaces.
Submission trims only the callback payload. Native required validation remains
active, and an all-whitespace value does not start a write. Failed submission
retains the full draft. `reset(path)` explicitly changes it, clears feedback and
retires earlier picker/submit outcomes; it does not replay those operations.

Native picker and submit have separate ownership guards. Either pending action
disables the picker, Add workspace and existing workspace actions; the path
field and Cancel retain their original availability. Ordinary state snapshots
cannot release local pending. An empty picker result is cancellation and keeps
the draft. An explicit picker error is shown literally and focuses the path;
a rejected picker adds the original `You can enter the path below.` guidance.

A picked path releases picker ownership before attempting the separate submit.
It resets the input, then consults current availability. If the host became
disabled while native selection was pending, the path still appears while the
write is refused and pending is released. The host performs its own final
business restriction check, as in the example.

Success closes only this live opening once. `close()` and `destroy()` retire
the composition; create a new one for another opening. Parent destruction or
replacement performs the same retirement before descendants, so late native
picker results cannot change a later target or start a write. Saved reads stay
available after disposal. The enclosing frame keeps its appearance owner until
that frame is destroyed. `fail(message)` reports the fixed-dialog feedback
channel without changing the draft or replaying any business action.

`tests/parts-workspace-picker.spec.ts` compares the actual old application with
the composition in both engines, light/dark and desktop/mobile. It covers
populated, empty, disabled, long/unsafe-content and error states; all visible
native layout/control geometry, typography, colors, SVG and field properties
remain equal. Separate checks cover bounded native primitives, trimmed writes,
distinct selection intents, cancellation/rejection, retained drafts/selection,
pending snapshots, late disabled completion, explicit reset, closing and shared
parent disposal. The source and all TypeScript documentation examples compile.
