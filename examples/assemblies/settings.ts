/** Usage example: the implementation is imported from the published package. */
import {mountParts, type MountPartsOptions} from "pith-ui";
import {composeSettings, type Appearance, type RecipeResult as Result, type SettingsState, type SettingsDraft, type SettingsProvider, type ProviderActions, type ProviderAction, type SettingsCredential, type UpdateState, type SettingsCallbacks, type SettingsAssembly, type SettingsComposition} from "pith-ui/recipes";
export {composeSettings};
export type {Appearance, Result, SettingsState, SettingsDraft, SettingsProvider, ProviderActions, ProviderAction, SettingsCredential, UpdateState, SettingsCallbacks, SettingsAssembly, SettingsComposition};
export function mountSettings(mount: HTMLElement,initial: Readonly<SettingsState>,callbacks: SettingsCallbacks = {},appearance: MountPartsOptions = {},productName = 'Application'): SettingsAssembly {
  const settings = composeSettings(initial,callbacks,productName);
  try {mountParts(mount,settings.part,appearance);settings.open();return settings;}
  catch (error) {settings.destroy();throw error;}
}
