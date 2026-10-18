/** Usage example: the implementation is imported from the published package. */
import {mountParts, type MountPartsOptions} from "pith-ui";
import {customModelDefaults, composeCustomConnection, composeCustomConnectionLoading, type RecipeResult as Result, type CustomModel, type CustomConnectionState, type CustomModelDraft, type CustomConnectionDraft, type CustomConnectionCallbacks, type CustomConnectionAssembly, type CustomConnectionComposition, type CustomLoadingState, type CustomLoadingAssembly, type CustomLoadingComposition} from "pith-ui/recipes";
export {customModelDefaults, composeCustomConnection, composeCustomConnectionLoading};
export type {Result, CustomModel, CustomConnectionState, CustomModelDraft, CustomConnectionDraft, CustomConnectionCallbacks, CustomConnectionAssembly, CustomConnectionComposition, CustomLoadingState, CustomLoadingAssembly, CustomLoadingComposition};
export function mountCustomConnection(mount: HTMLElement,initial: Readonly<CustomConnectionState>,callbacks: CustomConnectionCallbacks = {},appearance: MountPartsOptions = {}): CustomConnectionAssembly {
  const connection = composeCustomConnection(initial,callbacks);
  try {mountParts(mount,connection.part,appearance);connection.open();return connection;}
  catch (error) {connection.destroy();throw error;}
}

export function mountCustomConnectionLoading(mount: HTMLElement,initial: Readonly<CustomLoadingState>,callbacks: {onClose?(): void} = {},appearance: MountPartsOptions = {}): CustomLoadingAssembly {
  const loading = composeCustomConnectionLoading(initial,callbacks);
  try {mountParts(mount,loading.part,appearance);loading.open();return loading;}
  catch (error) {loading.destroy();throw error;}
}
