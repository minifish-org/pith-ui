import type { UIBlock } from '../core.js';
import { escape } from '../dom.js';
export interface ProviderActionsState {id: string; oauth: boolean; signedIn: boolean; custom: boolean}
export interface ResourceActionsState {kind: string; resource: {name: string; path: string}; workspaceId: string}
export function providerActionsMarkup(provider: ProviderActionsState): string {return `<div class="pui-feature-toolbar">${provider.oauth ? `<button type="button" class="pui-secondary-button" data-sdk="${provider.signedIn ? 'logout' : 'login'}" data-id="${escape(provider.id)}">${provider.signedIn ? 'Sign out' : 'Sign in with provider'}</button>` : ''}${provider.custom ? `<button type="button" class="pui-secondary-button" data-sdk="custom" data-id="${escape(provider.id)}">Edit models and prices</button><button type="button" class="pui-secondary-button pui-destructive-button" data-sdk="remove-connection" data-id="${escape(provider.id)}">Remove connection</button>` : ''}</div>`;}
export function resourceActionsMarkup(kind: string, resource: {name: string; path: string}, workspaceId: string): string {
 const command = kind === 'skill' ? `/skill:${resource.name} ` : `/${resource.name} `;
 return `<div class="pui-file-actions">${kind !== 'instructions' ? `<button class="pui-secondary-button" data-sdk="use-resource" data-command="${escape(command)}">Use</button>` : ''}<button class="pui-secondary-button" data-sdk="resource" data-resource-workspace="${escape(workspaceId)}" data-kind="${kind}" data-path="${escape(resource.path)}">View / edit</button></div>`;
}
function actions<State>(initial: State, markup: (state: State) => string, onAction?: (action: string, target: DOMStringMap) => void): UIBlock<State> {
 const element = document.createElement('div'); element.className = 'pui-feature-actions'; const abort = new AbortController();
 const update = (state: Readonly<State>) => {element.innerHTML = markup(state);}; update(initial);
 element.addEventListener('click', (event) => {const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-sdk]'); if (button && !button.disabled) onAction?.(button.dataset.sdk!, button.dataset);}, {signal:abort.signal});
 return {element, update, destroy() {abort.abort(); element.remove();}};
}
export function createProviderActions(state: ProviderActionsState, options: {onAction?: (action: string, target: DOMStringMap) => void} = {}): UIBlock<ProviderActionsState> {return actions(state, providerActionsMarkup, options.onAction);}
export function createResourceActions(state: ResourceActionsState, options: {onAction?: (action: string, target: DOMStringMap) => void} = {}): UIBlock<ResourceActionsState> {return actions(state, (state) => resourceActionsMarkup(state.kind, state.resource, state.workspaceId), options.onAction);}
