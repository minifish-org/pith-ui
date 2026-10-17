# Desk's local assembly and coordination

This is the executable map from the rc.27 Desk calls to the verified small-part
recipes. `examples/assemblies/desk.ts` is local application code. It is excluded
from the npm exports. After the constrained UI package is published, this file
and the region recipes move into Desk; only their imports of formal parts
change to the exact installed `pith-ui` version. The state, requests, saved
configuration and conversations stay in their existing Desk controllers.

The library supplies no application, workspace, settings or resource scene.
This local controller owns which parts to compose and which opening to retire.

## The one ownership tree

```text
FramePart
├─ SideRailPart: Brand, rail heading, title search, keyed navigation, utilities
├─ MenuPart + DrawerPart
├─ MainPart
│  ├─ TopbarPart
│  │  ├─ drawer trigger + BreadcrumbPart
│  │  └─ TopbarActionsPart: Compact + explicit artifacts composition
│  ├─ reader SearchToolbarPart
│  ├─ ReadingRegionPart
│  │  ├─ ReadingViewportPart: Welcome composition + ReadingColumnPart
│  │  └─ latest button
│  └─ ComposerRegionPart
│     ├─ ComposerPanelsPart
│     │  ├─ approval
│     │  ├─ StatusActionsPart: literal span + text action button
│     │  ├─ banner FeedbackPart: inline error
│     │  ├─ task failure
│     │  ├─ runtime disclosure + request ledger
│     │  └─ pending-message list
│     ├─ composer form, native picker, attachments, input and actions
│     └─ image guidance + permission description
├─ completion-notice composition
├─ shared AnnouncementPart
├─ native DownloadPart
├─ shared image DialogPart
└─ active fixed / feature / OAuth DialogParts, as direct siblings
```

There is one `mountParts` call and one theme owner. A local frame helper replaces
the direct overlay children and preserves the main, announcement and controls.
It adds no wrapper or additional style scope. Topbar actions retain their
original auto margin, fixed shrink behavior and no wrapping.
The formal frame anchors its viewport origin independently of an ordinary host
body margin. Its root uses absolute positioning; the old shell used normal
flow under a reset body. The complete-frame regression explicitly asserts both
mechanisms and then checks identical viewport bounds and all region geometry.

## Executable starting point

The host is provided by Desk. This example supplies data and callbacks only.
The native mount is the sole DOM argument.

```ts
import {mountDesk} from '../../examples/assemblies/desk.js';

declare const mount: HTMLElement;
const desk = mountDesk(mount, {
  brand: {name: 'Pith', qualifier: 'Desk', mark: {symbol: 'pith', alt: ''}},
  appearance: 'light',
  workspace: {
    onBusyAction(id) { console.log('select the existing running conversation', id); },
    onAction(action) { console.log('existing action controller', action); },
    onSubmit(text) { console.log('existing send controller', text); return {ok: true}; },
  },
  onUIStateChange(state) { console.log('read acknowledgement gate', state.hasModal); },
});
desk.workspace.updateNavigation({groups: [], empty: 'workspaces'});
desk.workspace.updateShell({
  workspace: 'No workspace', conversation: 'New conversation', reconnecting: false,
  busy: null, error: {message: ''},
});
desk.workspace.updateWelcome({hasApiKey: false,hasConnections: false,modelName: ''});
desk.workspace.updateConversation({id: '',messages: [],working: false});
desk.workspace.updateComposer({action: 'send',actionDisabled: true});
desk.workspace.updateAvailability({busy: false,global: false,active: false,conversations: [],workspaces: []});

const loading = desk.resources.openEditorLoading({kind: 'skill'});
const editor = desk.resources.openEditor({
  workspaceId: 'original-workspace',workspacePath: '/original/workspace',kind: 'skill',
  content: '# Existing draft',editable: true,workspaceBusy: false,
}, {onSubmit(draft) { console.log('write using original target', draft); return {ok: true}; }});
// The feature slot replaces Loading with the editor before the next snapshot.
console.assert(!loading.isOpen() && editor.isOpen());
editor.close();
desk.destroy();
```

## Old call to local recipe

| Existing Desk opening | Explicit local recipe | Slot |
| --- | --- | --- |
| `workspace.openWorkspacePicker` | `composeWorkspacePicker` | workspace |
| `workspace.openRename` | `composeRename` | rename |
| `workspace.openFullAccess` | `composeFullAccess` | permissions |
| `workspace.openHistory` | `composeBranchHistory` | shared feature |
| `workspace.openMessageEditor` | `composeTextEditor`, message purpose | message |
| `workspace.openQueueEditor` | `composeTextEditor`, queue-message purpose | queue |
| `workspace.openConfirmation` | `composeConfirmation`; map action and description to its content | confirmation |
| `settings.openSettings` | `composeSettings` | settings |
| `settings.openConnections` | `composeMCPConnections` | connections |
| `settings.openModels` | `composeModelPicker` | model |
| `settings.openConnectionLoading` | `composeCustomConnectionLoading` | shared feature |
| `settings.openCustomConnection` | `composeCustomConnection` | shared feature |
| `settings.openProviderLogin` | `composeProviderLogin` | independent OAuth |
| `resources.open` | `composeResourcesInventory` | resources |
| `resources.openEditorLoading` | `composeResourceLoading` | shared feature |
| `resources.openEditor` | `composeResourceEditor` | shared feature |
| `files.openPreview` | `composeFilePreview`, shared announcement and image callback | preview |

The UI-facing names remain local migration helpers. They are not exported by
the package. Each region's accompanying document contains its part tree,
compiled composition, state projection and operation retirement rules.

## State and callback connections

`updateShell` preserves omitted breadcrumb fields. Busy state updates the
current key and the same span/button; clearing it hides the retained row.
Its action calls the existing `onBusyAction(key)` handler. The inline error uses
the exact banner presentation, `role="alert"`, and hides for either an empty
message or an explicit hidden flag. It occupies its original panels position.

`updateAvailability` projects the host mutation and the existing scoped run
state. Navigation menus use their own conversation/workspace ID. An unrelated
idle conversation remains editable while another conversation runs. Global
model selection and Compact retain their original constraints. Task recovery
uses its current workspace ID against running workspaces, falling back to the
active scope when that ID is absent; host busy also disables Continue.
Settings and Diagnostics are not gated by that recovery scope. Message action
availability remains the separate `updateMessageAvailability` snapshot;
global/active running state does not invent a prohibition on historical copies.
The old copy controller's busy option affects its pending/restoration state,
not whether it invokes its callback. The assembly preserves that behavior.

`updateConversation` closes the shared image viewer before changing owner,
clears obsolete image URLs through the body recipe, closes request breakdown
and clears its ledger. Reader positions and tool folds are retained per
conversation and pruned together. The existing costs controller still decides
when to fetch a ledger using `readCosts`; only its projected content moves.

The frame's `hasModal` checks only its own native dialog descendants. Opening,
closing, native Escape and viewer changes feed the same boolean change
notification used by Desk's completion read acknowledgement and native menu.
An unrelated modal outside the frame has no effect. The final destroyed state
is false. Appearance is local to the one checked mount.

Before a file preview opens, the local coordinator borrows that opening's
genuine DialogPart in the artifact inspector alongside the shared viewer.
Focus and pointer interaction in those related dialogs retain the open file
panel. Replacing or destroying a preview removes its borrowed relationship;
the inspector never takes ownership of either dialog. Each relationship update
validates the complete snapshot before releasing the previous one.

`downloadFile({blob,name})` delegates to the small native DownloadPart. It keeps
the original filename, returns the original success/failure protocol, retires
object URLs after the fixed library delay and revokes all outstanding URLs on
destruction. The local recipe creates no link or DOM node.

## Opening ownership and destruction

The local slot map and opening sequence are the old application's ownership
algorithm. The shared feature slot covers branches, resource loading/editor and
custom-connection loading/editor. OAuth has a separate slot. Replacing an
opening retires its old callbacks and async outcomes before activating its
successor. A close callback may synchronously open another surface: that nested
opening wins over the superseded outer attempt. Stale methods cannot close or
write into it. Host close exceptions are reported safely after retirement.

Root destruction marks the coordinator disposed before descendants retire.
Close callbacks still run once, but cannot reopen the disposed application.
Native listeners, image URLs, download URLs, pending operations and delayed
feedback all belong to the part tree and are released by its one owner.

```sh
node scripts/verify-assemblies.ts
npx playwright test tests/parts-desk.spec.ts
```

The permanent test executes actual old calls first, then the formal local
assembly. It covers native status/banner/header parts, explicit themes, busy
targets, scoped availability, native download retirement, modal observation,
fixed/feature reentrant replacement, independent OAuth, native dismissal,
image owner changes and terminal teardown with throwing host cleanup.
