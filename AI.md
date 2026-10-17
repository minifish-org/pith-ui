# Pith UI: small constrained building blocks

The default `pith-ui` entry is the composable API. Import CSS once from `pith-ui/styles.css`. Start with a button, input, select, form or layout and compose the returned opaque `Control` handles. A complete application is optional, not the unit of reuse.

Read [API.md](./API.md), the [catalog](./docs/catalog.md), [guide](./docs/guide.md), and the exact installed declarations. Use a published exact version and lockfile; do not redirect a consumer to sibling sources or private package files.

## Fixed presentation

Applications choose content, semantic intent, business availability and callbacks. The library chooses font, size, line height, weight, padding, gaps, icon dimensions, borders, colors, hover and local interaction. Do not add CSS overrides, mutate design tokens, inspect generated nodes, use arbitrary DOM/HTML slots or copy component source. No public density, appearance, className, style, numeric size or render callback is available on controls. `appearance` on the mount selects only light/dark/system.

Typography uses two roles: system UI and monospace code. Small/medium/large text is 12/14/16 CSS px, weights are 400/600, line height is 1.5. The spacing scale is 4/8/12/16/24 CSS px. Roles and gaps are chosen inside each block. Focus draws no ring, glow or border highlight; retain existing hover, caret, text selection and selected/error/permission states.

## Composition and lifecycle

- Obtain and validate an HTMLElement host, then `mount(host, control, {appearance: 'system'})`. This is the only DOM handoff. Do not inspect the generated descendants.
- Compose handles with `createStack`, `createFormSection`, `createForm`, `createActions`, `createToolbar`, `createDisclosure`, `createScrollArea`, `createDialog` and `createPopover`.
- A child has one owner. Do not reuse one control in two parents or mounts. Destroying the owner destroys all children, listeners and pending UI responses. Destroy before replacing a tree.
- `update` supplies presentation state and never resets a live input. Use `read`, `reset` and `focus` explicitly. Use stable menu IDs and select values.
- Mount dialogs before `open`. Closing a dialog invalidates pending descendant form feedback without resetting the draft. Closing cannot undo an already completed business write.
- Ordinary actions accept void or ActionResult, synchronously or asynchronously. Form/editor/confirmation submissions return ActionResult. Failures retain drafts; never replay a write because a later refresh failed.
- `createSelect` is single-choice. `createListSelect` is a fixed five-row native list with separate single/multiple value contracts. Multi-row native metrics may differ between WebKit and Chromium; preserve native modifier keys and selection.
- Button intent is neutral/primary/danger. Menus offer neutral/danger only. Icon names are a closed typed registry, not arbitrary SVG.
- Numeric input min/max/step and progress values are data constraints, not presentation options. Business requests, drafts, identities, authorization, credentials and native capabilities stay in the application.

The [compiled examples](./docs/examples.ts) use only the default public entry. Showroom base components mount those same controls; they do not use a separate demonstration implementation.

## Optional complete application

`pith-ui/app` is an optional precomposed Pith-shaped interface with workspace/settings/resources/files scenes. Read [APP.md](./APP.md) and [APP-API.md](./APP-API.md) only when choosing that whole composition. It shares the internal components with the small controls. Applications may use small controls without creating this application. Never inspect the application's generated nodes; mount an independent composition in a host you own, not in an internal app node.

When embedding a small modal in that optional application, use `app.attachDialog(dialog)` rather than finding a host inside the app. It accepts modal control handles only, participates in modal/theme/disposal ownership, and returns an early destroy handle.

Product block and older composed-page exhibits marked “库内实现片段” document private implementation, not additional package exports. If a reusable control lacks a real capability, add a narrow semantic port plus regression and showroom example in the library. Do not add an escape hatch or a UI-description DSL.

## Validation

Preserve input method composition, selection, focus, reading position and disclosures. Verify disabled plus pending, failed submit, close/reopen, late response and destroy in Chromium/WebKit. Compile positive and negative public examples against an actual installed package, build production JS/CSS and review both themes in the showroom. Automated success is not human acceptance; source, tarball, publication, deployment and native validation are separate evidence.
