import type { UIBlock, UIAction } from '../core.js';
import { escape, setText } from '../dom.js';
import {adoptAction, type ActionController} from '../foundations.js';
import {reconcileKeyed} from '../reconcile.js';
export interface ProviderActionsState {id: string; oauth: boolean; signedIn: boolean; custom: boolean; disabled?: boolean}
export type ResourceKind = 'instructions' | 'skill' | 'template';
export interface ResourceActionsState {kind: string; resource: {name: string; path: string}; workspaceId: string}
export type ProviderAction = 'login' | 'logout' | 'custom' | 'remove-connection';
export type ResourceAction = 'use-resource' | 'resource';
export interface ProviderActionTarget {readonly id: string}
export interface ResourceActionTarget {readonly workspaceId: string; readonly kind: string; readonly resource: {readonly name: string; readonly path: string}; readonly command?: string}
export function providerActionsMarkup(provider: ProviderActionsState): string {return `<div class="pui-feature-toolbar">${provider.oauth ? `<button type="button" class="pui-secondary-button" data-sdk="${provider.signedIn ? 'logout' : 'login'}" data-id="${escape(provider.id)}">${provider.signedIn ? 'Sign out' : 'Sign in with provider'}</button>` : ''}${provider.custom ? `<button type="button" class="pui-secondary-button" data-sdk="custom" data-id="${escape(provider.id)}">Edit models and prices</button><button type="button" class="pui-secondary-button pui-destructive-button" data-sdk="remove-connection" data-id="${escape(provider.id)}">Remove connection</button>` : ''}</div>`;}
const resourceCommand = (kind: string, name: string) => kind === 'skill' ? `/skill:${name} ` : `/${name} `;
export function resourceActionsMarkup(kind: string, resource: {name: string; path: string}, workspaceId: string): string {
 return `<div class="pui-file-actions">${kind !== 'instructions' ? `<button type="button" class="pui-secondary-button" data-sdk="use-resource" data-command="${escape(resourceCommand(kind,resource.name))}">Use</button>` : ''}<button type="button" class="pui-secondary-button" data-sdk="resource" data-resource-workspace="${escape(workspaceId)}" data-kind="${escape(kind)}" data-path="${escape(resource.path)}">View / edit</button></div>`;
}
export interface FeatureActionOptions {onAction?: (action: string, target: DOMStringMap) => ReturnType<UIAction>; onError?: (message: string) => void}
export interface ProviderActionOptions extends FeatureActionOptions {onProviderAction?: (action: ProviderAction, target: ProviderActionTarget) => ReturnType<UIAction>}
export interface ResourceActionOptions extends FeatureActionOptions {onResourceAction?: (action: ResourceAction, target: ResourceActionTarget) => ReturnType<UIAction>}
type ActionView<Action, Target> = {key: string; action: Action; label: string; target: Target; dataset: Record<string,string>; destructive?: boolean; disabled?: boolean};
function actions<State, Action extends string, Target>(initial: State, className: string, describe: (state: Readonly<State>) => readonly ActionView<Action,Target>[], options: FeatureActionOptions, onAction?: (action: Action,target: Target) => ReturnType<UIAction>): UIBlock<State> {
 const element = document.createElement('div'); element.className = 'pui-feature-actions'; const toolbar = document.createElement('div'); toolbar.className = className; element.append(toolbar);
 type Row = {element: HTMLButtonElement; view: ActionView<Action,Target>; handle: ActionController; stop?: (event: Event) => void};
 const rows = new Map<string,Row>(); let destroyed = false;
 const release = (row: Row) => {if (row.stop) row.element.removeEventListener('click',row.stop); row.handle.destroy();};
 const update = (state: Readonly<State>) => {
   if (destroyed) return;
   reconcileKeyed(toolbar,rows,describe(state),{key:view=>view.key,element:row=>row.element,create(view) {
     const button = document.createElement('button'); button.type = 'button';
     const stop = onAction || options.onAction ? (event: Event) => event.stopPropagation() : undefined;
     // Stop before the callback: it can synchronously destroy this owner.
     if (stop) button.addEventListener('click',stop);
     const row: Row = {element:button,view,handle:adoptAction(button,{onAction:stop ? () => onAction ? onAction(row.view.action,row.view.target) : options.onAction!(row.view.action,button.dataset) : undefined,onError:options.onError}),stop}; return row;
   },update(row,view) {row.view = view; row.element.className = `pui-secondary-button${view.destructive ? ' pui-destructive-button' : ''}`; setText(row.element,view.label); for (const [name,value] of Object.entries(view.dataset)) row.element.dataset[name] = value; if (view.disabled !== undefined) row.handle.update({disabled:view.disabled});},destroy:release});
 }; update(initial);
 return {element, update, destroy() {if (destroyed) return; destroyed = true; for (const row of rows.values()) release(row); rows.clear(); element.remove();}};
}
export function createProviderActions(state: ProviderActionsState, options: ProviderActionOptions = {}): UIBlock<ProviderActionsState> {
 return actions(state,'pui-feature-toolbar',value => {
   const target = Object.freeze({id:value.id}); const result: ActionView<ProviderAction,ProviderActionTarget>[] = [];
   const add = (action: ProviderAction,label: string,destructive = false) => result.push({key:JSON.stringify([value.id,action]),action,label,target,dataset:{sdk:action,id:value.id},destructive,disabled:!!value.disabled});
   if (value.oauth) add(value.signedIn ? 'logout' : 'login',value.signedIn ? 'Sign out' : 'Sign in with provider');
   if (value.custom) {add('custom','Edit models and prices'); add('remove-connection','Remove connection',true);} return result;
 },options,options.onProviderAction);
}
export function createResourceActions(state: ResourceActionsState, options: ResourceActionOptions = {}): UIBlock<ResourceActionsState> {
 return actions(state,'pui-file-actions',value => {
   const resource = Object.freeze({...value.resource}); const identity = JSON.stringify([value.workspaceId,value.kind,resource.name,resource.path]);
   const target = Object.freeze({workspaceId:value.workspaceId,kind:value.kind,resource}); const result: ActionView<ResourceAction,ResourceActionTarget>[] = [];
   if (value.kind !== 'instructions') {const command = resourceCommand(value.kind,resource.name); result.push({key:identity+'use-resource',action:'use-resource',label:'Use',target:Object.freeze({...target,command}),dataset:{sdk:'use-resource',command}});}
   result.push({key:identity+'resource',action:'resource',label:'View / edit',target,dataset:{sdk:'resource',resourceWorkspace:value.workspaceId,kind:value.kind,path:resource.path}}); return result;
 },options,options.onResourceAction);
}
