# Pith UI

Native TypeScript parts for AI-assisted application development. Compose buttons, fields, choices, dialogs, lists, content and small layouts. Supply content, finite semantic options, state and callbacks. The library owns typography, spacing, colors, dimensions, icons, motion and native interaction.

The package exports `pith-ui` and `pith-ui/styles.css`. Parts expose no generated element, HTML, selector, class, style, pixel or animation options. A checked mount is the only DOM input. There is no public application, page or scene factory.

```sh
npm install --save-exact pith-ui@0.8.6
```

```ts
import {createButtonPart,createActionsPart,mountParts} from 'pith-ui';
import 'pith-ui/styles.css';
const mount = document.getElementById('app');
if (!(mount instanceof HTMLElement)) throw new Error('Missing mount');
const save = createButtonPart({label: 'Save',variant: 'primary',onAction: async () => ({ok: true})});
const tree = mountParts(mount,createActionsPart({children: [save]}),{appearance: 'system'});
// On owner release: tree.destroy();
```

Mount into an ordinary DIV, MAIN, SECTION or ARTICLE. Composition transfers each child's lifetime to its parent; a part has one owner. Replace children through part methods and destroy the mounted owner. Ordinary updates retain drafts, focus and selection; explicit resets replace drafts.

The [showroom](https://minifish-org.github.io/pith-ui/) contains formal parts, specifications, legal states and interaction examples. Read the [API reference](API.md), [AI instructions](AI.md) and [assembly guide](APP.md).

Import full regions from `pith-ui/recipes`; examples and showroom call the same implementation. Pith UI owns presentation, controls, drafts, focus, scrolling and dialog lifetime. The application owns data, requests, persistence, permissions, credentials, native actions and cross-feature coordination.

System/light/dark appearance is the visual theme choice. Focus retains native keyboard operation without outlines, glows or border highlights; hover, caret, selection, errors and semantic selections retain their presentation.

## Development

Development requires Node 22.18 or newer. Start the source showroom with Vite hot reload:

```sh
npm ci
npm run build
npm run dev
```

Pith Desk owns product composition, wording and Desktop/Server differences. Pith UI owns stable components, styles and shared interactions. Product availability uses semantic capabilities; shared fixes belong here. See the long-term conventions in [AGENTS.md](AGENTS.md).

To develop this checkout alongside a sibling Pith Desk checkout:

```sh
npm --prefix ../pith-desk ci
npm --prefix ../pith-desk/frontend ci
npm --prefix ../pith-desk run dev:server -- --ui-source ../pith-ui
```

Use `dev` instead of `dev:server` for the native Desktop window. Both commands resolve only the three public entries to this checkout for that invocation. CSS updates in place and TypeScript edits reload the interface, without publishing, linking packages or changing a lockfile. Desk builds its initial embedded assets from its locked package if they are missing; do that before experimenting with an unpublished public API. Stop and restart without `--ui-source` to restore the installed package. Formal builds, CI and releases use the locked published dependency. See [Desk development](https://github.com/minifish-org/pith-desk#develop) for data isolation and authentication.

For a quick source check and focused interaction test:

```sh
npm run build
npm run check
npm run test:browser -- tests/parts-artifacts.spec.ts
```

Replace the spec with the affected component or recipe. Rebuild after source edits before checking declarations or package consumers. During local Desk integration, check its public types without bundling or running the product suites:

```sh
npm --prefix ../pith-desk run check:ui -- --ui-source ../pith-ui
```

Run relevant checks while iterating, then complete the necessary full validation before delivery. For shared component, public API or release changes, the complete library check is:

```sh
npx playwright install chromium webkit
npm run validate
```

This covers types, units, tools, catalog and API documentation, assembly examples, both browser engines, the showroom build and an isolated packed-package consumer. Keep key input, lifetime and interaction regressions; validate affected Desk behavior and native integration there. See [validation](docs/validation.md) for individual groups and preparation.

The ESM package and stylesheet are separate from the showroom and fixtures. Install a published exact version and commit the consumer lockfile. Package verification compiles assembly documentation from an isolated installation and rejects private imports and presentation escapes. Source preview, npm publication and consumer delivery are separate verification steps.

Licensed under [AGPL-3.0-only](LICENSE). Runtime dependencies retain their own licenses.
