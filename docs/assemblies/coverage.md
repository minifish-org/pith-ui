# Region coverage

Every region implementation lives in `src/recipes`; examples and showroom import
`pith-ui/recipes`. State and callback types are indexed in [API.md](../../API.md).
The `parts-*.spec.ts` suites verify region behavior in Chromium and WebKit.
Desk validates business mapping and the application coordinator in its own repo.

```ts
import {composeComposer, composeConversationReader, composeFrame} from 'pith-ui/recipes';
const composer = composeComposer({}, {onSubmit: () => ({ok: true})});
const reader = composeConversationReader({id: '', messages: [], working: false});
const frame = composeFrame({navigation: {groups: [], empty: 'workspaces'}}, {}, {
  main: [reader.find, reader.region, composer.part], siblings: [reader.announcement],
});
export {frame};
```
