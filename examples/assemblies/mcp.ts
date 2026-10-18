/** Usage example: the implementation is imported from the published package. */
import {mountParts, type MountPartsOptions} from "pith-ui";
import {composeMCPConnections, type RecipeResult as Result, type MCPState, type MCPEditor, type MCPDraft, type MCPConnection, type MCPAction, type MCPCallbacks, type MCPAssembly, type MCPComposition} from "pith-ui/recipes";
export {composeMCPConnections};
export type {Result, MCPState, MCPEditor, MCPDraft, MCPConnection, MCPAction, MCPCallbacks, MCPAssembly, MCPComposition};
export function mountMCPConnections(mount: HTMLElement,initial: Readonly<MCPState> = {},callbacks: MCPCallbacks = {},appearance: MountPartsOptions = {}): MCPAssembly {
  const connections = composeMCPConnections(initial,callbacks);
  try {mountParts(mount,connections.part,appearance);connections.open();return connections;}
  catch (error) {connections.destroy();throw error;}
}
