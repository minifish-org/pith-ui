# Catalog and taxonomy

There are two consumption contracts. Pith Desk's UI must use only `pith-ui/app` and `pith-ui/styles.css`; general component consumers use `pith-ui`. Their installed declarations define exact options and return types. Interactive links below use the same stable `item` IDs as the typed showroom catalog. Match the documentation and deployed showroom to the package version being reviewed.

## Application entry

Read the bundled [application contract](../APP.md) and installed `dist/app/index.d.ts`. `createApplication(mount, options)` owns one complete interface and returns four plain semantic scenes. The root factories cataloged below remain public for general composition; they must not be used to bypass an application scene's boundary.

| Scene | Feature groups | Reference |
|---|---|---|
| `workspace` | Navigation/search/menus/welcome; messages/tools/commands/Markdown/reading; composer/attachments/drop/queue; permissions/approval/runtime/failure; owned edit/confirm/workspace/rename dialogs; branches, costs and completion notices | `Application.workspace`, `WorkspaceScene` |
| `settings` | Appearance/provider credentials/test/update display; model/effort; independent connections/model definitions/prices; MCP and provider sign-in | `Application.settings`, `SettingsScene` |
| `resources` | Instructions/skills/templates/diagnostics, inventory actions, read-only/source editing and editor loading | `Application.resources`, `ResourcesScene` |
| `files` | Conversation artifacts/actions, text/Markdown/diff/image previews, UTF-8 paging, copy feedback and image zoom | `Application.files`, `FilesScene` |

The complete [`application-reference`](https://minifish-org.github.io/pith-ui/?item=application-reference) case is classified as **pages / 应用集成**. It embeds the [compiled reference application](../examples/application/main.ts), with a full-page link. All business actions are explicitly simulated. It uses only the approved public entry and CSS; its harness and gallery measurement code stay outside the application package.

The following four design/component layers document the general library. Their Node slots, DOM handles, compatibility markup and density options are not application-consumption permissions.

## 1. Design foundations

| Category | Showroom | Design contract |
|---|---|---|
| Color | [Palette](https://minifish-org.github.io/pith-ui/?item=foundation-colors) | Semantic light/dark/system palettes; `--pui-*` tokens |
| Type | [Typography](https://minifish-org.github.io/pith-ui/?item=foundation-typography) | Two automatic font roles; 12/14/16 CSS px, 400/600 weight, 1.5 line height |
| Spacing | [Spacing](https://minifish-org.github.io/pith-ui/?item=foundation-spacing) | Only 4/8/12/16/24 CSS px; blocks own padding, margins and grouping |
| Dimensions | [Dimensions](https://minifish-org.github.io/pith-ui/?item=foundation-sizing) | Standard controls, fixed internal compact samples and native multiline differences |
| Borders | [Borders](https://minifish-org.github.io/pith-ui/?item=foundation-borders) | Border widths, corners and focus separation |
| Layers | [Surfaces](https://minifish-org.github.io/pith-ui/?item=foundation-surfaces) | Surfaces, selection, overlay and shadow |
| Focus | [Keyboard focus](https://minifish-org.github.io/pith-ui/?item=foundation-focus) | Visible keyboard targets and logical traversal |
| Motion | [Motion](https://minifish-org.github.io/pith-ui/?item=foundation-motion) | Existing transition/working feedback, replay and reduced motion |

`setAppearance` establishes a `.pui` root and its selected appearance. CSS values are measured in CSS px; device pixel ratio is shown separately. The showroom distinguishes declared rules from current browser measurements and does not infer actual glyph fonts or browser zoom from device pixel ratio.

The typography and spacing exhibits display the supported contract, not an open-ended design editor. UI and code fonts are selected by purpose; medium 14 CSS px is the default. Common showroom controls let a reviewer choose content state, theme and container width. Density is retained only in the fixed compatibility demonstration; old density URLs normalize to the standard view.

## 2. Base components

| Category | Public factories | Showroom item IDs |
|---|---|---|
| Actions | `createButton`, `createIconButton`, `createTextAction` | `button`, `icon-button`, `text-action` |
| Text input | `createField`, `createTextInput`, `createSearchInput`, `createNumberInput`, `createTextArea`, `createSecretInput` | `text-input`, `search-input`, `number-input`, `text-area`, `secret-input` |
| Choice | `createSelect`, `createCheckbox` | `select`, `checkbox` |
| Information | `createIcon`, `createStatus`, `createListRow`, `createKeyValue`, `createDivider`, `createProgress` | `icons`, `status`, `list-row`, `key-value`, `divider`, `progress` |
| Feedback | `createNotice`, `createCollectionState`, `createCopyFeedback` | `notice`, `collection-state`, `copy-feedback` |
| Floating UI | `createDialog`, `createTextEditDialog`, `createConfirmDialog`, `createMenu`, `createPopover` | `dialog`, `text-edit-dialog`, `confirmation`, `menu`, `popover` |
| Composition | `createFormSection`, `createActions`, `createToolbar`, `createDisclosure`, `createScrollArea` | `form-section`, `actions`, `toolbar`, `disclosure`, `scroll-area` |
| File actions | `createFileActions` | `file-actions` |

See [`showroom/primitive-cases.ts`](../showroom/primitive-cases.ts) and [`showroom/files-cases.ts`](../showroom/files-cases.ts). Use default presentation and semantic intent; the concrete state type defines content capabilities. Density remains a compatibility/internal presentation option. Functional size options, such as a Select's visible row count or a ScrollArea's viewport mode, retain their documented behavior and are separate from typography or spacing choices.

`createSelect` uses the shared floating option surface for a single-choice dropdown, including selection, disabled items, keyboard navigation and focus. Permission, provider, theme and other product choices reuse this implementation. Use the block's `focus()` method to reach its visible control; `control` retains the native form value and validation adapter. Explicit `multiple: true` or `size > 1` produces a visible native listbox, preserving platform multi-selection and multiline navigation rather than squeezing a list into a dropdown. See [Select](https://minifish-org.github.io/pith-ui/?item=select) and [conversation permissions](https://minifish-org.github.io/pith-ui/?item=permission-control) together.

Multi-select uses `values`, `getValues()`, `resetValues(values)` and `onValuesChange(values)` for complete selections. Scalar value methods remain compatible; `values` takes precedence at construction. Explicit resets do not emit change callbacks or replace native form-reset defaults. File actions expose `setDisabled(boolean)` and combine it with copy-pending restrictions.

## 3. Product blocks

| Product category | Public factories | Showroom item IDs |
|---|---|---|
| Workspace shell | `createWorkspaceShell`, `createWelcomeView` | `workspace-chat`, `welcome` |
| Navigation | `createWorkspaceNavigation`, `createWorkspacePicker`, `createRenameConversation`, `createContextMenu` | `workspace-navigation`, `workspace-picker`, `rename-conversation`, `context-menu` |
| Conversation | `createConversationView`, `installConversationReader` | `conversation-messages`, `conversation-reader` |
| Composer/queue | `createComposerView`, `createAttachments`, `createPendingMessages`, `createDropFeedback` | `composer`, `attachments`, `pending-messages`, `drop-feedback` |
| Models | `createModelPicker`, `createModelEditor` | `model-picker` |
| Task policy presentation | `createPermissionControl`, `createFullAccessConfirmation`, `createApprovalPanel`, `createRuntimePanel`, `createTaskFailure` | `permission-control`, `full-access-confirmation`, `approval-panel`, `runtime-panel`, `task-failure` |
| Settings/connections | `createSettingsPanel`, `createCustomConnectionEditor`, `createCustomModelRow`, `createProviderActions` | `settings-panel`, `custom-connection`, `provider-resource-actions` |
| OAuth/MCP | `createProviderLoginPanel`, `createMCPConnectionsPanel`, `createMCPConnectionList` | `provider-login`, `mcp-connections` |
| Workspace resources | `createResourcesPanel`, `createResourceEditor`, `createResourceActions` | `resources-panel`, `resource-editor`, `provider-resource-actions` |
| Files/content | `createArtifactPanel`, `createFilePreview`, `createPagedPreview`, `createImageViewer` | `artifact-panel`, `file-preview`, `paged-preview`, `markdown-content`, `image-viewer` |
| Branches | `createBranchHistory` | `branch-history` |
| System information | `createCostLedger`, `createUpdatePanel`, `createCompletionNotices` | `cost-ledger`, `updates`, `completion-notices` |
| Shared feature surface | `createFeatureDialogFrame`, `createFeatureStatus` | `feature-dialog` |

The complete current set of page IDs is defined by the catalog itself, rather than a second copied implementation. The composed workspace case uses the same shell, message, composer, task and notification blocks.

Provider/resource action factories expose typed `onProviderAction`/`onResourceAction` callbacks; MCP connection lists expose typed `onAction`. Navigation's `onAction` receives a `WorkspaceNavigationAction` with semantic IDs and its trigger. These callbacks consume their owned action event; legacy dataset routing remains available when callbacks are omitted. Code-copy callbacks consistently receive the text and actual button through conversation, paged and file previews; the host supplies clipboard access and feedback.

Case implementations:

- [`content-cases.ts`](../showroom/content-cases.ts): messages, tools, Markdown, reader, paging, images and welcome.
- [`forms-cases.ts`](../showroom/forms-cases.ts): settings, model catalog, custom models, OAuth/MCP, editing and branches.
- [`navigation-cases.ts`](../showroom/navigation-cases.ts): navigation, workspace dialogs, menus, permissions, approval and runtime.
- [`files-cases.ts`](../showroom/files-cases.ts): resources, file actions/preview, costs, updates and notices.

## 4. Helpers and adapter compatibility

- Content: `renderMarkdown`, `renderDiff`, `findRanges`, `previewPageRanges`, `previewPageBytes`, `formatCost`, `thinkingLabel`, `historyStatusMarkup`.
- Safe DOM: `element`, `setText`, `iconElement`, `uniqueId`, `focusableElements`, `escape`, `escapeHTML`.
- Ownership/state: `UIBlock`, `ActionResult`, `UIAction`, `Generation`, `Lifetime`, `controlDisabled`, `setControlPending`.
- Adapter factories: `createSDKDialogElements`, `installImageViewer`, `mountPagedPreview`. Prefer `createFeatureDialogFrame`, `createImageViewer` and `createPagedPreview` for new independently owned instances. `mountPagedPreview` replaces a prior mount; factory instances expose explicit cleanup.
- Safe markup adapters: `icon`, `dialogHeading`, `modelEditorMarkup`, `providerActionsMarkup`, `resourceActionsMarkup`, `fileActionsMarkup`, `showDialogError`. These support general component compatibility routing while factories are the default composition API. They are not approved Pith Desk imports.

Private message reconciliation is not a public HTML extension mechanism. Raw strings from users, files, models or providers must never be assigned to trusted markup sinks.
