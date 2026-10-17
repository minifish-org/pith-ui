# Full-access confirmation assembly

Contract: [22](../contracts/rc27-ui-022.md#22-full-access-confirmation), Desk
`3f1ee24`, UI `897f46a`. The implementation is
[`examples/assemblies/full-access.ts`](../../examples/assemblies/full-access.ts).
It is executable consumer composition, never a public package scene API.

```text
Dialog (warning, title="Enable full access?", closeLabel="Cancel full access")
├─ TextFlow (description, literal text and two native strong segments)
├─ Warning
│  ├─ Icon (shield)
│  └─ Stack
│     ├─ Text (strong)
│     └─ Text (paragraph)
├─ Text (note, scope/persistence/revocation explanation)
├─ Feedback (inline error)
└─ Footer
   ├─ Button (secondary, Cancel)
   └─ Button (warning, Enable full access)
```

The library owns the warning palette, spacing, dimensions, discreet dialog
close action and hover behavior. The warning surface is one native DIV with
caller-composed parts, without automatic permission text or actions. The
dialog also supplies no business permission semantics; those remain here and
in the caller's existing controller.

```ts
import {composeFullAccess, type FullAccessResult} from '../../examples/assemblies/full-access.js';
import {createStackPart, mountParts, type Part} from '../../src/parts/index.js';

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

Capture the conversation identity in the callback closure before opening.
`update({title,error,disabled})` updates visible content and availability; it
does not replace that target. The target title is literal text inside a retained
native STRONG node; absent or empty title uses "this conversation". No HTML is
accepted. The original warning remains verbatim in the executable recipe,
including external MCP access, lack of an OS sandbox, persistence and how to
revoke permission.

The confirmation button owns one pending operation. An enabled snapshot cannot
release its local pending state. Error feedback is cleared on a new attempt;
failed results retain the opening for retry, and a successful result closes
only its own live revision. Cancel, native Escape, close and destruction retire
late results, restore focus and notify once. An unopened composition disposes
silently. The `onDispose` hook retires local ownership before a shared parent
releases its descendants.

Use one outer `MountedParts` for live appearance. `mountFullAccess` is the
standalone example adapter; whole applications compose the opaque part directly.
Tests in `parts-full-access.spec.ts` compare actual old application appearance,
literal/long/missing target content, errors, availability, SVG paths and
responsive scrolling in both browser engines and appearances. Shared-tree
tests cover live appearance, retained target nodes, pending parent disposal and
unopened teardown. The actual application shell is verified separately.
