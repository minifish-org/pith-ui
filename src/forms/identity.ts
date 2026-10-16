/** Scope DOM IDs and their references without relying on document-level lookup. */
export function scopeIds(root: HTMLElement, prefix: string): void {
  for (const control of root.querySelectorAll<HTMLElement>('input:not([type="checkbox"]):not([type="file"]), textarea, select')) control.classList.add('pui-control');
  if (!prefix) return;
  const attributes = ['id', 'for', 'aria-labelledby', 'aria-describedby', 'aria-controls', 'data-close'];
  for (const node of [root, ...root.querySelectorAll<HTMLElement>('*')]) for (const attribute of attributes) {
    const value = node.getAttribute(attribute);
    if (value) node.setAttribute(attribute, value.split(' ').map(id => prefix + id).join(' '));
  }
}
export function localField<T extends HTMLElement = HTMLElement>(root: HTMLElement, id: string): T {
  const found = [...root.querySelectorAll<HTMLElement>('[id]')].find(node => node.getAttribute('id') === id);
  if (!found) throw new Error(`Unknown component field: ${id}`);
  return found as T;
}
import {Generation,type ActionResult} from '../core.js';


/** Shared form lifetime; business writes and target identity remain with the caller. */
export function bindFormSubmission<Value>(form:HTMLFormElement,options:{
  read:()=>Value;
  unavailable:()=>boolean;
  onSubmit?: (value:Value)=>ActionResult|Promise<ActionResult>;
  onPending:(pending:boolean)=>void;
  onError:(error:string)=>void;
}):{invalidate():void;destroy():void} {
  const generation = new Generation(),abort = new AbortController(); let pending = false;
  if (options.onSubmit) form.addEventListener('submit',async event=>{
    event.preventDefault(); if (pending || options.unavailable() || !form.reportValidity()) return;
    const sequence = generation.next(); pending = true; options.onError(''); options.onPending(true);
    try {const result = await options.onSubmit!(options.read()); if (generation.current(sequence) && !result.ok) options.onError(result.error);}
    catch (error) {if (generation.current(sequence)) options.onError(error instanceof Error ? error.message : String(error));}
    finally {if (generation.current(sequence)) {pending = false; options.onPending(false);}}
  },{signal:abort.signal});
  return {invalidate() {generation.invalidate(); pending = false; options.onPending(false);},destroy() {generation.destroy(); abort.abort();}};
}
