# Rename conversation assembly

Import this region from `pith-ui/recipes`. Its single implementation is
[`src/recipes/rename.ts`](../../src/recipes/rename.ts); public state, callbacks and
handles are indexed in [API.md](../../API.md).

Supply display state and data callbacks from the host. Ordinary snapshots retain local interaction state. Explicit reset/target changes and parent disposal retire pending UI outcomes; business requests and write validity remain host responsibilities.

```ts
import {composeRename} from 'pith-ui/recipes';
import {createStackPart, mountParts, type Part} from 'pith-ui';

export function openRename(mount: HTMLElement, applicationBody: Part) {
  const assembly = composeRename({id: 'conversation-a', title: 'Project notes'}, {
    async onSubmit({id, title}) {
      // Connect the application's existing rename write here. This example
      // deliberately does not perform a business write.
      return id && title ? {ok: true} : {ok: false, error: 'A title is required.'};
    },
    onClose() { /* Release this opening from the application's owner. */ },
  });
  const root = createStackPart({children: [applicationBody, assembly.part]});
  const application = mountParts(mount, root, {appearance: 'light'});
  assembly.open();
  return {assembly, application};
}
```

Attach the region to the existing ownership tree before opening it. See
[APP.md](../../APP.md) for shared mounting and dialog slots. The current
interaction assertions run in Chromium and WebKit in
[`parts-rename.spec.ts`](../../tests/parts-rename.spec.ts).
