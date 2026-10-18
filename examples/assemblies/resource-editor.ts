/** Usage example: the implementation is imported from the published package. */
import {mountParts, type MountPartsOptions} from "pith-ui";
import {composeResourceEditor, composeResourceLoading, type ResourceKind, type ResourceResult, type ResourceState, type ResourceDraft, type ResourceTarget, type ResourceCallbacks, type ResourceEditorAssembly, type ResourceEditorComposition, type ResourceLoadingState, type ResourceLoadingAssembly, type ResourceLoadingComposition} from "pith-ui/recipes";
export {composeResourceEditor, composeResourceLoading};
export type {ResourceKind, ResourceResult, ResourceState, ResourceDraft, ResourceTarget, ResourceCallbacks, ResourceEditorAssembly, ResourceEditorComposition, ResourceLoadingState, ResourceLoadingAssembly, ResourceLoadingComposition};
export function mountResourceEditor(mount: HTMLElement, initial: Readonly<ResourceState>, callbacks: ResourceCallbacks = {}, appearance: MountPartsOptions = {}): ResourceEditorAssembly {
  const editor = composeResourceEditor(initial,callbacks);
  mountParts(mount,editor.part,appearance);editor.open();return editor;
}

export function mountResourceLoading(mount: HTMLElement, initial: Readonly<ResourceLoadingState> & {readonly kind: ResourceKind; readonly path?: string}, callbacks: {onClose?(): void} = {}, appearance: MountPartsOptions = {}): ResourceLoadingAssembly {
  const loading = composeResourceLoading(initial,callbacks);
  mountParts(mount,loading.part,appearance);loading.open();return loading;
}
