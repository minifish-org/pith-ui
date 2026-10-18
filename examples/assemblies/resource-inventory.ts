/** Usage example: the implementation is imported from the published package. */
import {mountParts, type MountPartsOptions} from "pith-ui";
import {composeResourcesInventory, type ResourceKind, type ResourceEntry, type InventoryState, type ResourceTarget, type ResourceActionResult, type InventoryCallbacks, type ResourceInventoryAssembly, type ResourceInventoryComposition} from "pith-ui/recipes";
export {composeResourcesInventory};
export type {ResourceKind, ResourceEntry, InventoryState, ResourceTarget, ResourceActionResult, InventoryCallbacks, ResourceInventoryAssembly, ResourceInventoryComposition};
export function mountResourcesInventory(mount: HTMLElement, initial: Readonly<InventoryState>, callbacks: InventoryCallbacks = {}, appearance: MountPartsOptions = {}): ResourceInventoryAssembly {
  const inventory = composeResourcesInventory(initial,callbacks);
  mountParts(mount,inventory.part,appearance);inventory.open();return inventory;
}
