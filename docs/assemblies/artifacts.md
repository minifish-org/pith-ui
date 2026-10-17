# Assemble the conversation file control

This is an internal, compiled recipe in
[`examples/assemblies/artifacts.ts`](../../examples/assemblies/artifacts.ts), not
a public artifacts scene. The preserved contract is unit 33 in
[`docs/contracts/rc27-ui-022.md`](../contracts/rc27-ui-022.md), derived from
`src/files/panels.ts:9-105`, `src/app/files.ts` and the topbar markup in
`src/workspace.ts` at UI baseline `897f46a`. Desk owns discovery, conversation
activity, authenticated reads, native clipboard/file delivery and cancellation.

## Part tree

```text
AnchoredGroupPart (one relative wrapper; hidden state)
├─ ButtonPart (counter; file icon; count content; label/title)
└─ InspectorPart (one focusable native section)
   ├─ InspectorHeadingPart
   │  ├─ intrinsic h2 with title + count span
   │  └─ caller ButtonPart (quiet-icon; Close files)
   ├─ TextPart (surface-status; Looking for files…)
   └─ ContentViewportPart (inspector; fixed scroll/padding rules)
      ├─ StackPart (keyed cards as direct children)
      │  └─ CardPart per owner/path
      │     ├─ IconPart (file)
      │     ├─ CardBodyPart
      │     │  ├─ TextPart (strong; current name)
      │     │  └─ TextPart (path; immutable row path)
      │     └─ CompactActionsPart
      │        ├─ ButtonPart ×3 (Preview / Open / Reveal)
      │        └─ CopyButtonPart (Copy file / Copy path)
      └─ FeedbackPart (paragraph; error; explicit hidden state)
```

Every wrapper shown is an original native layout element. The heading owns its
single intrinsic heading/count structure and accepts the independently composed
close action. The inspector owns only its native section, label relationship,
fixed presentation and nonmodal dismissal. The anchored group owns only the
relative wrapper and two genuine child parts. It does not install a toggle
action; the recipe explicitly connects the counter's callback to
`inspector.open(trigger)` or `inspector.close()`.

## Connect shared dependencies and callbacks

```ts
import {createAnnouncementPart, createStackPart, mountParts} from 'pith-ui';
import {composeArtifacts, type ArtifactsCallbacks, type ArtifactsState} from '../../examples/assemblies/artifacts.js';
import {composeImageViewer} from '../../examples/assemblies/image-viewer.js';

export function attachFiles(
  mount: HTMLElement,
  state: ArtifactsState,
  callbacks: ArtifactsCallbacks,
  appearance: 'light' | 'dark' | 'system',
) {
  const announcement = createAnnouncementPart({message: ''});
  const viewer = composeImageViewer();
  const artifacts = composeArtifacts(state, callbacks, {
    announcement,
    relatedDialogs: [viewer.part],
  });
  const owner = mountParts(mount, createStackPart({children: [
    artifacts.part, announcement, viewer.part,
  ]}), {appearance});
  return {artifacts, viewer, setAppearance: owner.setAppearance, destroy: owner.destroy};
}
```

The example is a standalone boundary. In the shared application frame, place
`artifacts.part` in the topbar action row; put the announcement and image/preview
dialog parts directly among the frame's other siblings. Borrow the relevant
genuine dialog parts through `relatedDialogs`. They are not transferred into
the inspector or destroyed with it. One frame owns the appearance setting.

`onPreview(target)` requests preview through the host's existing controller.
`onFileAction(action,target)` handles `open`, `reveal`, `copy` and `copy-path`.
Both return the existing success/error result or promise. Each target and nested
owner is frozen at activation, with the current file name for its owner/path.
Callbacks receive no native element or browser event. Native cancellation stays
in Desk's handler; no UI part chooses a delivery fallback.

## State, pending operations and dismissal

Call `artifacts.update(state, callbacks?)` for a current discovery/activity
snapshot. No owner, or no files without an error, hides the control. Loading does
not fabricate a file. Errors use `!` and the original unavailable label. Counts
retain the exact singular/plural wording. Busy disables file actions while the
counter can still open the read-only inventory.

Cards key by owner/path. Repeated metadata updates keep the same native card,
path selection, content scroll and pending action. A changed display name updates
the retained name part; the next activation freezes that current name. Each
Preview/Open/Reveal action owns its own pending state. Copy has separate feedback
and never disables the other row actions. The copy content provider captures
the correct `File copied.` / `Path copied.` announcement once at activation;
later copy-mode snapshots cannot change an already pending operation's message.
The library validates this provider as synchronous text and owns copied-state
timing and restoration.

The panel focuses itself on opening. Close and Escape restore the counter's
focus; outside pointer/focus dismisses. Borrowed preview/image dialogs are
excluded from dismissal, and an open modal takes Escape first. Chromium may
blur a focused action when disabling it and dismiss this nonmodal panel;
WebKit retains panel focus. The regression compares the settled actual old and
formal result in each browser, alongside control availability.

An integrated application can replace the borrowed related dialog handles with
the local composition's `setRelatedDialogs`. This delegates to the small
InspectorPart, validates the whole genuine-handle snapshot before changing any
relationship, and does not transfer ownership. The complete Desk composition
registers each new file-preview opening before it receives focus; the shared
image viewer remains related. Destroyed dialogs retire their own borrowed
relationship automatically.

Owner changes close the panel and destroy old rows. Removing a regular-action
row retires its pending result. Parent disposal fires the group's lifecycle
callback before descendants are released, retires the local controller and
makes later updates/close/destroy harmless. It does not cancel a business action
that already started.

## Recorded old defect and disposal rule

There is one explicit correctness difference. The old scene's
`src/app/files.ts:makeArtifactCopy` only checks scene disposal and owner identity
before displaying a rejected copy. If the last copied row disappears while its
copy is pending, that rejection revives the hidden control with a stale error.
The baseline implementation is left unchanged. The new assembly destroys the
genuine copy button when its row disappears; its pending result is retired and
cannot revive the control. The permanent regression asserts both the old defect
and the formal behavior, rather than treating the old defect as a preservation
requirement. All other old presentation and correct-behavior assertions remain.

```sh
node scripts/verify-assemblies.ts
npx playwright test tests/parts-artifacts.spec.ts tests/parts-copy-button.spec.ts
```

The oracle opens the actual old topbar files control, then compares the assembly
with loading, errors, multiple cards and long scrollable inventories in both
appearances and short/mobile viewports. It measures absolute anchor placement,
all meaningful nodes, computed styles, icons, focus, accessibility relationships,
keyed retention, selection/scroll, busy operations, copy-mode updates and stale
results. The formal branch destroys all old controllers before mounting parts.
