import {assertOptions,createOwnedPart,nodeOf,onPartDestroy,type Part} from '../parts/ownership.js';
import type {FramePart,SideRailPart} from '../parts/frame.js';

export interface SidebarWidths {navigation: number;tools: number}
type Side = keyof SidebarWidths;
const defaults: SidebarWidths={navigation:260,tools:300},minimum: SidebarWidths={navigation:200,tools:240},maximum: SidebarWidths={navigation:480,tools:800};
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));

/** Private frame interaction. The rails own the separator parts; Desk owns
 * persistence. Temporary viewport constraints never replace the preference. */
export function composeSidebarSizing(scope: FramePart,rails: {navigation:SideRailPart;tools?:SideRailPart},initial: Partial<SidebarWidths>={},onResize?: (widths: Readonly<SidebarWidths>)=>void) {
  const root=nodeOf(scope) as HTMLElement,narrow=matchMedia('(max-width: 720px)');
  let preferred={...defaults},actual={navigation:0,tools:0},effectiveMinimum={...minimum},alive=true,dirty=false;
  let drag: {side:Side;pointer:number;x:number;width:number;before:SidebarWidths}|undefined;
  const controls=new Map<Side,HTMLElement>(),parts: Part[]=[],stops: Array<()=>void>=[];
  function read(next: Partial<SidebarWidths>): SidebarWidths {
    assertOptions(next,['navigation','tools'],'sidebar widths');const value={...preferred};
    for (const side of ['navigation','tools'] as const) if (next[side] !== undefined) {
      if (typeof next[side] !== 'number' || !Number.isFinite(next[side]) || next[side]! <= 0) throw new TypeError('Sidebar widths must be positive finite numbers.');
      value[side]=clamp(Math.round(next[side]!),minimum[side],maximum[side]);
    }
    return value;
  }
  preferred=read(initial);
  const visible=(side:Side)=>!!rails[side] && !nodeOf(rails[side]!).classList.contains('pui-collapsed');
  function bounds(side:Side) {
    const other=side==='navigation'?'tools':'navigation',room=Math.max(1,Math.floor(root.getBoundingClientRect().width)-320-actual[other]);
    return {min:Math.min(effectiveMinimum[side],room),max:Math.min(maximum[side],room)};
  }
  function fit(): void {
    if (!alive) return;
    if (narrow.matches) {
      root.style.setProperty('--pui-sidebar-width','260px');root.style.setProperty('--pui-tools-width','300px');
      for (const control of controls.values()) control.hidden=true;
      return;
    }
    const width=root.getBoundingClientRect().width;if (!width) return;
    const sides=(['navigation','tools'] as const).filter(visible),budget=Math.max(0,Math.floor(width)-320);
    const minTotal=sides.reduce((sum,side)=>sum+minimum[side],0),minScale=Math.min(1,budget/(minTotal || 1));
    effectiveMinimum={navigation:Math.floor(minimum.navigation*minScale),tools:Math.floor(minimum.tools*minScale)};
    const wanted=sides.reduce((sum,side)=>sum+preferred[side],0),base=minTotal*minScale;
    const scale=wanted>budget?Math.max(0,(budget-base)/(wanted-base || 1)):1;
    actual={navigation:0,tools:0};
    for (const side of sides) actual[side]=Math.floor(minimum[side]*minScale+(preferred[side]-minimum[side]*minScale)*scale);
    root.style.setProperty('--pui-sidebar-width',`${actual.navigation || preferred.navigation}px`);
    root.style.setProperty('--pui-tools-width',`${actual.tools || preferred.tools}px`);
    for (const [side,control] of controls) {
      control.hidden=!visible(side);const range=bounds(side);
      control.setAttribute('aria-valuemin',String(range.min));control.setAttribute('aria-valuemax',String(range.max));
      control.setAttribute('aria-valuenow',String(actual[side]));control.setAttribute('aria-valuetext',`${actual[side]} pixels`);
    }
  }
  function commit(): void {if (alive && dirty) {dirty=false;onResize?.(Object.freeze({...preferred}));}}
  function finish(cancel=false): void {
    if (!drag) return;
    const previous=drag;drag=undefined;root.classList.remove('pui-resizing-rails');
    if (cancel) {preferred=previous.before;dirty=false;fit();} else commit();
    const control=controls.get(previous.side)!;
    if (control.hasPointerCapture(previous.pointer)) control.releasePointerCapture(previous.pointer);
  }
  function change(side:Side,value:number): void {
    const range=bounds(side),next=clamp(clamp(Math.round(value),range.min,range.max),minimum[side],maximum[side]);
    if (preferred[side]!==next) {preferred={...preferred,[side]:next};dirty=true;fit();}
  }
  function dispose(): void {
    if (!alive) return;alive=false;finish(true);observer.disconnect();narrow.removeEventListener('change',breakpoint);
    root.classList.remove('pui-resizing-rails');root.style.removeProperty('--pui-sidebar-width');root.style.removeProperty('--pui-tools-width');
    for (const stop of stops.splice(0)) stop();
  }
  for (const side of ['navigation','tools'] as const) if (rails[side]) {
    const node=document.createElement('div');node.className=`pui-rail-resize pui-rail-resize-${side}`;
    node.tabIndex=0;node.setAttribute('role','separator');node.setAttribute('aria-orientation','vertical');node.setAttribute('aria-label',side==='navigation'?'Resize navigation':'Resize tools');node.setAttribute('aria-controls',nodeOf(rails[side]!).id);
    node.title='Drag to resize. Left/Right arrows adjust width; Shift for larger steps; Home/End for limits.';
    controls.set(side,node);
    const down=(event:PointerEvent)=>{
      if (!alive || narrow.matches || !visible(side) || event.button!==0 || drag) return;
      event.preventDefault();event.stopPropagation();node.focus({preventScroll:true});
      drag={side,pointer:event.pointerId,x:event.clientX,width:actual[side],before:{...preferred}};
      node.setPointerCapture(event.pointerId);root.classList.add('pui-resizing-rails');
    };
    const move=(event:PointerEvent)=>{if (drag?.pointer===event.pointerId) {event.preventDefault();change(side,drag.width+(event.clientX-drag.x)*(side==='navigation'?1:-1));}};
    const up=(event:PointerEvent)=>{if (drag?.pointer===event.pointerId) finish();};
    const cancel=(event:PointerEvent)=>{if (drag?.pointer===event.pointerId) finish(true);};
    const keydown=(event:KeyboardEvent)=>{
      if (drag) {if (event.key==='Escape') {event.preventDefault();event.stopPropagation();finish(true);}return;}
      if (!alive || narrow.matches || !visible(side) || event.altKey || event.ctrlKey || event.metaKey || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();event.stopPropagation();const range=bounds(side),step=event.shiftKey?40:10;
      const value=event.key==='Home'?range.min:event.key==='End'?range.max:actual[side]+(event.key==='ArrowRight'?1:-1)*(side==='navigation'?1:-1)*step;
      change(side,value);
    };
    const keyup=(event:KeyboardEvent)=>{if (['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) commit();};
    node.addEventListener('pointerdown',down);node.addEventListener('pointermove',move);node.addEventListener('pointerup',up);node.addEventListener('pointercancel',cancel);node.addEventListener('lostpointercapture',cancel);node.addEventListener('keydown',keydown);node.addEventListener('keyup',keyup);node.addEventListener('blur',commit);
    parts.push(createOwnedPart(node,{}, {dispose() {
      dispose();node.removeEventListener('pointerdown',down);node.removeEventListener('pointermove',move);node.removeEventListener('pointerup',up);node.removeEventListener('pointercancel',cancel);node.removeEventListener('lostpointercapture',cancel);node.removeEventListener('keydown',keydown);node.removeEventListener('keyup',keyup);node.removeEventListener('blur',commit);
    }}));
  }
  const observer=new ResizeObserver(fit),breakpoint=()=>{finish(true);fit();};observer.observe(root);narrow.addEventListener('change',breakpoint);
  stops.push(onPartDestroy(scope,dispose));
  return {navigation:parts[0],tools:parts[1],fit,setWidths(next:Partial<SidebarWidths>) {const value=read(next);if (alive) {finish(true);preferred=value;dirty=false;fit();}}};
}
