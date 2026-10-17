# Pith UI

Native TypeScript parts for AI-assisted application development. Compose buttons, fields, choices, dialogs, lists, content and small layouts. Supply content, finite semantic options, state and callbacks. The library owns typography, spacing, colors, dimensions, icons, motion and native interaction.

The package exports `pith-ui` and `pith-ui/styles.css`. Parts expose no generated element, HTML, selector, class, style, pixel or animation options. A checked mount is the only DOM input. There is no public application, page or scene factory.

```sh
npm install --save-exact pith-ui@0.6.0
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

Executable assembly blueprints reconstruct the retained Pi Desk rc.27 regions. They belong in the application and have no package export. Each recipe composes formal parts, projects application state and connects callbacks. Internal regressions compare them to the frozen Pith UI 0.2.2 templates, including actual styles and native behavior.

Pith UI owns presentation, native controls, focus and popup mechanics, sanitization, reading position and local feedback. The application owns region assembly, business data, protocols, persistence, permissions, credentials, file acquisition, native actions and feature coordination. System/light/dark appearance is the visual theme choice. Focus retains native keyboard operation without outlines, glows or border highlights; hover, caret, selection, errors and semantic selections retain their presentation.

Development requires Node 22.18 or newer:

```sh
npm ci
npm run check
npm test
node scripts/verify-assemblies.ts
npm run test:browser
npm run showroom:build
```

The ESM package and stylesheet are separate from the showroom and fixtures. Install a published exact version and commit the consumer lockfile. Package verification compiles assembly documentation from an isolated installation and rejects private imports and presentation escapes.

Licensed under [AGPL-3.0-only](LICENSE). Runtime dependencies retain their own licenses.
