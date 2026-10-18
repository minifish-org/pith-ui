/** Usage example: the implementation is imported from the published package. */
import {mountParts, type MountPartsOptions} from "pith-ui";
import {composeBranchHistory, type HistoryNode, type HistoryState, type HistoryResult, type HistoryCallbacks, type HistoryAssembly, type HistoryComposition} from "pith-ui/recipes";
export {composeBranchHistory};
export type {HistoryNode, HistoryState, HistoryResult, HistoryCallbacks, HistoryAssembly, HistoryComposition};
export function mountBranchHistory(mount: HTMLElement,initial: Readonly<HistoryState>,callbacks: HistoryCallbacks = {},appearance: MountPartsOptions = {}): HistoryAssembly {
  const history = composeBranchHistory(initial,callbacks);
  try {mountParts(mount,history.part,appearance);history.open();return history;}
  catch (error) {history.destroy();throw error;}
}
