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

For an ordinary button action, use one pending owner. Return a stable action's promise for library-managed feedback. If a controller already owns a resettable or retargetable action, invoke it synchronously, merge its pending state into the control, and handle failures and stale results in that controller. Returning that same promise would add a second pending owner and can lock a new target or a cancellation action. Forms and editors retain their required ActionResult submission contract and explicit submission reset methods.

Compose application pages locally from `createPane`, `createSplitPane`, `createStack`, `createList` and `createSlot`. A list uses stable keys and retains the corresponding controls; removed children are destroyed. Replacing a slot destroys its old content. Own independent dialogs through `mounted.attach(dialog)`, without accessing any generated DOM. `mounted.read().hasModal` describes local modal state.

There is no app or whole-scene export, and the showroom does not expose internal implementations. Version 0.4 intentionally removes the previous app entry rather than preserving an alternate consumption route.

See docs/examples.ts for strictly compiled public examples, API.md for signatures, and the showroom's base components for actual interaction. Test actual registry/tarball consumption; never confuse a local build with publication or human acceptance.

Text editing uses one fixed layout per purpose: `message` (the default, eight native rows) or `pending-message` (five rows). These are the established message and queue editors, not arbitrary height, width, density or font settings. All dialogs retain the shared base dialog geometry.

## Restore layout through small bounded pieces

A centered reading measure is `createContentColumn({purpose:'reading',content})`; a reading area can own this measure internally with `column:'reading'`. Input and introduction measures use `purpose:'input'` and `'intro'`. The input surface combines a prompt and its footer. The panel surface is a fixed narrow card; notice surfaces fill their enclosing region and carry semantic warning/error tones.

Only an explicitly created notice surface accepts `selected`. Its selected left edge preserves the existing frame, tone and child controls; it does not make the surface clickable or disable its actions. Omitting `selected` in an update retains it, and `{selected:false}` clears it. Input/panel surfaces reject this state; their handles use `OrdinarySurfaceState`, while notice handles use `NoticeSurfaceState`. A notice composed from a flow stack and a leading/trailing toolbar aligns its heading and action at their top edges. Try the [Surface example](https://minifish-org.github.io/pith-ui/?item=surface).

Toolbar leading/trailing groups preserve two edges instead of appending all controls into one list. Inline choices keep accessible labels while using a fixed compact trigger. Navigation disclosures/rows retain independent primary actions, auxiliary actions and visible status. A readout differs from an output disclosure: the former stays unframed; the latter frames command output. Queue contexts provide a bounded scrolling collection and small rows, while application callbacks continue to own queue mutations.

`createGrid({columns:'pair'})` adapts two fields to one column on narrow screens. Settings sections and model fieldsets are finite form contexts; `context:'flow'` retains document flow for adjacent sections. Dialog purposes are form (500 CSS px), collection (660) and document (900), all shrinking within the viewport. Label visibility never removes the accessible name. Contexts are structural choices retained from construction when update omits them; drafts, selection, disclosure state and child ownership remain independent.

`createSecretInput` retains Show/Hide by default. Choose `revealable:false` at construction when the host requires a password-only field, such as a secret sign-in answer. Updates cannot change this policy. Both modes retain native validation and drafts, reset to password masking, and erase the secret on destruction. [Try both modes](https://minifish-org.github.io/pith-ui/?item=secret-input).

`createTimestamp({value})` accepts epoch milliseconds and owns one native `<time>` presentation: local hour/minute text, a full local date tooltip, and canonical ISO `datetime`. Zero, nonfinite and out-of-range values clear and hide the time; other value types are rejected. It starts no timer. `createMessage({time:value,...})` reuses this control for numeric times; plain string time metadata retains its existing behavior. Message role names are fixed by the library. [Try saved times and clearing](https://minifish-org.github.io/pith-ui/?item=timestamp).
