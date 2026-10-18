# Composer and file drop (08, 10b)

Import this region from `pith-ui/recipes`. Its single implementation is
[`src/recipes/composer.ts`](../../src/recipes/composer.ts); public state, callbacks and
handles are indexed in [API.md](../../API.md).

The composer owns the draft, caret, IME and drop/paste interaction. The host owns sending, stopping, queue decisions and resolving native reference paths. Availability snapshots do not reset drafts.

Permission descriptions remain available to assistive technology without a persistent footer. Permission selection, confirmations and actionable attachment feedback stay visible.

```ts
import {mountParts} from 'pith-ui';
import {composeComposer} from 'pith-ui/recipes';
const composer = composeComposer({action: 'send'}, {
  onSubmit: async text => ({ok: true}),
  onStop: async () => ({ok: true}),
  onInput: text => { /* persist this conversation draft */ },
  onAction: action => { /* open the model picker */ },
  onDropReferences: data => { /* resolve native paths and URI-list content */ },
});
const owner = mountParts(document.createElement('div'),composer.part);
composer.updateComposer({action: 'queue',model: {label: 'Selected model',description: 'Provider model'}});
composer.updatePermission({mode: 'ask',description: 'Changes and commands require approval.'});
composer.resetDraft('Explicit draft replacement');
composer.insertReferences(['README.md']);
owner.destroy();
```

Attach the region to the existing ownership tree before opening it. See
[APP.md](../../APP.md) for shared mounting and dialog slots. The current
interaction assertions run in Chromium and WebKit in
[`parts-composer.spec.ts`](../../tests/parts-composer.spec.ts).
