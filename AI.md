# Pith UI: small constrained building blocks

The default `pith-ui` entry is the composable API. Import CSS once from `pith-ui/styles.css`. Start with a button, input, select, form or layout and compose the returned opaque `Control` handles. Applications own their pages; no app or whole-scene interface is provided.

Read [API.md](./API.md), the [catalog](./docs/catalog.md), [guide](./docs/guide.md), and the exact installed declarations. Use a published exact version and lockfile; do not redirect a consumer to sibling sources or private package files.

## Fixed presentation

Applications choose content, semantic intent, business availability and callbacks. The library chooses font, size, line height, weight, padding, gaps, icon dimensions, borders, colors, hover and local interaction. Do not add CSS overrides, mutate design tokens, inspect generated nodes, use arbitrary DOM/HTML slots or copy component source. No public density, appearance, className, style, numeric size or render callback is available on controls. `appearance` on the mount selects only light/dark/system.

Typography uses two roles: system UI and monospace code. Small/medium/large text is 12/14/16 CSS px, weights are 400/600, line height is 1.5. The spacing scale is 4/8/12/16/24 CSS px. Roles and gaps are chosen inside each block. Focus draws no ring, glow or border highlight; retain existing hover, caret, text selection and selected/error/permission states.

## Composition and lifecycle

- Obtain and validate an HTMLElement host, then `mount(host, control, {appearance: 'system'})`. This is the only DOM handoff. Do not inspect the generated descendants.
- Compose handles with `createStack`, `createFormSection`, `createForm`, `createActions`, `createToolbar`, `createDisclosure`, `createScrollArea`, `createDialog` and `createPopover`.
- A child has one owner. Do not reuse one control in two parents or mounts. Destroying the owner destroys all children, listeners and pending UI responses. Destroy before replacing a tree.
- `update` supplies presentation state and never resets a live input. Use `read`, `reset` and `focus` explicitly. Use stable menu IDs and select values.
- Mount dialogs before `open`. Closing a dialog invalidates pending descendant form feedback without resetting the draft. Closing cannot undo an already completed business write.
- Ordinary actions accept void or ActionResult, synchronously or asynchronously. Form/editor/confirmation submissions return ActionResult. Failures retain drafts; never replay a write because a later refresh failed.
- Give each ordinary action one pending owner. For a stable target, return its promise and let the control own pending and failure feedback. If the consumer already owns a resettable or retargetable operation, start it synchronously and drive `pending`/`disabled` from that owner; do not return the same promise to a second owner. The consumer must catch failures and discard stale results. A cancel action remains available while the operation it cancels is running.
- `createSelect` is single-choice. `createListSelect` is a fixed five-row native list with separate single/multiple value contracts. Multi-row native metrics may differ between WebKit and Chromium; preserve native modifier keys and selection.
- Button intent is neutral/primary/danger. Menus offer neutral/danger only. Icon names are a closed typed registry, not arbitrary SVG.
- Numeric input min/max/step and progress values are data constraints, not presentation options. Business requests, drafts, identities, authorization, credentials and native capabilities stay in the application.

The [compiled examples](./docs/examples.ts) use only the default public entry. Showroom base components mount those same controls; they do not use a separate demonstration implementation.

## Public surface and examples

Only `pith-ui` and `pith-ui/styles.css` are exported. The showroom displays public components, composition examples and design specifications. Private implementation is not a consumer API.

Compose regions with `createPane` and `createSplitPane`; choose children with `createSlot`; update stable-key collections with `createList`. A list preserves retained controls and destroys removed controls. Replaced slot content is destroyed. Attach an independently opened small modal with `mount.attach(dialog)`. The mount owns that modal and reports `hasModal` through `read()` / `onStateChange`.

Safe Markdown and diff content use `createMarkdown` and `createDiff`. Link opening and copying are callbacks; native decisions stay in the consumer. If a reusable component lacks a real capability, add a narrow semantic port plus regression and showroom example in the library. Do not add an escape hatch or a UI-description DSL.

## Validation

Preserve input method composition, selection, focus, reading position and disclosures. Verify disabled plus pending, failed submit, close/reopen, late response and destroy in Chromium/WebKit. Compile positive and negative public examples against an actual installed package, build production JS/CSS and review both themes in the showroom. Automated success is not human acceptance; source, tarball, publication, deployment and native validation are separate evidence.

Small input and reading pieces: `createPromptInput` handles editing and input intent, `createDropArea` reports drag data, `createImage` owns local zoom, `createMessage` frames one composed item, `createReadingArea` owns reading/search/follow intent, and `createDocument` paginates supplied text. None creates a page, navigation, permission policy, model request or file transaction. A reading item needs a stable key and content revision so unchanged reading nodes stay intact.

Use `mount(..., {viewport: 'window'})` only for the application root; content mounts stay in the surrounding layout. This is fixed viewport behavior, not a style override. Native picking/downloading, business identities and files remain application capabilities. Markdown local links require paired `resolveLink` / `onLocalLink` callbacks returning an opaque data key, never DOM or HTML.

For native URL validation use `createURLInput`; multiline sensitive text uses `createSecretTextArea`. A secret reset restores masking. `Form.validate()` checks native constraints and opens invalid folded fields; `resetSubmission()` retires old submission feedback while retaining drafts. `submitDisabled` blocks writing while leaving read-only content selectable; `disabled` blocks all form fields. Pending blocks repeated submission while retaining editable drafts; it does not implicitly disable the fields. Reading areas may own an `empty` control, which is excluded from content search.

A list row may supply `onAction` for its native main action, with separate owned auxiliary actions. Use its `disabled` state rather than wiring events to the row DOM. Grid stacks constrain long code to their own horizontal scrolling. A pane footer lets its bounded scroll region yield to input, and a keyed list of attachment images keeps one horizontally scrolling strip with104×80 thumbnails and visible filenames; consumers do not supply layout pixels or CSS for these cases.

Use Markdown `disabled` to merge application availability with local copy/link pending state without replacing the reading nodes. A changed Markdown source or a closed owner retires old action feedback. Auxiliary row actions own their own availability separately from the row’s native main action.

## Bounded layout contexts

Use `createContentColumn` for the fixed reading/input/intro measures, `createSurface` for input/panel/notice content, and `createGrid({columns:'pair'})` for two related fields. `createToolbar` accepts either children or independent leading/trailing groups. `createBreadcrumb`, `createBrand`, `createStep` and `createNotificationRegion` remain small content pieces; they create no application, page or business request.

`createSurface({purpose:'notice',selected:true,content})` expresses selected content without click handling or action availability. Notice updates may omit `selected` to retain it, or pass `false` to clear it. Input/panel surfaces cannot select, and surface families do not change after construction; the returned `NoticeSurfaceState` and `OrdinarySurfaceState` handles enforce that boundary. A notice owning a flow stack with a grouped toolbar uses a top-aligned card heading. Do not replace the fixed selected edge with focus decoration or consumer CSS.

A supported `context` or `purpose` selects a finite semantic composition. It is not a free size/density setting: navigation rows, inline choices, readouts, output disclosures, queued collections and form/collection/document dialogs have fixed reviewed geometry. Construction-time contexts remain when an update omits them. Preserve the same context when replacing a control. Input values still change only through explicit reset.

Use `Text.value` for a safely emphasized value following its label, and caption/lead text for explicitly supplied line breaks. Hidden field labels remain accessible. A field `status` is noninteractive credential state, separate from error text. Icon copying is `createCopyButton({presentation:'icon',...})`; default copying retains its text action. Keep data and native file actions in the application.

Brand graphics keep a fixed 24 CSS px logical slot and a bounded natural image (maximum 32); introduction frames keep 64 with a maximum 40 graphic. The supplied asset owns its artwork, including any painted edges or rotation. The library never adds a brand-specific transform. Intro `compactSource` supplies optional alternate artwork at the fixed 720px window breakpoint; it is content data, not a numeric responsive/style option. Ordinary content and attachment image sizing remains separate.

Use `createTextAction({context:'link'})` for a compact underlined auxiliary action. Buttons do not accept this context. Use `createFormSection({context:'editor'})` for a separate collection editor group. Resource rows may own one `details` control inside their card; updates preserve its open state. Confirmation creation accepts either `message` or owned `content`, never both, and may use `purpose:'form', tone:'warning'`; closing retires descendant async feedback. Notice `presentation:'inline'` is plain body status text regardless of tone; `presentation:'caption'` is plain caption feedback for validation. `presentation:'compact'` is a compact feedback surface. Omit presentation to retain the ordinary notice.

Native field purposes are creation-time choices: `createTextArea({purpose:'form'})` and `createSecretTextArea({purpose:'form'})` use three code rows; `createTextArea({purpose:'document'})` is a code document editor; `createListSelect({purpose:'catalog'})` uses six native rows. Ordinary text areas and lists retain their defaults. Do not substitute numeric rows or pixel options.

`createForm` may own `auxiliaryActions` before Cancel and Submit in the same footer. Their own disabled state is preserved; an internal native fieldset additionally disables them while the form is disabled or pending. Cancel remains available.

Use `createTable` for information whose columns must remain related. Columns are creation-time `{key,label}` data; rows have stable keys and one owned control per column. Update rows without replacing retained cell controls. Removing a row destroys its removed controls. The library owns native table layout and horizontal scrolling; no column widths, alignment variants, CSS, raw nodes or rendering callbacks are accepted.

The existing queue context preserves its named polite region, text/count grouping and action state. A bounded navigation toggle gets its expanded/control relationship from the owning split pane; applications do not supply IDs. Inline choices may use their existing description data for assistive text while keeping a visible note in the surrounding composition.

Row `tooltip` accepts plain text; an empty or omitted tooltip clears it. `Document.error` displays safe plain text inside the existing document surface, without stale content or code-copy controls. Clearing it restores the supplied document format and text.
