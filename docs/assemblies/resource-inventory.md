# Assemble workspace resource inventory

This application-owned recipe composes formal parts; it is not a package export
or a public resource-scene API. Its compiled implementation is
[`examples/assemblies/resource-inventory.ts`](../../examples/assemblies/resource-inventory.ts).
Preservation sources are `src/files/panels.ts:createResourcesPanel`,
`src/forms/actions.ts:createResourceActions`, `src/app/resources.ts:open` and the
fixed resources dialog in `src/workspace.ts` at UI commit `897f46a`. Desk connects
these callbacks in `frontend/src/files.ts` at `3f1ee24`.

## Part tree

```text
DialogPart (purpose: feature; title Workspace resources; original workspace eyebrow)
├─ TextPart (role: description)
├─ ToolbarPart (purpose: feature)
│  └─ ButtonPart ×3 (purpose: prompt; secondary; Refresh/Add skill/Add prompt template)
├─ StackPart (natural block flow; owned section order)
│  ├─ ContentSectionPart (title Instructions)
│  │  ├─ GroupedCardPart × inherited/workspace instruction path
│  │  │  ├─ summary: IconPart(file), CardBodyPart, CompactActionsPart ×2
│  │  │  │  ├─ CardBodyPart: TextPart(strong name), TextPart(path)
│  │  │  │  ├─ CompactActionsPart: ButtonPart(Open), ButtonPart(Reveal)
│  │  │  │  └─ CompactActionsPart: ButtonPart(View / edit)
│  │  │  └─ children: DisclosurePart(purpose preview; View instructions)
│  │  │     └─ PreformattedPart (literal instruction content)
│  │  └─ ButtonPart(Create AGENTS.md), when permitted
│  ├─ ContentSectionPart (title Skills)
│  │  └─ CardPart × path
│  │     └─ IconPart(file), CardBodyPart(name, description, path),
│  │        CompactActionsPart(Open/Reveal), CompactActionsPart(Use/View / edit)
│  ├─ ContentSectionPart (title Prompt templates)
│  │  └─ CardPart × path
│  │     └─ CardBodyPart(name, description, path), CompactActionsPart(Use/View / edit)
│  └─ ContentSectionPart (title Resource notes; tone warning), when needed
│     └─ TextPart(paragraph) × diagnostic
└─ FeedbackPart (inline; error)
```

Before the first result, the stack contains a paragraph feedback part saying
`Loading workspace resources…`. Empty results use each section's original hint.
The library chooses native tags, typography, colors, section rhythm, compact
buttons, card borders, instruction-preview overflow and responsive card wrapping.
The grouped card contributes exactly the original intrinsic header `div`; plain
cards and bodies add no per-node wrappers. The old action adapter's neutral
`display: contents` wrapper is unnecessary in this composition.

## Connect callbacks to the original workspace

```ts
import {
  mountResourcesInventory, type InventoryState, type ResourceActionResult,
  type ResourceInventoryAssembly, type ResourceKind, type ResourceTarget,
} from '../../examples/assemblies/resource-inventory.js';

export function attachResources(
  mount: HTMLElement,
  initial: Readonly<InventoryState>,
  refreshOriginalWorkspace: (id: string) => Promise<ResourceActionResult>,
  createOriginalResource: (id: string, kind: ResourceKind) => Promise<ResourceActionResult>,
  editOriginalResource: (target: ResourceTarget) => Promise<ResourceActionResult>,
  nativeFileAction: (action: 'open' | 'reveal', target: ResourceTarget) => Promise<ResourceActionResult>,
  insertComposerDraft: (command: string) => void,
  focusComposer: () => void,
  clearOwnedInventory: () => void,
  appearance: 'light' | 'dark' | 'system',
): ResourceInventoryAssembly {
  const workspaceId = initial.workspace.id;
  let inventory: ResourceInventoryAssembly;
  inventory = mountResourcesInventory(mount, initial, {
    onRefresh: () => refreshOriginalWorkspace(workspaceId),
    onCreate: kind => createOriginalResource(workspaceId, kind),
    onEdit: editOriginalResource,
    onFileAction: nativeFileAction,
    onUse(target) {
      insertComposerDraft(target.kind === 'skill' ? `/skill:${target.name} ` : `/${target.name} `);
      inventory.close();
      focusComposer();
    },
    onClose: clearOwnedInventory,
  }, {appearance});
  return inventory;
}
```

Refresh retains the original workspace ID and request-generation guard. When a
read completes, check that generation and `inventory.isOpen()` before applying
`inventory.update(next)`. A failed read projects the original error state rather
than opening a different workspace. `onCreate('instructions')` retains Desk's
create-instructions write; skill/template creation opens the editor recipe.
Business callbacks still recheck task/global availability before mutations.

Each row callback receives a frozen flat target containing workspace ID, kind,
name and path. `onEdit` also applies to inherited instructions; the editor owns
the corresponding read-only decision. Native Open/Reveal keep the existing
business delivery and cancellation behavior. The recipe has no filesystem,
network or persistence access.

## Update and ownership rules

| State or operation | Rule |
| --- | --- |
| `update(next)` | Accepts only the original workspace ID. The original opening's eyebrow remains unchanged. |
| Keyed rows | A section retains cards by resource path. Reordering or metadata updates retain the card, instruction disclosure and preview. |
| Instruction content unchanged | Retains the native text node, selection and preview scroll. A real content change updates literal text. |
| Row name changes | Replaces only the target-dependent action buttons; file actions and the card keep their own operation/lifetime. |
| `loading` before first empty result | Keeps the initial loading paragraph. Once rendered, section contents follow subsequent data snapshots. |
| `canCreateInstructions` | Controls the original Create AGENTS.md action independently from the data arrays. |
| `busy` | Disables resource creation and Open/Reveal. Use and View / edit retain their original availability; business callbacks own their further checks. |
| Refresh pending | Guards repeated refresh requests while retaining the original enabled button presentation. |
| Creation pending | Disables all creation actions and survives availability snapshots. |
| File action pending | Disables Open and Reveal for that row together; metadata cannot clear the local guard. |
| Use/View callback pending | Belongs to that action button; removing or replacing its target retires its UI outcome. |
| `fail(message)` | Updates local error feedback without altering the last application snapshot returned by `read()`. |

All operation results are scoped to the live opening. A removed row, closed
inventory or discarded owner cannot display late errors or replay actions.
Native selection, focus and scroll stay attached to retained nodes. Diagnostics
are literal warning paragraphs, and all names, descriptions and paths are text.

## Dispose and verify

The close icon, native Escape/backdrop dismissal, `close()` and `destroy()` end
the owned opening, dispose its parts and operation guards, restore focus and
notify `onClose` once. Repeated disposal and later snapshots are harmless.
The shared application owner still coordinates this fixed resource surface with
other dialogs and live appearance updates. `mountResourcesInventory` is the
standalone validation/demo adapter. In the application, build the unopened
dialog and transfer its genuine part directly into the shared tree:

```ts
import {createStackPart, mountParts} from '../../src/parts/index.js';
import {
  composeResourcesInventory, type InventoryCallbacks, type InventoryState,
} from '../../examples/assemblies/resource-inventory.js';

export function attachInventoryLayer(
  mount: HTMLElement,
  initial: Readonly<InventoryState>,
  callbacks: InventoryCallbacks,
  appearance: 'light' | 'dark' | 'system',
) {
  const inventory = composeResourcesInventory(initial, callbacks);
  const owner = mountParts(mount, createStackPart({children: [inventory.part]}), {appearance});
  inventory.open();
  return {inventory, setAppearance: owner.setAppearance, destroy: owner.destroy};
}
```

Add other composed dialog parts as siblings in that same parent before mounting.
The builder takes no mount container and creates no nested theme scope. Parent
appearance changes update retained parts; parent disposal retires refresh,
creation and row operations and notifies an opened inventory once. A constructed
layer that was never opened is disposed without an `onClose` callback.
Current parity tests use the actual
baseline application parent; the complete shell assembly remains a separate
required proof. Independent behavior tests mount an ordinary container.

```sh
node scripts/verify-assemblies.ts
npx playwright test tests/parts-resource-inventory.spec.ts
npx playwright test tests/parts-resource-composition.spec.ts
```

The regression checks actual application geometry, typography, colors, SVG file
and close icons, native card/section structure, literal previews, both appearance
modes, short/mobile layouts, empty/loading/error/busy states, native selection,
disclosure and scroll retention, callback targets, pending guards, removal and
teardown. Constructor failures also prove that invalid composition cannot take
ownership of supplied valid parts. The frozen baseline contract stays unchanged.
