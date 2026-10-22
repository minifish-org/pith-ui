# Web preview

```ts
import {mountParts} from 'pith-ui';
import {composeWebPreview,composeWorkspaceTools,composeFrame} from 'pith-ui/recipes';

declare const mount: HTMLElement;
const preview=composeWebPreview({url:'',presentation:'native'},{
  onViewport(bounds) {console.log('Native content viewport:',bounds);},
  onNavigate(address) {console.log('Admit this address in the application:',address);},
  onRefresh() {console.log('Refresh the application-approved address');},
});
const tools=composeWorkspaceTools({tabs:[{id:'preview',kind:'preview',label:'Web'}],activeId:'preview',location:'Local',detail:'',webPreview:true});
tools.attach('preview',preview.part);
const frame=composeFrame({navigation:{groups:[],empty:'workspaces'}},{},{tools:{label:'Workspace tools',layout:'tabs',close:tools.dismiss,children:[tools.part]}});
mountParts(mount,frame.part);frame.setToolsOpen(true);
```

`composeWebPreview` owns the existing address draft, refresh icon and external
opening context menu. Return submits the address; Shift+F10 or right-click on
Refresh opens **Open externally**. Only errors display feedback below the toolbar.
The application admits URLs, retains original targets and owns requests, browser
intents, credentials and authorization lifetimes. `resetAddress` explicitly
replaces the accepted address; metadata updates preserve a typed draft.

Use `presentation: 'native'` with `onViewport(bounds)` for a native host-rendered
page. `createWebPreviewPart({disabled}, onViewport)` is the same opaque surface.
It reports visible CSS-pixel bounds or `null` while hidden, disabled, inert,
covered by a modal/popover, or disposed. Reports are coalesced per animation frame;
inactive and external surfaces do not schedule frames. This is an output-only
native placement contract; consumers receive no DOM or styling port.
The host handles native scaling, page focus, creation, navigation and destruction.

Use `presentation: 'external'` (the default) when the application opens a separate
browser tab. Neither presentation creates an iframe or loads web content in the
DOM. `url` and `externalUrl` are accepted metadata on a separate HTTP/HTTPS origin;
they do not automatically navigate a browser. `onNavigate`, `onRefresh` and
`onExternal` remain application intents. External opening defaults to a browser
tab without an opener/referrer; hosts authorizing asynchronously should reserve
a tab during the user gesture and navigate it after admission.

`composeWorkspaceTools({webPreview:true,...})` exposes **New Web** and retains the
existing tabs, close buttons and rail behavior. The application owns independent
browser/page and preview lease lifetimes. Hiding or destroying the UI surface
only retires its geometry reports; it never revokes a browser grant itself.
Never serve untrusted project content on Desk's authenticated origin.
