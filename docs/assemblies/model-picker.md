# Assemble the model catalog picker

This is an application-owned composition recipe, not a package export or a new
whole-scene API. Its compiled implementation is
[`examples/assemblies/model-picker.ts`](../../examples/assemblies/model-picker.ts),
and the runnable browser example is
[`examples/assemblies/model-picker.html`](../../examples/assemblies/model-picker.html).
The implementation imports UI capabilities only from the formal parts staging
entry. It creates no HTML, CSS, DOM nodes or selectors.

The old contract comes from `src/forms/panels.ts:createModelPicker`,
`src/forms/model-editor.ts:createModelEditor` and
`src/app/settings.ts:openModels` at UI commit `897f46a`, together with Desk's
`frontend/src/settings.ts:openModelPicker` at `3f1ee24`. The actual application
uses a standard 500px-bounded modal. Its native six-row model list is retained.

## Part tree

```text
DialogPart (purpose: form; title and catalog eyebrow)
└─ FormPart
   ├─ FieldLabelPart: Provider
   ├─ SelectPart: provider
   ├─ FieldLabelPart: Model
   ├─ InputPart: search
   ├─ FieldLabelPart: Choose model, screen-reader only
   ├─ ChoiceListPart: native six-row model list
   ├─ TextPart: capabilities hint, polite announcement
   ├─ FieldLabelPart: Thinking effort
   ├─ SelectPart: effort, described by capabilities
   ├─ TextPart: catalog hint
   ├─ FeedbackPart: inline error
   └─ FooterPart
      ├─ ButtonPart: Cancel
      └─ ButtonPart: primary Use model, native submit
```

The library chooses the native tags, shared dropdown surface, font, spacing,
colors, six-row list geometry, modal bound, action presentation and transitions.
The recipe supplies content, legal states and callbacks. Fields and labels are
independent native parts; they do not acquire an extra wrapper per control.

## Connect the application controller

Copy the maintained recipe into the application's presentation layer, then
provide catalog state and existing business callbacks. `composeModelPicker`
builds without mounting or opening. Attach its opaque `part` as a direct child
of the shared frame, mount that frame once, then call `open()`:

```ts
import {
  composeModelPicker, type ModelSelection, type ModelPickerState,
} from '../../examples/assemblies/model-picker.js';

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

The caller retains conversation identity, revision, availability, selected
provider/model persistence and refresh ownership. Check the original target
again before a write. Return `{ok: true}` or `{ok: false, error}`; rejected
promises also enter the owned error feedback. The recipe never starts a model
request, persists credentials or retries a business write.

The [frame recipe](frame-navigation.md) demonstrates one outer `mountParts` and
appearance owner for the application and all dialogs. Appearance updates reach
this dialog through that shared mount. `mountModelPicker` remains the standalone
internal example adapter; it composes, mounts and opens in that order. It is not
used to create a second mount inside an integrated application. The caller
supplies no palette, CSS token or internal style override.

## Catalog, draft and reset rules

| Input or method | Ownership and update rule |
| --- | --- |
| `editor.providers` and `editor.models` | Catalog metadata, projected only when their signature changes. Stable choice values retain the actual native option/control. |
| Initial `editor.selection` | Initializes provider, model and thinking effort. It is not a command to overwrite a live selection on every snapshot. |
| `update(state)` | Retains search text, caret, focus, model and effort while applying catalog, error and availability changes. |
| `read()` | Returns a fresh `{provider, model, thinkingLevel}` value, including the last selection after disposal. |
| `reset(selection)` | Explicitly changes the target selection, clears search and retires the previous submit outcome. |
| `focus()` | Focuses the native search field through its part handle. |
| `disabled` | Blocks submission; ordinary updates cannot release local form pending. Omission in a full snapshot means available again. |
| `editor.disabled` | Independently controls catalog field availability, preserving the old distinction from submit availability. |
| `loading` | Adds submission pending. Once the editor exists, a loading snapshot does not replace the live catalog or draft. |

Before the first editor arrives, the provider is the old native disabled
`Loading providers…` choice, the native model list is empty and disabled, and
the empty effort choice remains visible. Search can accept text but has no
catalog-filter behavior yet. First catalog arrival initializes selection and
clears that initial search, exactly as the old editor did. The formal choice's
loading-to-ready transition adopts the shared dropdown without replacing the
native field identity or adding another wrapper.

After initialization, search filters names and IDs but retains the currently
selected model even when it does not match the query. Changing provider clears
search and chooses its saved/default model and effort. Effort falls back to
high, then medium, then the first supported value. A model without explicit
levels uses off; a single effort value hides its label and shared dropdown.
Capabilities announce text/image support and formatted context/output limits.

Submission stays single while pending, including across availability updates.
Failure keeps the selection and search. A successful result closes only the
same live opening and selection revision. Explicit reset, close or destruction
retires previous UI outcomes; it does not cancel or replay a write already
started by the controller.

## Close and destroy

This recipe owns one opening. `close()` and `destroy()` both close and release
the owned dialog tree once, retaining a readable last selection and notifying
`onClose` once. Native close, Escape and permitted backdrop dismissal use the
same lifecycle. Focus returns through the library's native dialog handling.
To open a new target after disposal, create a new local recipe instance.

Disposal releases form pending state, input/select controllers, label listeners,
buttons, feedback and dialog listeners. Parent destruction or replacement calls
the same retirement before descendants are disposed, so pending results and
later snapshots remain quiet. In an integrated application the enclosing frame
and its appearance owner remain until their own destruction. A standalone mount
releases its appearance ownership with its root. The dialog cannot open before
its checked mount is connected.

## Executable evidence

```sh
npm run check
npx playwright test tests/parts-model-picker.spec.ts
npx playwright test tests/parts-composition-ownership.spec.ts
```

The maintained suite passed 54 checks across Chromium and WebKit. It compares
the actual old application scene against the assembly in true light/dark
appearance at 900×600, 1280×800, 1440×900 and 390×844, including original control
geometry, typography, colors and screen-reader label placement. Additional
comparisons cover initial loading, disabled, error, empty/null catalog, long
content and single-effort states. Behavior checks cover search-before-catalog,
live search/selection preservation, provider changes, native validation,
duplicate prevention, failed submit, explicit reset, stale success, close,
focus and complete teardown. The frozen rc.27 oracle remains unchanged.
