/** Usage example: the implementation is imported from the published package. */
import {mountParts, type MountPartsOptions} from "pith-ui";
import {thinkingLabel, composeModelPicker, type ModelSelection, type ModelProvider, type ModelEntry, type ModelCatalog, type ModelPickerState, type ModelPickerCallbacks, type ModelPickerAssembly, type ModelPickerComposition} from "pith-ui/recipes";
export {thinkingLabel, composeModelPicker};
export type {ModelSelection, ModelProvider, ModelEntry, ModelCatalog, ModelPickerState, ModelPickerCallbacks, ModelPickerAssembly, ModelPickerComposition};
export function mountModelPicker(mount: HTMLElement, initial: Readonly<ModelPickerState>, callbacks: ModelPickerCallbacks = {}, appearance: MountPartsOptions = {}): ModelPickerAssembly {
  const picker = composeModelPicker(initial,callbacks);
  try {mountParts(mount,picker.part,appearance);picker.open();return picker;}
  catch (error) {picker.destroy();throw error;}
}
