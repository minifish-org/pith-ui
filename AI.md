# AI composition instructions

Import parts from `pith-ui`, complete regions from `pith-ui/recipes`, and styles from `pith-ui/styles.css`. Use the exact installed declarations and read [APP.md](APP.md).

- Reuse the published region implementation. Do not copy its source or create a parallel region library in an application.
- Applications own data, identity, permissions, requests, persistence, file acquisition and business coordination. Supply display state and callbacks to recipes; compute target and operation availability in the application.
- Recipes own their controls, drafts, focus, selection, reading state and teardown. Keep one `mountParts` owner and use `createDialogHost` for replaceable dialogs.
- Use ordinary updates for metadata and explicit resets for new targets or deliberate replacement. Preserve request cancellation, target/revision checks and the rule that failed refreshes never repeat committed writes.
- Parts are opaque. Do not inspect their DOM, classes or selectors, inject HTML/Node, override presentation or add a wrapper per node. Use finite semantic options.
- Resolve content links to data intents. The application validates and executes native operations.
- Destroy the shared owner on release; business controllers also clear secrets and abort requests. Late results must not update replacement openings.

There is no public whole-application entry or `pith-ui/app`. Region recipes are public modules, not source blueprints to copy. Add a concrete regression before changing an established behavior. Do not introduce a UI framework or broad rendering DSL.

Source validation, packed-package proof, npm publication, consumer installation, product build and human acceptance are separate evidence states.

Explicit local preview may resolve the same three public entries to checkout
source as described in APP.md. This is a development-only resolution; product
imports, ownership and production registry checks keep the same boundaries.
