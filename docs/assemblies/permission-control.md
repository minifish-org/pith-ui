# Assemble conversation permission choice

This local recipe composes a compact selector and a context note. It is not a
public permission scene or policy API. The executable source is
[`examples/assemblies/permission-control.ts`](../../examples/assemblies/permission-control.ts).
It imports only formal parts and creates no DOM, HTML or CSS.

The old contract is `src/tasks/permission-element.ts`,
`src/tasks/permission.ts:createPermissionControl` and the composer slots in
`src/workspace.ts` at `897f46a`. Desk supplies its policy and updates through
`frontend/src/task-controls.ts` at `3f1ee24`.

## Parts and placement

```text
Existing composer context row
└─ CompactSelectPart: Conversation permissions
   └─ intrinsic native label: shield / hidden caption / shared select / down

Existing composer description slot
└─ ContextNotePart: current permission description
```

The two returned opaque parts occupy their original separate slots under the
same application owner. The selector's intrinsic label anchors its shared
popup. Its description refers to the genuine text part, whose stable ID is
assigned by the library. Fonts, colors, icon sizes, maximum selector width,
padding, warning treatment and popup placement belong to the library.

The options are recipe content: `ask` / Ask before changes,
`workspace-write` / Allow workspace changes, and `full-access` / Full access.
Only the last selects the bounded warning tone for both control and note.
The recipe introduces no permission rules, confirmation modal or persistence.

## Compose and update

This compiled example shows the parts inside one owner. The full composer
recipe places `control` in its existing toolbar and `description` after the
composer form; the simple surrounding stack below demonstrates ownership.

```ts
import {
  composePermissionControl, type PermissionState,
} from '../../examples/assemblies/permission-control.js';
import {createStackPart, mountParts} from 'pith-ui';

interface PermissionController {
  change(mode: string): void;
}

export function attachPermissionChoice(
  mount: HTMLElement,
  initial: PermissionState,
  controller: PermissionController,
  appearance: 'light' | 'dark' | 'system',
) {
  const permission = composePermissionControl(initial, {
    onChange: mode => controller.change(mode),
  });
  const owner = mountParts(mount, createStackPart({
    children: [permission.control, permission.description],
  }), {appearance});
  return {owner, permission};
}
```

`update({mode,description,disabled})` explicitly projects the authoritative
selection, availability and text. This differs from an editable text draft:
each permission snapshot intentionally resets the selected value. The same
native select, visible trigger, description and icons remain attached through
metadata and tone changes. Updating appearance through the shared owner also
retains those parts and focus.

Choosing an option emits exactly one string value intent. It does not enable
tools or approve a pending action. Keep Desk's existing request, confirmation
for full access, conversation identity, cancellation and error policy in its
controller. A cancelled confirmation should render the controller's actual
mode back through `update`. Disabled prevents popup selection and closes an
already open popup.

## Lifetime and proof

Attach each returned part once. Parent destruction releases the selector's
native control, popup, listeners and note. Calling the local `destroy` handle
also releases both parts, including when they occupy different slots. Repeated
destruction and late updates cannot recreate UI or emit another change. If an
unattached composition is discarded, destroy it to release its control.

```sh
npm run check
node scripts/verify-assemblies.ts
npx playwright test tests/parts-permission-control.spec.ts
```

The permanent suite passed 38 checks across Chromium and WebKit. It compares
the actual old application control and note in
all three modes, enabled/disabled and light/dark with the opposite OS theme.
It checks native structure, SVG paths, exact geometry and computed
presentation, genuine accessible descriptions, narrow 340/480px bounds and
popup anchoring. The formal side uses a cloned native context after destroying
the old application, so old controllers cannot supply its behavior. Additional
checks cover keyboard/click intents, authoritative selection, retained native
identity/focus, disabled popup retirement, shared appearance and destruction.
