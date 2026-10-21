import {mountParts,type Part} from 'pith-ui';
import {composeFrame,composeTerminal,composeWorkspaceTools,type TerminalCallbacks,type TerminalState} from 'pith-ui/recipes';

/** Host supplies transport, flow-control acknowledgements and session policy. */
export function mountTerminal(mount: HTMLElement,files: Part,state: TerminalState,callbacks: TerminalCallbacks) {
  const terminal = composeTerminal(state,callbacks);
  const tools = composeWorkspaceTools({tabs: [{id: 'files',kind: 'files',label: 'Files'},{id: 'terminal',kind: 'terminal',label: 'Terminal'}],activeId: 'terminal',location: 'Local',detail: state.directory},{onSelect() {terminal.fit();},onClose(id) {console.log('Host closes this tab and its session',id);},onNew(kind) {console.log('Host creates and activates a tab',kind);}});
  tools.attach('files',files);tools.attach('terminal',terminal.part);
  const frame = composeFrame({navigation: {groups: [],empty: 'workspaces'}},{},{tools: {label: 'Workspace tools',layout: 'tabs',close: tools.dismiss,children: [tools.part]}});
  const tree = mountParts(mount,frame.part);frame.setToolsOpen(true);
  return {update: terminal.update,write: terminal.write,reset: terminal.reset,
    beginReplay(next: TerminalState,size: {cols: number;rows: number}) {terminal.update({...next,connected: false,restoring: true});terminal.reset(size);},
    destroy: tree.destroy};
}
