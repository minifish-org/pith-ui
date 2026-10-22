import {assertOptions,createOwnedPart,isPartAlive,type Part} from './ownership.js';

export interface WebPreviewBounds {x:number;y:number;width:number;height:number}
export interface WebPreviewPartState {disabled?:boolean}
export interface WebPreviewPart extends Part {update(state:Readonly<WebPreviewPartState>):void}

/** An opaque viewport for host-rendered content. No webpage or credentials enter
 * the DOM. Coordinates are CSS pixels; the native host owns rendering and scale. */
export function createWebPreviewPart(initial:WebPreviewPartState,onViewport?:(bounds:WebPreviewBounds|null)=>void):WebPreviewPart {
  const node=document.createElement('div');node.className='pui-web-preview-viewport';
  let disabled=true,frame=0,last='';
  function report(bounds:WebPreviewBounds|null) {
    const key=JSON.stringify(bounds);if(key===last)return;last=key;onViewport?.(bounds);
  }
  function measure() {
    frame=0;if(!isPartAlive(part) || disabled)return;
    const rect=node.getBoundingClientRect();
    const visible=!disabled && node.isConnected && !node.closest('[hidden],[inert]') && rect.width>0 && rect.height>0 && document.visibilityState==='visible' && !document.querySelector(':modal, :popover-open');
    report(visible ? {x:Math.max(0,rect.x),y:Math.max(0,rect.y),width:Math.max(0,Math.min(rect.right,innerWidth)-Math.max(0,rect.x)),height:Math.max(0,Math.min(rect.bottom,innerHeight)-Math.max(0,rect.y))}:null);
    if(isPartAlive(part) && !disabled)frame=requestAnimationFrame(measure);
  }
  function update(state:Readonly<WebPreviewPartState>) {
    assertOptions(state,['disabled'],'web preview');
    if(state.disabled!==undefined && typeof state.disabled!=='boolean')throw new TypeError('Invalid web preview state.');
    if(!isPartAlive(part))return;disabled=!!state.disabled;
    if(disabled){cancelAnimationFrame(frame);frame=0;if(last)report(null);}else if(onViewport && !frame)frame=requestAnimationFrame(measure);
  }
  const part=createOwnedPart(node,{update},{dispose(){cancelAnimationFrame(frame);report(null);}});
  try {update(initial);}catch(error){part.destroy();throw error;}
  return part;
}
