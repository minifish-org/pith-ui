# Shared region recipes

Import complete regions from `pith-ui/recipes`, basic parts from `pith-ui`, and
one stylesheet from `pith-ui/styles.css`. Examples, showroom and consumers call
the same implementation. Never copy a recipe into the application or import
library source. The installed package declarations and [API.md](./API.md)
index all public state, callbacks and handles.

The library owns region layout, controls, drafts, focus, selection, scrolling,
pending UI and disposal. The application owns backend requests, persistence,
permissions, original operation targets and cross-feature coordination. Compute
availability in the host and pass it as display state; callbacks are business
intents. Closing a region retires its UI results. The controller still owns
request cancellation and whether a write is valid.

## One ownership tree

```ts
import {mountParts} from 'pith-ui';
import {composeFrame, composeComposer, composeConversationReader,
  composeSettings, createDialogHost} from 'pith-ui/recipes';
import 'pith-ui/styles.css';

declare const mount: HTMLElement;
const composer = composeComposer({}, {onSubmit: text => {console.log(text); return {ok: true};}});
const reader = composeConversationReader({id: '', messages: [], working: false});
const frame = composeFrame({navigation: {groups: [], empty: 'workspaces'}}, {}, {
  main: [reader.find, reader.region, composer.part], siblings: [reader.announcement],
});
const tree = mountParts(mount, frame.part, {appearance: 'system'});
const dialogs = createDialogHost(frame);
dialogs.open('settings', onClose => composeSettings(
  {baseUrl: '', hasApiKey: false}, {onClose},
), settings => settings.open());
// Destroying the root retires every region, observer and dialog host.
export const destroy = () => tree.destroy();
```

`createDialogHost` accepts host-defined slot names and optional persistent dialogs.
Replacing a slot destroys its predecessor. A close callback may open a successor;
that nested opening wins. Close callbacks run once. Root teardown prevents reopen
and late activation. Use the host's `onChange` callback to project modal state to
application actions, and `onError` to report a failed callback.

There is no public `mountDesk` or full application template. A product keeps a
small coordinator that connects regions and projects business availability. Use
public types or infer them from the recipe return value; avoid structural copies.

See [region coverage](./docs/assemblies/coverage.md), [settings](./docs/assemblies/settings.md),
[conversation reader](./docs/assemblies/conversation-reader.md),
[composer](./docs/assemblies/composer.md), [resources](./docs/assemblies/resource-editor.md),
[preview](./docs/assemblies/file-preview.md), and [validation](./docs/validation.md).
