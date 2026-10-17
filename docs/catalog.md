# Catalog and taxonomy

The default `pith-ui` entry contains small, constrained, composable controls. Import `pith-ui/styles.css` once. Presentation is fixed; applications supply data/state/callbacks, compose opaque handles, and mount a tree. Application and page composition belongs to the consumer. Installed declarations are authoritative.

## Base components

Every base exhibit uses the default public entry. No font, pixel size, density, class/style override or arbitrary DOM slot is accepted. The library owns geometry, typography, interaction and child lifecycle.

| Category | Public factories | Showroom IDs |
|---|---|---|
| Mount and composition | `mount`, `createStack` | `stack` |
| Dynamic composition | `createSlot`, `createList` | `slot`, `list` |
| Regions | `createPane`, `createSplitPane` | `pane`, `split-pane` |
| Input intent | `createPromptInput`, `createDropArea` | `prompt-input`, `drop-area` |
| Reading pieces | `createImage`, `createMessage`, `createReadingArea`, `createDocument` | `image`, `message`, `reading-area`, `document` |
| Safe content | `createMarkdown`, `createDiff` | `markdown`, `diff` |
| Actions | `createButton`, `createIconButton`, `createTextAction` | `button`, `icon-button`, `text-action` |
| Copy | `createCopyButton` | `copy-feedback` |
| Text input | `createTextInput`, `createSearchInput`, `createSecretInput`, `createTextArea`, `createNumberInput`, `createURLInput`, `createSecretTextArea` | `text-input`, `search-input`, `secret-input`, `text-area`, `number-input`, `url-input`, `secret-text-area` |
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
| Dimensions | Fixed standard controls; geometry selected by each component | [Dimensions](https://minifish-org.github.io/pith-ui/?item=foundation-sizing) |
| Borders and surfaces | Existing reviewed geometry and surface shadows | [Borders](https://minifish-org.github.io/pith-ui/?item=foundation-borders), [surfaces](https://minifish-org.github.io/pith-ui/?item=foundation-surfaces) |
| Focus | Native focus without rings/glows/border highlights; retain hover, caret, selection and business states | [Focus](https://minifish-org.github.io/pith-ui/?item=foundation-focus) |
| Motion | Existing purposeful feedback and reduced-motion support | [Motion](https://minifish-org.github.io/pith-ui/?item=foundation-motion) |

CSS px is not a physical screen pixel. The showroom separately reports DPR and measured browser values. Native multi-row list metrics vary by platform; preserve native behavior. Design tokens document implementation, not per-consumer customization permission.

## Composition examples

[Connection form](https://minifish-org.github.io/pith-ui/?item=controls-form-page) and [actions/surfaces](https://minifish-org.github.io/pith-ui/?item=controls-actions-page) use only the default public controls. They demonstrate reuse without a whole-application API.

## Bounded small layout pieces

| Category | Public factories | Showroom IDs |
|---|---|---|
| Fixed measures and surfaces | `createContentColumn`, `createSurface` | `content-column`, `surface` |
| Paired fields | `createGrid` | `grid` |
| Tabular display | `createTable` | `table` |
| Navigation and identity | `createBreadcrumb`, `createBrand` | `breadcrumb`, `brand` |
| Small progress actions | `createStep` | `step` |
| Notification placement | `createNotificationRegion` | `notification-region` |

[Surface](https://minifish-org.github.io/pith-ui/?item=surface) includes a selectable notice: select, clear explicitly, and update its label while retaining selection. Selection is a notice-only business state with fixed frame geometry; it adds no click action or style parameters.

[Bounded control composition](https://minifish-org.github.io/pith-ui/?item=controls-layout-contexts) shows edge groups, inline choices, navigation rows, independent status indicators, queued rows and icon copying. These use the same public controls as consumers. Existing generic defaults remain available; the new finite contexts supply missing layout guarantees without exposing spacing, fonts, pixels, arbitrary CSS or whole scenes.
