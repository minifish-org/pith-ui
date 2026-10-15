import { escape, icon } from '../dom.js';

export interface ImageViewerOptions { dialog?: HTMLDialogElement; headingId?: string }
export interface ImageViewerInput { src: string; alt?: string; returnFocus?: HTMLElement }
let sequence = 0;

/** A modal above either a generated-file preview or a conversation attachment. */
export function createImageViewer(options: ImageViewerOptions = {}) {
  const dialog = options.dialog || document.createElement('dialog');
  const headingId = options.headingId || `pui-image-title-${++sequence}`;
  dialog.classList.add('pui-modal', 'pui-image-viewer');
  dialog.setAttribute('aria-labelledby', headingId);
  dialog.innerHTML = `<div class="pui-modal-heading"><h2 id="${escape(headingId)}">Image</h2><button type="button" class="pui-quiet-icon" data-image-close aria-label="Close image">${icon('close')}</button></div>
    <div class="pui-image-viewer-viewport"><img alt="" /></div>
    <div class="pui-image-viewer-toolbar"><span data-image-scale role="status"></span><div><button type="button" class="pui-secondary-button" data-image-out aria-label="Zoom out">−</button><button type="button" class="pui-secondary-button" data-image-in aria-label="Zoom in">+</button><button type="button" class="pui-secondary-button" data-image-fit>Fit</button><button type="button" class="pui-secondary-button" data-image-original>Original size</button></div></div>`;
  const image = dialog.querySelector<HTMLImageElement>('img')!;
  const viewport = dialog.querySelector<HTMLElement>('.pui-image-viewer-viewport')!;
  const title = dialog.querySelector<HTMLElement>('h2')!;
  const status = dialog.querySelector<HTMLElement>('[data-image-scale]')!;
  const listeners = new AbortController();
  const signal = listeners.signal;
  let destroyed = false;
  let scale = 1, fitted = true, source: HTMLElement | null = null;
  function update(): void {
    if (destroyed || !image.naturalWidth) return;
    if (fitted) scale = Math.min(1, viewport.clientWidth / image.naturalWidth, viewport.clientHeight / image.naturalHeight);
    image.style.width = `${image.naturalWidth * scale}px`;
    image.style.height = `${image.naturalHeight * scale}px`;
    status.textContent = `${Math.round(scale * 100)}% · ${image.naturalWidth} × ${image.naturalHeight}`;
  }
  function resize(factor: number): void { fitted = false; const next = scale * factor; if (Number.isFinite(next) && next > 0) scale = next; update(); }
  dialog.querySelector('[data-image-fit]')!.addEventListener('click', () => { fitted = true; update(); }, { signal });
  dialog.querySelector('[data-image-original]')!.addEventListener('click', () => { fitted = false; scale = 1; update(); }, { signal });
  dialog.querySelector('[data-image-in]')!.addEventListener('click', () => resize(1.25), { signal });
  dialog.querySelector('[data-image-out]')!.addEventListener('click', () => resize(1 / 1.25), { signal });
  dialog.querySelector('[data-image-close]')!.addEventListener('click', () => dialog.close(), { signal });
  image.addEventListener('load', update, { signal });
  const observer = new ResizeObserver(() => { if (dialog.open && fitted) update(); });
  observer.observe(viewport);
  dialog.addEventListener('close', () => {
    image.removeAttribute('src');
    image.removeAttribute('style');
    source?.focus({ preventScroll: true });
    source = null;
  }, { signal });
  document.addEventListener('keydown', (event) => {
    if (!dialog.open || event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === '+' || event.key === '=') { event.preventDefault(); resize(1.25); }
    if (event.key === '-') { event.preventDefault(); resize(1 / 1.25); }
  }, { signal });
  function close(): void { if (dialog.open) dialog.close(); }
  return {
    element: dialog,
    open(target: HTMLImageElement | ImageViewerInput): void {
      if (destroyed) return;
      const input = target instanceof HTMLImageElement
        ? target.getAttribute('src') && !target.classList.contains('pui-image-unavailable') ? { src: target.src, alt: target.alt, returnFocus: target } : null
        : target;
      if (!input?.src) return;
      source = input.returnFocus || null;
      title.textContent = input.alt || 'Image';
      image.alt = input.alt || '';
      scale = 1;
      fitted = true;
      status.textContent = 'Loading…';
      image.src = input.src;
      if (!dialog.open) dialog.showModal();
      viewport.scrollTop = viewport.scrollLeft = 0;
      update();
    },
    close,
    destroy(): void {
      if (destroyed) return;
      close();
      image.removeAttribute('src');
      image.removeAttribute('style');
      source?.focus({ preventScroll: true });
      source = null;
      destroyed = true;
      observer.disconnect();
      listeners.abort();
      dialog.replaceChildren();
    },
  };
}

export function installImageViewer(dialog: HTMLDialogElement) {
  return createImageViewer({ dialog, headingId: dialog.getAttribute('aria-labelledby') || undefined });
}
