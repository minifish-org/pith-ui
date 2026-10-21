import {mountParts,type Part} from 'pith-ui';
import {composeFrame,composeTerminal,composeWorkspaceTools,type TerminalCallbacks,type TerminalState} from 'pith-ui/recipes';

/** Host supplies transport, flow-control acknowledgements and session policy. */
export function mountTerminal(mount: HTMLElement,files: Part,state: TerminalState,callbacks: TerminalCallbacks) {
  const terminal = composeTerminal(state,callbacks);
  const tools = composeWorkspaceTools({files,terminal: terminal.part},{onView(view) {if (view === 'terminal') terminal.fit();}});
  const frame = composeFrame({navigation: {groups: [],empty: 'workspaces'}},{},{tools: {label: 'Workspace tools',children: [tools.part]}});
  const tree = mountParts(mount,frame.part);frame.setToolsOpen(true);tools.select('terminal');
  return {update: terminal.update,write: terminal.write,reset: terminal.reset,destroy: tree.destroy};
}
