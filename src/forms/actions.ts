import type { UIBlock, UIAction } from '../core.js';
import { escape } from '../dom.js';
import {adoptAction, type ActionController} from '../foundations.js';
export interface ProviderActionsState {id: string; oauth: boolean; signedIn: boolean; custom: boolean}
export interface ResourceActionsState {kind: string; resource: {name: string; path: string}; workspaceId: string}
export function providerActionsMarkup(provider: ProviderActionsState): string {return `<div class="pui-feature-toolbar">${provider.oauth ? `<button type="button" class="pui-secondary-button" data-sdk="${provider.signedIn ? 'logout' : 'login'}" data-id="${escape(provider.id)}">${provider.signedIn ? 'Sign out' : 'Sign in with provider'}</button>` : ''}${provider.custom ? `<button type="button" class="pui-secondary-button" data-sdk="custom" data-id="${escape(provider.id)}">Edit models and prices</button><button type="button" class="pui-secondary-button pui-destructive-button" data-sdk="remove-connection" data-id="${escape(provider.id)}">Remove connection</button>` : ''}</div>`;}
export function resourceActionsMarkup(kind: string, resource: {name: string; path: string}, workspaceId: string): string {
 const command = kind === 'skill' ? `/skill:${resource.name} ` : `/${resource.name} `;
 return `<div class="pui-file-actions">${kind !== 'instructions' ? `<button class="pui-secondary-button" data-sdk="use-resource" data-command="${escape(command)}">Use</button>` : ''}<button class="pui-secondary-button" data-sdk="resource" data-resource-workspace="${escape(workspaceId)}" data-kind="${kind}" data-path="${escape(resource.path)}">View / edit</button></div>`;
}
export interface FeatureActionOptions {onAction?: (action: string, target: DOMStringMap) => ReturnType<UIAction>; onError?: (message: string) => void}
function actions<State>(initial: State, markup: (state: State) => string, options: FeatureActionOptions): UIBlock<State> {
 const element = document.createElement('div'); element.className = 'pui-feature-actions'; let destroyed = false, signature = ''; let handles: ActionController[] = [];
 const update = (state: Readonly<State>) => {
   if (destroyed) return; const next = markup(state); if (next === signature) return; signature = next;
   handles.forEach(handle => handle.destroy()); handles = []; element.innerHTML = next;
   if (options.onAction) for (const button of element.querySelectorAll<HTMLButtonElement>('[data-sdk]')) {
     // Stop before the owned callback runs: it may synchronously replace or
     // destroy this block, removing listeners further up the bubbling path.
     const stopDelegation = (event: Event) => event.stopPropagation();
     button.addEventListener('click',stopDelegation);
     const handle = adoptAction(button, {onAction: () => options.onAction!(button.dataset.sdk!, button.dataset), onError: options.onError});
     handles.push({...handle,destroy() {button.removeEventListener('click',stopDelegation);handle.destroy();}});
   }
 }; update(initial);
 return {element, update, destroy() {if (destroyed) return; destroyed = true; handles.forEach(handle => handle.destroy()); handles = []; element.remove();}};
}
export function createProviderActions(state: ProviderActionsState, options: FeatureActionOptions = {}): UIBlock<ProviderActionsState> {return actions(state, providerActionsMarkup, options);}
export function createResourceActions(state: ResourceActionsState, options: FeatureActionOptions = {}): UIBlock<ResourceActionsState> {return actions(state, (state) => resourceActionsMarkup(state.kind, state.resource, state.workspaceId), options);}
