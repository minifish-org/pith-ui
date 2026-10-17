# Assemble the viewport frame, brand and navigation

This local recipe proves the frame, brand, sidebar tree, topbar and navigation
menus from contract units [01–04](../contracts/rc27-ui-022.md). Its implementation
is [`examples/assemblies/frame.ts`](../../examples/assemblies/frame.ts), with a
standalone internal [example](../../examples/assemblies/frame.html). It imports
only formal parts and creates no DOM, HTML or CSS. It is not a package export or
a public workspace API.

The source contract is `src/workspace.ts:createWorkspaceShell`,
`src/app/workspace.ts`, `src/navigation/navigation.ts` and their styles at
`897f46a`, as used by Desk's
`frontend/src/workspace.ts` at `3f1ee24`. Conversation bodies, composer, task
panels and remaining dialogs require their own assemblies. The `main` argument
accepts those already composed opaque parts in their original order; this
recipe's empty main is not a claim that the complete workspace is proven.

## Part tree

```text
FramePart (viewport layout only)
├─ SideRailPart (native aside)
│  ├─ BrandPart
│  │  └─ intrinsic display-contents span: BrandMarkPart + name + qualifier
│  ├─ RailHeadingPart: WORKSPACES + quiet Manage workspaces ButtonPart
│  ├─ SearchFieldPart: native label / search SVG / hidden label / search input
│  ├─ TreePart (native nav)
│  │  └─ keyed TreeBranchPart (native section)
│  │     ├─ intrinsic heading: toggle / More ButtonPart / New ButtonPart
│  │     └─ intrinsic children
│  │        └─ keyed TreeItemPart
│  │           ├─ intrinsic selection button: caption / optional ActivityPart
│  │           └─ quiet More ButtonPart
│  └─ RailFooterPart
│     ├─ navigation ButtonParts: Resources / Connections / Settings
│     └─ ConnectionIndicatorPart: Reconnecting…
├─ MenuPart (ordinary small menu, independently populated by local closures)
├─ DrawerPart (native scrim; borrows frame / rail / main / trigger)
├─ MainPart (native main)
│  ├─ TopbarPart (native header)
│  │  ├─ drawer-trigger ButtonPart
│  │  ├─ BreadcrumbPart: workspace / conversation
│  │  └─ ActionsPart: toolbar-action Compact ButtonPart
│  └─ caller-composed conversation / composer / task parts
└─ caller-composed DialogParts, including Settings
```

The useful native wrappers and intrinsic branch/row nodes match the baseline.
There is no general wrapper for each text, icon or button. Parts accept content,
finite semantic options, state and callbacks. They expose no elements, selectors,
arbitrary classes, dimensions or animation controls.

`FramePart` owns viewport positioning, responsive minimum heights and overflow.
It can mount in Desk's ordinary empty DIV without host style resets or document
theme mutation. It is a viewport part, rather than a general embedded panel.

## Compose first, mount once

`composeFrame` returns its opaque `part` and local lifecycle methods. Compose
dialogs before creating the frame, attach their parts as direct frame children,
then establish one outer mount and appearance owner. `mountFrame` is only the
standalone internal example adapter.

```ts
import {mountParts, type Part} from '../../src/parts/index.js';
import {
  composeFrame, type FrameState, type FrameCallbacks,
} from '../../examples/assemblies/frame.js';
import {
  composeSettings, type SettingsState, type SettingsCallbacks,
} from '../../examples/assemblies/settings.js';

export function mountFrameWithSettings(
  mount: HTMLElement,
  state: FrameState,
  settingsState: SettingsState,
  callbacks: FrameCallbacks,
  settingsCallbacks: SettingsCallbacks,
  main: readonly Part[],
) {
  const settings = composeSettings(settingsState, settingsCallbacks, 'Pith Desk');
  const frame = composeFrame(state, {
    ...callbacks,
    onAction(action) {
      if (action === 'settings') {settings.open(); return;}
      return callbacks.onAction?.(action);
    },
  }, {main, dialogs: [settings.part]});
  const mounted = mountParts(mount, frame.part, {
    appearance: settingsState.appearance?.mode ?? 'system',
  });
  return {
    frame, settings,
    setAppearance: mounted.setAppearance,
    destroy() {
      settings.destroy();
      frame.destroy();
      mounted.destroy();
    },
  };
}
```

Keep the existing persistence callback for appearance and publish the accepted
appearance through `setAppearance`. The shared mount selects the library's
palette and notifies descendant brand assets. The named Pith mark retains its
four native tiles. An image mark accepts only `src`, optional `darkSrc` and alt
text; switching explicit or system appearance retains that same image node.
The application preserves its existing asset paths and product name.

## State and callback connections

| Local operation | Projection and behavior |
| --- | --- |
| `update(state)` | Updates breadcrumb, reconnecting state, Compact availability and keyed navigation metadata. Omitted breadcrumb captions retain their previous values. |
| `search(query)` | Filters conversation titles case insensitively, opens matching branches and reports `onSearch`. The native field reports edits through this same local operation. |
| Branch toggle | Changes the local expansion map without selecting a workspace or running a business callback. A newly active conversation opens its branch. |
| Row selection | Closes the local menu and drawer, then calls `onSelectConversation(id)`. The host publishes the resulting selected conversation. |
| New conversation | Closes the menu and calls `onNewConversation(workspaceId)`. |
| Utility / Compact action | Calls `onAction(action)`. Compact returns the host outcome to its ButtonPart, preserving native local pending across ordinary snapshots. |
| Menu item | Captures its target ID in a local closure, closes the menu, then dispatches the corresponding workspace/conversation callback. |
| `closeNavigationMenu()` | Closes the small menu and clears only the local target/expanded state. |
| `setSidebarOpen(open)` | Delegates to the composed DrawerPart after mounting. |

Rows and branches are keyed by their existing workspace/conversation identity.
Metadata updates and reorder retain selection-button focus, activity-node
identity and tree scroll. Search and removal destroy obsolete parts. Activity
has only approval, running, unread and idle states, including the existing SVG
and indicator behavior. Empty workspace and search messages stay literal text.

Workspace menus offer Remove workspace. Conversation menus offer Rename,
Export Markdown and Delete conversation; Conversation branches appears only for
the active conversation. Existing action availability and busy snapshots remain
caller data. Disabling selection and auxiliary actions does not disable the
independent branch disclosure control. Promise failures use the existing host
error callback; destroying the local composition retires those outcomes.

Finite button variants determine markup inside their native contexts:
`navigation` and `navigation-item` have a required library icon and caption;
`toolbar-action` has an icon, caption and optional accessible caption;
`drawer-trigger` is an icon-only mobile action. These are action presentations,
not prompt variants. Only a quiet menu trigger accepts `menuExpanded`. Ordinary
button snapshots do not erase ARIA state owned by a borrowed drawer or menu.

## Drawer and destruction

At the library's existing mobile breakpoint, the closed rail is inert. Opening
the drawer makes main content inert, focuses the first rail control and keeps
Tab/Shift+Tab inside the rail. Escape closes it and restores the trigger. An
open modal gets keyboard precedence. A pointer scrim dismissal preserves the
baseline's native focus result, which is BODY after the pointer has blurred the
rail; it does not invent a focus restoration. Returning to mobile while focus
is inside a newly inert closed rail restores the trigger. Desktop behavior
retains ordinary rail access.

The frame owns child parts. Its disposal callback retires local state and keyed
maps before children, including ancestor replacement or mount destruction.
Later state updates, search and asynchronous outcomes stay quiet. Drawer and
menu borrow only genuine opaque handles; destroying their source closes them
and removes listeners. Dispose local
composition handles before releasing the shared mount, as in the example. This
also retires local async error reporting and clears settings secrets. All
destruction methods are idempotent. Do not independently mount a dialog or
reparent a part already owned by this tree.

## Verification

`tests/parts-frame.spec.ts` checks native trees, bounded constructor/update
options, theme-aware brand assets, mobile focus/inert behavior and one shared
Settings dialog mount. `tests/parts-navigation.spec.ts` compares the actual old
application's markup, SVG, geometry, visible text styles, callbacks, menus,
retained identity and Compact pending in Chromium and WebKit.

The visual oracle covers light/dark at desktop, medium, mobile and short
viewports. Matched rail/header captures and a content-free main-background
sample are pixel identical in both engines after finishing finite transitions.
Textless outer layout containers are compared by layout and effective paint;
all visible text keeps exact computed-style assertions. These proofs do not
replace the separate conversation, composer and task-panel contracts.
