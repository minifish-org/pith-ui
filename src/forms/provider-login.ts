import {scopeIds, localField} from './identity.js';
import {Generation, type ActionResult, type UIBlock} from '../core.js';
import {uniqueId} from '../dom.js';
import {adoptProductParts} from '../foundations.js';
export interface ProviderLoginState {phase: string; message: string; url?: string; code?: string; prompt?: string; promptType?: string; options?: readonly {id: string; label: string}[] | null; error?: string; disabled?: boolean}
export function createProviderLoginPanel(initial: ProviderLoginState, options: {idPrefix?: string; onAnswer?: (answer: string) => void | ActionResult | Promise<void | ActionResult>; onCancel?: () => void; onClose?: () => void} = {}): UIBlock<ProviderLoginState> {
 const element = document.createElement('div'); element.className = 'pui-provider-login'; const prefix = options.idPrefix ?? uniqueId('pui-login') + '-';
 element.innerHTML = `<p class="pui-provider-login-status" role="status"></p><p data-login-link hidden><a target="_blank" rel="noopener noreferrer">Open sign-in page in your browser ↗</a></p><p data-login-code hidden>Verification code: <strong></strong></p><form id="oauth-answer" hidden><label class="pui-field-label" for="oauth-value"></label><span data-login-input></span><button type="submit" class="pui-primary-button">Continue</button></form><div id="oauth-error" class="pui-form-error" role="alert"></div><div class="pui-modal-footer"><button type="button" class="pui-secondary-button" data-close="oauth-dialog" hidden>Close</button><button type="button" class="pui-secondary-button" data-sdk="cancel-login">Cancel sign-in</button></div>`;
 scopeIds(element, prefix);
 const field = <T extends HTMLElement = HTMLElement>(id: string): T => localField<T>(element, prefix + id);
 const form = field<HTMLFormElement>('oauth-answer'), status = element.querySelector<HTMLElement>('.pui-provider-login-status')!, inputHost = element.querySelector<HTMLElement>('[data-login-input]')!, submit = form.querySelector<HTMLButtonElement>('button')!;
 const link = element.querySelector<HTMLAnchorElement>('a')!, code = element.querySelector<HTMLElement>('[data-login-code]')!, error = field('oauth-error');
 const generation = new Generation(), abort = new AbortController(), parts = adoptProductParts(element);
 let signature = '', destroyed = false, pending = false, localError = '', state: Readonly<ProviderLoginState> = initial;
 function renderDisabled(): void {parts.action(submit).update({disabled:state.disabled,pending});}
 const update = (login: Readonly<ProviderLoginState>) => {
  if (destroyed) return; state = login;
  const next = JSON.stringify([login.phase, login.prompt, login.promptType, login.options]);
  if (next !== signature) {
   signature = next; generation.invalidate(); pending = false; localError = '';
   inputHost.replaceChildren();
   if (login.phase === 'prompt') {
    const input = document.createElement(login.options?.length ? 'select' : 'input'); input.id = prefix + 'oauth-value';
    if (input instanceof HTMLInputElement) { input.type = login.promptType === 'secret' ? 'password' : 'text'; input.required = true; input.autocomplete = 'off'; }
    else { input.className = 'pui-feature-select'; for (const item of login.options || []) { const option = document.createElement('option'); option.value = item.id; option.textContent = item.label; input.append(option); } }
    inputHost.append(input);
   }
  }
  parts.feedback(status).update({message:login.message,tone:login.phase === 'error' ? 'error' : 'info'}); status.classList.toggle('pui-form-error', login.phase === 'error');
  let href = ''; try {const url = new URL(login.url || ''); if (url.protocol === 'https:' || url.protocol === 'http:') href = url.href;} catch {}
  link.parentElement!.hidden = !href; if (href) link.href = href; else link.removeAttribute('href');
  code.hidden = !login.code; code.querySelector('strong')!.textContent = login.code || '';
  form.hidden = login.phase !== 'prompt'; form.querySelector('label')!.textContent = login.prompt || '';
  const promptInput = inputHost.querySelector<HTMLInputElement | HTMLSelectElement>('input, select'); if (promptInput) parts.control(promptInput);
  parts.update(); parts.feedback(error).update({message:login.error || localError,tone:'error'});
  const complete = ['complete','error'].includes(login.phase);
  element.querySelector<HTMLButtonElement>('[data-close]')!.hidden = !complete;
  element.querySelector<HTMLButtonElement>('[data-sdk]')!.hidden = complete;
  renderDisabled();
 };
 element.addEventListener('submit', async event => {
  event.preventDefault(); if (pending || state.disabled || state.phase !== 'prompt' || !options.onAnswer) return;
  const input = field<HTMLInputElement | HTMLSelectElement>('oauth-value'); if (!input.checkValidity()) {input.reportValidity(); return;}
  const seq = generation.next(); pending = true; localError = ''; error.textContent = ''; renderDisabled();
  try { const result = await options.onAnswer(parts.control(input).getValue()); if (generation.current(seq) && result && !result.ok) {localError = result.error; parts.feedback(error).update({message:localError,tone:'error'});} }
  catch (reason) {if (generation.current(seq)) {localError = reason instanceof Error ? reason.message : String(reason); parts.feedback(error).update({message:localError,tone:'error'});}}
  finally {if (generation.current(seq)) {pending = false; renderDisabled();}}
 }, {signal:abort.signal});
 element.addEventListener('click', event => {const target = (event.target as HTMLElement).closest<HTMLButtonElement>('button'); if (target?.dataset.sdk === 'cancel-login') options.onCancel?.(); if (target?.dataset.close === prefix + 'oauth-dialog') options.onClose?.();}, {signal:abort.signal});
 update(initial); return {element, update, destroy() {if (destroyed) return; destroyed = true; generation.destroy(); abort.abort(); for (const input of element.querySelectorAll<HTMLInputElement>('input')) parts.control(input).reset(''); parts.destroy(); element.remove();}};
}
