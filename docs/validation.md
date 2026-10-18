# Validation

The accepted behavior baseline is Desk `3838b7f` and UI `8fd33e3` / `0.6.3`.
Current tests run against public parts and recipes. The old rc.27 dual-runtime
comparison and screenshot infrastructure is retired after the extraction parity
pass; Git retains that source and evidence history.

`npm run validate` builds once and runs the current checks. Individual groups:

| Group | Command | Preparation |
|---|---|---|
| Ordinary units | `npm test` | `npm ci`, `npm run build` |
| Browser interactions | `npm run test:browser` | built package, Playwright Chromium and WebKit |
| Tools | `npm run test:tools` | `npm test` compiles tool tests without executing them |
| Actual package | `npm run test:package` | build, generated API/docs and examples current |

`npm run check`, `dev`, `showroom:build` and browser startup reuse the build;
they do not silently rebuild. After editing source, explicitly rebuild before
checking declarations or an installed package. UI's Vite source aliases are only
for its own development. Consumer/package validation has no source alias.

The single archive chain packs once and independently installs that exact tarball.
It checks root/recipes ESM and declarations, CSS, private-entry rejection, all
shipped examples and documentation, rejected public type cases in one compiler
program, and both production consumers. Publication reuses the successful CI
artifact from the exact main commit.

Preserve IME, drafts, selection, scrolling, async retirement, replacement and
root disposal regressions in UI. Desk validates request targets, permissions,
persistence, recovery and non-replayed writes. Both browsers remain required;
native integration also receives a macOS WebView check before delivery.
