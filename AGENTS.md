# Working in Pith UI

Read `AI.md`, the relevant entry in `docs/catalog.md`, and the actual implementation before changing a block. Use `rg` and targeted reads. Prefer RTK when available for supported terminal commands.

- Pith Desk and approved application consumers follow `APP.md`: UI imports are only `pith-ui/app` and `pith-ui/styles.css`, with one checked mount and pure semantic scenes/sessions. Preserve the existing controllers. A missing port needs a regression and a narrow library change; do not bypass it through root factories, generated nodes or CSS. The unrestricted root entry remains for general component consumers.

- Handwritten logic, configuration scripts and new tests use TypeScript. CSS owns presentation; use HTML native behavior before adding TS. Generated JavaScript/declarations live in `dist/`.
- Preserve observed correct behavior and historical regression assertions. Characterize a concrete behavior gap before fixing it. Keep business protocol, identity and persistence out of the library.
- Prefer an existing full block, then a base component. Do not copy a component into a consumer, introduce a UI framework, or add a broad DSL for a single use case.
- Public options are semantic and finite. Add a real example and validation for each new variant. Keep classes/tokens under `pui-`/`--pui-` and within the `.pui` scope. Do not add a global reset or external font.
- DOM updates must preserve ongoing text input, composition, selection, focus, disclosures and reading position where the component owns those. Dispose listeners, observers, frames and timers; ignore stale UI responses without replaying business writes.
- Accept text safely and extension content as Nodes. Sanitize Markdown through the shared implementation. Keep internal trusted-markup machinery private.
- Add a case to the existing typed showroom catalog. Categorize it as foundation, component, block or page. Expose only controls actually supported by the API, label simulated actions, and provide a meaningful TypeScript example.
- Run `npm run check`, `npm run build`, `npm test`, `node scripts/catalog.ts` and related Playwright tests. Validate the packed package for public API changes. CI uses the lockfile; do not upgrade the toolchain during unrelated work.
- Keep review notes, benchmarks, ad hoc screenshots, browser profiles, tarballs and temporary fixtures out of commits. Maintained visual regression baselines under `visual-baselines/` are the explicit exception: update them only through the visual tool's `--update`, inspect the changes and commit them with the relevant component change. Never change tests to conceal a behavior regression or mark automated results as human acceptance.

See `docs/validation.md` for acceptance scenarios and `docs/releasing.md` for artifact and release evidence. A local build, a push, a successful workflow, npm publication and downloaded consumer validation are distinct facts; report them separately.
