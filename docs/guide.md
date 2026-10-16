# Integrating Pith UI

## Installation and scope

Install a released, exact version, commit the consumer lockfile, and import only the package entry and `pith-ui/styles.css`. The generated ESM is for a browser DOM; Node can inspect exports but cannot mount a UI without a browser document.

Call `setAppearance(root, appearance)` on an ancestor of all mounted components. A dialog that automatically appends to `document.body` needs a themed body ancestor. For an embedded surface, append its supplied dialog under the themed host before opening it.

Use host layout to position a component, and supported component options to configure it. Theme-specific overrides belong in a reviewed, central `--pui-*` token scope. Internal class names are implementation details, not a per-page design API.

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

## Conversation reading

Wrap an update with `reader.beforeRender(scopeID)` and `reader.afterRender()`. Use `reader.prune(validScopeIDs)` to release positions for removed conversations, `followLatest()` for an explicit user intent, and `destroy()` when releasing the surface.

Literal find is case-insensitive and treats punctuation as text. Search navigation can open a containing disclosure to reveal a match. The reader preserves whether the user is following and anchors manual history reading across image decoding, resizing and streaming.

`keyboardTarget` chooses who receives find shortcuts. An embedded reader should use its owning surface; a full application may choose the document and pass `isKeyboardBlocked` for its active dialogs. Test focus behavior whenever shortcut scope changes.

## Showroom links

Share an exact state using:

```text
?item=conversation-messages&theme=dark&state=long&width=800&compare=theme&rulers=1
```

Supported gallery parameters are `item`, `theme`, `state`, `width`, `density`, `compare`, `outcome`, `motion` and `rulers`. Legal options come from the chosen case. Measurement/ruler tools and simulated requests stay in the showroom bundle.
