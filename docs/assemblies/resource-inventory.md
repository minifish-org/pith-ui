# Assemble workspace resource inventory

Import this region from `pith-ui/recipes`. Its single implementation is
[`src/recipes/resource-inventory.ts`](../../src/recipes/resource-inventory.ts); public state, callbacks and
handles are indexed in [API.md](../../API.md).

Callbacks retain the displayed workspace and resource target. The host owns fetching and decides whether creation and writes are available. Keyed snapshots preserve rows, selection and disclosure state.

Skill rows display the name, path and actions without the description. The supplied description remains in inventory state. Narrow layouts place actions below the metadata so names retain readable width.

```ts
import {mountParts} from 'pith-ui';
import {
  composeResourcesInventory, type InventoryState, type ResourceActionResult,
  type ResourceInventoryAssembly, type ResourceKind, type ResourceTarget,
} from 'pith-ui/recipes';

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
  let inventory: ReturnType<typeof composeResourcesInventory>;
  inventory = composeResourcesInventory(initial, {
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
  });
  mountParts(mount,inventory.part,{appearance});inventory.open();
  return inventory;
}
```

```ts
import {createStackPart, mountParts} from 'pith-ui';
import {
  composeResourcesInventory, type InventoryCallbacks, type InventoryState,
} from 'pith-ui/recipes';

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

Attach the region to the existing ownership tree before opening it. See
[APP.md](../../APP.md) for shared mounting and dialog slots. The current
interaction assertions run in Chromium and WebKit in
[`parts-resource-inventory.spec.ts`](../../tests/parts-resource-inventory.spec.ts).
