# Pith UI

Small constrained TypeScript UI building blocks for AI-assisted composition. Choose a button, input, select, form, layout or surface; provide content/state/callbacks. The library owns typography, spacing, styling, interaction and disposal. A full application is optional.

The default **pith-ui** entry exposes opaque component handles. **pith-ui/app** is an optional complete Pith-shaped composition; it is not a prerequisite for reuse. Version 0.3 replaces the unrestricted root API without compatibility aliases. See [AI.md](./AI.md), [API.md](./API.md) and the [composition guide](./docs/guide.md).

TypeScript/CSS source builds to ESM and declarations plus one portable stylesheet. No UI framework, downloaded font or animation runtime. Fixed system UI/code fonts, 12/14/16 CSS px type, 400/600 weights, 1.5 line height and 4/8/12/16/24 CSS px spacing. Components choose roles; consumers do not style individual nodes.

Small compositions to try first: [connection form](https://minifish-org.github.io/pith-ui/?item=controls-form-page), [actions and surfaces](https://minifish-org.github.io/pith-ui/?item=controls-actions-page). They use the default entry without a complete app.

## Try the components

The [interactive showroom](https://minifish-org.github.io/pith-ui/) groups **design foundations → base components → product blocks → composed pages**. It exposes real controls, theme and state comparisons, CSS-pixel measurements, spacing rulers and motion playback. Showroom data and actions are simulated and labelled accordingly. Automated checks do not substitute for human acceptance.

The [`application-reference`](https://minifish-org.github.io/pith-ui/?item=application-reference) page embeds the [complete TypeScript reference application](./examples/application/main.ts): chat and simulated streaming, queues, approval, model/settings/login/MCP, resources, files and branch history. Use the deployment matching the package under review; source examples and a public site do not establish that a version has been published or manually accepted.

In **Pages / 应用集成**, start directly with [App workspace](https://minifish-org.github.io/pith-ui/?item=application-workspace), [App settings](https://minifish-org.github.io/pith-ui/?item=application-settings), [App resources](https://minifish-org.github.io/pith-ui/?item=application-resources) or [App files](https://minifish-org.github.io/pith-ui/?item=application-files). These are four entry points into the same `pith-ui/app` reference, with simulated data and reproducible full-page links. Other Pages show private library compositions and are labelled accordingly.

Run it locally with Node 22.18 or newer:

```sh
npm ci
npm run dev
```

## Use small building blocks

Install a published exact version and commit the lockfile. Do not use source aliases or local package links for application integration.

```ts
import {mount, createTextInput, createFormSection, createForm} from 'pith-ui';
import 'pith-ui/styles.css';
const host = document.getElementById('app');
if (!(host instanceof HTMLElement)) throw new Error('Missing mount');
const name = createTextInput({label: 'Name', required: true});
const fields = createFormSection({title: 'Connection', children: [name]});
const form = createForm({children: [fields], submitLabel: 'Save', onSubmit: async () => {
  console.log(name.read()); // Connect the application-owned write here.
  return {ok: true};
}});
const mounted = mount(host, form, {appearance: 'system'});
// mounted.destroy() releases the complete tree.
```

The only DOM handoff is mount. Content slots accept library controls, not HTML/Node/renderers. No element/control/panel handles, class/style, density or per-control font/size/gap knobs. update preserves live drafts; read/reset/focus are explicit. A child has one owner. Errors, pending, disabled and late responses retain tested behavior. See the [catalog](./docs/catalog.md) and [compiled examples](./docs/examples.ts).

Choose [pith-ui/app](./APP.md) only when the complete workspace/settings/resources/files composition fits. It shares the same private controllers/styles with the small components. Business protocols, persistence, credentials, permissions and native actions remain outside the library.

## Development and validation

Use the locked toolchain and npm ci. Run npm run check, npm test, npm run test:browser, node scripts/catalog.ts and npm run showroom:build. Verify an actual packed package with scripts/verify-package.ts. See [validation](./docs/validation.md) and [releasing](./docs/releasing.md). Builds, publication, showroom deployment, native tests and human acceptance are separate evidence.

AGPL-3.0-only. See [LICENSE](./LICENSE).
