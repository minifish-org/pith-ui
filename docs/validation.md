# Validation

The accepted behavior baseline is Desk `3838b7f` and UI `8fd33e3` / `0.6.3`.
Current tests run against public parts and recipes. The old rc.27 dual-runtime
comparison and screenshot infrastructure is retired after the extraction parity
pass; Git retains that source and evidence history.

Use relevant fast checks and focused specs while iterating; see the commands in
`README.md`. Before delivering shared component, public API or release changes,
`npm run validate` builds once and runs the complete library checks. Individual groups:

| Group | Command | Preparation |
|---|---|---|
| Ordinary units | `npm test` | `npm ci`, `npm run build` |
| Browser interactions | `npm run test:browser` | built package, Playwright Chromium and WebKit |
| Tools | `npm run test:tools` | `npm test` compiles tool tests without executing them |
| Actual package | `npm run test:package` | build, generated API/docs and examples current |

`npm run check`, `dev`, `showroom:build` and browser startup reuse the build;
they do not silently rebuild. After editing source, explicitly rebuild before
checking declarations or an installed package. UI's Vite source aliases and
Desk's explicit `--ui-source` resolution are development-only. They preserve the
same public entries and ownership boundaries. Formal consumer builds, CI,
releases and package validation use the locked published dependency without
source aliases; library CI builds and validates its own source package.

The single archive chain packs once and independently installs that exact tarball.
It checks root/recipes ESM and declarations, CSS, private-entry rejection, all
shipped examples and documentation, rejected public type cases in one compiler
program, and both production consumers. Publication reuses the successful CI
artifact from the exact main commit.

Full validation does not separately repeat `scripts/verify-assemblies.ts`:
the installed-archive check retains its example import/DOM boundary checks and
compiles every shipped recipe and Markdown example against the actual package.
The standalone script remains a fast documentation check after building.
The README documents PR selection and reproduction commands. Main/manual runs
remain full; the `validate` job always returns a result, including
when a maintenance-only PR needs no package or browser work.

Preserve IME, drafts, selection, scrolling, async retirement, replacement and
root disposal regressions in UI. Desk validates request targets, permissions,
persistence, recovery and non-replayed writes. Both browsers remain required;
native integration also receives a macOS WebView check before delivery.

Phone keyboard geometry is covered in `tests/mobile-viewport.spec.ts` using a
shrinking visual viewport in Chromium and WebKit: input/selection, approval
scrolling, drawer bounds, modal bounds and zoom behavior. This simulation does
not replace a real iOS/Android soft-keyboard acceptance check.

`tests/web-preview.spec.ts` covers the single-row toolbar at 240px, Return
navigation, the refresh icon and external-opening context menu, error-only
feedback, address-draft retention, native geometry/visibility reports, modal/popover
yielding, unsafe/same-origin metadata rejection, independent tool intents and
report teardown on disable/disposal. Neither presentation creates an iframe. Desk covers URL admission, isolated preview
grants, credential stripping, lease revocation, real Vite HMR and WKWebView use.

`parts-titlebar.spec.ts` verifies one compact header height across navigation,
conversation and tool tabs, all wide rail states and narrow overlays, including
native window-control reservations and fullscreen draft preservation.
`sidebars.spec.ts` verifies rail-owned expanded controls and topbar openers,
independent wide navigation/tools, preserved draft
content, native titlebar reservations when navigation collapses, modal openings
that preserve wide state, and mutually exclusive phone overlays with close,
scrim and focus restoration. `file-browser.spec.ts` checks the compact path/refresh
row, retained disclosure focus, lazy directory intents, original file targets and workspace reset.
Desk covers authenticated directory IO, search bounds, retired responses,
native actions and persistent drafts using the public recipes.
`sidebar-sizing.spec.ts` verifies independent pointer drags, keyboard limits,
native drag regions, width constraints without overwriting preferences, draft
selection, phone overlays and cancellation/teardown during a drag. Sidebar
focus checks also reproduce WKWebView's rejection of an offscreen entering
control before verifying recovery and opener restoration.

`terminal.spec.ts` checks byte-fragmented UTF-8/ANSI, Chinese/emoji text input,
focus-local control keys, standard selection/copy/paste, connection gating,
retained tab views, add/close intents, keyboard/overflow navigation, reset
callbacks/input identity, root disposal and short visual-viewport fitting in both engines.
The pinned upstream CSS has an exact-content/scope check independent of authored
design tokens. Desk checks real PTYs, bounded parse acknowledgements/history,
leases, reconnect, process cleanup, vim/top and actual macOS WebView integration.
Soft-keyboard automation does not establish physical phone acceptance.
