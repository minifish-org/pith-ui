/** Usage example: the implementation is imported from the published package. */
import {mountParts, type MountPartsOptions} from "pith-ui";
import {composeAttachments, type AttachmentItem, type AttachmentsState, type AttachmentsCallbacks, type AttachmentsComposition} from "pith-ui/recipes";
export {composeAttachments};
export type {AttachmentItem, AttachmentsState, AttachmentsCallbacks, AttachmentsComposition};
export function mountAttachments(mount: HTMLElement,state: Readonly<AttachmentsState>,callbacks: AttachmentsCallbacks = {},appearance: MountPartsOptions = {}): AttachmentsComposition {
  const attachments = composeAttachments(state,callbacks);mountParts(mount,attachments.part,appearance);return attachments;
}
