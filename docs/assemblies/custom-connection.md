# Assemble independent connection loading and model editing

This application-owned recipe composes formal parts. It is not a package export
or public connection/model editor API. Its compiled source is
[`examples/assemblies/custom-connection.ts`](../../examples/assemblies/custom-connection.ts),
with a runnable
[`browser example`](../../examples/assemblies/custom-connection.html).
The source imports only the formal parts entry and creates no DOM, HTML or CSS.

The old contract is `src/forms/custom-connection.ts` and
`src/app/settings.ts:openConnectionLoading/openCustomConnection` at `897f46a`.
Desk uses them in `frontend/src/custom-connections.ts:custom` at `3f1ee24`.
Both phases use the original 660px feature modal. The title is Add model
connection or Edit model connection, chosen for that opening.

## Part trees

```text
Loading: feature DialogPart
├─ paragraph FeedbackPart: Loading… or body error
└─ paragraph FeedbackPart: independent frame error

Editor: feature DialogPart
├─ StackPart
│  ├─ description TextPart
│  └─ FormPart
│     ├─ LabelledFieldPart / InputPart: connection name and required URL
│     ├─ LabelledFieldPart / SelectPart: API protocol
│     ├─ LabelledFieldPart / password InputPart: optional key
│     ├─ StackPart: application-owned model rows
│     │  └─ StackPart for each stable source index
│     │     ├─ FieldsetPart: Model N
│     │     │  ├─ LabelledFieldParts: required ID and display name
│     │     │  ├─ FieldGridPart: required context/output number fields
│     │     │  ├─ FieldGridPart: thinking/images CheckboxParts
│     │     │  ├─ advanced DisclosurePart
│     │     │  │  └─ FieldGridPart: four optional numeric price fields
│     │     │  └─ destructive Remove model ButtonPart
│     │     └─ paragraph FeedbackPart error
│     ├─ Add model ButtonPart + limits/prices hint TextPart
│     ├─ paragraph FeedbackPart form error
│     └─ FooterPart: Cancel / native submit Save connection
└─ paragraph FeedbackPart: independent frame error
```

The library decides grid columns, native fieldset, legend, nested field rhythm,
modal bounds, fonts, colors, numeric controls and transitions. Model limits and
prices are content values. The caller supplies no dimensions, CSS, HTML or
animation settings. The original row and grid containers remain useful layout
nodes; labels own their native controls without extra per-control wrappers.

## Connect the loading and editor lifecycle

Both `composeCustomConnectionLoading` and `composeCustomConnection` return an
opaque dialog part and local lifecycle handle. Place each opening under the
existing application tree. The standalone `mount…` functions are internal demo
adapters. This executable example shows the shared owner and loading replacement:

```ts
import {
  composeCustomConnection, composeCustomConnectionLoading,
  type CustomConnectionDraft, type CustomConnectionState, type Result,
} from '../../examples/assemblies/custom-connection.js';
import {createStackPart, mountParts, type Part} from '../../src/parts/index.js';

interface ConnectionController {
  load(): Promise<CustomConnectionState>;
  save(draft: CustomConnectionDraft): Promise<Result>;
  loadingClosed(): void;
  editorClosed(): void;
}

export async function attachIndependentConnection(
  mount: HTMLElement,
  applicationBody: Part,
  editing: boolean,
  controller: ConnectionController,
  appearance: 'light' | 'dark' | 'system',
) {
  const loading = composeCustomConnectionLoading({editing}, {
    onClose: () => controller.loadingClosed(),
  });
  const root = createStackPart({children: [applicationBody, loading.part]});
  const owner = mountParts(mount, root, {appearance});
  loading.open();
  try {
    const initial = await controller.load();
    if (!loading.isOpen()) return {owner};
    const editor = composeCustomConnection(initial, {
      onSubmit: draft => controller.save(draft),
      onClose: () => controller.editorClosed(),
    });
    root.replace([applicationBody, editor.part]);
    editor.open();
    return {owner, editor};
  } catch (error) {
    loading.fail(error instanceof Error ? error.message : String(error));
    return {owner};
  }
}
```

For later openings, reuse the existing parent instead of mounting another
application tree. Replacing loading destroys that owned loading part before
opening the editor. The controller still owns its request sequence and original
connection ID; a closed or superseded loading attempt must not open an editor.
Forward live theme changes through the shared owner's `setAppearance`.

## Initial models, draft and update semantics

| Input or method | Preserved rule |
| --- | --- |
| Initial `name/baseUrl/api/models/editing` | Initializes one editing target and title. Later availability snapshots do not replace these live drafts. |
| `update(state)` | Applies error and button availability. Keeps model rows, field values, price disclosure, caret and focus. |
| `read()` | Returns fresh connection/model data, including stable source indices and independent nested price objects. |
| Add model | Adds a new row with empty ID/name, 128000 context tokens and 8192 maximum output tokens. Prices stay blank and capabilities start false. |
| Remove model | Removes only that row. Source indices and Model N legends remain stable; the next index is never reused. |
| `clearSecrets()` | Explicitly clears only the key draft. Disposal also wipes its retained native value and default. |
| `fail(message)` | Uses the independent feature-frame error, not the form error. |

Existing definitions are never defaulted. Missing context/output limits remain
empty and fail native required validation until edited. Empty price fields mean
unknown prices; explicit zero remains the string `"0"`. The recipe never turns
unknown prices into free usage.

Connection name, base URL, protocol and key use the old parent draft behavior;
the recipe adds no trimming policy. Model IDs and display names are trimmed,
limits use native number fields, booleans retain thinking/image capability, and
all four price values remain strings for the existing controller's validation.

The fixed API protocols are openai-completions, openai-responses,
anthropic-messages, google-generative-ai and mistral-conversations. The optional
key placeholder differs for new versus existing endpoints. This is content and
state passed to ordinary parts, not a public provider-specific component.

## Callbacks, persistence and pending behavior

The controller owns complete model-definition metadata. Preserve its existing
merge from the original definition at `draft.models[i].sourceIndex`. A new row
has a fresh source index. Removing a row must not accidentally shift metadata
onto another model. Keep the controller's all-four-rates-or-all-blank rule and
its existing error message; the composition does not create a second pricing
validation policy.

One save stays pending across availability snapshots. Add, Remove and Save are
unavailable while it is pending. Text, numeric, capability and protocol drafts
remain editable, and Cancel remains available while pending. A disabled host
snapshot disables Cancel as before; header close still follows the ordinary
dialog lifecycle. Fields and protocol selection are not disabled by that
snapshot.

Failure keeps the key and model drafts. Success closes only the current live
opening and notifies once. If the existing callback already closes after a
committed write, the recipe's success close is idempotent. The controller owns
the original connection/generation guard, persistence, returning to settings
and distinguishing a committed write from a later refresh failure.

## Loading status and disposal

Loading has independent body and frame channels. `update({error})` replaces the
body status; omission or an empty error restores Loading…. `fail(message)` reports
a frame failure. One channel does not clear the other. Editing/title identity
is fixed for the opening.

Close, Escape, permitted backdrop dismissal and destruction release the dialog
subtree and call `onClose` once. That callback should clear the controller's
local reference. The editor's final read preserves model data with key empty,
and each read returns new nested price objects. Closing leaves siblings and the
shared owner intact. Destroying the parent retires UI outcomes before releasing
child fields and wiping the key. Late results, updates or errors cannot recreate
the opening. Unattached compositions cannot open and must be destroyed if
discarded.

```sh
npm run check
node scripts/verify-assemblies.ts
npx playwright test tests/parts-custom-connection.spec.ts
```

The maintained suite passed 60 checks across Chromium and WebKit. It compares
the actual old application editor and loading
openings in both themes, including empty/multiple models, missing limits,
unknown/free prices, disabled state, form/frame errors and each loading title.
Expanded price grids are compared at 900×568 and 390×844 with the same native
application parent. Behavior coverage includes defaults, source-index holes,
raw payloads, preserved rows/caret, pending/Cancel behavior, secret clearing,
success/failed save, isolated closed reads and shared-owner destruction.
