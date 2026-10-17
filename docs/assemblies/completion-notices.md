# Assemble completion notices

[`examples/assemblies/completion-notices.ts`](../../examples/assemblies/completion-notices.ts)
is the compiled consumer composition for `src/files/systems.ts` and the fixed
workspace notification region at `897f46a`. The package exports small native
toast, text, emblem and button parts; it has no completion-notice scene API.

## Part tree

```text
ToastStackPart: SECTION, Completed tasks, aria-live polite
└─ keyed ToastPart: ARTICLE
   ├─ success EmblemPart: SPAN with the fixed check SVG
   ├─ ToastBodyPart: DIV
   │  ├─ strong TextPart: Task completed
   │  ├─ paragraph TextPart: workspace · title
   │  └─ text-action ButtonPart: Open conversation
   └─ dismiss-icon ButtonPart: close, Dismiss completion notification
```

The library retains the original fixed placement, bounded scrolling, responsive
position, card surface, check emblem and dismissal size. The native hierarchy
has no extra wrapper. The recipe selects content and callbacks, with no CSS,
pixel, animation or arbitrary icon options.

## Connect to the workspace

```ts
import {composeCompletionNotices, type CompletionNoticeDisplay} from '../../examples/assemblies/completion-notices.js';
import {createStackPart, mountParts, type Part} from '../../src/parts/index.js';

export function attachCompletionNotices(
  mount: HTMLElement,
  workspace: Part,
  initial: readonly CompletionNoticeDisplay[],
  onOpen: (id: string) => void,
  onDismiss: (runID: string) => void,
) {
  const notices = composeCompletionNotices(initial, {onOpen, onDismiss});
  const owner = mountParts(mount, createStackPart({children: [workspace, notices.part]}));
  return {owner, notices};
}
```

In the full frame, use the existing root sibling slot for `notices.part` and
the application's single appearance owner. Forward Open conversation to Desk's
existing conversation selection and Dismiss to its existing run notification
removal. The callback does not mutate session history or remove the notice
itself; the next authoritative snapshot does so.

## Updates and lifetime

The default initial list is empty. `update` keys notices by run ID, retains
their native articles and buttons, and supplies the latest conversation target
and workspace/title. Reordering retains the focused action. Removed entries
dispose their buttons, so a saved reference cannot later invoke a stale target.
Open sends the current conversation ID; Dismiss sends the run ID. Their actions
preserve the original immediate intent behavior.

All title and workspace strings remain literal text. The shared native section
keeps polite announcements and independent scrolling as notices arrive.
Destroying the parent or composition retires both initially empty and populated
stacks before late updates. Explicit destruction is idempotent.

## Maintained proof

```sh
npm run check
node scripts/verify-assemblies.ts
npx playwright test tests/parts-completion-notices.spec.ts
```

The suite passed 24 Chromium/WebKit checks. It compares the actual old workspace
and formal composition for empty,
single and multiple long notices in light/dark, narrow and short windows. It
checks native structure, literal content, SVGs, accessible names, fixed bounds
and computed presentation. The formal side replaces the cloned native context
after the old application has been destroyed. Both implementations exercise
keyboard activation, stable focused rows, latest targets, dismissal and removed
controls; formal cases also verify bounded parts and shared-parent disposal.
