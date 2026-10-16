# Pith UI

Native TypeScript UI building blocks for AI-assisted application development. Choose a complete block, provide typed content and callbacks, and reuse its reviewed layout and interaction rules.

Pith Desk's approved consumption boundary is the constrained **`pith-ui/app`** entry: one checked mount and four semantic scenes, with no generated-node, template or styling access. Read the bundled [application consumption contract](./APP.md) first. The general **`pith-ui`** entry remains available for independent component compositions; it is not a fallback around the application's boundary.

The source is TypeScript and CSS. The package contains compiled ESM, declarations and a separate stylesheet. It uses browser DOM APIs, native controls and system fonts; no UI framework or animation runtime is required.

Presentation is fixed rather than assembled from style choices: system UI and monospace code fonts, small/medium/large text at 12/14/16 CSS px, regular/strong weights at 400/600, a shared 1.5 line height, and 4/8/12/16/24 CSS px spacing. Blocks choose the appropriate role automatically. Applications supply their own branding.

## Try the components

The [interactive showroom](https://minifish-org.github.io/pith-ui/) groups **design foundations → base components → product blocks → composed pages**. It exposes real controls, theme and state comparisons, CSS-pixel measurements, spacing rulers and motion playback. Showroom data and actions are simulated and labelled accordingly. Automated checks do not substitute for human acceptance.

The [`application-reference`](https://minifish-org.github.io/pith-ui/?item=application-reference) page embeds the [complete TypeScript reference application](./examples/application/main.ts): chat and simulated streaming, queues, approval, model/settings/login/MCP, resources, files and branch history. Use the deployment matching the package under review; source examples and a public site do not establish that a version has been published or manually accepted.

Run it locally with Node 22.18 or newer:

```sh
npm ci
npm run dev
```

## Use the package

Choose an approved, verified registry version that exports `./app`, install it with `--save-exact`, and commit the consumer lockfile. The declarations and documents in that installed artifact define the contract. A consumer migration must not depend on a local tarball, `file:`/`link:`, source alias or symlink. See [installation and migration](./APP.md#migration-and-validation).

The application entry owns its DOM and presentation:

```ts
import {createApplication, type ConversationMessage} from 'pith-ui/app';
import 'pith-ui/styles.css';

const mount = document.getElementById('app');
if (!(mount instanceof HTMLElement)) throw new Error('Missing application mount');
const messages: ConversationMessage[] = [
  {id: 'intro', role: 'assistant', text: 'This example uses in-memory data.'},
];
const app = createApplication(mount, {
  brand: {name: 'Example', qualifier: 'Desk'},
  workspace: {onSubmit(text) {
    messages.push({id: String(messages.length), role: 'user', text});
    app.workspace.resetDraft('');
    app.workspace.updateConversation({id: 'chat', messages, working: false});
    return {ok: true};
  }},
});
app.workspace.updateComposer({action: 'send'});
app.workspace.updateConversation({id: 'chat', messages, working: false});
// The embedding owner calls app.destroy() when released.
```

The four scenes are `workspace`, `settings`, `resources` and `files`. Controllers retain requests, identities, drafts, policy, credentials, transactions and native capabilities. The [application contract](./APP.md) maps every feature and names each session's methods; [`dist/app/index.d.ts`](./dist/app/index.d.ts) in the installed package is authoritative.

For a general component consumer outside that application boundary, the root entry remains available:

```ts
import { createTextEditDialog, setAppearance } from 'pith-ui';
import 'pith-ui/styles.css';

// Include document.body when dialogs are mounted there.
setAppearance(document.body, 'system');

const editor = createTextEditDialog({
  title: 'Edit message',
  onSubmit: async (text) => {
    const saved = await saveMessage(text); // Your existing business action.
    return saved ? { ok: true } : { ok: false, error: 'Save failed. Your edit is retained.' };
  },
});
editor.open({ value: 'Original message' });
// When this owner is released:
// editor.destroy();
```

`saveMessage` is an application callback, not a Pith UI API. [Complete, type-checked examples](https://github.com/minifish-org/pith-ui/blob/main/docs/examples.ts) show how to connect it and clean up ownership.

## What belongs where

| Pith UI | Application |
|---|---|
| Visual tokens, component layout, native controls | Branding and business data |
| Focus, disclosure, menu, local feedback, reading position | HTTP/WebSocket, authentication, persistence |
| Pending/error presentation and content rendering | Permission, identity and target validation |
| Sanitized Markdown, code/diff/file/image presentation | File acquisition, native actions, object-URL ownership |
| Interactive examples and component regression tests | End-to-end product policy and release validation |

The first consumer is Pith Desk. Its existing controllers retain their request, draft, approval and recovery semantics. Its UI integration must use the application scenes instead of reconstructing shared views through lower-level factories.

## Find a block

- **Foundations:** color, typography, spacing, dimensions, borders, surfaces, focus and motion.
- **Base components:** actions, fields, status, feedback, dialog/menu/popover, form/layout and scrolling.
- **Product blocks:** navigation, conversation reader, composer/queue, models, tasks/approval, settings/connections, OAuth/MCP, resources, files, branch history and system information.
- **Pages:** working compositions of those blocks, rather than separate copies of their implementations.

Read the bundled [application contract](./APP.md), [general component API reference](./API.md), [complete catalog](https://github.com/minifish-org/pith-ui/blob/main/docs/catalog.md), [integration guide](https://github.com/minifish-org/pith-ui/blob/main/docs/guide.md), [AI usage instructions](./AI.md), [validation guide](https://github.com/minifish-org/pith-ui/blob/main/docs/validation.md) and [release procedure](https://github.com/minifish-org/pith-ui/blob/main/docs/releasing.md). Match repository documentation and the showroom to the installed version when reviewing a release.

## Develop and validate

```sh
npm run check
npm run build
npm test
node scripts/catalog.ts
node scripts/api-docs.ts --check
npx --no-install playwright install chromium webkit
npm run test:browser
npm run showroom:build
```

The lockfile fixes tool and dependency versions. All handwritten logic, including new scripts and tests, is TypeScript; JavaScript and declarations are generated build products. The library and showroom build separately, so measurement tools and fixtures do not ship to applications.

Pith UI is licensed under [AGPL-3.0-only](./LICENSE). Runtime dependencies retain their own licenses.
