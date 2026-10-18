/** Usage example: the implementation is imported from the published package. */
import {mountParts, type MountPartsOptions} from "pith-ui";
import {composeProviderLogin, type RecipeResult as Result, type ProviderLoginState, type ProviderLoginCallbacks, type ProviderLoginAssembly, type ProviderLoginComposition} from "pith-ui/recipes";
export {composeProviderLogin};
export type {Result, ProviderLoginState, ProviderLoginCallbacks, ProviderLoginAssembly, ProviderLoginComposition};
export function mountProviderLogin(mount: HTMLElement,initial: Readonly<ProviderLoginState>,callbacks: ProviderLoginCallbacks = {},appearance: MountPartsOptions = {}): ProviderLoginAssembly {
  const login = composeProviderLogin(initial,callbacks);
  try {mountParts(mount,login.part,appearance);login.open();return login;}
  catch (error) {login.destroy();throw error;}
}
