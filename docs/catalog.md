# Catalog and taxonomy

The default `pith-ui` entry contains small, constrained, composable controls. Import `pith-ui/styles.css` once. Presentation is fixed; applications supply data/state/callbacks, compose opaque handles, and mount a tree. `pith-ui/app` is an optional complete application composition, not the required unit of reuse. Installed declarations are authoritative.

## Base components

Every base exhibit uses the default public entry. No font, pixel size, density, class/style override or arbitrary DOM slot is accepted. The library owns geometry, typography, interaction and child lifecycle.

| Category | Public factories | Showroom IDs |
|---|---|---|
| Mount and composition | `mount`, `createStack` | `stack` |
| Actions | `createButton`, `createIconButton`, `createTextAction` | `button`, `icon-button`, `text-action` |
| Copy | `createCopyButton` | `copy-feedback` |
| Text input | `createTextInput`, `createSearchInput`, `createSecretInput`, `createTextArea`, `createNumberInput` | `text-input`, `search-input`, `secret-input`, `text-area`, `number-input` |
| Choice | `createSelect`, `createListSelect`, `createCheckbox` | `select`, `checkbox` |
| Display | `createText`, `createIcon`, `createListRow`, `createKeyValue`, `createDivider`, `createProgress` | `text`, `icons`, `list-row`, `key-value`, `divider`, `progress` |
| Feedback | `createNotice`, `createStatus`, `createCollectionState` | `notice`, `status`, `collection-state` |
| Surfaces | `createDialog`, `createTextEditDialog`, `createConfirmDialog`, `createMenu`, `createContextMenu`, `createPopover` | `dialog`, `text-edit-dialog`, `confirmation`, `menu`, `context-menu`, `popover` |
| Layout and forms | `createForm`, `createFormSection`, `createActions`, `createToolbar`, `createDisclosure`, `createScrollArea` | `form`, `form-section`, `actions`, `toolbar`, `disclosure`, `scroll-area` |

[Public API](../API.md), [compiled examples](./examples.ts), [composition guide](./guide.md). The default entry also exports pure formatCost/thinkingLabel/customModelDefaults helpers; these create no UI.

## Design foundations

| Rule | Fixed values | Experience |
|---|---|---|
| Fonts | System UI and monospace code roles | [Typography](https://minifish-org.github.io/pith-ui/?item=foundation-typography) |
| Type | 12/14/16 CSS px, weights 400/600, line height 1.5 | [Typography](https://minifish-org.github.io/pith-ui/?item=foundation-typography) |
| Spacing | 4/8/12/16/24 CSS px, selected inside components | [Spacing](https://minifish-org.github.io/pith-ui/?item=foundation-spacing) |
| Colors | Existing light/dark/system semantic palettes | [Palette](https://minifish-org.github.io/pith-ui/?item=foundation-colors) |
| Dimensions | Fixed standard controls; internal product contexts may be compact | [Dimensions](https://minifish-org.github.io/pith-ui/?item=foundation-sizing) |
| Borders and surfaces | Existing reviewed geometry and surface shadows | [Borders](https://minifish-org.github.io/pith-ui/?item=foundation-borders), [surfaces](https://minifish-org.github.io/pith-ui/?item=foundation-surfaces) |
| Focus | Native focus without rings/glows/border highlights; retain hover, caret, selection and business states | [Focus](https://minifish-org.github.io/pith-ui/?item=foundation-focus) |
| Motion | Existing purposeful feedback and reduced-motion support | [Motion](https://minifish-org.github.io/pith-ui/?item=foundation-motion) |

CSS px is not a physical screen pixel. The showroom separately reports DPR and measured browser values. Native multi-row list metrics vary by platform; preserve native behavior. Design tokens document implementation, not per-consumer customization permission.

## Small composed pages

[Connection form](https://minifish-org.github.io/pith-ui/?item=controls-form-page) and [actions/surfaces](https://minifish-org.github.io/pith-ui/?item=controls-actions-page) use only the default public controls. They demonstrate reuse independently of the optional app.

## Product blocks and composed pages

Existing product block and root-composed page exhibits are marked **库内实现片段**. They show the private reusable implementations used by the library; their DOM adapters are not public package factories. Small compositions should use the base API above. Do not copy these implementations or import private dist/source paths.

## Optional application composition

The [complete reference](https://minifish-org.github.io/pith-ui/?item=application-reference) and the four scene starting points use only `pith-ui/app` with simulated business data. They share the existing internal implementation and have reproducible full-page links. The scene query is example-only, not a runtime routing API.

| Scene | Contents | Pages experience |
|---|---|---|
| workspace | Navigation, messages/tools/Markdown/reading, composer/queue/attachments, permission/approval/runtime/failure, edits, branches, costs and completion | [App workspace](https://minifish-org.github.io/pith-ui/?item=application-workspace) |
| settings | Appearance, providers, credentials/test, models/effort, independent connections, MCP, login and updates | [App settings](https://minifish-org.github.io/pith-ui/?item=application-settings) |
| resources | Instructions, skills, templates, diagnostics, source editing and resource actions | [App resources](https://minifish-org.github.io/pith-ui/?item=application-resources) |
| files | Conversation files, actions, text/Markdown/diff/image previews, paging, copy feedback and zoom | [App files](https://minifish-org.github.io/pith-ui/?item=application-files) |

[Application contract](../APP.md), [application API](../APP-API.md). The application owns protocols, credentials, identities, drafts, persistence and native capability decisions; the library owns UI behavior.
