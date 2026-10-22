# Web preview

```ts
import {mountParts} from 'pith-ui';
import {composeWebPreview,composeWorkspaceTools,composeFrame} from 'pith-ui/recipes';

declare const mount: HTMLElement;
const preview=composeWebPreview({url:''},{
  onNavigate(address) {console.log('Admit this address in the application:',address);},
  onRefresh() {console.log('Refresh the application-approved address');},
});
const tools=composeWorkspaceTools({tabs:[{id:'preview',kind:'preview',label:'Web'}],activeId:'preview',location:'Local',detail:'',webPreview:true});
tools.attach('preview',preview.part);
const frame=composeFrame({navigation:{groups:[],empty:'workspaces'}},{},{tools:{label:'Workspace tools',layout:'tabs',close:tools.dismiss,children:[tools.part]}});
mountParts(mount,frame.part);frame.setToolsOpen(true);
```

`composeWebPreview` owns one address draft, a refresh icon and a sandboxed iframe.
Return submits the address; right-clicking the refresh icon (or Shift+F10)
opens the **Open externally** menu. Only errors display feedback below the toolbar.
Supply `url`, `externalUrl`, availability and
callbacks; the application admits URLs and owns requests, credentials and proxy
lifetimes. `resetAddress` replaces the draft only after explicit navigation.
`revision` deliberately reloads the frame; ordinary metadata updates preserve it.

`createWebPreviewPart` accepts only HTTP/HTTPS URLs without embedded credentials,
on an origin different from its owner. Its sandbox permits scripts, forms and
the preview's own origin, while denying popups, top navigation, downloads and
native permissions. Disabling or destroying it removes the frame. It does not
read frame contents, accept frame messages or infer success from `load` events.

Use `composeWorkspaceTools` with `webPreview: true` to expose the optional preview
intent. The host enforces a single preview and supplies its approved external
URL. External opening defaults to a new browser tab with no opener or referrer.
Keep website embedding headers intact; show a persistent external-browser hint.
Never serve untrusted project content on the application's authenticated origin.
