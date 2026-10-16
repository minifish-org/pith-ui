import {Lifetime,type ActionResult} from '../core.js';
import {createOperation} from '../operation.js';
import {adoptAction} from '../foundations.js';
import {createProviderActions,type ProviderAction,type ProviderActionsState,type ProviderActionTarget} from '../forms/actions.js';
import {createSettingsPanel,createMCPConnectionsPanel,createMCPConnectionList,createModelPicker} from '../forms/panels.js';
import type {SettingsPanelState,SettingsDraft,SettingsProviderOption,SettingsCredentialView,MCPConnectionsState,MCPConnectionDraft,MCPEditorValue,MCPConnectionItem,MCPConnectionAction,MCPConnectionTarget,ModelPickerState} from '../forms/panels.js';
import {createCustomConnectionEditor,type CustomConnectionState,type CustomConnectionDraft} from '../forms/custom-connection.js';
import {createProviderLoginPanel,type ProviderLoginState} from '../forms/provider-login.js';
import type {ModelSelection} from '../forms/model-editor.js';
import {createUpdatePanel,type UpdatePanelState} from '../files/systems.js';
import type {Appearance} from '../theme.js';
import type {AppEnvironment,HostResult,OwnedContent,OwnedSurface} from './internal.js';
import {createLoadingSession,type LoadingState,type LoadingSession} from './session.js';

export type {SettingsPanelState,SettingsDraft,SettingsProviderOption,MCPConnectionsState,MCPConnectionDraft,MCPEditorValue,MCPConnectionItem,ModelPickerState,ModelSelection,CustomConnectionState,CustomConnectionDraft,ProviderLoginState,UpdatePanelState,ProviderAction,ProviderActionsState,ProviderActionTarget,MCPConnectionAction,MCPConnectionTarget};
type Submission<Value>=(value:Value)=>ActionResult|Promise<ActionResult>;

/** Session methods address one owned opening, never a later use of its window. */
export interface SettingsViewSession<State> {
  update(state:Readonly<State>):void;
  fail(message:string):void;
  close():void;
  isOpen():boolean;
  destroy():void;
}
export interface SettingsCredential extends Omit<SettingsCredentialView,'actions'> {providerActions?:Readonly<ProviderActionsState>}
export type UpdateAction='check'|'install';
export interface SettingsCallbacks {
  onSubmit?:Submission<SettingsDraft>;
  onRemoveKey?:Submission<SettingsDraft>;
  onTest?:(draft:SettingsDraft)=>HostResult;
  onCancelTest?:()=>HostResult;
  onAppearanceChange?:(appearance:Appearance)=>HostResult;
  onProviderChange?:(provider:string)=>HostResult;
  onDraftChange?:(draft:SettingsDraft)=>void;
  onProviderAction?:(action:ProviderAction,target:ProviderActionTarget)=>HostResult;
  onUpdateAction?:(action:UpdateAction)=>HostResult;
  onCreateConnection?:()=>HostResult;
  onDiagnostics?:()=>HostResult;
  onClose?:()=>void;
}
export interface SettingsSession extends SettingsViewSession<SettingsPanelState> {
  read():SettingsDraft;
  setProviders(providers:readonly SettingsProviderOption[],selected?:string):void;
  resetProvider(value:{provider:string;baseUrl:string;clearKey?:boolean;collapseAdvanced?:boolean}):void;
  setCredential(view:Readonly<SettingsCredential>):void;
  updateUpdates(state:Readonly<UpdatePanelState>):void;
  setUpdatePending(pending:boolean):void;
  setUpdateError(message:string,options?:{allowCheckRetry?:boolean}):void;
  clearSecrets():void;
}
export interface MCPCallbacks {
  onSubmit?:Submission<MCPConnectionDraft>;
  onConnectionAction?:(action:MCPConnectionAction,target:MCPConnectionTarget)=>HostResult;
  onRefresh?:()=>HostResult;
  onNew?:()=>HostResult;
  onClose?:()=>void;
}
export interface MCPSession extends SettingsViewSession<MCPConnectionsState> {
  read():MCPConnectionDraft;
  edit(value?:Readonly<MCPEditorValue>):void;
  setConnections(entries:readonly MCPConnectionItem[]):void;
  clearBearerToken():void;
  clearSecrets():void;
}
export interface ModelCallbacks {onSubmit?:Submission<ModelSelection>;onClose?:()=>void}
export interface ModelSession extends SettingsViewSession<ModelPickerState> {read():ModelSelection;reset(selection:Readonly<ModelSelection>):void;focus():void}
export interface CustomConnectionCallbacks {onSubmit?:Submission<CustomConnectionDraft>;onClose?:()=>void}
export interface CustomConnectionSession extends SettingsViewSession<CustomConnectionState> {read():CustomConnectionDraft;clearSecrets():void}
export interface ProviderLoginCallbacks {onAnswer?:(answer:string)=>HostResult;onCancel?:()=>HostResult;onClose?:()=>void}
export interface ProviderLoginSession extends SettingsViewSession<ProviderLoginState> {}
export interface SettingsScene {
  openConnectionLoading(state:Readonly<LoadingState>&{readonly editing:boolean},callbacks?:{onClose?:()=>void}):LoadingSession;
  openSettings(state:Readonly<SettingsPanelState>,callbacks?:SettingsCallbacks):SettingsSession;
  openConnections(state?:Readonly<MCPConnectionsState>,callbacks?:MCPCallbacks):MCPSession;
  openModels(state:Readonly<ModelPickerState>,callbacks?:ModelCallbacks):ModelSession;
  openCustomConnection(state:Readonly<CustomConnectionState>,callbacks?:CustomConnectionCallbacks):CustomConnectionSession;
  openProviderLogin(state:Readonly<ProviderLoginState>,callbacks?:ProviderLoginCallbacks):ProviderLoginSession;
  destroy():void;
}

const unavailable:ActionResult={ok:false,error:'This action is unavailable.'};
const cloneCustom=(draft:CustomConnectionDraft):CustomConnectionDraft=>({...draft,models:draft.models.map(model=>({...model,prices:{...model.prices}}))});
const closedSurface:OwnedSurface={isOpen:()=>false,close(){},destroy(){},fail(){}};

/** Compose existing product blocks behind data-only application sessions. */
export function createSettingsScene(env:AppEnvironment):SettingsScene {
  const surfaces=new Set<OwnedSurface>();let destroyed=false,sequence=0;
  let loading:LoadingSession|undefined;
  const prefix=(name:string)=>`${env.idPrefix}${name}-${++sequence}-`;
  const track=(open:(content:OwnedContent,onClose:()=>void)=>OwnedSurface,content:OwnedContent,onClose?:()=>void):OwnedSurface=>{
    if(destroyed) {content.destroy();return closedSurface;}
    let surface:OwnedSurface|undefined;
    surface=open(content,()=>{if(surface) surfaces.delete(surface);onClose?.();});
    if(surface.isOpen()) surfaces.add(surface);
    if(destroyed) surface.destroy();
    return surface;
  };
  const submit=<Value>(callback:Submission<Value>|undefined,owner:()=>OwnedSurface|undefined,closeOnSuccess:boolean):Submission<Value>=>async value=>{
    if(!owner()?.isOpen()) return unavailable;
    const result=callback ? await callback(value) : unavailable;
    if(result.ok&&closeOnSuccess&&owner()?.isOpen()) owner()!.close();
    return result;
  };
  return {
    openConnectionLoading(state,callbacks={}) {
      loading?.destroy();
      loading=createLoadingSession(env,state.editing?'Edit model connection':'Add model connection',state,callbacks.onClose);
      if(destroyed) loading.destroy();
      return loading;
    },
    openSettings(initial,callbacks={}) {
      let surface:OwnedSurface|undefined,disposed=false,current=initial;
      let closed:SettingsDraft={provider:'',baseUrl:initial.baseUrl,apiKey:''};
      let provider:ReturnType<typeof createProviderActions>|undefined;
      let providerState:Readonly<ProviderActionsState>|undefined;
      const life=new Lifetime(),auxiliary=new Map<string,ReturnType<typeof createOperation>>();
      const active=()=>!disposed&&!destroyed&&!!surface?.isOpen();
      const run=(name:string,task:()=>HostResult)=>{
        let operation=auxiliary.get(name);
        if(!operation) {operation=createOperation({unavailable:()=>!active(),onError:message=>surface?.fail(message)});auxiliary.set(name,operation);}
        operation.run(task,result=>{if(result&&!result.ok) surface?.fail(result.error);});
      };
      const block=createSettingsPanel(initial,{idPrefix:env.idPrefix,
        onSubmit:submit(callbacks.onSubmit,()=>surface,true),onRemoveKey:submit(callbacks.onRemoveKey,()=>surface,true),
        onTest:draft=>{if(current.testing&&callbacks.onCancelTest) run('cancel-test',callbacks.onCancelTest);else if(callbacks.onTest) run('test',()=>callbacks.onTest!(draft));},
        onAppearanceChange:value=>{if(callbacks.onAppearanceChange&&(value==='light'||value==='dark'||value==='system')) run('appearance',()=>callbacks.onAppearanceChange!(value));},
        onProviderChange:id=>{if(callbacks.onProviderChange) run('provider',()=>callbacks.onProviderChange!(id));},
        onDraftChange:callbacks.onDraftChange,
      });
      const addConnection=block.element.querySelector<HTMLButtonElement>('button[data-sdk="custom"]')!;
      life.listen(addConnection,'click',event=>event.stopPropagation());
      const addAction=adoptAction(addConnection,{onAction:()=>{if(active()&&!current.disabled) return callbacks.onCreateConnection?.();},onError:message=>surface?.fail(message)});
      addAction.update({disabled:!!current.disabled});
      let externalUpdatePending=false,localUpdatePending=false,updateKind:UpdateAction='check';
      const updateOperation=createOperation({unavailable:()=>!active(),onPending:value=>{localUpdatePending=value;updates.setPending(externalUpdatePending||localUpdatePending);},onError:message=>updates.setError(message,{allowCheckRetry:updateKind==='check'})});
      const updateAction=(action:UpdateAction)=>{if(callbacks.onUpdateAction) updateOperation.run(()=>{updateKind=action;updates.setError('');return callbacks.onUpdateAction!(action);},result=>{if(result&&!result.ok) updates.setError(result.error,{allowCheckRetry:action==='check'});});};
      const updates=createUpdatePanel({container:block.updates,productName:env.productName,onCheck:()=>updateAction('check'),onInstall:()=>updateAction('install')});
      life.listen(block.element,'click',event=>{
        if(!active()||!(event.target instanceof Element)) return;
        const button=event.target.closest<HTMLButtonElement>('button');if(!button||button.disabled) return;
        if(button.dataset.action==='diagnostics') {event.stopPropagation();if(callbacks.onDiagnostics) run('diagnostics',callbacks.onDiagnostics);}
      });
      const content:OwnedContent={element:block.element,destroy(){
        if(disposed) return;closed={...block.read(),apiKey:''};disposed=true;life.destroy();updateOperation.destroy();
        for(const operation of auxiliary.values()) operation.destroy();auxiliary.clear();addAction.destroy();provider?.destroy();updates.destroy();block.clearSecrets();block.destroy();
      }};
      surface=track((content,onClose)=>env.openDialog('settings',content,onClose),content,callbacks.onClose);
      return {
        update(state){if(active()){current=state;block.update(state);addAction.update({disabled:!!state.disabled});if(providerState) provider?.update({...providerState,disabled:!!state.disabled||!!providerState.disabled});}},
        read(){return active()?{...block.read()}:{...closed};},
        setProviders(items,selected){if(active()) block.setProviders(items,selected);},
        resetProvider(value){if(active()){for(const operation of auxiliary.values()) operation.invalidate();block.resetProvider(value);}},
        setCredential(view){
          if(!active()) return;
          providerState=view.providerActions;
          if(view.providerActions) {
            const actions={...view.providerActions,disabled:!!current.disabled||!!view.providerActions.disabled};
            if(provider) provider.update(actions);
            else provider=createProviderActions(actions,{onProviderAction:(action,target)=>{if(active()&&!current.disabled) return callbacks.onProviderAction?.(action,target);},onError:message=>surface?.fail(message)});
          } else {provider?.destroy();provider=undefined;}
          const {providerActions:_,...credential}=view;block.setCredential({...credential,actions:provider?.element});
        },
        updateUpdates(state){if(active()) updates.update(state);},
        setUpdatePending(pending){if(active()){externalUpdatePending=pending;updates.setPending(externalUpdatePending||localUpdatePending);}},
        setUpdateError(message,options){if(active()) updates.setError(message,options);},
        clearSecrets(){if(active()) block.clearSecrets();closed.apiKey='';},
        fail(message){if(active()) surface!.fail(message);},close(){surface?.close();},isOpen:active,destroy(){surface?.destroy();},
      };
    },
    openConnections(initial={},callbacks={}) {
      let surface:OwnedSurface|undefined,disposed=false,current=initial;
      let entries:readonly MCPConnectionItem[]=[];
      let closed:MCPConnectionDraft={name:'',type:'http',url:'',oauth:false,oauthClientId:'',oauthScope:'',command:'',args:'[]',enabled:true,bearerToken:'',clearBearerToken:false,env:'',clearEnv:false};
      const life=new Lifetime(),active=()=>!disposed&&!destroyed&&!!surface?.isOpen();
      const operation=createOperation({unavailable:()=>!active(),onError:message=>surface?.fail(message)});
      const run=(task:(()=>HostResult)|undefined)=>{if(task) operation.run(task,result=>{if(result&&!result.ok) surface?.fail(result.error);});};
      const block=createMCPConnectionsPanel(initial,{idPrefix:env.idPrefix,onSubmit:submit(callbacks.onSubmit,()=>surface,false)});
      const list=createMCPConnectionList({entries:[],disabled:initial.disabled},{onAction:(action,target)=>callbacks.onConnectionAction?.(action,target)});
      life.listen(block.element,'click',event=>{
        if(!active()||!(event.target instanceof Element)) return;
        const button=event.target.closest<HTMLButtonElement>('button');if(!button||button.disabled) return;
        if(button.dataset.action==='refresh-mcp'){event.stopPropagation();run(callbacks.onRefresh);}
        if(button.dataset.action==='new-mcp'){event.stopPropagation();block.edit();run(callbacks.onNew);}
      });
      const content:OwnedContent={element:block.element,destroy(){if(disposed) return;closed={...block.read(),bearerToken:'',env:''};disposed=true;life.destroy();operation.destroy();list.destroy();block.clearSecrets();block.destroy();}};
      surface=track((content,onClose)=>env.openDialog('connections',content,onClose),content,callbacks.onClose);
      return {
        update(state){if(active()){current=state;block.update(state);list.update({entries,disabled:state.disabled});}},
        read(){return active()?{...block.read()}:{...closed};},
        edit(value){if(active()){operation.invalidate();block.edit(value);}},
        setConnections(values){if(active()){entries=values;if(list.element.parentNode!==block.list) block.list.replaceChildren(list.element);list.update({entries,disabled:current.disabled});}},
        clearBearerToken(){if(active()) block.clearBearerToken();closed.bearerToken='';},
        clearSecrets(){if(active()) block.clearSecrets();closed.bearerToken='';closed.env='';},
        fail(message){if(active()) surface!.fail(message);},close(){surface?.close();},isOpen:active,destroy(){surface?.destroy();},
      };
    },
    openModels(initial,callbacks={}) {
      let surface:OwnedSurface|undefined,disposed=false,closed:ModelSelection={...(initial.editor?.selection??{provider:'',model:'',thinkingLevel:''})};
      const active=()=>!disposed&&!destroyed&&!!surface?.isOpen();
      const block=createModelPicker(initial,{idPrefix:env.idPrefix,onSubmit:submit(callbacks.onSubmit,()=>surface,true)});
      const content:OwnedContent={element:block.element,destroy(){if(disposed) return;closed={...block.read()};disposed=true;block.destroy();}};
      surface=track((content,onClose)=>env.openDialog('model',content,onClose),content,callbacks.onClose);
      return {update(state){if(active()) block.update(state);},read(){return active()?{...block.read()}:{...closed};},reset(selection){if(active()) block.reset(selection);},focus(){if(active()) block.focus();},fail(message){if(active()) surface!.fail(message);},close(){surface?.close();},isOpen:active,destroy(){surface?.destroy();}};
    },
    openCustomConnection(initial,callbacks={}) {
      let surface:OwnedSurface|undefined,disposed=false;
      let closed:CustomConnectionDraft={name:initial.name,baseUrl:initial.baseUrl,api:initial.api,apiKey:'',models:[]};
      const active=()=>!disposed&&!destroyed&&!!surface?.isOpen();
      const block=createCustomConnectionEditor(initial,{idPrefix:prefix('custom'),onSubmit:submit(callbacks.onSubmit,()=>surface,true)});
      const clearSecrets=()=>{for(const input of block.form.querySelectorAll<HTMLInputElement>('input[type="password"]')) input.value='';closed.apiKey='';};
      const content:OwnedContent={element:block.element,destroy(){if(disposed) return;closed={...cloneCustom(block.read()),apiKey:''};disposed=true;clearSecrets();block.destroy();}};
      surface=track((content,onClose)=>env.openFeature(initial.editing?'Edit model connection':'Add model connection',content,onClose),content,callbacks.onClose);
      return {update(state){if(active()) block.update(state);},read(){return cloneCustom(active()?block.read():closed);},clearSecrets(){if(active()) clearSecrets();},fail(message){if(active()) surface!.fail(message);},close(){surface?.close();},isOpen:active,destroy(){surface?.destroy();}};
    },
    openProviderLogin(initial,callbacks={}) {
      let surface:OwnedSurface|undefined,disposed=false;
      const life=new Lifetime(),active=()=>!disposed&&!destroyed&&!!surface?.isOpen();
      const external=createOperation({unavailable:()=>!active(),onError:message=>surface?.fail(message)});
      const cancellation=createOperation({unavailable:()=>!active(),onError:message=>surface?.fail(message)});
      const block=createProviderLoginPanel(initial,{idPrefix:prefix('login'),onAnswer:answer=>callbacks.onAnswer?.(answer),
        onCancel(){cancellation.run(()=>callbacks.onCancel?.());surface?.close();},onClose:()=>surface?.close(),
      });
      life.listen(block.element,'click',event=>{
        if(!active()||!(event.target instanceof Element)) return;
        const link=event.target.closest<HTMLAnchorElement>('a[href]');if(!link||!block.element.contains(link)) return;
        event.preventDefault();event.stopPropagation();external.run(()=>env.openExternal(link.href),result=>{if(!result.ok) surface?.fail(result.error);});
      });
      const content:OwnedContent={element:block.element,destroy(){if(disposed) return;disposed=true;external.destroy();cancellation.destroy();life.destroy();block.destroy();}};
      surface=track((content,onClose)=>env.openOAuth('Provider sign-in',content,onClose),content,callbacks.onClose);
      return {update(state){if(active()) block.update(state);},fail(message){if(active()) surface!.fail(message);},close(){surface?.close();},isOpen:active,destroy(){surface?.destroy();}};
    },
    destroy(){if(destroyed) return;destroyed=true;loading?.destroy();for(const surface of [...surfaces]) surface.destroy();surfaces.clear();},
  };
}
