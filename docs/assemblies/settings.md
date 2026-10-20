# Assemble settings, provider actions and update status

Import this region from `pith-ui/recipes`. Its single implementation is
[`src/recipes/settings.ts`](../../src/recipes/settings.ts); public state, callbacks and
handles are indexed in [API.md](../../API.md).

Snapshots preserve the draft and caret. Use resetProvider only for an explicit provider target change. A failed save keeps the draft; clearing or destroying secrets wipes the native input.

`connectionHint` supplies host-specific endpoint context without changing the
form. `diagnosticsLabel` can name browser delivery, such as `Download diagnostics`.
Custom connection editors also accept `connectionHint`. These are text only;
the host still owns requests, storage and execution location. The showroom's
browser state demonstrates these options.

```ts
import {
  composeSettings, type Appearance, type RecipeResult as Result, type SettingsState,
  type SettingsDraft, type SettingsProvider, type SettingsCredential,
  type UpdateState, type ProviderAction,
} from 'pith-ui/recipes';
import {createStackPart, mountParts, type Part} from 'pith-ui';

interface SettingsController {
  save(draft: SettingsDraft): Promise<Result>;
  removeKey(draft: SettingsDraft): Promise<Result>;
  test(draft: SettingsDraft): Promise<Result>;
  cancelTest(): Promise<Result>;
  setAppearance(mode: Appearance): Promise<Result>;
  selectProvider(id: string): Promise<Result>;
  draftChanged(draft: SettingsDraft): void;
  providerAction(action: ProviderAction, target: Readonly<{id: string}>): Promise<Result>;
  update(action: 'check' | 'install'): Promise<Result>;
  createConnection(): Promise<Result>;
  saveDiagnostics(): Promise<Result>;
  providers(): readonly SettingsProvider[];
  credential(): SettingsCredential;
  updates(): UpdateState;
  closed(): void;
}

export function attachSettings(
  mount: HTMLElement,
  applicationBody: Part,
  initial: SettingsState,
  controller: SettingsController,
  currentAppearance: Appearance,
) {
  const settings = composeSettings(initial, {
    onSubmit: draft => controller.save(draft),
    onRemoveKey: draft => controller.removeKey(draft),
    onTest: draft => controller.test(draft),
    onCancelTest: () => controller.cancelTest(),
    onAppearanceChange: mode => controller.setAppearance(mode),
    onProviderChange: id => controller.selectProvider(id),
    onDraftChange: draft => controller.draftChanged(draft),
    onProviderAction: (action, target) => controller.providerAction(action, target),
    onUpdateAction: action => controller.update(action),
    onCreateConnection: () => controller.createConnection(),
    onDiagnostics: () => controller.saveDiagnostics(),
    onClose: () => controller.closed(),
  }, 'Pith Desk');
  const owner = mountParts(mount,
    createStackPart({children: [applicationBody, settings.part]}),
    {appearance: currentAppearance});
  settings.setProviders(controller.providers());
  settings.setCredential(controller.credential());
  settings.updateUpdates(controller.updates());
  settings.open();
  return {settings, owner};
}
```

Attach the region to the existing ownership tree before opening it. See
[APP.md](../../APP.md) for shared mounting and dialog slots. The current
interaction assertions run in Chromium and WebKit in
[`parts-settings.spec.ts`](../../tests/parts-settings.spec.ts).
