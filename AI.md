# Pith UI: instructions for consumers

Pith UI supplies native TypeScript product blocks and base components. Import from `pith-ui`; import CSS once from `pith-ui/styles.css`. Consult the bundled [API reference](./API.md) for exact factory signatures, state, options, callbacks and handles; the installed `.d.ts` files remain authoritative. Do not guess parameter names, import private package paths or generate parallel JavaScript implementations.

## Choose the largest appropriate block

1. Locate the intended task in the catalog below and inspect its interactive case.
2. Prefer the complete product block. Compose base components only when no product block fits.
3. Supply typed display state, stable item keys and existing application callbacks.
4. Keep business identity, authorization, API calls and persistence in the application.
5. Change supported options or documented theme tokens. Add a shared variant and its example when new behavior is required; do not patch internal selectors or copy component source into the application.

Product blocks and standalone factories share the same private action, native-field, feedback, layout and floating-surface implementations. A retained product node does not need a second public factory instance or a class patch. Choose the semantic block interface; private controllers and compatibility markup are not consumer APIs.

- Supply `createWorkspaceShell({ composer: { onSubmit, onStop, onInput, onModel, onThinkingChange }, onDialogClose })`; update its composer state for model, effort, send/queue/stop and availability. Use `openDialog`, `closeDialog` and `setSidebarOpen` for the shell-owned surfaces.
- `createModelPicker` owns its model editor. Supply `editor` catalog state and `onSubmit`; use `read()` or the callback selection instead of constructing another editor over its fields.
- Settings and MCP expose typed drafts, credential presentation and explicit reset/edit operations. Use their callbacks and methods; `field()`/`id()` remain compatibility adapters, not the default integration route.
- Messages expose action/code callbacks, action availability and image state. Preserve the host's per-message eligibility rules; do not decorate rendered buttons with a second event-routing scheme.
- Resources provide their own standard refresh/create toolbar. Node slots remain available for additional compositions, with explicit host ownership.
- Provider/resource action blocks and MCP lists expose finite action types with semantic target snapshots. Navigation exposes `WorkspaceNavigationAction`, including its triggering button for anchored menus. Prefer these callbacks to dataset inspection; owned callbacks consume their event, while omitted callbacks preserve legacy host delegation.

| Task | First API to inspect |
|---|---|
| Workspace and chat layout | `createWorkspaceShell`, `createWorkspaceNavigation`, `createWelcomeView` |
| Messages, tools and conversation reading | `createConversationView`, `installConversationReader` |
| Composer, attachments, drag feedback and queued messages | `createComposerView`, `createAttachments`, `createPendingMessages`, `createDropFeedback` |
| Edit text or confirm a dangerous action | `createTextEditDialog`, `createConfirmDialog` |
| Model catalog and thinking effort | `createModelPicker`, `createModelEditor` |
| Permission, approval and runtime | `createPermissionControl`, `createFullAccessConfirmation`, `createApprovalPanel`, `createRuntimePanel`, `createTaskFailure` |
| Settings and independent endpoints | `createSettingsPanel`, `createCustomConnectionEditor` |
| Provider sign-in and MCP | `createProviderLoginPanel`, `createMCPConnectionsPanel`, `createMCPConnectionList` |
| Resource list and source editing | `createResourcesPanel`, `createResourceEditor` |
| Files, Markdown, diff and images | `createArtifactPanel`, `createFilePreview`, `createPagedPreview`, `createImageViewer` |
| Branches and system information | `createBranchHistory`, `createCostLedger`, `createUpdatePanel`, `createCompletionNotices` |
| Smaller compositions | `createButton`, `createField`, native input factories, `createActions`, `createFormSection`, `createCollectionState` |

Full catalog: https://github.com/minifish-org/pith-ui/blob/main/docs/catalog.md

Showroom: https://minifish-org.github.io/pith-ui/?item=text-edit-dialog&theme=light&state=normal&width=800

## State and lifecycle

Most views expose `{ element, update(state), destroy() }`; dialogs add open/close and editors expose read/getValue/reset as declared. Pass complete state values of the concrete component type. Do not assume a method exists on every block.

- Call `update` on the existing instance; do not rebuild the entire page on streamed snapshots.
- Input `value` initializes a draft. Use `reset` or `open({ value })` explicitly for a new target. Feedback updates must not replace user input.
- Native `form.reset()` restores construction values. Component `reset` changes the current draft without changing that baseline or emitting a user-change callback. For multi-select, use `values`, `getValues`, `resetValues` and `onValuesChange`; the scalar methods remain available for single-choice compatibility.
- Stable message IDs and collection keys protect selection, focus, decoded images and scroll positions.
- An async submit returns `{ ok: true }` or `{ ok: false, error }`. A failed operation retains the draft. Closing or changing the view prevents a stale response from changing new UI; it does not undo a completed business write.
- Combine external disabled state with local pending state. Do not automatically replay a write because the following refresh failed.
- Call `destroy()` before releasing an instance. Destroy child block handles supplied through ordinary Node slots yourself; the parent cannot infer their ownership. A `DialogContent` handle passed to `createFeatureDialogFrame` is an explicit ownership transfer and is destroyed when replaced or closed.
- Use distinct generated prefixes or supported ID options for coexisting instances. Leave legacy unprefixed IDs to the existing application adapter.

## Theme and layout

Call `setAppearance(root, 'light' | 'dark' | 'system')` on an ancestor containing the view. Include `document.body` when a dialog is mounted there. This establishes the `.pui` boundary and `--pui-*` tokens.

Use supported density/intent/size options only. Different blocks support different options; the showroom enables controls only when implemented. Single-choice dropdowns share the same Select surface across base components and product blocks. Use `createSelect` for another ordinary choice rather than building a second options popup; call its `focus()` method to focus the visible control. Its native `control` remains a form-value and validation adapter. Explicit `multiple: true` or `size > 1` retains a native visible listbox. Native lists and compact chat actions intentionally have different sizing rules from ordinary fields. CSS px is a layout unit, not a physical screen-pixel measurement.

Keyboard targets share a 1 CSS px focus outline with a 2 CSS px offset, without an additional glow. Permission controls show a single outline around their complete control. Keep this keyboard indication when composing controls. `focusableElements` returns visible, enabled, non-inert tab targets; hidden native select adapters are excluded.

Native multi-row lists use 16 CSS px text. Row spacing follows platform capabilities: Chromium applies option padding; WebKit owns its native row metrics. Do not add empty container height to simulate spacing or replace native keyboard behavior implicitly.

Do not add app-wide resets, new fonts, arbitrary animation timings, internal-class overrides or a UI framework to style these blocks. If a product brand needs a theme, centralize overrides in one reviewed token scope and inspect both themes and relevant states.

## Security and host boundaries

- Set ordinary text through typed factory inputs or `textContent`. Node slots accept trusted nodes constructed by the caller, not untrusted HTML.
- `renderMarkdown` sanitizes content; embedded media, executable markup, forms and arbitrary CSS are excluded. Local file links require the host's explicit resolver and authenticated download validation.
- A resolved local link is a UI affordance, not permission to access a file. The host owns native file open/reveal/copy/download actions and cancellation.
- The host acquires image data, validates supported MIME types and owns object URLs. Revoke URLs when their host scope ends; closing the zoom view does not establish file ownership.
- Code-copy callbacks on conversations, paged previews and file previews receive `(text, button)`. The host owns clipboard access and error handling; reuse `createCopyFeedback` with that actual button for pending and result feedback. An owned callback consumes the code-copy event; without one, existing host delegation remains available. Do not install a second copy handler or change per-message eligibility rules.
- Never log credentials, save them in the showroom, or place them in URLs. Empty credential fields and explicit removal actions must preserve the application's existing distinction.
- Older safe markup helpers remain for application adapters. Prefer factories and Node composition. Never invent a generic raw-HTML extension point or bypass sanitization.

## Validate a change

Type-check the public example, run the related component tests, experience normal/error/loading/disabled/long-content states, and check keyboard, focus, repeated actions and destruction. Preserve existing application behavior tests; changing a selector mechanically is different from weakening its assertion.

For chat-sensitive changes check streaming, selection, code scrolling and reading anchors. For forms check input retention, failed submits, late responses and auxiliary buttons not submitting. For layout check both themes, `900×600`, larger desktop sizes and a narrow browser container. Human reviewers use the showroom; automated checks never declare human approval.

Build and install the actual tarball before upgrading an application. Pin a released version in the consumer lockfile. Do not claim a package is published, a showroom is deployed, or an application release is validated based solely on a local build.
