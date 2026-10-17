# Assemble the MCP inventory and connection editor

This is an application-owned composition, not a package export or public MCP
scene API. The compiled recipe is
[`examples/assemblies/mcp.ts`](../../examples/assemblies/mcp.ts); the runnable
example is [`examples/assemblies/mcp.html`](../../examples/assemblies/mcp.html).
The recipe imports only the formal parts entry and creates no DOM, HTML or CSS.

The old contract is `src/forms/panels.ts:createMCPConnectionsPanel` and
`createMCPConnectionList`, plus `src/app/settings.ts:openConnections` at
`897f46a`. Desk rc.27 calls it from
`frontend/src/settings.ts:openConnections`, `loadMCP`, `editMCP` and `saveMCP`
at `3f1ee24`. The actual opening uses the existing 660px feature modal.

## Part tree

```text
DialogPart (feature; Connections / EXTERNAL TOOLS)
└─ StackPart
   ├─ TextPart description
   ├─ feature ToolbarPart: Refresh
   ├─ StackPart: loading caption, or retained inventory StackPart
   │  └─ keyed CardPart (stacked), for each connection
   │     ├─ CardHeadingPart: strong name TextPart
   │     ├─ path TextPart + availability caption TextPart
   │     ├─ paragraph StatusPart + saved-key caption TextPart
   │     ├─ paragraph FeedbackPart error
   │     └─ CompactActionsPart: sign in/out, edit, enable/disable, delete
   ├─ FeedbackPart inventory error
   └─ SeparatedSectionPart
      ├─ SectionHeadingPart: Add/Edit TextPart + New connection ButtonPart
      └─ FormPart
         ├─ FieldLabelPart / InputPart: name
         ├─ FieldLabelPart / SelectPart: HTTP or local command
         ├─ StackPart: HTTP fields, hidden and disabled when inactive
         │  ├─ label / URL InputPart + OAuth CheckboxPart
         │  ├─ advanced DisclosurePart: client/scope LabelledFieldParts + hint
         │  └─ label / password InputPart + remove-token checkbox + hint
         ├─ StackPart: stdio fields, hidden and disabled when inactive
         │  ├─ label / executable InputPart
         │  ├─ label / JSON TextareaPart + installation hint
         │  ├─ SecretLabelPart + separate secret TextareaPart
         │  └─ privacy hint + saved-key hint + clear-environment CheckboxPart
         ├─ enabled CheckboxPart + FeedbackPart form error
         └─ FooterPart: Close / native submit Save connection
```

The library owns native tags, typography, spacing, card borders, JSON textarea
size, masking, modal bounds and transitions. The secret label borrows a genuine
secret textarea; it adds only the original label/action row. Each control keeps
its native identity. There is no new wrapper around every field.

## Connect the existing controller

`composeMCPConnections` returns an opaque dialog part and local lifecycle handle.
Attach that part to the application's existing tree, then call `open()`. The
application retains one mount and appearance owner. `mountMCPConnections` is
only the standalone internal example adapter.

```ts
import {
  composeMCPConnections, type MCPAction, type MCPConnection,
  type MCPDraft, type MCPState, type Result,
} from '../../examples/assemblies/mcp.js';
import {createStackPart, mountParts, type Part} from 'pith-ui';

interface ConnectionsController {
  save(draft: MCPDraft): Promise<Result>;
  action(action: MCPAction, target: Readonly<{name: string}>): Promise<Result>;
  refresh(): Promise<Result>;
  newEditor(): void;
  connections(): readonly MCPConnection[];
  closed(): void;
}

export function attachConnections(
  mount: HTMLElement,
  applicationBody: Part,
  initial: MCPState,
  controller: ConnectionsController,
  appearance: 'light' | 'dark' | 'system',
) {
  const connections = composeMCPConnections(initial, {
    onSubmit: draft => controller.save(draft),
    onConnectionAction: (action, target) => controller.action(action, target),
    onRefresh: () => controller.refresh(),
    onNew: () => controller.newEditor(),
    onClose: () => controller.closed(),
  });
  const owner = mountParts(mount,
    createStackPart({children: [applicationBody, connections.part]}),
    {appearance});
  connections.open();
  connections.setConnections(controller.connections());
  return {connections, owner};
}
```

For a later opening, attach a new local composition to the existing parent
instead of mounting another application tree. Forward live theme changes through
the shared owner's `setAppearance`. The dialog, native secret field, focus and
caret retain their identity through that change.

The controller owns inventory reads, connection identity/generation, MCP
transport, OAuth discovery, PKCE, browser delivery, token storage and business
writes. Action callbacks receive only an immutable connection name. Status text
and saved environment-key names come from the controller; saved secret values
never enter inventory state.

## Editing, transport and raw drafts

| Port | Exact ownership rule |
| --- | --- |
| `setConnections(entries)` | Reconciles cards by immutable connection name. Retains existing cards, buttons, local pending and local action errors through reorder and metadata snapshots. |
| `update(state)` | Applies inventory/form errors and action availability. Preserves all field drafts, selection, disclosure, masking and caret. It does not choose an editing target. |
| `edit(entry?)` | Explicitly retires the previous form and auxiliary outcomes, performs native form reset, conceals environment text, clears transient errors and selects the target fields. Existing names become read-only; a new name is editable. |
| `read()` | Returns a fresh plain draft. Names, URL, client ID, scopes, command and bearer token are trimmed. Arguments and environment remain byte-for-byte strings. |
| `clearBearerToken()` | Explicitly clears only the one-shot token input. |
| `clearSecrets()` | Explicitly clears token and environment inputs. |
| `fail(message)` | Reports an owned external failure through the inventory error. |

HTTP activates required URL, optional OAuth client/scope fields and bearer token.
Stdio activates required executable, JSON arguments and private JSON environment.
The inactive group's inputs, textareas and checkboxes are disabled, preserving
their draft while preventing them from blocking native validation. `read()`
still returns both groups, matching the old panel; the controller selects the
payload according to transport.

The library does not parse JSON. The existing Desk controller requires an array
of strings for arguments and an object of string values for environment
overrides. Retain its existing validation messages and payload construction.
JSON whitespace, Unicode and private edits survive metadata snapshots and failed
submissions.

Explicit edit initializes arguments with the existing pretty-printed JSON array,
restores enabled/OAuth state and saved-key removal availability, and leaves
saved token/environment values empty. It focuses name for a new connection,
URL for existing HTTP, and executable for existing stdio. OAuth disclosure state
is retained. Environment masking is explicitly reset to concealed; Show/Hide
keeps its original label, pressed state and genuine control association.

## Save, inventory actions and callback retirement

Save remains single while pending, including across disabled/available snapshots.
It reports failure in the form error and retains the draft. Success keeps the
Connections dialog open. The controller decides whether to refresh and explicitly
edit the saved entry. A later `edit` retires old save feedback without replaying
or cancelling a business write that already started.

Desk's existing save controller clears the one-shot bearer token after a failed
write while retaining the environment draft. On success it clears both secrets,
reloads inventory and edits the current saved entry only if its generation is
still current. Those calls remain controller-owned; the recipe does not add a
second automatic secret-clearing policy or close on success.

Card actions preserve their original name target through reorder. OAuth supplies
Sign in/Sign in again and optional Sign out; every row also supplies Edit,
Enable/Disable and destructive Delete. Clicking an action clears its previous
local error. Host errors take precedence on the next inventory snapshot; local
errors persist until a new action or authoritative replacement. Removing a card
destroys its pending action controllers.

Refresh and New share the existing auxiliary-operation guard. New still resets
the editor before that guard, even while a refresh callback is pending. A direct
`edit()` retires the guard for a newly selected target. No refresh polling,
network retry or transport connection starts inside the composition.

## Lifetime and executable evidence

Close, Escape, backdrop dismissal and destruction release only the dialog
subtree and notify `onClose` once; that callback should clear the controller's
local reference. The last draft remains readable with token and environment
always empty. Destruction wipes retained native secret values and defaults.

Destroying the shared owner first retires the composition's callbacks, then
releases fields and keyed actions. Late save results, inventory snapshots,
edits and failures cannot touch disposed children or recreate the dialog.
Closing a child leaves the parent and its siblings mounted. The library restores
focus through the native dialog lifecycle. An unattached composition cannot
open and must be destroyed if it is discarded.

```sh
npm run check
node scripts/verify-assemblies.ts
npx playwright test tests/parts-mcp.spec.ts
```

The maintained suite passed 54 checks across Chromium and WebKit. It compares
the actual old application opening in both themes
against the composed native nodes, complete visible geometry, SVGs, text, control
state and computed presentation. Scenarios include loading, empty inventory,
HTTP, edited HTTP/OAuth, edited stdio, disabled, form/inventory errors and a live
connection error. Expanded OAuth is compared at 900×568 and 390×844 using the
same application parent context in both versions.

Behavior checks cover transport validation, exact raw JSON payloads, secret
reveal and reset, caret preservation, immutable names, stale saves, duplicate
prevention, success staying open, keyed action pending/errors, refresh/New
guarding, explicit secret clearing and shared-owner disposal during save.
