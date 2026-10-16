import type { UIBlock } from './core.js';
import { icon, setText } from './dom.js';
import { adoptProductParts } from './foundations.js';
import { reconcileKeyed } from './reconcile.js';

export interface PendingMessage { id: string; text: string; mode: string; imageCount?: number; }
export interface PendingMessagesState { items: readonly PendingMessage[]; running: boolean; busy: boolean; }
export interface PendingMessagesOptions {
  container?: HTMLElement;
  onAction?: (action: 'edit' | 'delete' | 'steer', id: string) => void;
}
export function createPendingMessages(options: PendingMessagesOptions = {}): UIBlock<PendingMessagesState> {
  const element = options.container ?? document.createElement('section');
  element.classList.add('pui-queued-messages'); element.setAttribute('aria-label', 'Pending messages');
  const parts = adoptProductParts(element);
  let destroyed = false;
  const rows = new Map<string, HTMLElement>();
  const heading = document.createElement('div'); heading.className = 'pui-section-heading'; heading.textContent = 'Pending messages';
  element.append(heading);
  const click = (event: Event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-queue-action]');
    if (button && !button.disabled) options.onAction?.(button.dataset.queueAction as 'edit' | 'delete' | 'steer', button.dataset.queuedMessage!);
  };
  element.addEventListener('click', click);
  return { element, update(state) {
    if (destroyed) return;
    element.hidden = !state.items.length;
    const keep = new Set(state.items.map(item => item.id));
    for (const [key, row] of rows) if (!keep.has(key)) { row.remove(); rows.delete(key); }
    let cursor: Element | null = heading.nextElementSibling;
    for (const item of state.items) {
      let row = rows.get(item.id);
      if (!row) {
        row = document.createElement('div'); row.className = 'pui-queued-message';
        row.innerHTML = `<span class="pui-queue-badge">Instruction</span><div class="pui-queued-message-content"><span class="pui-queued-message-text"></span><small class="pui-queue-image-count"></small></div><div class="pui-queued-message-actions"><button type="button" class="pui-quiet-icon pui-queue-steer" data-queue-action="steer" title="Steer the current task at its next turn">${icon('steer')}<span>Steer</span></button><button type="button" class="pui-quiet-icon" data-queue-action="edit" aria-label="Edit pending message" title="Edit message">${icon('edit')}</button><button type="button" class="pui-quiet-icon" data-queue-action="delete" aria-label="Delete pending message" title="Delete message">${icon('trash')}</button></div>`;
        rows.set(item.id, row);
      }
      row.querySelector<HTMLElement>('.pui-queue-badge')!.hidden = item.mode !== 'steer';
      const text = row.querySelector<HTMLElement>('.pui-queued-message-text')!;
      const value = item.text || 'Image attachment'; if (text.textContent !== value) text.textContent = value; text.title = item.text;
      const count = row.querySelector<HTMLElement>('.pui-queue-image-count')!;
      const label = item.imageCount ? `${item.imageCount} image${item.imageCount === 1 ? '' : 's'}` : '';
      if (count.textContent !== label) count.textContent = label; count.hidden = !item.imageCount;
      for (const button of row.querySelectorAll<HTMLButtonElement>('[data-queue-action]')) {
        button.dataset.queuedMessage = item.id; parts.action(button).update({ disabled: state.busy });
        if (button.dataset.queueAction === 'steer') button.hidden = item.mode !== 'follow-up' || !state.running;
      }
      if (row !== cursor) element.insertBefore(row, cursor);
      cursor = row.nextElementSibling;
    }
    parts.update();
  }, destroy() { if (destroyed) return; destroyed = true; parts.destroy(); element.removeEventListener('click', click); rows.clear(); element.replaceChildren(); } };
}

export interface AttachmentItem { id: string; url: string; name: string; }

export function createDropFeedback(options: { container: HTMLElement }): UIBlock<{ active: boolean; disabled?: boolean }> {
  const element = options.container;
  let destroyed = false;
  return { element, update(state) {
    if (destroyed) return;
    if (state.active && !state.disabled) element.classList.add('pui-drag-images');
    else element.classList.remove('pui-drag-images');
  }, destroy() { destroyed = true; element.classList.remove('pui-drag-images'); } };
}
export interface AttachmentsState { items: readonly AttachmentItem[]; disabled?: boolean; }
export function createAttachments(options: { container?: HTMLElement; onRemove?: (id: string) => void; onOpen?: (image: HTMLImageElement) => void } = {}): UIBlock<AttachmentsState> {
  const element = options.container ?? document.createElement('div'); element.classList.add('pui-draft-images'); element.setAttribute('aria-label', 'Image attachments');
  const parts = adoptProductParts(element);
  let destroyed = false;
  const figures = new Map([...element.querySelectorAll<HTMLElement>('[data-attachment-id]')].map(node => [node.dataset.attachmentId!, node]));
  const click = (event: Event) => {
    const target = event.target as Element;
    const button = target.closest<HTMLButtonElement>('[data-remove-image]');
    if (button && !button.disabled && options.onRemove) {event.stopPropagation(); options.onRemove(button.dataset.removeImage!);}
    if (target instanceof HTMLImageElement && options.onOpen) {event.stopPropagation(); options.onOpen(target);}
  };
  const keydown = (event: KeyboardEvent) => {
    if (!options.onOpen || !(event.target instanceof HTMLImageElement) || event.isComposing || !['Enter',' '].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    if (!event.repeat) options.onOpen(event.target);
  };
  element.addEventListener('click', click);
  element.addEventListener('keydown', keydown);
  return { element, update(state) {
    if (destroyed) return;
    element.hidden = !state.items.length;
    reconcileKeyed(element,figures,state.items,{key:item=>item.id,element:figure=>figure,
      create(item) {const figure = document.createElement('figure'); figure.className = 'pui-draft-image'; figure.dataset.attachmentId = item.id;
        figure.innerHTML = `<img role="button" tabindex="0" title="Click to enlarge" /><figcaption></figcaption><button type="button" class="pui-remove-image">${icon('close')}</button>`;return figure;},
      update(figure,item) {
      const image = figure.querySelector('img')!; if (image.getAttribute('src') !== item.url) image.src = item.url; image.alt = item.name;
      setText(figure.querySelector('figcaption')!,item.name);
      const button = figure.querySelector('button')!; button.dataset.removeImage = item.id; button.setAttribute('aria-label', 'Remove ' + item.name); parts.action(button).update({ disabled: !!state.disabled });
      },destroy() {},
    });
    parts.update();
  }, destroy() { if (destroyed) return; destroyed = true; parts.destroy(); element.removeEventListener('click', click); element.removeEventListener('keydown', keydown); figures.clear(); element.replaceChildren(); } };
}
