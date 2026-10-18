/** Usage example: the implementation is imported from the published package. */
import {mountParts, type MountPartsOptions} from "pith-ui";
import {composeImageViewer, type ImageViewerInput, type ImageViewerCallbacks, type ImageViewerComposition} from "pith-ui/recipes";
export {composeImageViewer};
export type {ImageViewerInput, ImageViewerCallbacks, ImageViewerComposition};
export function mountImageViewer(mount: HTMLElement,callbacks: ImageViewerCallbacks = {},appearance: MountPartsOptions = {}): ImageViewerComposition {
  const viewer = composeImageViewer(callbacks);mountParts(mount,viewer.part,appearance);return viewer;
}
