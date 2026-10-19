# Assemble conversation permission choice

Import this region from `pith-ui/recipes`. Its single implementation is
[`src/recipes/permission-control.ts`](../../src/recipes/permission-control.ts); public state, callbacks and
handles are indexed in [API.md](../../API.md).

The composer shows the permission name at ordinary widths and a 44px icon button
when its toolbar content width is at most 680 CSS pixels. The toolbar observes
its actual width so Linux desktop DPI scaling cannot delay this change. The shield contains a question mark
for `ask`, a pencil for `workspace-write`, and an amber exclamation mark for
`full-access`. The current name remains available in the tooltip and all three
full names remain in the menu. Container resizing keeps the same control,
draft and keyboard focus; permission policy and confirmation remain with the host.

Supply display state and data callbacks from the host. Ordinary snapshots retain local interaction state. Explicit reset/target changes and parent disposal retire pending UI outcomes; business requests and write validity remain host responsibilities.

```ts
import {
  composePermissionControl, type PermissionState,
} from 'pith-ui/recipes';
import {createStackPart, mountParts} from 'pith-ui';

interface PermissionController {
  change(mode: string): void;
}

export function attachPermissionChoice(
  mount: HTMLElement,
  initial: PermissionState,
  controller: PermissionController,
  appearance: 'light' | 'dark' | 'system',
) {
  const permission = composePermissionControl(initial, {
    onChange: mode => controller.change(mode),
  });
  const owner = mountParts(mount, createStackPart({
    children: [permission.control, permission.description],
  }), {appearance});
  return {owner, permission};
}
```

Attach the region to the existing ownership tree before opening it. See
[APP.md](../../APP.md) for shared mounting and dialog slots. The current
interaction assertions run in Chromium and WebKit in
[`parts-permission-control.spec.ts`](../../tests/parts-permission-control.spec.ts).
