# Assemble a lazy file browser

`composeFileBrowser` owns the search control, keyed directory disclosures, file
action menu and disposal. Applications supply `FileBrowserState.directories`,
including the root path `''`; expanding an unloaded directory emits `onToggle`
with its original workspace ID and relative path. The application reads only
that directory and projects its loading/error/expanded state back into the recipe.

```ts
import {composeFileBrowser,composeFrame} from 'pith-ui/recipes';
const browser = composeFileBrowser({workspaceId: 'demo',location: '/demo',query: '',
  directories: [{path: '',expanded: true,entries: [{name: 'README.md',path: 'README.md',directory: false}]}],
  capabilities: {native: false,copyPathLabel: 'Copy path'}}, {
  onAction(action,target) {console.log(action,target);},
});
export const frame = composeFrame({navigation: {groups: [],empty: 'workspaces'}},{},{
  tools: {label: 'Workspace files',children: [browser.part]},
});
```

Mount the frame before opening tools with `frame.setToolsOpen(true)`. Wide
navigation and tools toggle independently; phone overlays exclude one another,
trap focus, close by button/scrim/Escape and restore the matching trigger.
`closeNavigationOverlay` and `closeToolsOverlay` dismiss only phone overlays;
they preserve the user's wide sidebar choices.

Search data, debounce, scan limits, permission checks, preview reads, downloads,
native operations and draft insertion remain with the application. A workspace
change resets the search and closes the menu. Host controllers must also retire
their pending reads and validate every callback's original target. Native actions
are finite capabilities; unavailable actions have no placeholder entries.
