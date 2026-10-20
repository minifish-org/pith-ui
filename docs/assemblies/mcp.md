# Assemble the MCP inventory and connection editor

Import this region from `pith-ui/recipes`. Its single implementation is
[`src/recipes/mcp.ts`](../../src/recipes/mcp.ts); public state, callbacks and
handles are indexed in [API.md](../../API.md).

The selected transport alone participates in native validation and submission. Keep both transport drafts. Actual requests, cancellation and persistence belong to the host.

Use `connectionHint` to explain where commands, environment and dependencies
run. Set `oauthAvailable: false` when this host cannot complete new authorization:
new OAuth controls and sign-in actions are hidden, while an edited connection's
saved OAuth selection and Sign out remain intact. Existing connections can
explicitly turn OAuth off to use a bearer token. The host must enforce the
same policy at its API boundary. See the browser state in the showroom.

```ts
import {
  composeMCPConnections, type MCPAction, type MCPConnection,
  type MCPDraft, type MCPState, type RecipeResult as Result,
} from 'pith-ui/recipes';
import {createStackPart, mountParts, type Part} from 'pith-ui';

interface ConnectionsController {
  save(draft: MCPDraft): Promise<Result>;
  action(action: MCPAction, target: Readonly<{name: string}>): Promise<Result>;
  refresh(): Promise<Result>;
  newEditor(): void;
  connections(): readonly MCPConnection[];
  closed(): void;
}

export function attachConnections(
  mount: HTMLElement,
  applicationBody: Part,
  initial: MCPState,
  controller: ConnectionsController,
  appearance: 'light' | 'dark' | 'system',
) {
  const connections = composeMCPConnections(initial, {
    onSubmit: draft => controller.save(draft),
    onConnectionAction: (action, target) => controller.action(action, target),
    onRefresh: () => controller.refresh(),
    onNew: () => controller.newEditor(),
    onClose: () => controller.closed(),
  });
  const owner = mountParts(mount,
    createStackPart({children: [applicationBody, connections.part]}),
    {appearance});
  connections.open();
  connections.setConnections(controller.connections());
  return {connections, owner};
}
```

Attach the region to the existing ownership tree before opening it. See
[APP.md](../../APP.md) for shared mounting and dialog slots. The current
interaction assertions run in Chromium and WebKit in
[`parts-mcp.spec.ts`](../../tests/parts-mcp.spec.ts).
