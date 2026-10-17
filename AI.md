# AI composition instructions

Import factories and types only from `pith-ui`; import styles from `pith-ui/styles.css`. Use the declarations installed with the exact version. Read [APP.md](APP.md) and the matching compiling recipe before adapting a Desk region.

1. Keep application data, identity, permissions, requests, persistence, file acquisition and feature coordination in the application. Port the documented part tree and state/callback wiring into its source.
2. Configure parts with content, finite semantic options, state and callbacks. Typography, spacing, colors, sizes and motion are library decisions. Unknown options are rejected by both runtime and declarations.
3. Compose child parts through documented slots. A part is opaque and has one owner. Do not inspect generated DOM, classes or selectors, attach native listeners to it, inject Node/HTML, override CSS or add a wrapper for every node.
4. Obtain one ordinary mount container and call `mountParts`. Keep that owner for appearance and final destruction. Never reuse a mounted or destroyed part.
5. Use ordinary updates for snapshots and explicit resets for new targets or deliberate replacement. Preserve existing target/revision checks, drafts and cancellation behavior.
6. Keep keyed handles and local maps in the consumer. Reuse unchanged children and replace through part methods; parent ownership retires removals. Mark local coordination terminal through supported disposal callbacks before late results arrive.
7. Use semantic library icons and supported content rendering. Resolve local links to data intents; the application validates and executes native actions. Files and image payloads are data, not DOM extension slots.
8. Destroy the shared mounted owner on release. Clear application secrets, transactions and resources through existing business lifecycles. Late results must not update or close replacement openings.

There is no public whole application/page/scene API, `pith-ui/app` or recipe subpath. Bundled assembly source is documentation to copy into the consumer. Do not wrap it into another public scene library.

If an old template cannot be expressed, identify its exact native structure or behavior and add the smallest bounded part capability with a permanent regression first. Preserve correct assertions. Do not copy old HTML/CSS into the consumer, add style overrides, expose arbitrary presentation parameters or invent a new visual system.

Use the parts-only showroom for component inspection and internal assembly regressions for combinations. Source tests, tarball proof, npm publication, consumer installation, product build and human acceptance are separate evidence states.
