import {createButtonPart,createFeedbackPart,createInputPart,createMenuPart,createStackPart,createWebPreviewPart} from '../parts/index.js';
import {nodeOf,onPartDestroy} from '../parts/ownership.js';

export interface WebPreviewState {url: string;externalUrl?: string;disabled?: boolean;pending?: boolean;revision?: number;error?: string}
export interface WebPreviewCallbacks {onNavigate?(address: string): void;onRefresh?(): void;onExternal?(url: string): void}

/** One address draft and one iframe. Requests and URL admission stay in the host. */
export function composeWebPreview(initial: Readonly<WebPreviewState>,callbacks: WebPreviewCallbacks = {}) {
  const validate=(next:Readonly<WebPreviewState>)=>{
    for(const value of [next.url,next.externalUrl])if(value){const target=new URL(value);if(!['http:','https:'].includes(target.protocol)||target.username||target.password||target.origin===location.origin)throw new TypeError('Web preview addresses require a separate HTTP or HTTPS origin.');}
  };
  validate(initial);
  let alive=true,state=initial;
  const address=createInputPart({kind:'url',label:'Web address',placeholder:'http://localhost:5173',autocomplete:'off',onEnter() {if(alive && !state.disabled && !state.pending) callbacks.onNavigate?.(address.read());}});
  const refresh=createButtonPart({label:'Refresh',title:'Refresh',icon:'refresh',variant:'quiet-icon',onAction() {if(alive && !state.disabled && !state.pending) callbacks.onRefresh?.();}});
  const menu=createMenuPart({label:'Web actions',items:[{key:'external',label:'Open externally',onAction() {menu.close();if(alive && !state.disabled && state.externalUrl) {if(callbacks.onExternal)callbacks.onExternal(state.externalUrl);else window.open(state.externalUrl,'_blank','noopener,noreferrer');}}}]});
  const openMenu=(event:Event)=>{if(alive && !state.disabled && !state.pending && state.externalUrl){event.preventDefault();menu.open(refresh);}};
  const menuKey=(event:Event)=>{if(event instanceof KeyboardEvent && (event.key==='ContextMenu' || event.shiftKey && event.key==='F10'))openMenu(event);};
  const refreshNode=nodeOf(refresh);refreshNode.addEventListener('contextmenu',openMenu);refreshNode.addEventListener('keydown',menuKey);
  const toolbar=createStackPart({children:[address,refresh]});nodeOf(toolbar).className='pui-web-preview-toolbar';
  const feedback=createFeedbackPart({message:'',tone:'error',hidden:true}),viewport=createWebPreviewPart({url:initial.url,disabled:initial.disabled,revision:initial.revision});
  const part=createStackPart({children:[toolbar,feedback,viewport,menu]});nodeOf(part).className='pui-web-preview';
  function update(next:Readonly<WebPreviewState>) {
    if(!alive)return;validate(next);state=next;
    address.update({label:'Web address',disabled:!!next.disabled || !!next.pending});
    refresh.update({label:'Refresh',title:'Refresh',icon:'refresh',variant:'quiet-icon',disabled:!!next.disabled || !!next.pending || !next.externalUrl});
    if(next.disabled || next.pending || !next.externalUrl)menu.close();
    feedback.update({message:next.error??'',tone:'error',hidden:!next.error});
    viewport.update({url:next.url,disabled:next.disabled,revision:next.revision});
  }
  onPartDestroy(part,()=>{alive=false;refreshNode.removeEventListener('contextmenu',openMenu);refreshNode.removeEventListener('keydown',menuKey);});update(initial);
  return {part,update,resetAddress:address.reset,destroy:part.destroy};
}
