# Assemble conversation reading and find

This compiled application recipe lives in
[`examples/assemblies/conversation-reader.ts`](../../examples/assemblies/conversation-reader.ts).
It is not a package-exported conversation reader scene. Its baseline is the
reading/search markup in `src/workspace.ts`, the reading algorithm in
`src/content/conversation-reader.ts`, and the update ordering in
`src/app/workspace.ts` at `897f46a`.

## Part tree

```text
Shared frame main children:
├─ SearchToolbarPart (native section; initially hidden)
│  ├─ InputPart (search; literal label/placeholder; Enter intent)
│  ├─ MetadataPart (search-count; polite native status span)
│  ├─ ButtonPart (previous-match; down icon; fixed previous direction)
│  ├─ ButtonPart (quiet-icon; down; Next match)
│  └─ ButtonPart (quiet-icon; close; Close search)
└─ ReadingRegionPart (native flex region)
   ├─ ReadingViewportPart (native scroll section)
   │  └─ composed ConversationBody ReadingColumnPart
   └─ ButtonPart (latest; down icon; Back to latest)

Shared frame sibling:
└─ ConversationBody AnnouncementPart
```

The viewport owns scrolling, anchor retention, latest-follow intent, literal
search and highlight marks. It never constructs a search toolbar or navigation
button. The caller explicitly composes those parts and connects data callbacks.
Its genuine reading column must be present among its direct owned children.
No scroll coordinate, follow-distance setting, selector, HTML, style or native
event is accepted by the public part.

## Connect one shared frame

```ts
import {mountParts} from 'pith-ui';
import {composeFrame, type FrameState} from '../../examples/assemblies/frame.js';
import {composeConversationReader} from '../../examples/assemblies/conversation-reader.js';
import {type ConversationBodyState, type ConversationBodyCallbacks} from '../../examples/assemblies/conversation-body.js';

export function attachConversation(
  mount: HTMLElement,
  frameState: FrameState,
  conversation: ConversationBodyState,
  callbacks: ConversationBodyCallbacks,
  appearance: 'light' | 'dark' | 'system',
) {
  const reader = composeConversationReader(conversation, callbacks);
  const frame = composeFrame(frameState, {}, {
    main: [reader.find, reader.region],
    siblings: [reader.announcement],
  });
  const owner = mountParts(mount, frame.part, {appearance});
  return {reader, setAppearance: owner.setAppearance, destroy: owner.destroy};
}
```

Other composed regions and dialogs remain ordinary opaque siblings in the same
frame. A single owner controls appearance and disposal. The standalone recipe
does not recreate Desk's configuration, conversations or business controller.

## State and callback connections

Each update follows the same sequence: `viewport.beforeUpdate(conversation.id)`,
the body composition's update, then `viewport.afterUpdate()`. The library
remembers per-conversation reading positions before content changes and restores
the selected history anchor afterward. Latest-follow is an explicit user intent
that survives layout changes, including asynchronous image decoding. Manual
history reading does not become latest-follow merely because content grows.

The local recipe connects the viewport's callbacks as follows:

| Data callback or action | Caller composition |
| --- | --- |
| `onSearchState({open,query,current,total,label})` | Updates toolbar visibility, current field value, literal count and previous/next availability. `current` is zero-based; the library supplies the formatted label. |
| `onLatestChange(visible)` | Updates the independently composed latest button's hidden state. |
| `onSearchIntent('open')` | Focuses and selects the search input through its bounded field methods. |
| Input `onInput(query)` | Calls `viewport.search(query)`. |
| Input `onEnter(next/previous)` | Calls `viewport.moveMatch(direction)`; composition events are ignored. |
| Previous / Next | Calls the same bounded match method. |
| Close search | Calls `viewport.closeSearch()`, which clears marks and restores viewport focus. |
| Back to latest | Calls `viewport.followLatest()`. |

The keyboard handler recognizes the platform find shortcut and Escape within
the owning application. An open modal in that frame blocks reader shortcuts.
Search is literal, case-insensitive and Unicode-aware. A match may cross native
text nodes without treating the query as a regular expression. Matches inside
buttons, summaries and ignored content do not become reading matches. Moving
to a match opens enclosing native disclosures and retains the original fixed
reveal behavior.

Unchanged message nodes and code content keep their identity, selection and
horizontal code scroll. The private cache uses the original renderer version
where supplied; independently composed content uses retained literal text and
connected highlight nodes. Streaming updates therefore invalidate changed
matches while leaving unchanged messages available for reading.

## Lifecycle and verification

`reader.prune(ids)` releases obsolete reading positions and the body composition's
saved disclosure folds. The host remains responsible for pruning its
deleted-conversation data. Destroy the shared frame
to release the search row, viewport, body and announcement together. The viewport
disconnects observers, document listeners and pending animation frames; direct
methods remain inert after disposal. The local controller's explicit `destroy`
also disposes its independent siblings and is idempotent.
Destroying the viewport's required reading-column part also retires that
viewport; it cannot retain document shortcuts for a missing column.

```sh
node scripts/verify-assemblies.ts
npx playwright test tests/parts-conversation-reader.spec.ts
```

The permanent regression first executes the actual old application. It covers
light/dark and narrow/wide layout, literal multilingual matches spanning native
nodes, cycling and keyboard focus, streamed invalidation, retained code scroll
and text selection, manual reading across appends and conversation switches,
explicit latest-follow, modal keyboard boundaries and terminal teardown. The
formal fixture destroys the old application; only an inert composer clone is
retained as test context for the reading area's available height.
