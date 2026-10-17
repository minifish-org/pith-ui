# Assemble provider sign-in

This application-owned recipe composes formal parts. It is not a package export
or a public sign-in scene. Its compiled source is
[`examples/assemblies/provider-login.ts`](../../examples/assemblies/provider-login.ts),
with a runnable [browser example](../../examples/assemblies/provider-login.html).
The recipe imports only the formal parts entry and creates no DOM, HTML or CSS.

The old contract is `src/forms/provider-login.ts` and
`src/app/settings.ts:openProviderLogin` at `897f46a`. Desk calls it from
`frontend/src/provider-login.ts:openProviderLogin` at `3f1ee24`. The ordinary
500px native dialog retains its existing title, header close and body/frame
error channels. The library decides typography, color, spacing, bounds,
control presentation and motion.

## Part tree

```text
DialogPart: Provider sign-in
├─ StackPart
│  ├─ lead FeedbackPart: provider message / phase error
│  ├─ paragraph LinkPart: external HTTP(S) sign-in page
│  ├─ TextFlowPart: Verification code: + native strong code
│  ├─ answer FormPart
│  │  ├─ FieldLabelPart: provider prompt
│  │  ├─ InlineGroupPart: native span
│  │  │  └─ required InputPart / password InputPart / SelectPart
│  │  └─ native submit primary ButtonPart: Continue
│  ├─ inline FeedbackPart: provider / answer error
│  └─ FooterPart: Close / Cancel sign-in
└─ paragraph FeedbackPart: independent frame error
```

The prompt control exists only for the `prompt` phase. A nonempty choices array
selects an ordinary shared select; an empty array falls back to the required
text input. Only `promptType: 'secret'` selects a password input. The inline
span preserves the original control host; it does not add a control wrapper.
The link paragraph and verification-code paragraph are hidden when absent.
Verification codes and every provider message are literal text.

## Attach to the existing owner

`composeProviderLogin` returns the opaque dialog part and local lifecycle
handle. Attach it to the application's existing tree; the standalone
`mountProviderLogin` function is an internal example adapter. This compiled
invocation shows the controller boundary:

```ts
import {
  composeProviderLogin, type ProviderLoginState, type Result,
} from '../../examples/assemblies/provider-login.js';
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

For later openings, reuse the existing parent. Update appearance through that
one owner's `setAppearance`; secret drafts, caret and focus survive. Retain
the original controller's login ID and request generation. A later login must
not receive an earlier opening's answer or completion result.

## State and draft updates

| Input or method | Preserved rule |
| --- | --- |
| `phase/message` | Updates status and active/finished actions. `error` uses alert semantics; `complete` and `error` show Close instead of Cancel sign-in. |
| `url` | Only normalized HTTP or HTTPS URLs are visible. Invalid, relative and other-protocol destinations remain hidden. Security attributes are fixed by the link part. |
| `code` | Literal native strong text inside the verification paragraph. Empty hides the paragraph. |
| Same prompt signature | Metadata, availability, URL, code and provider-error updates retain the same native control, answer, caret and pending answer operation. |
| Changed prompt signature | The exact signature is `JSON.stringify([phase,prompt,promptType,options])`. A change retires the answer operation, clears its local error and creates a fresh prompt control. |
| `disabled` | Disables Continue. The answer field, external link, cancellation and header close retain their original availability. |
| `error` | Provider error takes precedence during snapshots. An answer action clears the displayed answer error; a later answer failure is local to that prompt. |
| `fail(message)` | Reports an independent frame error; it does not replace the provider status or answer error. |

There is no implicit trimming or normalization of an answer. Text and password
values reach `onAnswer` exactly as typed, including spaces and Unicode. A choice
delivers its original option ID. Required text validation remains native;
choice selection retains the first native option. Answer success keeps the
dialog and draft open until the controller supplies the next phase.

## Callback ownership and separate operations

Continue owns one answer operation. Availability snapshots do not release its
pending guard. A prompt-signature change or disposal retires that UI outcome;
it does not retry or cancel the business request. An old failure cannot appear
in a new prompt. Error snapshots for an unchanged prompt preserve a local
answer failure until another answer attempt or a signature change.

The external link owns a separate pending guard. It delivers only a normalized
HTTP(S) URL to `onOpenExternal`, with no event or native element. Repeated
clicks while pending do not open another browser. Prompt/phase changes do not
retire that external operation. A failed external callback reports through
the frame channel. Desk should forward the existing native browser bridge.

Cancel sign-in invokes optional `onCancel` and closes immediately. Cancellation
and answer completion are independent. Late cancellation failures cannot
reopen a closed dialog or report into its next opening. Close, Escape and
header close notify `onClose` without invoking `onCancel`.

Desk's baseline passes its cancellation request through `onClose`, after
checking whether the current login is still active. Preserve that policy;
do not add a second cancellation request through `onCancel`. The controller
also owns dismissed-login identity, provider-auth refresh after completion,
and clearing its panel reference.

## Disposal and verified states

Each opening notifies `onClose` once. Closing destroys only its dialog subtree
and restores the opener; sibling content and the shared appearance owner
remain. Parent destruction retires UI outcomes before releasing fields, and
wipes the retained password value and native default. Late updates, errors,
answers or external results cannot recreate the opening. Destroy an unattached
composition if it is discarded; opening it before attachment does nothing.

```sh
npm run check
node scripts/verify-assemblies.ts
npx playwright test tests/parts-provider-login.spec.ts
```

The maintained regression suite passed 66 checks across Chromium and WebKit.
It compares the actual old application scene in
both themes with the opposite OS theme, including starting, browser/code,
plain/secret/choice/empty-choice prompts, completion, provider/body/frame
errors, disabled state, invalid URLs and long content. It compares native
layout, computed presentation, SVG paths, labels and control states at desktop,
900×568 and 390×844. Behavioral checks cover raw answers, identity/caret,
signature reset, native validation, independent pending guards, stale results,
all dismissal routes, opener focus, shared-owner appearance and secret wipe.
