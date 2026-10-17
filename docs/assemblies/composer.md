# Composer and file drop (08, 10b)

Executable source: [`composer.ts`](../../examples/assemblies/composer.ts). This is a consumer blueprint copied into Desk, not a package scene API. Attachments use the separate [thumbnail recipe](attachments.md); permission control and description use [their recipe](permission-control.md).

The native part tree is `ComposerRegion(ComposerPanels(caller panels), Form(composer: Feedback(error), ThumbnailStrip, FilePicker(images), MessageInput, InputToolbar(InputContext(attach Button, permission CompactSelect), InputActions(model Button, inline CompactSelect, send/stop Button))), ContextNote(attachment-guidance), ContextNote(permission))`. Empty layout parts add only the original DIVs; controls retain native TEXTAREA, INPUT, SELECT, LABEL and BUTTON roots. The library fixes fonts, spacing, colors, growth, icons, image formats and drag feedback.

```ts
import {mountParts} from '../../src/parts/index.js';
import {composeComposer} from '../../examples/assemblies/composer.js';
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

Ordinary `updateComposer` projections never replace the field or draft/selection. Action remains send/queue/stop until explicitly changed. Model and thinking projections only change when supplied. The native form owns the send/stop operation; only its action button becomes pending. A successful submit keeps the draft until Desk explicitly resets it. Reset invalidates earlier operation results, clears errors and resizes the same native field. Enter submits only send/queue, Shift+Enter inserts a newline, composition Enter stays native, and Enter never activates Stop.

`readDraft`, `resetDraft`, `focusComposer`, `pickImages`, `updateAttachments`, `updatePermission`, `updateImageGuidance`, `updateAvailability`, `setDropPending` and `receiveNativeDrop` are local orchestration functions. Image chooser and paste callbacks carry files. The local recipe filters drop files using the old four MIME formats and extension fallback, routes unresolved files/URI lists separately, and owns CommonMark reference formatting. `receiveNativeDrop` passes incoming native pointer coordinates to the Form part for hit testing; coordinates are event data, not configurable geometry. Pending reference resolution suppresses references while still allowing dropped image files. Disabled/read-only/busy states suppress drag highlighting and drop work; attachment availability separately controls image admission and chooser activation.

The parent region's disposal marks the recipe terminal before children retire pending operations and native listeners. Destroy the one shared Frame owner in Desk; standalone consumers destroy the returned mount owner. Repeated destruction and late state/results stay inert.

Validated by `tests/parts-composer.spec.ts` and `tests/parts-composer-drop.spec.ts` against actual baseline application calls in Chromium and WebKit, including both themes, 390/900 widths, single thinking choice, caret/draft retention, successful single submission, pending reset, file re-selection, paste, mixed drop routing, native hit testing and disposal.
