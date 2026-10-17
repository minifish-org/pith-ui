# Baseline assembly coverage

This index maps all 36 regions in the frozen rc.27/UI 0.2.2 contract to application-owned assembly source and permanent browser proof. Recipes are compiling documentation, not package exports. Their names below are source file names under `examples/assemblies`; browser specifications are under `tests`.

| Contract | Assembly source | Permanent proof |
| --- | --- | --- |
| 01 Frame | frame.ts, desk.ts | parts-frame, parts-desk |
| 02 Brand/Logo | frame.ts, welcome.ts | parts-frame, parts-welcome |
| 03 Navigation | frame.ts | parts-navigation, parts-navigation-composition |
| 04 Context menu | frame.ts | parts-navigation |
| 05 Welcome/setup | welcome.ts | parts-welcome |
| 06 Messages/tools/images | conversation-body.ts, tool-disclosures.ts, conversation-images.ts | parts-conversation-body, parts-tool-disclosure, parts-conversation-images, parts-conversation-actions |
| 07 Reader/find/latest | conversation-reader.ts | parts-conversation-reader |
| 08 Composer/image acquisition | composer.ts | parts-composer |
| 09 Pending messages | pending-messages.ts | parts-pending-messages |
| 10 Thumbnails/drop | attachments.ts, composer.ts | parts-attachments, parts-composer-drop |
| 11 Permission choice | permission-control.ts | parts-permission-control |
| 12 Tool approval | approval.ts | parts-approval |
| 13 Task failure | task-failure.ts | parts-task-failure |
| 14 Runtime | runtime.ts | parts-runtime |
| 15 Cost ledger | cost-ledger.ts | parts-cost-ledger |
| 16 Completion/navigation status | completion-notices.ts, frame.ts | parts-completion-notices, parts-navigation |
| 17 Message edit | text-edit.ts | parts-edit-confirm |
| 18 Pending edit | text-edit.ts | parts-edit-confirm |
| 19 Confirmation | confirmation.ts | parts-edit-confirm |
| 20 Workspace picker | workspace-picker.ts | parts-workspace-picker |
| 21 Rename | rename.ts | parts-rename |
| 22 Full access | full-access.ts | parts-full-access |
| 23 Branches | branch-history.ts | parts-branch-history |
| 24 Settings | settings.ts | parts-settings |
| 25 Provider actions | settings.ts | parts-settings |
| 26 Updates | settings.ts | parts-settings |
| 27 MCP inventory/editor | mcp.ts | parts-mcp |
| 28 Model chooser | model-picker.ts | parts-model-picker |
| 29 Independent connection/models | custom-connection.ts | parts-custom-connection |
| 30 Provider sign-in | provider-login.ts | parts-provider-login |
| 31 Resource inventory | resource-inventory.ts | parts-resource-inventory |
| 32 Resource editor/loading | resource-editor.ts | parts-resource-editor, parts-resource-composition |
| 33 Artifacts/file actions | artifacts.ts | parts-artifacts |
| 34 Preview/paging/Markdown/diff | file-preview.ts | parts-file-preview |
| 35 Image zoom | image-viewer.ts | parts-image-viewer |
| 36 Shared lifecycle/copy | desk.ts and all dialog recipes | parts-desk, parts-dialog-lifetime, parts-copy-button, parts-composition-ownership |

Every source imports only formal parts and sibling recipes. The local application coordinator retains shared feature-slot replacement, scoped availability, modal state and native host callbacks. The frozen old source remains an internal oracle and is excluded from published entry dependencies.

```ts
import {createTextPart} from 'pith-ui';
// Each linked recipe composes opaque handles with the same ownership rules.
const content = createTextPart({text: 'Application-owned content'});
content.destroy();
```

Publication requires every listed source and proof to be present and passing. The exact tarball verification separately checks public exports, runtime/types/CSS and compilation of these installed recipes. Consumer migration and human acceptance follow publication.
