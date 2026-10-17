# Assemble the existing welcome and setup content

This local recipe proves contract unit [05](../contracts/rc27-ui-022.md).
Its compiled implementation is
[`examples/assemblies/welcome.ts`](../../examples/assemblies/welcome.ts). It
imports only formal parts and creates no HTML, CSS or DOM. The package exports
small parts; setup/workspace/model decisions and suggested prompts remain in
the application's local composition.

The preservation sources are `src/content/welcome.ts:createWelcomeView` and
`src/app/workspace.ts` at `897f46a`, called by Desk's existing welcome projection
at `3f1ee24`. The local state keeps those same meanings and branch conditions.

```text
CenteredContentPart
├─ BrandTilePart → genuine BrandMarkPart
├─ TextPart (eyebrow-paragraph)
├─ TextPart (display-heading)
├─ ResponsiveLeadPart (literal lines, library-owned responsive break)
├─ setup branch:
│  └─ StepGroupPart: title + summary
│     ├─ StepActionPart: step/check + model/provider title + description + chevron
│     └─ StepActionPart: step/check + workspace title + path + chevron
├─ ready branch:
│  ├─ ContextLinePart
│  │  ├─ folder IconPart
│  │  ├─ inline TextFlowPart: Working in + strong workspace name
│  │  └─ secondary Change ButtonPart
│  └─ SuggestionGroupPart
│     └─ three suggestion ButtonParts: file / chat / plus
└─ IconNotePart: shield + literal footnote
```

These are the original useful native wrappers. Step actions remain one native
button with intrinsic number/check and title/description spans. Brand and icon
parts add no icon wrappers. Inline emphasis uses native text/strong nodes. The
library fixes column width, typography, tile dimensions, spacing, colors,
ellipsis, button appearance and the responsive paragraph break.

```ts
import {composeWelcome, type WelcomeState} from '../../examples/assemblies/welcome.js';
import {type BrandMarkOptions} from '../../src/parts/index.js';

interface WelcomeController {
  action(action: 'model'|'settings'|'workspace'): void;
  unavailable(): boolean;
  hasModal(): boolean;
  resetDraft(text: string): void;
  notifyInput(text: string): void;
  focusDraft(): void;
  reportError(message: string): void;
}
export function buildWelcome(state: WelcomeState,controller: WelcomeController,mark: BrandMarkOptions) {
  return composeWelcome(state, {
    onAction: action => controller.action(action),
    canPrompt: () => !controller.unavailable() && !controller.hasModal(),
    onPrompt(text) {
      controller.resetDraft(text);
      controller.notifyInput(text);
      controller.focusDraft();
    },
    onError: message => controller.reportError(message),
  },mark);
}
```

Attach `part` to the existing reading viewport before its reading column, then
mount the enclosing frame once. Preserve Desk's existing mark resource, product
text and state projection. The composition creates no extra mount or theme
owner. Its mark follows that shared appearance owner in place.

`update(state)` keeps the brand node, top-level content and focused action while
updating metadata within the same setup/ready branch. Setup is selected until
both workspace and selected-model readiness exist. The first setup action
dispatches Model when a connection exists and Settings otherwise; the second
always dispatches Workspace. Completion shows the existing check and content.
Ready content retains Change and the three original full prompt strings.

Suggested prompts recheck current composer/modal availability at click time.
When available, the existing controller resets the draft, reports one input
notification and focuses it. The guard does not introduce a disabled visual
state on those buttons. Callback targets and all business writes remain in
Desk. An ordinary metadata update performs no business action.

`destroy()` releases the composed native tree. Parent destruction or replacement
also retires its callbacks before children are disposed. Later snapshots and
late action errors stay quiet. The library has no welcome scene, provider
catalog or workspace workflow API.

`tests/parts-welcome.spec.ts` passes 58 checks in Chromium and WebKit. It compares
the actual old application for setup, connected, model-selected, workspace-only,
ready and long/unsafe text states in light/dark at desktop/mobile widths. Every
native content node's geometry, typography, colors, spacing, responsive break,
SVG and rendered text matches. Behavior checks cover current-state callbacks,
all prompt strings, unavailability, one input notification, focus, retained
brand/action identity and shared-parent disposal.
