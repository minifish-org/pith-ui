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
import {type ActionResult} from '../core.js';
import {createOperation} from '../operation.js';


/** Shared form lifetime; business writes and target identity remain with the caller. */
export function bindFormSubmission<Value>(form:HTMLFormElement,options:{
  read:()=>Value;
  unavailable:()=>boolean;
  onSubmit?: (value:Value)=>ActionResult|Promise<ActionResult>;
  onPending:(pending:boolean)=>void;
  onError:(error:string)=>void;
}):{invalidate():void;destroy():void} {
  const abort = new AbortController();
  const operation = createOperation({unavailable:options.unavailable,onPending:options.onPending,onError:options.onError});
  if (options.onSubmit) form.addEventListener('submit',event=>{
    event.preventDefault(); if (operation.pending || options.unavailable() || !form.reportValidity()) return;
    operation.run(() => {options.onError(''); return options.onSubmit!(options.read());}, result => {if (!result.ok) options.onError(result.error);});
  },{signal:abort.signal});
  return {invalidate() {operation.invalidate();},destroy() {operation.destroy(); abort.abort();}};
}
