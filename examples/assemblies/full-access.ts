/** Usage example: the implementation is imported from the published package. */
import {mountParts, type MountPartsOptions} from "pith-ui";
import {composeFullAccess, type FullAccessState, type FullAccessResult, type FullAccessCallbacks, type FullAccessAssembly, type FullAccessComposition} from "pith-ui/recipes";
export {composeFullAccess};
export type {FullAccessState, FullAccessResult, FullAccessCallbacks, FullAccessAssembly, FullAccessComposition};
export function mountFullAccess(mount: HTMLElement, initial: Readonly<FullAccessState>, callbacks: FullAccessCallbacks, appearance: MountPartsOptions = {}): FullAccessAssembly {
  const assembly = composeFullAccess(initial,callbacks); mountParts(mount,assembly.part,appearance); assembly.open(); return assembly;
}
