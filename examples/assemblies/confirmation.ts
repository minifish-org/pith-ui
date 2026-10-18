/** Usage example: the implementation is imported from the published package. */
import {mountParts, type MountPartsOptions} from "pith-ui";
import {composeConfirmation, type ConfirmationState, type ConfirmationResult, type ConfirmationCallbacks, type ConfirmationAssembly, type ConfirmationComposition} from "pith-ui/recipes";
export {composeConfirmation};
export type {ConfirmationState, ConfirmationResult, ConfirmationCallbacks, ConfirmationAssembly, ConfirmationComposition};
export function mountConfirmation(mount: HTMLElement, initial: Readonly<ConfirmationState>, callbacks: ConfirmationCallbacks, appearance: MountPartsOptions = {}): ConfirmationAssembly {
  const confirmation = composeConfirmation(initial,callbacks);
  try {mountParts(mount,confirmation.part,appearance);confirmation.open();return confirmation;}
  catch (error) {confirmation.destroy();throw error;}
}
