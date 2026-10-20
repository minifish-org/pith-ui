# Assemble the viewport frame, brand and navigation

Import this region from `pith-ui/recipes`. Its single implementation is
[`src/recipes/frame.ts`](../../src/recipes/frame.ts); public state, callbacks and
handles are indexed in [API.md](../../API.md).

Project conversation/workspace availability in the host. Compose children before the one mount. Use createDialogHost to manage dialog slots on the frame; root disposal retires them before descendants.

The Compact control uses an icon button with an accessible name and hover hint. Caller-supplied topbar actions can use the same `quiet-icon` variant; file counters keep their visible count.

```ts
import {mountParts, type Part} from 'pith-ui';
import {
  composeFrame, type FrameState, type FrameCallbacks,
} from 'pith-ui/recipes';
import {
  composeSettings, type SettingsState, type SettingsCallbacks,
} from 'pith-ui/recipes';

export function mountFrameWithSettings(
  mount: HTMLElement,
  state: FrameState,
  settingsState: SettingsState,
  callbacks: FrameCallbacks,
  settingsCallbacks: SettingsCallbacks,
  main: readonly Part[],
) {
  const settings = composeSettings(settingsState, settingsCallbacks, 'Pith Desk');
  const frame = composeFrame(state, {
    ...callbacks,
    onAction(action) {
      if (action === 'settings') {settings.open(); return;}
      return callbacks.onAction?.(action);
    },
  }, {main, dialogs: [settings.part]});
  const mounted = mountParts(mount, frame.part, {
    appearance: settingsState.appearance?.mode ?? 'system',
  });
  return {
    frame, settings,
    setAppearance: mounted.setAppearance,
    destroy() {
      settings.destroy();
      frame.destroy();
      mounted.destroy();
    },
  };
}
```

Attach the region to the existing ownership tree before opening it. See
[APP.md](../../APP.md) for shared mounting and dialog slots. The current
interaction assertions run in Chromium and WebKit in
[`parts-navigation.spec.ts`](../../tests/parts-navigation.spec.ts).
