# Assemble the existing welcome and setup content

Import this region from `pith-ui/recipes`. Its single implementation is
[`src/recipes/welcome.ts`](../../src/recipes/welcome.ts); public state, callbacks and
handles are indexed in [API.md](../../API.md).

Supply display state and data callbacks from the host. Ordinary snapshots retain local interaction state. Explicit reset/target changes and parent disposal retire pending UI outcomes; business requests and write validity remain host responsibilities.

```ts
import {composeWelcome, type WelcomeState} from 'pith-ui/recipes';
import {type BrandMarkOptions} from 'pith-ui';

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

Attach the region to the existing ownership tree before opening it. See
[APP.md](../../APP.md) for shared mounting and dialog slots. The current
interaction assertions run in Chromium and WebKit in
[`parts-welcome.spec.ts`](../../tests/parts-welcome.spec.ts).
