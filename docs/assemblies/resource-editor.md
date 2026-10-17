# Assemble resource loading and editing

These are application-owned composition recipes, not package exports or new
scene APIs. The compiled code is
[`examples/assemblies/resource-editor.ts`](../../examples/assemblies/resource-editor.ts).
It imports only the formal parts entry. The preservation sources are
`src/forms/resource-editor.ts`, `src/forms/dialog-frame.ts`,
`src/app/resources.ts:openEditorLoading/openEditor` and `src/app/session.ts` at
UI commit `897f46a`. The business ownership source is Desk's
`frontend/src/resource-editor.ts` at `3f1ee24`.

## Part trees

```text
DialogPart (purpose: feature; original opening's title)
├─ StackPart (natural block flow)
│  ├─ TextPart (role: path-paragraph; original path or workspace path)
│  ├─ TextPart (role: paragraph; initial read-only/busy notice, when present)
│  └─ FormPart
│     ├─ LabelledFieldPart (Name, only new skills/templates)
│     │  └─ InputPart (required name and native pattern validation)
│     ├─ FieldLabelPart (Markdown; associated with the next textarea)
│     ├─ TextareaPart (purpose: markdown; owned draft)
│     ├─ FeedbackPart (presentation: paragraph; write error)
│     └─ FooterPart
│        ├─ ButtonPart (danger; Delete resource, when initially editable/existing)
│        ├─ ButtonPart (secondary; Cancel or Close)
│        └─ ButtonPart (primary submit; Save, when initially editable)
└─ FeedbackPart (presentation: paragraph; frame error)

DialogPart (purpose: feature; loading title)
├─ FeedbackPart (presentation: paragraph; Loading… or body read error)
└─ FeedbackPart (presentation: paragraph; frame error)
```

The containing Name label owns its input and adds no field wrapper or caption
span. Markdown uses the separate associated label. Feature-dialog sizing,
responsive overflow, padding, fonts, textarea geometry, footer spacing, colors
and motion belong to the library. The outer natural-flow stack has no scene CSS.

## Wire the original target and business write

This typed example uses the compiled recipe. The application checks workspace
availability and owns persistence; the assembly owns the draft and its opening.

```ts
import {
  mountResourceEditor, type ResourceDraft, type ResourceEditorAssembly,
  type ResourceResult, type ResourceState,
} from '../../examples/assemblies/resource-editor.js';

export function attachResourceEditor(
  mount: HTMLElement,
  original: Readonly<ResourceState>,
  writeOriginal: (target: Readonly<ResourceState>, draft: ResourceDraft) => Promise<ResourceResult>,
  refreshInventory: () => Promise<void>,
  reportRefreshFailure: (error: unknown) => void,
  clearOwnedEditor: () => void,
  appearance: 'light' | 'dark' | 'system',
): ResourceEditorAssembly {
  let editor: ResourceEditorAssembly;
  editor = mountResourceEditor(mount, original, {
    async onSubmit(draft) {
      const result = await writeOriginal(original, draft);
      if (!result.ok) return result;
      // A committed write stays successful if this following read fails.
      if (editor.isOpen()) {
        editor.close();
        try {await refreshInventory();} catch (error) {reportRefreshFailure(error);}
      }
      return result;
    },
    onClose: clearOwnedEditor,
  }, {appearance});
  return editor;
}
```

`writeOriginal` must recheck the original workspace's availability before a
write, preserve its original path/kind and return `{ok: false, error}` when a
write fails. Desk's new-skill frontmatter substitution also remains in this
business callback. Do not derive a target from whichever workspace is selected
when an asynchronous callback finishes.

Connect `onDelete(target)` to the application's confirmation assembly. The
supplied target is frozen and contains the current name plus the opening's
workspace/kind/path. The confirmed operation writes `editor.read()` against that
original target with the application's remove flag. Delete is guarded while a
save or earlier asynchronous deletion callback is pending. Its own operation
does not change the original button presentation or disable Cancel.

## State and lifetime rules

| Operation or state | Preserved rule |
| --- | --- |
| Initial `content` / `name` | Initializes the draft once. Existing resources and new instructions have no Name input, so `read().name` is empty. |
| `update(next)` | Accepts only the same workspace ID/path, resource kind and resource path; never replaces draft values or field nodes. |
| `editable` / `workspaceBusy` | Makes native fields read-only and disables Save/Delete. `disabled` blocks actions independently. |
| Local save pending | Survives availability snapshots, blocks a second submission and disables Delete. Cancel remains available. |
| `error` omitted from a snapshot | Leaves the current write feedback intact. An explicit empty string clears it. |
| `fail(message)` | Reports a resource editor write error; in a loading opening, it reports the separate frame error. |
| Initial read-only notice, title and buttons | Stay structurally tied to the original opening; metadata updates do not add Save/Delete to an inherited opening. |
| `read()` after close/destroy | Returns a copy of the final saved draft. |

The native form retains required/name-pattern validation. Metadata changes keep
the same controls, input composition, focus and selection. A failed callback or
rejected promise retains the draft and displays its error. A successful callback
closes only the still-current opening. A close invalidates the presentation of
late outcomes; it never cancels, retries or replays the business write.

For asynchronous reads, create `mountResourceLoading(...)` first. Retain an
application generation token and check both that token and `loading.isOpen()`
before replacing it with the editor. `loading.update({error})` changes the body
status; `loading.fail(message)` changes the independent frame feedback. Closing
or replacing loading makes late reads ineligible to open an editor.

The application owns the shared feature-dialog slot: close/destroy the previous
opening before mounting its replacement. This same owner coordinates history,
connection-loading and other feature openings; a recipe is not a second public
scene manager. The `mountResourceEditor` and `mountResourceLoading` functions are
standalone validation/demo adapters. A shared application uses the composable
builders below, then mounts their genuine dialog parts through one theme owner.

```ts
import {createStackPart, mountParts} from 'pith-ui';
import {
  composeResourceEditor, composeResourceLoading,
  type ResourceCallbacks, type ResourceState,
} from '../../examples/assemblies/resource-editor.js';

export function attachResourceLayers(
  mount: HTMLElement,
  initial: Readonly<ResourceState>,
  callbacks: ResourceCallbacks,
  appearance: 'light' | 'dark' | 'system',
) {
  const editor = composeResourceEditor(initial, callbacks);
  const loading = composeResourceLoading({kind: initial.kind, path: initial.path});
  const owner = mountParts(mount, createStackPart({children: [editor.part, loading.part]}), {appearance});
  // The caller chooses loading.open() or editor.open() after mounting, and
  // checks its own request-generation token before changing the active layer.
  return {editor, loading, setAppearance: owner.setAppearance, destroy: owner.destroy};
}
```

`composeResourceEditor` and `composeResourceLoading` construct unopened parts.
They receive no DOM container and create no theme scope. Their explicit `open()`
works after the shared tree is mounted. Changing the owner's appearance updates
every retained layer immediately without changing field values or selection.
Destroying that parent calls the dialog disposal hook before child controls are
cleared, saves the draft and retires outstanding outcomes. Unopened layers are
disposed silently; an opened layer notifies `onClose` once.

The current parity fixture supplies the actual baseline application's parent
for the modal comparison; the complete shell assembly and shared owner remain
a separate required proof. Independent part and behavior tests use ordinary
container mounts.

## Close, destroy and verify

`close()` and `destroy()` both terminate these openings. They save the draft,
destroy the mounted tree and native/form/dialog controllers, restore focus and
deliver `onClose` once. Native Escape, backdrop dismissal, the close icon and the
footer cancellation use that same lifecycle. Repeated disposal and late updates
are harmless.

```sh
npx tsc --noEmit
npx playwright test tests/parts-resource-editor.spec.ts
npx playwright test tests/parts-resource-composition.spec.ts
```

The regression compares the actual old `createApplication().resources` editor
and loading openings with these assemblies in both appearance modes and browser
engines. It checks complete modal/control/text/button geometry, typography,
colors, SVG close icon, native label nesting, responsive overflow, both loading
error channels, read-only/busy states, validation, draft/selection identity,
pending/repeated operations, immutable target gating, failures, teardown and the
successful-write/failed-refresh boundary. The frozen rc.27 oracle is unchanged.
