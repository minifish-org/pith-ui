# Composition guide

Use the default `pith-ui` entry for small constrained controls and `pith-ui/styles.css` once. The exact installed API declarations define the contract. Version 0.3 removes unrestricted root factories, DOM helpers, raw slots and density/appearance options; migrate rather than relying on compatibility aliases.

```ts
import {mount, createTextInput, createSelect, createFormSection, createForm} from 'pith-ui';
import 'pith-ui/styles.css';
const host = document.getElementById('app');
if (!(host instanceof HTMLElement)) throw new Error('Missing mount');
const name = createTextInput({label: 'Name', required: true});
const provider = createSelect({label: 'Provider', options: [{value: 'demo', label: 'Demo'}]});
const fields = createFormSection({title: 'Connection', children: [name, provider]});
const form = createForm({children: [fields], submitLabel: 'Save', onSubmit: async () => {
  console.log(name.read(), provider.read()); // Replace with the application's business action.
  return {ok: true};
}});
const mounted = mount(host, form, {appearance: 'system'});
// mounted.destroy() releases all descendants.
```

Controls do not expose element/control/body/button handles. Only mount accepts DOM. Composition slots accept real library controls and reject plain nodes or duplicate ownership. No Node wrappers or render callbacks are supported.

Use semantic content and state instead of fonts, sizes, gaps or CSS. The fixed type roles are 12/14/16 CSS px, 400/600 weight and 1.5 line height; UI and code use system fonts. Spacing is chosen by the library from 4/8/12/16/24 CSS px. A mount selects light/dark/system. Theme-token edits and per-control styling are outside the public consumption contract.

Call update on the existing control to preserve live input and selection. Input construction values are initial drafts; reset explicitly changes the current draft. read/focus are semantic methods. Select is scalar; list selection has scalar and array overloads and fixed native row count. Do not replace the native list to hide platform row-height differences.

A form owns native validation, primary submit action, pending, errors and optional cancel. Inputs remain in place, failure keeps content, duplicate submits are blocked, and external disabled/pending state cannot re-enable an in-flight action. A dialog owns its content; closing invalidates descendant form responses, reopening preserves the draft, and destroy releases the entire tree. Business identities and completed writes remain the controller's responsibility.

Compose application pages locally from `createPane`, `createSplitPane`, `createStack`, `createList` and `createSlot`. A list uses stable keys and retains the corresponding controls; removed children are destroyed. Replacing a slot destroys its old content. Own independent dialogs through `mounted.attach(dialog)`, without accessing any generated DOM. `mounted.read().hasModal` describes local modal state.

There is no app or whole-scene export, and the showroom does not expose internal implementations. Version 0.4 intentionally removes the previous app entry rather than preserving an alternate consumption route.

See docs/examples.ts for strictly compiled public examples, API.md for signatures, and the showroom's base components for actual interaction. Test actual registry/tarball consumption; never confuse a local build with publication or human acceptance.

Text editing uses one fixed layout per purpose: `message` (the default, eight native rows) or `pending-message` (five rows). These are the established message and queue editors, not arbitrary height, width, density or font settings. All dialogs retain the shared base dialog geometry.
