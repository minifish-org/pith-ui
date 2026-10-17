# Pith UI

Small constrained TypeScript UI building blocks for AI-assisted composition. Choose a button, input, select, form, layout or surface; provide content/state/callbacks. The library owns typography, spacing, styling, interaction and disposal. Applications compose their own pages.

The **pith-ui** entry exposes opaque component handles. The only other export is **pith-ui/styles.css**. There is no app or whole-scene entry. Version 0.4 removes the former app API without compatibility aliases. See [AI.md](./AI.md), [API.md](./API.md) and the [composition guide](./docs/guide.md).

TypeScript/CSS source builds to ESM and declarations plus one portable stylesheet. No UI framework, downloaded font or animation runtime. Fixed system UI/code fonts, 12/14/16 CSS px type, 400/600 weights, 1.5 line height and 4/8/12/16/24 CSS px spacing. Components choose roles; consumers do not style individual nodes.

Small compositions to try first: [connection form](https://minifish-org.github.io/pith-ui/?item=controls-form-page), [actions and surfaces](https://minifish-org.github.io/pith-ui/?item=controls-actions-page). They use the default entry using only the same public components.

## Try the components

The [interactive showroom](https://minifish-org.github.io/pith-ui/) groups **base components → composition examples → design foundations**. It exposes real controls, theme and state comparisons, CSS-pixel measurements, spacing rulers and motion playback. Showroom data and actions are simulated and labelled accordingly. Automated checks do not substitute for human acceptance.

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

Applications own page composition, business protocols, persistence, credentials, permissions and native actions. Use small panes, lists and slots to keep those responsibilities local.

## Development and validation

Use the locked toolchain and npm ci. Run npm run check, npm test, npm run test:browser, node scripts/catalog.ts and npm run showroom:build. Verify an actual packed package with scripts/verify-package.ts. See [validation](./docs/validation.md) and [releasing](./docs/releasing.md). Builds, publication, showroom deployment, native tests and human acceptance are separate evidence.

AGPL-3.0-only. See [LICENSE](./LICENSE).
