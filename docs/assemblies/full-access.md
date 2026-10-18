# Full-access confirmation assembly

Import this region from `pith-ui/recipes`. Its single implementation is
[`src/recipes/full-access.ts`](../../src/recipes/full-access.ts); public state, callbacks and
handles are indexed in [API.md](../../API.md).

Supply display state and data callbacks from the host. Ordinary snapshots retain local interaction state. Explicit reset/target changes and parent disposal retire pending UI outcomes; business requests and write validity remain host responsibilities.

```ts
import {composeFullAccess, type FullAccessResult} from 'pith-ui/recipes';
import {createStackPart, mountParts, type Part} from 'pith-ui';

export function openFullAccess(
  mount: HTMLElement,
  applicationBody: Part,
  conversation: {id: string; title: string},
  enable: (id: string) => Promise<FullAccessResult>,
) {
  const target = Object.freeze({...conversation});
  const assembly = composeFullAccess({title: target.title}, {
    onConfirm: () => enable(target.id),
    onClose() { /* Release this opening from the application's controller. */ },
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
[`parts-full-access.spec.ts`](../../tests/parts-full-access.spec.ts).
