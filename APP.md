# Pith UI application consumption contract

This is the constrained application contract for Pith Desk and applications choosing the same boundary. It is shipped with the package whose API it describes. Read the installed [`dist/app/index.d.ts`](./dist/app/index.d.ts), the exact dependency and integrity in the consumer lockfile, and this document together. A repository `main` document or a newer showroom is not a substitute for the installed version's declarations.

The allowed UI imports are `pith-ui/app` and `pith-ui/styles.css`. The general `pith-ui` entry remains available for independent component compositions; Pith Desk must not use it, private package paths, copied components or internal CSS to bypass this contract. A missing application capability needs a tested semantic port in the library before the application consumes it.

<!-- PUI_APP_VERSION_START -->
This contract accompanies `pith-ui@0.2.0-app.3`. Exact API: [APP-API.md](./APP-API.md); installed declarations: `dist/app/index.d.ts`.

The full reference application source is versioned with this artifact: [TypeScript controller](https://github.com/minifish-org/pith-ui/blob/v0.2.0-app.3/examples/application/main.ts) and [HTML entry](https://github.com/minifish-org/pith-ui/blob/v0.2.0-app.3/examples/application/index.html). These sources are not bundled into the npm runtime package.
<!-- PUI_APP_VERSION_END -->

## One mount, four scenes

The only DOM argument is the checked application mount. `createApplication` builds and owns the interface beneath it. Obtain the mount once, validate it with `HTMLElement`, and pass it to the library. Do not query, retain, move, decorate or listen on the generated UI nodes.

```ts
import {createApplication, type ConversationMessage} from 'pith-ui/app';
import 'pith-ui/styles.css';

const mount = document.getElementById('app');
if (!(mount instanceof HTMLElement)) throw new Error('Missing application mount');
const messages: ConversationMessage[] = [
  {id: 'intro', role: 'assistant', text: 'This example uses in-memory data.'},
];
const app = createApplication(mount, {
  appearance: 'system',
  brand: {name: 'Example', qualifier: 'Desk'},
  workspace: {
    onSubmit(text) {
      messages.push({id: String(messages.length), role: 'user', text});
      app.workspace.resetDraft('');
      app.workspace.updateConversation({id: 'chat', messages, working: false});
      return {ok: true};
    },
  },
});
app.workspace.updateComposer({action: 'send'});
app.workspace.updateConversation({id: 'chat', messages, working: false});
// The embedding owner calls app.destroy() when this application is released.
```

The full, compiled reference controller and HTML entry linked in the version block exercise every scene with explicit simulated data. Their sources are versioned in the repository, outside the npm runtime package. The showroom item is [`application-reference`](https://minifish-org.github.io/pith-ui/?item=application-reference); it embeds that same application and links its full page. Use the showroom deployment corresponding to the tested package version. These are demonstrations, not evidence of publication or human acceptance.

`Application` exposes the four plain scene objects, `read()`, `setAppearance(appearance)`, `downloadFile({blob, name})` and `destroy()`. `read()` reports `{hasModal, appearance}` for business read gating. `onUIStateChange` observes that presentation state; it does not acknowledge a task or persist a read marker.

The application entry also exports the pure `formatCost` and `thinkingLabel` helpers. They format values without creating UI or granting access to the general component API.

| Scene | Complete feature ownership | Main methods |
|---|---|---|
| `workspace` | Shell, sidebar, breadcrumb, workspace/conversation navigation, search and anchored menus; welcome; messages, tools/groups, commands, Markdown and code; reading anchors, literal find and follow-latest; composer, attachments, drop feedback, queue; permissions, full-access confirmation, approval/diff, runtime and failure; message/queue editing, confirmation, workspace selection and rename; branch history, cost presentation and completion notices | `updateShell`, `updateNavigation`, `updateWelcome`, `updateConversation`, `updateComposer`, `updatePending`, `updateAttachments`, `updatePermission`, `updateApproval`, `updateRuntime`, `updateTiming`, `updateFailure`, `updateCosts`, `updateNotices`; named dialog methods below |
| `settings` | Appearance controls, provider settings and credentials, connection test presentation, update status/actions; model/provider catalog and effort; independent connections with model definitions/capabilities/prices; MCP connection editor/list and OAuth/provider sign-in | `openSettings`, `openModels`, `openConnections`, `openCustomConnection`, `openConnectionLoading`, `openProviderLogin` |
| `resources` | Workspace instructions, skills, templates, diagnostics, refresh/create/use/edit/file actions; source editor, read-only state, save/delete and loading presentation | `open`, `openEditor`, `openEditorLoading` |
| `files` | Conversation artifact panel and actions; text, Markdown, diff and image preview; UTF-8 pagination, code-copy feedback, image zoom and focus restoration | `updateArtifacts`, `closeArtifacts`, `areArtifactsOpen`, `openPreview` |

Costs and branch history belong to `workspace`; update status belongs to `settings`. They are not file-center responsibilities merely because their generic implementation shares a source file with file components.

## Finite configuration and host capabilities

`ApplicationOptions` accepts `appearance`, `brand`, `host`, `workspace`, `onUIStateChange` and `onError`. Appearance is `light`, `dark` or `system`, also changed through `app.setAppearance`. No font, size, gap, density, class, arbitrary theme CSS, markup, Node slot or render callback is part of the application interface.

Branding is data: `{name, qualifier?, mark?: {src, darkSrc?, alt}}`. The application supplies approved static asset URLs and alternative text; optional `darkSrc` supplies the same brand's dark-appearance asset. The library selects the asset for light, dark or system appearance and places it in its owned brand treatment. Branding does not permit arbitrary SVG/HTML, a logo Node, a renderer or a second layout. With no brand option the name defaults to `Pith` and no logo is invented.

The two optional `host` callbacks are `copyText(text)` and `openExternal(url)`. They receive values, never controls or events. They may return `void`, `ActionResult`, or a promise of either. Omitted adapters use the browser clipboard and browser external-link mechanism. Native applications supply their existing capability adapters. The library presents pending/results; the adapter performs the actual capability and reports cancellation or failure according to application policy.

`app.downloadFile({blob, name})` owns the browser download affordance. The controller still acquires and validates the bytes, resolves ownership/path policy, and chooses native download behavior where applicable. It does not cause the library to fetch a file or authenticate a request.

## Scene ports and sessions

These are named methods, not a UI description language. Pass the concrete exported types rather than `Record<string, unknown>`, `any`, a structural cast to a low-level block, or an invented option. All scenes have `destroy()`; normally the root application owner calls `app.destroy()` once.

`workspace` also provides:

- Draft and input intent: `readDraft`, `resetDraft`, `focusComposer`, `pickImages`, `insertReferences`, `receiveNativeDrop` and `setDropPending`. Input/reset owns resizing; there is no application resize operation.
- Reading and navigation intent: `search`, `closeNavigationMenu`, `setSidebarOpen`, `followLatest`, `openFind`, `closeFind` and `pruneConversations`.
- Availability and system projection: `updateMessageAvailability`, `updateAvailability`, `updateImageGuidance`, `readCosts` and `resetCosts`.
- Owned openings: `openMessageEditor`, `openQueueEditor`, `openConfirmation`, `openWorkspacePicker`, `openRename`, `openFullAccess` and `openHistory`.

Navigation state supplies workspace/conversation identity, selection, status and allowed actions. Disclosure state and menu anchoring stay in the library; do not drive an `expanded` field or retain the menu's trigger. `setSidebarOpen` expresses an application intent, not a node-access escape hatch.

Workspace headings only expand or collapse their conversation lists. Selecting a conversation, requesting a new one, and choosing a workspace in `openWorkspacePicker` have separate callbacks. Consumers of the `app.1` or `app.2` prereleases must remove `WorkspaceCallbacks.onSelectWorkspace`; that callback incorrectly coupled disclosure to business navigation and has been removed.

`updateAvailability({busy, global, active, conversations, workspaces})` keeps mutation and run scopes separate. `busy` blocks all action scopes during a host mutation. `global` blocks global actions while any task runs; `active` and the two identity lists block only their matching targets. An unrelated inactive conversation or workspace keeps its actions. Message copy/edit/branch eligibility still comes from `updateMessageAvailability`.

`onDropReferences` receives pure `{paths, uris?, hasUnidentifiedFiles}` data. Native validated paths set `hasUnidentifiedFiles: false`; browser drops set it when they contain non-image files whose identities the host must resolve. A URI-only drag does not imply unidentified files. The host retains path validation and error policy. `setDropPending(true)` blocks another reference resolution while still permitting available image attachments from the matching drop. Release it before calling `insertReferences`; the scene owns selection and focus.

Every opening returns a plain session with `update(state)`, `fail(message)`, `isOpen()`, `close()` and `destroy()`. Only declared additions exist:

| Session | Additional semantic methods |
|---|---|
| Message/queue editor | `read(): string`, `reset(value)`, `focus()` |
| Workspace picker | `read(): {path}`, `reset(path?)`, `focus()` |
| Conversation rename | `read(): RenameConversationDraft`, `reset(state)`, `focus()` |
| Settings | `read`, `setProviders`, `resetProvider`, `setCredential`, `updateUpdates`, `setUpdatePending`, `setUpdateError`, `clearSecrets` |
| MCP connections | `read`, `edit(value?)`, `setConnections`, `clearBearerToken`, `clearSecrets` |
| Model picker | `read`, `reset(selection)`, `focus()` |
| Independent connection | `read`, `clearSecrets` |
| Resource inventory/editor | `read` with the declared state/draft result |
| Loading, confirmation, permission, login, history and file preview | The common session methods only |

`settings.openConnectionLoading({editing, error?})` and `resources.openEditorLoading({kind, path?, error?})` represent existing asynchronous load phases. Their subsequent `update` accepts `LoadingState` (`{error?}`); it is not a general status/rendering slot. The controller opens the corresponding editor after successful target validation. Independent-connection, resource-editor and branch-history openings share the SDK feature surface: replacing one invalidates its previous session. File preview has its own surface and can coexist with that feature surface.

`SettingsSession.setCredential` accepts credential presentation and optional typed `providerActions`, not an action Node. For update-controller reads, use `updateUpdates` for authoritative status, `setUpdatePending` for external in-flight state, and `setUpdateError(message, {allowCheckRetry: true})` for a failed read that may be checked manually. These operations do not start polling, download updates or authorize installation.

Resource action targets contain `{workspaceId, kind, name, path}`. File targets contain `{owner: {kind: 'artifact', id}, name, path}`. `FilePreviewInput` adds finite `capabilities` (`open`, `reveal`, `copyMode`) and optional content; preview `update` accepts content/feedback, not a different target. Use a fresh opening when target identity changes. `updateArtifacts` accepts its pure state and optional semantic callbacks; no file-action Node is supplied.

## UI state and business state

| Library owns | Application controller owns |
|---|---|
| Structure, fixed shared presentation, native controls and accessibility wiring | Request protocols, URLs, endpoint contracts, schema conversion and response parsing |
| Focus, menus, local disclosures, navigation expansion, image zoom and reading anchors | Workspace/conversation/task identity, target validation and authorization |
| Live editor controls, selection/composition, local submit pending and error placement | Versioned drafts, persistence, request generations, transactions and cancellation |
| Sanitized Markdown, code/diff presentation, pagination and copy feedback | Resource/file acquisition, write/delete policy, native open/reveal/copy/download |
| Credential field presentation and cleanup of owned secrets on close | Credential storage, login transaction/PKCE, account state and token lifetime |
| Runtime/cost/update/notification display | Runtime requests, cost calculation, update polling, completion/read acknowledgments |

Callbacks return semantic targets and values. `File[]` attachment inputs and `Blob` image/download bytes are capability data, not Node slots. `onLoadImage({conversationId, messageId, index})` loads validated bytes in the controller; the workspace scene owns the resulting presentation object URLs and releases them when its image scope changes or is destroyed. An `imageSrc` URL supplied for preview or attachments remains host-owned and must remain valid while used, then be revoked by that owner.

`resolveLocalLink` only resolves a display link to a host-owned file target; `onLocalFile` must validate it again before acquisition or a native action. A rendered action is not permission. Preserve existing per-message Copy/Edit/Branch eligibility and exact target rules; do not infer authorization from a role or grant a whole-turn copy action.

## Drafts, writes and lifecycle

- Create an application once. Update existing scene projections with stable keys. Do not recreate the shell or replace messages on each token merely to refresh presentation.
- Initial values are applied at opening or by a declared explicit reset/edit operation. Ordinary `update` feedback must preserve input, IME composition, selection, focus, scroll and owned disclosures. Keep versioned business drafts in the controller.
- Submit callbacks whose declaration returns `ActionResult` return `{ok: true}` or `{ok: false, error}` (or their promise). A failed save retains the draft; local pending combines with external disabled state. Void notifications, such as queue/approval intents, still require the controller to project authoritative availability and guard business operations.
- Validate submitted identity, version and permission immediately before a write. A successful write followed by a failed refresh remains a successful write; present the refresh failure separately and do not retry the write automatically.
- An opening's session addresses that opening only. After close, replacement or destruction, its old updates, failures, close calls and asynchronous results cannot mutate a later opening. Keep controller request generations/target checks as well: UI invalidation does not abort a request, undo a completed write, or make its data relevant to a new target.
- Closing settings, connection and login presentations clears their owned secrets. Do not place real credentials in source examples, URLs, logs, screenshots or showroom state. The controller retains the distinction between an empty field, keeping an existing credential, and an explicit removal.
- Call `destroy` for the released owner. It releases UI listeners, observers, frames, temporary feedback, object URLs and owned child views; it does not start business cleanup requests or cancel a completed operation. Repeating close/destroy is harmless.

The application must not add event delegation, selectors, dataset routing, form/field access, HTML templates or CSS to fill a scene gap. It must not inspect `element`, `part`, `field`, `control`, `body`, `button`, `style` or similar internal handles. Business objects may naturally contain fields such as `id`, `path`, `content` or `name`; those are not UI nodes.

## Migration and validation

1. Freeze the accepted behavior and visual baseline; inventory every existing feature and its controller/scene owner.
2. Add a permanent regression for each concrete contract gap before changing the library. Reuse the existing component implementation internally and extend only the finite semantic capability that is missing.
3. Build, type-check and test the library, its compiled reference application and the matching showroom. Validate the actual package exports, declaration graph, CSS, examples and production consumption.
4. Publish and verify the approved registry version or prerelease. Install that exact registry version in Pith Desk and commit its lockfile. Do not use a local tarball, `file:`, `link:`, workspace alias, source-path mapping, symlink or vendored library as the application's dependency.
5. Replace view construction with scene projections and callbacks while preserving controllers and business assertions. Remove the replaced templates/styles so there is one visual implementation. Enforce the approved import/mount/semantic boundary with the consumer's source gate.
6. Run behavior, keyboard/focus, late-result, draft, credential, streaming, copy, image, file and native-host checks; compare both themes, supported window sizes and resource budgets. Record observations separately from publication, deployment and human acceptance.

The reference application's in-memory simulator is an example controller, not a business implementation to move into the library. Its Node syntax/strict compilation tests and Chromium/WebKit interaction tests verify the example; they do not establish Pith Desk parity, a resource-budget result, native acceptance, an npm publication or a deployed showroom.
