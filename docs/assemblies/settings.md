# Assemble settings, provider actions and update status

This application-owned recipe composes formal parts. It is not a package export
or a settings scene API. Its compiled implementation is
[`examples/assemblies/settings.ts`](../../examples/assemblies/settings.ts), and
the runnable example is
[`examples/assemblies/settings.html`](../../examples/assemblies/settings.html).
The recipe imports only the formal parts entry and creates no DOM, HTML or CSS.

The old contract is `src/forms/panels.ts:createSettingsPanel`,
`src/forms/actions.ts:createProviderActions`,
`src/files/systems.ts:createUpdatePanel` and
`src/app/settings.ts:openSettings` at `897f46a`, called by Desk's
`frontend/src/settings.ts:openSettings` at `3f1ee24`. The appearance and update
sections remain outside the native form. The library owns the 500px modal,
grouped form rhythm, shared choices, action variants and responsive scrolling.

## Part tree

```text
DialogPart (form; Settings / MAKE IT YOURS)
└─ FormLayoutPart (one grouped-form spacing scope)
   ├─ SectionPart: Appearance
   │  ├─ TextPart hint + screen-reader FieldLabelPart
   │  ├─ SelectPart (preference purpose; system / light / dark)
   │  └─ FeedbackPart error
   ├─ SectionPart: Updates
   │  ├─ CopyGroupPart: version TextPart + polite paragraph FeedbackPart
   │  ├─ ProgressPart (native percentage track)
   │  └─ ActionsPart: Check / primary Update and restart
   └─ FormPart
      ├─ SectionPart: Model providers
      │  ├─ TextPart description + ActionsPart: Add independent connection
      │  ├─ FieldStackPart: Provider label / select / provider actions / hint
      │  │  └─ Feature ToolbarPart: keyed ordinary ButtonParts
      │  ├─ DisclosurePart (advanced)
      │  │  ├─ FieldLabelPart: API base URL
      │  │  ├─ InputAdornmentPart (globe): native URL InputPart
      │  │  └─ TextPart hint
      │  └─ FieldStackPart: API key
      │     ├─ FieldLabelPart + owned BadgePart suffix
      │     ├─ password InputPart + TextPart hint
      │     └─ destructive Remove saved API key ButtonPart
      ├─ SectionPart: connection test hint / action / polite StatusPart
      ├─ FeedbackPart error
      ├─ SectionPart: diagnostics hint / action
      └─ FooterPart: Cancel / native submit Save settings
```

The group, section, disclosure and icon container correspond to existing useful
layout nodes. Ordinary fields stay native inputs and shared select controls;
there is no added wrapper around every element. No part supplies a provider
catalog, credentials protocol, update installer or business operation.

## Connect the existing controller

The host supplies business callbacks and metadata, then retains the returned
local handle for subsequent snapshots and explicit provider resets:

```ts
import {
  mountSettings, type Appearance, type Result, type SettingsState,
  type SettingsDraft, type SettingsProvider, type SettingsCredential,
  type UpdateState, type ProviderAction,
} from '../../examples/assemblies/settings.js';

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
  initial: SettingsState,
  controller: SettingsController,
  currentAppearance: Appearance,
) {
  const settings = mountSettings(mount, initial, {
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
  }, {appearance: currentAppearance}, 'Pith Desk');
  settings.setProviders(controller.providers());
  settings.setCredential(controller.credential());
  settings.updateUpdates(controller.updates());
  return settings;
}
```

The controller owns configuration identity, credential writes, provider
authentication, native diagnostics delivery, update polling and installation.
It must check the original business target before committing a write and report
that write's result even if a following refresh fails. The recipe supplies plain
drafts and immutable `{id}` provider targets. The product name is text content.

## State and draft rules

| Port | Update and ownership rule |
| --- | --- |
| `update(state)` | Applies error, readiness, testing, action availability, appearance metadata and test result. Retains URL, key, provider choice, disclosure, input identity, caret and focus. |
| `setProviders(items, selected?)` | Reconciles options by stable provider ID. Keeps the selected ID when still present; otherwise chooses the first provider. Names append configured/signed-in metadata. |
| `setCredential(view)` | Changes badge, key visibility/required/placeholder, remove visibility, authentication hint and keyed provider actions. It does not overwrite the key draft. |
| `read()` | Returns a fresh `{provider, baseUrl, apiKey}` with URL and key trimmed. A hidden/disabled key contributes an empty string, while its live draft remains available if shown again. |
| `resetProvider(value)` | Explicitly changes provider and URL, clears error and retires previous save/removal and auxiliary outcomes. Clears key or collapses advanced settings only when the corresponding flag is true. |
| `clearSecrets()` | Explicitly clears the private key draft. Destruction also wipes the input and its default value. |
| `fail(message)` | Reports an owned controller failure through the existing form error. |

`hasApiKey` initializes the key placeholder and requirement. Later credential
snapshots use `setCredential`. General state updates do not replace credentials
or infer them from that initialization flag. The password remains the original
plain password field. No reveal button is added.

Save and key removal share availability. A pending save or removal blocks the
other operation and connection testing; ordinary snapshots cannot release local
pending. Reset retires pending UI without calling native form reset, so a new
provider draft can be edited immediately. Old completion cannot close or report
an error into that new revision. Successful current save/removal closes once;
failure retains the draft.

Test connection performs native form validation; invalid URL expands advanced
settings. Its callback does not hold the test button's local pending state.
The controller can publish `testing: true`, exposing an enabled Cancel test
while the original test promise is still pending. Start and cancel have distinct
operation guards. The controller owns actual cancellation and result snapshots.
All auxiliary actions retain native `type="button"`.

Provider action buttons are keyed by provider ID and action. Repeated credential
snapshots keep the same button, local pending and focus. Changing target removes
and destroys obsolete buttons. OAuth supplies Sign in/Sign out; a custom provider
supplies Edit models and prices and destructive Remove connection. These remain
local callback wiring, not a public provider-actions template.

## Updates and appearance

`updateUpdates(state)` sets version, message, availability and percentage progress.
Checking, installing and restarting are busy phases. The progress track appears
only while installing. `setUpdatePending` merges host pending with the local
update callback; either source keeps actions unavailable. A failed check may
enable retry via `setUpdateError(message, {allowCheckRetry: true})` while the host
still reports checking. An installation error retains busy availability. A new
update snapshot clears the local message and retry exception.

Before the first update snapshot, the original Loading update status text remains
visible. Before providers arrive, the ordinary shared selector is already
installed around the disabled Loading providers choice; this differs from the
model picker's deliberately native cold selector.

The finite mount appearance option controls this opening independently of the
operating system. Appearance preference changes are controller intents. The
controller owns persistence and the application's theme; the preference select
uses the library's bounded preference presentation. Neither the callback nor
state accepts a palette, style override or animation parameter.

## Close, disposal and evidence

Close, Escape, backdrop dismissal and destruction release the mounted tree and
notify `onClose` once. The last provider/URL remain readable, with key always
empty after disposal. Form operations, auxiliary results, update operations,
keyed action controllers, input/select listeners, disclosure and dialog lifecycle
are retired together. Late snapshots and outcomes cannot recreate the opening.
The library returns focus through the native dialog lifecycle.

```sh
npm run check
node scripts/verify-assemblies.ts
npx playwright test tests/parts-settings.spec.ts
```

The maintained suite passed 68 checks across Chromium and WebKit. It compares
the actual old application scene with
the parts composition, including opposite operating-system theme, readiness,
disabled, testing, form/appearance/test errors, OAuth, empty providers, installing
and checking. It also compares expanded advanced fields at 900×568 and 390×844.
The geometry oracle uses the same application flex parent in both versions;
standalone behavior checks do not rely on that fixture context. Native browser
validation focus is compared to the original behavior in each browser.

Additional checks cover native form boundaries, percentage progress, badge label
accessibility, rejected-constructor ownership, pending invalidation without
draft reset, required validation, preserved drafts/caret, hidden credentials,
cancel during a pending test, stale save/removal, shared availability, keyed
provider pending, update retry and secret-clearing destruction. The frozen
rc.27 oracle and existing correct assertions remain separate and unchanged.
