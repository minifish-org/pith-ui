# Assemble provider sign-in

Import this region from `pith-ui/recipes`. Its single implementation is
[`src/recipes/provider-login.ts`](../../src/recipes/provider-login.ts); public state, callbacks and
handles are indexed in [API.md](../../API.md).

Authentication, cancellation and the original provider identity belong to the host. Same-prompt snapshots preserve the answer and caret; target changes or disposal retire stale outcomes and secrets.

```ts
import {
  composeProviderLogin, type ProviderLoginState, type RecipeResult as Result,
} from 'pith-ui/recipes';
import {createStackPart, mountParts, type Part} from 'pith-ui';

interface LoginController {
  answer(loginID: string, answer: string): Promise<Result>;
  openExternal(url: string): Promise<Result>;
  closed(loginID: string): void;
}

export function attachProviderLogin(
  mount: HTMLElement,
  applicationBody: Part,
  loginID: string,
  initial: ProviderLoginState,
  controller: LoginController,
  appearance: 'light' | 'dark' | 'system',
) {
  const login = composeProviderLogin(initial, {
    onAnswer: answer => controller.answer(loginID, answer),
    onOpenExternal: url => controller.openExternal(url),
    onClose: () => controller.closed(loginID),
  });
  const owner = mountParts(mount, createStackPart({children: [applicationBody, login.part]}), {appearance});
  login.open();
  return {owner, login};
}
```

Attach the region to the existing ownership tree before opening it. See
[APP.md](../../APP.md) for shared mounting and dialog slots. The current
interaction assertions run in Chromium and WebKit in
[`parts-provider-login.spec.ts`](../../tests/parts-provider-login.spec.ts).
