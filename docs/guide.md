# Integrating Pith UI

## Application integrations

Pith Desk integrations must follow the bundled [application consumption contract](../APP.md), not the general composition instructions below. UI imports are only `pith-ui/app` and `pith-ui/styles.css`. One checked mount enters `createApplication`; the four plain scene handles project existing controller state and return semantic intents. No internal node, Node slot, HTML, selector, dataset routing or custom styling is part of that boundary.

Use `workspace` for navigation, conversation reading, composer/queue, tasks/approval, owned dialogs, branch history, costs and completion notices; `settings` for appearance/provider/model/MCP/login/independent connections and updates; `resources` for inventory/source editing; `files` for artifact actions and previews. The contract lists exact methods and lifecycle rules; the installed `dist/app/index.d.ts` remains authoritative. `setAppearance` is an application method; branding is a finite asset/text object rather than a Node.

Keep application controllers for protocols, identity/permission/target validation, drafts, persistence, credentials/login transactions, file acquisition/native capabilities, costs, update polling and completion acknowledgments. A missing scene capability needs a tested library port. Do not fall back to the root factories or duplicate a component to finish a migration.

The [complete reference](../examples/application/main.ts) is TypeScript compiled against public package exports and exercised through the [`application-reference`](https://minifish-org.github.io/pith-ui/?item=application-reference) showroom case. It uses in-memory simulation rather than real services or native writes. A local passing example is not a release, deployment, Pith Desk parity or human-acceptance claim.

Install the approved verified registry version or prerelease exactly, commit its lockfile, and validate that artifact's API/CSS/types. Pith Desk must not depend on a local tarball, `file:`/`link:`, workspace/source alias or symlink. Migrate view assembly while preserving business controllers and regression assertions, delete the replaced view implementation, and verify behavior/visual/native/resource evidence separately. Detailed steps are in [APP.md](../APP.md#migration-and-validation).

## General component compositions

The remainder of this guide applies to independent consumers of the unrestricted root entry. It does not relax the application contract.

## Installation and scope

Install a released, exact version, commit the consumer lockfile, and import only the package entry and `pith-ui/styles.css`. The generated ESM is for a browser DOM; Node can inspect exports but cannot mount a UI without a browser document.

Call `setAppearance(root, appearance)` on an ancestor of all mounted components. A dialog that automatically appends to `document.body` needs a themed body ancestor. For an embedded surface, append its supplied dialog under the themed host before opening it.

Use host layout to position a component, and supported component options to configure it. Theme-specific overrides belong in a reviewed, central `--pui-*` token scope. Internal class names are implementation details, not a per-page design API.

## Fixed presentation

Create the appropriate block without selecting a font, text size or gap. It chooses between system UI and monospace code fonts, using small/medium/large text at 12/14/16 CSS px, regular/strong weights at 400/600 and a proportional line height of 1.5. Medium is the default. The same scale applies to UI headings and content; code keeps its monospace role. Supplied logos and brand Nodes remain application-owned.

The spacing scale is 4/8/12/16/24 CSS px. The block chooses gaps and padding from these values; zero simply means no spacing. Control heights, image/icon geometry, borders and focus offsets have their own functional dimensions. Do not use these as a second spacing scale.

The shared stylesheet defines `--pui-font-ui/code`, `--pui-text-small/medium/large`, `--pui-weight-regular/strong`, `--pui-line-height` and `--pui-space-xs/sm/md/lg/xl`. These document the shared contract; adding an internal override in a consumer creates another implementation. Retained font/field token names resolve to the shared foundations rather than introducing arbitrary font or size choices. Density options remain for compatibility and internal compositions, while ordinary examples use the standard presentation. Library-owned compact chat actions and the fixed dimensions exhibit retain their deliberate geometry.

## Create, update, destroy

The common handle is:

```ts
interface UIBlock<State> {
  readonly element: HTMLElement;
  update(state: Readonly<State>): void;
  destroy(): void;
}
```

Methods beyond this contract are explicit in each component's declaration. Text inputs have `getValue`, `reset` and `focus`; product forms expose typed `read`, reset and state methods; dialogs have open/close. Use semantic callbacks and these methods for normal integration. Native `form`, `field` and `part` accessors remain compatibility adapters.

`update` is a presentation update, not an implicit reset of an ongoing edit. Initialize a target once, update error/availability while it remains active, and use an explicit reset/open or a new instance when changing targets. Keep item IDs stable. Do not recreate a whole view for every token or refresh.

Call `destroy` before releasing a block. A component may remove its own element, but callers must not rely on every component doing so; release the host's remaining DOM after disposing owned children. Repeating cleanup should be harmless.

The [compiled examples](./examples.ts) include a text editor, a protected async form and a composed conversation reader. Their public API calls are type-checked by the normal project check.

## Actions and business state

Async submit-capable components accept:

```ts
type ActionResult = { ok: true } | { ok: false; error: string };
```

The host must validate target identity and current permissions before calling its business operation. When a write succeeds and the following refresh fails, return the successful write result and show refresh feedback separately; never make the component replay the write.

`createComposerView` accepts typed `onSubmit` and `onStop` callbacks that may return `ActionResult`, `void`, or a promise of either. Its own pending state protects against duplicate actions. The application decides whether a successful send should reset the draft; failure retains it. Dialogs expose an optional semantic `eyebrow`; confirmations additionally expose `hint` for supplementary explanation. Use those options rather than inserting custom styled heading markup.

Inputs and message drafts remain in place during feedback updates. Local pending and external disabled conditions are combined. Closing, reopening or destroying a surface invalidates old UI results, while the application retains ownership of cancellation and completed writes.

Use a product form's typed callbacks (`onSubmit`, `onProviderChange`, `onTest`, `onRemoveKey`) and its `read`, reset and presentation methods. The form owns native validation, duplicate prevention, pending feedback and stale-result suppression. Do not bind a second submit handler or patch internal fields. Legacy `data-*` routing and local DOM accessors support compatibility; if an unsupported integration still needs native bindings, own and dispose those listeners with the view.

Use explicit IDs/prefix options when adopting an existing application's elements. For independent instances, keep generated defaults and distinct model-editor prefixes. Do not query app-fixed global IDs inside a new library component.

Navigation's `onAction` receives finite actions and semantic IDs plus the trigger button. `createContextMenu.open(trigger, state)` anchors to that button's lower edge and flips at viewport boundaries. Supply `{ point: { x, y } }` as the third argument only for an explicit pointer-positioned menu. Provider/resource actions use `onProviderAction`/`onResourceAction`; MCP lists use `onAction`. Supplying these callbacks owns the event. Omitting one preserves the compatibility dataset route; do not bind both routes for the same action.

Single-choice selectors share the floating Select implementation. Multi-row and multiple selections retain the browser's native list, 16 CSS px text and system keyboard behavior; WebKit controls its own row metrics and ignores option padding. Use `values`, `getValues`, `resetValues` and `onValuesChange` for all selected values. `values` wins over scalar `value` at construction. Explicit resets change the draft without emitting change callbacks or changing the construction baseline restored by native `form.reset()`.

`createUpdatePanel` does not fetch or poll. The controller passes fresh status through `update`, local submission through `setPending`, and errors through `setError`. For a failed status read, `setError(message, { allowCheckRetry: true })` allows a manual check while retaining external disabled state, local pending and protection against another install. A fresh status clears that temporary read-error state.

## Node extension ownership

Node slots let callers compose controls without injecting HTML. Construct untrusted text using `textContent`, `element(tag, className, text)`, or ordinary typed text options.

An ordinary slot receives a Node, not its component handle. Keep child handles and destroy them yourself. Passing a `{ element, destroy }` `DialogContent` to `createFeatureDialogFrame` explicitly transfers that child's lifecycle to the frame; it releases the old child on replacement or close.

Moving a Node transfers that actual DOM node; it is not a cloned template unless the concrete API states otherwise. Avoid placing the same node in two owners.

## Content, files and images

`renderMarkdown` applies the shared marked/DOMPurify policy, strips embedded media and unsafe markup, decorates fenced code blocks, and restricts navigation links. `renderDiff` escapes every line. New blocks should reuse these functions.

Local file links are opt-in through `resolveLocalLink`. Its `{ path, conversationId }` result labels a host-owned action; the host still validates the path and conversation, handles native cancellation, and chooses the actual download or open mechanism.

`createConversationView` accepts a standalone `ConversationMessage` display model. The host supplies `actions` to authorize Copy/Edit/Branch; role alone is not an authorization rule. In Pith Desk, user copy/edit, each completed assistant message's copy, and branch-node eligibility retain their existing policy in the adapter.

Images in conversation rendering are placeholders with stable keys. The host loads and validates bytes, owns object URLs, rejects late results after a scope change, and revokes URLs when no longer needed. The zoom viewer owns fit/original/zoom/focus interaction, not the data URL's lifetime.

Paged text previews use UTF-8-safe 256 KiB windows. Large Markdown is shown as original text so a split code fence cannot change interpretation. The rendering window is not a file acceptance limit.

Conversation, paged-preview and file-preview code-copy callbacks receive `(text, button)`. Connect native clipboard access through this callback and use `createCopyFeedback` for duplicate prevention and result/error presentation. It is the host's responsibility to handle rejected copy operations; the library does not add another clipboard operation. A supplied callback consumes its code-copy event; an omitted callback leaves existing delegation available. File action groups expose `setDisabled` and retain copy-pending restrictions when re-enabled.

## Conversation reading

Wrap an update with `reader.beforeRender(scopeID)` and `reader.afterRender()`. Use `reader.prune(validScopeIDs)` to release positions for removed conversations, `followLatest()` for an explicit user intent, and `destroy()` when releasing the surface.

Literal find is case-insensitive and treats punctuation as text. Search navigation can open a containing disclosure to reveal a match. The reader preserves whether the user is following and anchors manual history reading across image decoding, resizing and streaming.

`keyboardTarget` chooses who receives find shortcuts. An embedded reader should use its owning surface; a full application may choose the document and pass `isKeyboardBlocked` for its active dialogs. Test focus behavior whenever shortcut scope changes.

## Showroom links

Share an exact state using:

```text
?item=conversation-messages&theme=dark&state=long&width=800&compare=theme&rulers=1
```

Supported gallery parameters are `item`, `theme`, `state`, `width`, `compare`, `outcome`, `motion` and `rulers`. Comparisons show themes or container widths. Old `density` parameters and `compare=density` links normalize to the standard view. Legal content states come from the chosen case. Measurement/ruler tools and simulated requests stay in the showroom bundle; there is no arbitrary font or gap editor.
