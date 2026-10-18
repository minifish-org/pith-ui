/** Usage example: the implementation is imported from the published package. */
import {mountParts, createAnnouncementPart, createStackPart, type MountPartsOptions} from "pith-ui";
import {composeFilePreview, type PreviewKind, type PreviewResult, type PreviewState, type PreviewTarget, type PreviewInput, type PreviewCallbacks, type FilePreviewAssembly, type FilePreviewComposition} from "pith-ui/recipes";
export {composeFilePreview};
export type {PreviewKind, PreviewResult, PreviewState, PreviewTarget, PreviewInput, PreviewCallbacks, FilePreviewAssembly, FilePreviewComposition};
export function mountFilePreview(mount: HTMLElement, input: Readonly<PreviewInput>, callbacks: PreviewCallbacks = {}, appearance: MountPartsOptions = {}): FilePreviewAssembly {
  const announcement = createAnnouncementPart({message: ''}),preview = composeFilePreview(input,callbacks,announcement);
  mountParts(mount,createStackPart({children: [announcement,preview.part]}),appearance);preview.open();return preview;
}
