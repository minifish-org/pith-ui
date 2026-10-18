/** Usage example: the implementation is imported from the published package. */
import {mountParts, type MountPartsOptions} from "pith-ui";
import {composeRename, type RenameState, type RenameDraft, type RenameResult, type RenameCallbacks, type RenameAssembly, type RenameComposition} from "pith-ui/recipes";
export {composeRename};
export type {RenameState, RenameDraft, RenameResult, RenameCallbacks, RenameAssembly, RenameComposition};
export function mountRename(mount: HTMLElement, initial: Readonly<RenameState>, callbacks: RenameCallbacks = {}, appearance: MountPartsOptions = {}): RenameAssembly {
  const assembly = composeRename(initial,callbacks); mountParts(mount,assembly.part,appearance); assembly.open(); return assembly;
}
