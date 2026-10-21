/** Host supplies lazy directory data, search results and file operations. */
import {mountParts} from 'pith-ui';
import {composeFileBrowser,composeFrame,type FileBrowserState,type FileBrowserCallbacks} from 'pith-ui/recipes';
export function mountFileBrowser(mount: HTMLElement,state: FileBrowserState,callbacks: FileBrowserCallbacks = {}) {
  const browser = composeFileBrowser(state,callbacks);
  const frame = composeFrame({navigation: {groups: [],empty: 'workspaces'}},{},{tools: {label: 'Workspace files',children: [browser.part]}});
  const tree = mountParts(mount,frame.part);frame.setToolsOpen(true);
  return {update: browser.update,destroy: tree.destroy};
}
