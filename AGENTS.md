# Working in Pith UI

Read `AI.md`, the relevant entry in `docs/catalog.md`, and the actual implementation before changing a block. Use `rg` and targeted reads. Prefer RTK when available for supported terminal commands.

- Consumers follow `APP.md`: import constrained parts from `pith-ui` and `pith-ui/styles.css`, compose one checked ownership tree, and keep region assembly/state mapping/callback coordination in the application. Executable recipes are documentation, never public scenes. Preserve business controllers. A concrete missing native capability needs a regression and narrow part change; do not bypass parts through generated DOM or CSS.

- Handwritten logic, configuration scripts and new tests use TypeScript. CSS owns presentation; use HTML native behavior before adding TS. Generated JavaScript/declarations live in `dist/`.
- Preserve observed correct behavior and historical regression assertions. Characterize a concrete behavior gap before fixing it. Keep business protocol, identity and persistence out of the library.
- Reuse bounded parts and the documented assembly method. Do not copy old HTML/CSS into a consumer, introduce a UI framework, add a broad DSL or publish a new whole-page/template API.
- Public options are semantic and finite. Add a real example and validation for each new variant. Keep classes/tokens under `pui-`/`--pui-` and within the `.pui` scope. Do not add a global reset or external font.
- DOM updates must preserve ongoing text input, composition, selection, focus, disclosures and reading position where the component owns those. Dispose listeners, observers, frames and timers; ignore stale UI responses without replaying business writes.
- Accept text safely and child content only as genuine opaque parts. Sanitize Markdown through the shared implementation. Keep trusted markup and native nodes private.
- Show only formal parts, specifications, legal states and interactions in the typed showroom. Keep large combinations in internal validation and compiling assembly documentation. Preserve internal baseline oracles and correct assertions without shipping them as package entries or public exhibits.
- Run `npm run check`, `npm run build`, `npm test`, `node scripts/catalog.ts` and related Playwright tests. Validate the packed package for public API changes. CI uses the lockfile; do not upgrade the toolchain during unrelated work.
- Keep review notes, benchmarks, ad hoc screenshots, browser profiles, tarballs and temporary fixtures out of commits. Maintained visual regression baselines under `visual-baselines/` are the explicit exception: update them only through the visual tool's `--update`, inspect the changes and commit them with the relevant component change. Never change tests to conceal a behavior regression or mark automated results as human acceptance.

See `docs/validation.md` for acceptance scenarios and `docs/releasing.md` for artifact and release evidence. A local build, a push, a successful workflow, npm publication and downloaded consumer validation are distinct facts; report them separately.
