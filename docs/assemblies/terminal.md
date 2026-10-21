# Workspace tool tabs and manual terminal

`composeWorkspaceTools` renders a compact ARIA tab strip followed directly by
retained opaque panels. The application supplies tab IDs, labels, selection,
location/tooltip details and pending/disabled states. The adjacent **+** menu
emits only New terminal and New files intents. Arrow keys, Home/End and Delete
operate on focused tabs. Each tab has a separate accessible close button.
Runtime location stays in tab tooltips rather than a permanent Local/Server
badge. A tab's explicit detail wins; other tabs use the supplied location/detail.

Call `attach(id, part)` once per view. `update(state)` hides inactive panels with
`hidden`/`inert`, retaining their inputs, selection and reading position. A
workspace switch can supply another set of tab IDs while keeping the other
panels attached. Only `remove(id)` destroys a panel; removing a tab from the
header alone does not destroy its view. Applications own persistence and must
finish an explicit terminal-process close before removing its panel. Close
callbacks are intents, not automatic process or view destruction.

Use `tools: {label, layout: 'tabs', close: tools.dismiss, children: [tools.part]}`
in `composeFrame` to omit the redundant rail heading. The frame borrows this
opaque button for collapse and focus restoration; the tab strip still owns it.
The expanded rail shows its control in the tab strip; the collapsed rail shows
its opener at the corresponding end of the main topbar. The narrow rail stays
an overlay; tabs and content retain the shared Pith UI theme and sizing. The tab
strip and terminal share the sidebar background without a horizontal divider.

`createTerminalPart` wraps pinned xterm.js and addon-fit behind an opaque part.
It owns ANSI/UTF-8 parsing, selection, focus, theme, scrollback (1,000 lines),
container/visual-viewport fitting and emulator disposal. Pass raw `Uint8Array`
bytes so multi-byte characters and control sequences can span writes.
`write(bytes, done)` calls `done` after parsing, allowing host flow control.
`reset` queues a cancel/RIS reset, keeps the focused input mounted and retires
earlier parse callbacks. It does not recreate the shell or replay input.
While replaying a recorded grid, set `TerminalState.restoring` (or the part's
`preserveSize`) so status/viewport changes cannot resize the emulator mid-stream.
Clear it at the live boundary to resume fitting the content area.

`composeTerminal` fills a panel with that emulator. Connected state is quiet;
errors, disconnection, exit and history notices appear above it when needed.
There are no Start/Close or desktop clipboard button rows. Standard selection,
Copy/Paste shortcuts and the browser/system context menu remain available.
Narrow/touch layouts add a compact Ctrl+C, Escape, Tab, arrow and Ctrl+D row.
Disconnected state disables input. Terminal key events stay inside the focused
terminal, including Escape; use Close tools to dismiss a phone overlay.

```ts
import {createTextPart} from 'pith-ui';
import {composeTerminal, composeWorkspaceTools, composeFrame} from 'pith-ui/recipes';
const terminal = composeTerminal({location: 'Local', directory: '/work',
  status: 'Connecting…', connected: false, exists: true}, {
  onInput(data) { console.log('Host sends through the current connection', data); },
});
const tools = composeWorkspaceTools({
  tabs: [{id: 'files', kind: 'files', label: 'Files'},
    {id: 'shell-1', kind: 'terminal', label: 'Terminal'}],
  activeId: 'shell-1', location: 'Local', detail: '/work',
}, {
  onClose(id) { console.log('Host closes this view and its session', id); },
  onNew(kind) { console.log('Host creates and activates a view', kind); },
});
tools.attach('files', createTextPart({text: 'Host-supplied file browser'}));
tools.attach('shell-1', terminal.part);
export const frame = composeFrame({navigation: {groups: [], empty: 'workspaces'}}, {}, {
  tools: {label: 'Workspace tools', layout: 'tabs', close: tools.dismiss, children: [tools.part]},
});
```

See the [compiled public example](../../examples/assemblies/terminal.ts).
The host owns PTYs, session identities, authentication, leases, transport,
bounded output history, acknowledgements and explicit process shutdown. UI
disposal never stops a shell. The library does not execute commands, persist
terminal data, expose the xterm instance or add output to an Agent context.
