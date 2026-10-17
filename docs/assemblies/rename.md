# Rename conversation assembly

Contract: [21](../contracts/rc27-ui-022.md#21-rename-conversation), Desk
`3f1ee24`, UI `897f46a`. The executable implementation is
[`examples/assemblies/rename.ts`](../../examples/assemblies/rename.ts); it is an
internal example and is not exported by the package.

```text
Dialog (form, title="Rename conversation", eyebrow="CONVERSATION")
└─ Form
   ├─ FieldLabel (Title, references Input)
   ├─ Input (text, required, autocomplete off, name=title)
   ├─ Feedback (inline error)
   └─ Footer
      ├─ Button (secondary, Cancel)
      └─ Button (primary, submit, Save title)
```

The dialog supplies its native heading, close action, backdrop and focus
lifecycle. Label, input and feedback remain separate native elements; there is
no wrapper around each control. The library decides every presentation rule.

```ts
import {mountRename, type RenameAssembly} from '../../examples/assemblies/rename.js';

export function openRename(mount: HTMLElement): RenameAssembly {
  return mountRename(mount, {id: 'conversation-a', title: 'Project notes'}, {
    async onSubmit({id, title}) {
      // Connect the application's existing rename write here. This example
      // deliberately does not perform a business write.
      return id && title ? {ok: true} : {ok: false, error: 'A title is required.'};
    },
    onClose() { /* Release this opening from the application's owner. */ },
  }, {appearance: 'light'});
}
```

`update` projects availability and feedback without replacing the input or
changing its value, selection or original target. Its `id` and `title` snapshot
fields do not retarget the opening. Use `reset({id,title,...})` explicitly to
change target and draft; reset invalidates pending UI outcomes before changing
either. `focus()` selects the entire title using the field's bounded
`selectAll()` operation. No browser Event or control is exposed.

Submit uses native required validation, then trims the value and refuses an
empty title. The callback receives a frozen `{id,title}` captured from this
opening. The form owns one pending operation; rendering an enabled snapshot
cannot clear that pending state. Failed results update feedback and preserve
the draft. Successful results close only the submitting revision.

Cancel, Escape, close, and destroy retire pending outcomes, preserve `read()`'s
last draft, restore the opener and notify `onClose` once. Destruction is
idempotent. A late failed result cannot recreate controls or show feedback.

`tests/parts-rename.spec.ts` compares the actual old application's dialog in
both appearances and browser engines, including long literal content, errors,
disabled state and narrow/short viewports. Presentation comparisons use the
same native application parent: WebKit's CSSOM automatic minimum serialization
depends on its flex context even for top-layer dialogs. Draft, reset,
validation, pending and disposal tests also run with an ordinary standalone
mount. The complete application shell and shared live appearance owner require
their separate assembly proof before Desk migration.
