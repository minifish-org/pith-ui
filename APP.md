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

For explicit local development, a consumer may resolve the three public entries
to this checkout's `src/index.ts`, `src/recipes/index.ts` and `src/styles.css` in
its Vite server and type check. Keep that resolution in the development runner,
without changing npm installs, lockfiles or production build configuration.
The source stylesheet includes its palette as ordinary CSS and supports HMR.
Production and CI consume the exact published package. Source imports and UI
internals remain private to the library.

For a native window whose controls overlay the webview, pass
`{titlebar: 'overlay'}` as `composeFrame` content (or on `createFramePart`).
The frame keeps the existing brand and controls, shares a 52px top row with
the native window buttons, and marks only that row as draggable. It adds no
window buttons. Supply `tools: {label, children}` for an optional right rail.
Navigation and tools toggle independently on wide screens and become mutually
exclusive phone overlays. The MyGo host supplies `--mygo-titlebar-height`
and `--mygo-titlebar-inset-left/right`; fullscreen changes update the reserved
space through CSS. Omit the option in ordinary browsers. The application owns
the native window setting; the library owns layout and drag regions.

See [file browser](./docs/assemblies/file-browser.md) for lazy directory display
and tool-rail composition. Applications retain file IO, permissions and drafts.
See [manual terminal](./docs/assemblies/terminal.md) for xterm presentation and
retained Files/Terminal switching. Applications retain shell and transport lifetimes.

See [region coverage](./docs/assemblies/coverage.md), [settings](./docs/assemblies/settings.md),
[conversation reader](./docs/assemblies/conversation-reader.md),
[composer](./docs/assemblies/composer.md), [resources](./docs/assemblies/resource-editor.md),
[preview](./docs/assemblies/file-preview.md), and [validation](./docs/validation.md).
