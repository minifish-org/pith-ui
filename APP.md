# Application assembly guide

Pith UI publishes constrained parts. Applications own region assembly, state projection and callback coordination. The blueprints reconstruct Pi Desk rc.27 (`3f1ee24`) templates from Pith UI 0.2.2 (`897f46a`) using formal parts only. They are executable documentation, not exported scene factories.

Start with the [frozen inventory](docs/contracts/rc27-ui-022.md) and [coverage map](docs/assemblies/coverage.md). Each assembly document links its compiling source and permanent browser regressions.

| Region | Instructions |
| --- | --- |
| Frame, brand, navigation and menus | [Frame](docs/assemblies/frame-navigation.md) |
| Welcome and setup | [Welcome](docs/assemblies/welcome.md) |
| Messages, images and tool groups | [Conversation body](docs/assemblies/conversation-body.md) |
| Reading, find and latest | [Reader](docs/assemblies/conversation-reader.md) |
| Input, permissions and file drops | [Composer](docs/assemblies/composer.md), [attachments](docs/assemblies/attachments.md), [permission](docs/assemblies/permission-control.md) |
| Pending messages | [Queue](docs/assemblies/pending-messages.md) |
| Approval, failures and runtime | [Approval](docs/assemblies/approval.md), [failure](docs/assemblies/task-failure.md), [runtime](docs/assemblies/runtime.md) |
| Message and pending-message edit | [Text edit](docs/assemblies/text-edit.md) |
| Confirmations | [Confirmation](docs/assemblies/confirmation.md), [full access](docs/assemblies/full-access.md) |
| Workspace picker, rename and branches | [Picker](docs/assemblies/workspace-picker.md), [rename](docs/assemblies/rename.md), [branches](docs/assemblies/branch-history.md) |
| Settings, providers and updates | [Settings](docs/assemblies/settings.md) |
| MCP and independent connections | [MCP](docs/assemblies/mcp.md), [custom connection](docs/assemblies/custom-connection.md) |
| Models and provider sign-in | [Models](docs/assemblies/model-picker.md), [login](docs/assemblies/provider-login.md) |
| Resources and editing | [Inventory](docs/assemblies/resource-inventory.md), [editor](docs/assemblies/resource-editor.md) |
| Files, preview and zoom | [Artifacts](docs/assemblies/artifacts.md), [preview](docs/assemblies/file-preview.md), [viewer](docs/assemblies/image-viewer.md) |

Copy the relevant blueprint into the consumer and import parts from `pith-ui`. Keep its DTOs and orchestration functions local. The package export map blocks recipe and internal imports. Sources bundled as documentation use the published entry and compile from the installed tarball.

Compose one shared Frame and mount once. The local coordinator connects navigation, content, composer panels, notices and dialogs, tracks modal state, preserves scoped availability and protects replacement openings from stale callbacks. Use each recipe's exact part ordering and disposal rules, then connect existing business controllers.

Install the released exact npm version and commit its lockfile. Replace one region at a time while preserving existing assertions, configuration, conversations, colors, Logo, layout and behavior. The consumer must contain no copied old HTML/CSS, style overrides, generated-DOM traversal, source aliases, local tarballs or workspace links. Complete region and whole-tree checks before merging main and building for human acceptance.
