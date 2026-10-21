# Manual terminal

`createTerminalPart` wraps pinned xterm.js and addon-fit behind an opaque part.
It owns ANSI/UTF-8 parsing, selection, focus, theme, scrollback (1,000 lines),
container and visual-viewport fitting, and emulator disposal. `write(bytes, done)`
calls `done` after parsing; the application can acknowledge transport output at
that boundary. Pass raw `Uint8Array` bytes so character and control sequences may
span writes. `reset` replaces the emulator and retires earlier callbacks.

`composeTerminal` adds display metadata, Start/Close intents, connection state,
copy/paste and touch keys (Ctrl+C, Escape, Tab, arrows and Ctrl+D). Host-supplied
`id` retires pending clipboard reads when the selected session changes. A
disconnected view disables input. Terminal key events stay in the focused
terminal, including Escape in phone overlays. Use Close tools to dismiss the
overlay. Short visual viewports keep the keys and emulator visible while the
metadata/actions scroll independently.

`composeWorkspaceTools` switches between two opaque files/terminal parts without
destroying either. Hiding or destroying UI never closes an operating-system
session. The application owns session creation, workspace/session identity,
authenticated transport, lease validity, output history, acknowledgement and
explicit process shutdown. It must not replay business input after reconnect.
See [the public example](../../examples/assemblies/terminal.ts).

```ts
import {createTextPart} from 'pith-ui';
import {composeTerminal,composeWorkspaceTools,composeFrame} from 'pith-ui/recipes';
const terminal = composeTerminal({id: 'manual',location: 'Local computer',
  directory: 'Initial directory: /work',status: 'Disconnected',connected: false,exists: true}, {
  onInput(data) {console.log('Send only through the current authenticated connection',data);},
});
const tools = composeWorkspaceTools({files: createTextPart({text: 'Files'}),terminal: terminal.part});
export const frame = composeFrame({navigation: {groups: [],empty: 'workspaces'}},{},{
  tools: {label: 'Workspace tools',children: [tools.part]},
});
```

The library does not execute commands or integrate terminal output with an
Agent. It does not expose the xterm instance, DOM, arbitrary options or transport
credentials. Clipboard buttons use the application copy callback/system
clipboard; paste requires browser permission, with system Paste as a fallback.
