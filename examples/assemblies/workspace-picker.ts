/** Usage example: the implementation is imported from the published package. */
import {mountParts, type MountPartsOptions} from "pith-ui";
import {composeWorkspacePicker, type PickerWorkspace, type WorkspacePickerState, type WorkspacePickerResult, type WorkspacePickerCallbacks, type WorkspacePickerAssembly, type WorkspacePickerComposition} from "pith-ui/recipes";
export {composeWorkspacePicker};
export type {PickerWorkspace, WorkspacePickerState, WorkspacePickerResult, WorkspacePickerCallbacks, WorkspacePickerAssembly, WorkspacePickerComposition};
export function mountWorkspacePicker(mount: HTMLElement,initial: Readonly<WorkspacePickerState>,callbacks: WorkspacePickerCallbacks = {},appearance: MountPartsOptions = {}): WorkspacePickerAssembly {
  const picker = composeWorkspacePicker(initial,callbacks);
  try {mountParts(mount,picker.part,appearance);picker.open();return picker;}
  catch (error) {picker.destroy();throw error;}
}
