import {assertOptions, createOwnedPart, isPartAlive, type Part} from './ownership.js';

export type ImageStatus = 'loading' | 'ready' | 'unavailable';
export interface ImageData {readonly src: string; readonly alt: string}
export interface ImagePartState {src?: string; alt?: string; status?: ImageStatus}
export interface ImagePartOptions extends ImagePartState {
  purpose: 'content' | 'attachment' | 'preview';
  onActivate?(image: ImageData): void;
  onLoad?(image: ImageData): void;
  onError?(image: ImageData): void;
}
export interface ImagePart extends Part {update(state: Readonly<ImagePartState>): void; focus(): void}

function validateSource(src: unknown): asserts src is string | undefined {
  if (src === undefined) return;
  if (typeof src !== 'string') throw new TypeError('Image source must be text.');
  if (!src) return;
  const url = new URL(src,document.baseURI);
  if (!['http:','https:','blob:','data:'].includes(url.protocol) || url.protocol === 'data:' && !/^data:image\//i.test(src)) throw new TypeError('Unsupported image source.');
}
function validateState(state: Readonly<ImagePartState>): void {
  validateSource(state.src);
  if (state.alt !== undefined && typeof state.alt !== 'string') throw new TypeError('Image description must be text.');
  if (state.status !== undefined && !['loading','ready','unavailable'].includes(state.status)) throw new TypeError('Unsupported image status.');
}

/** A single native image. Its semantic purpose selects the established rules. */
export function createImagePart(options: ImagePartOptions): ImagePart {
  assertOptions(options,['purpose','src','alt','status','onActivate','onLoad','onError'],'image');validateState(options);
  if (!['content','attachment','preview'].includes(options.purpose)) throw new TypeError('Unsupported image purpose.');
  for (const key of ['onActivate','onLoad','onError'] as const) if (options[key] !== undefined && typeof options[key] !== 'function') throw new TypeError(`Image ${key} must be a callback.`);
  const node = document.createElement('img');
  node.className = options.purpose === 'content' ? 'pui-history-image' : options.purpose === 'preview' ? 'pui-file-preview-image' : '';
  node.setAttribute('role','button');node.tabIndex = 0;node.title = 'Click to enlarge';
  if (options.purpose === 'content') node.loading = 'lazy';
  let src = '',alt = '',status: ImageStatus = 'loading',revision = 0,part: ImagePart;
  const data = (): ImageData => Object.freeze({src: node.src,alt: node.alt});
  const activate = (event: Event) => {
    if (!isPartAlive(part) || status !== 'ready' || !src) return;
    if (event instanceof KeyboardEvent && (event.isComposing || !['Enter',' '].includes(event.key))) return;
    event.preventDefault();event.stopPropagation();
    if (event instanceof KeyboardEvent && options.purpose === 'attachment' && event.repeat) return;
    options.onActivate?.(data());
  };
  node.addEventListener('click',activate);node.addEventListener('keydown',activate);
  const update = (state: Readonly<ImagePartState>) => {
    assertOptions(state,['src','alt','status'],'image state');validateState(state);if (!isPartAlive(part)) return;
    if (state.alt !== undefined) alt = state.alt;
    if (state.status !== undefined) status = state.status;
    node.classList.toggle('pui-image-unavailable',options.purpose === 'content' && status === 'unavailable');
    node.alt = status === 'unavailable' && options.purpose === 'content' ? 'Image unavailable' : alt;
    if (state.src !== undefined && state.src !== src) {
      src = state.src;const current = ++revision;
      if (src) {
        node.src = src;
        // Each decode belongs to its assigned source. Replaced or retired
        // requests cannot report a result for a later image identity.
        void node.decode().then(() => {if (isPartAlive(part) && current === revision) options.onLoad?.(data());},() => {if (isPartAlive(part) && current === revision) options.onError?.(data());});
      } else node.removeAttribute('src');
    }
    if (status === 'unavailable') revision++;
  };
  part = createOwnedPart<Omit<ImagePart,keyof Part>>(node,{update,focus() {if (isPartAlive(part)) node.focus({preventScroll: true});}},{dispose() {revision++;node.removeEventListener('click',activate);node.removeEventListener('keydown',activate);node.removeAttribute('src');}});
  update({src: options.src,alt: options.alt,status: options.status});return part;
}

export interface ZoomImageState {src?: string; alt?: string}
export interface ZoomImageStatus {readonly status: ImageStatus; readonly label: string}
export interface ZoomImageOptions extends ZoomImageState {onStatus?(status: ZoomImageStatus): void}
export interface ZoomImagePart extends Part {
  update(state: Readonly<ZoomImageState>): void;
  fit(): void;
  original(): void;
  zoomIn(): void;
  zoomOut(): void;
  clear(): void;
}

/** One fixed image viewport. The library owns all physical sizing and zoom steps. */
export function createZoomImagePart(options: ZoomImageOptions): ZoomImagePart {
  assertOptions(options,['src','alt','onStatus'],'zoom image');validateState(options);
  if (options.onStatus !== undefined && typeof options.onStatus !== 'function') throw new TypeError('Image status must be a callback.');
  const node = document.createElement('div');node.className = 'pui-image-viewer-viewport';
  const image = document.createElement('img');image.alt = '';node.append(image);
  let src = '',alt = '',revision = 0,fitted = true,scale = 1,part: ZoomImagePart;
  const announce = (status: ImageStatus,label: string) => {if (isPartAlive(part)) options.onStatus?.(Object.freeze({status,label}));};
  const render = () => {
    if (!isPartAlive(part) || !src || !image.naturalWidth || !image.naturalHeight || !node.isConnected || !node.clientWidth || !node.clientHeight) return;
    if (fitted) scale = Math.min(1,node.clientWidth / image.naturalWidth,node.clientHeight / image.naturalHeight);
    image.style.width = `${image.naturalWidth * scale}px`;image.style.height = `${image.naturalHeight * scale}px`;
    announce('ready',`${Math.round(scale * 100)}% · ${image.naturalWidth} × ${image.naturalHeight}`);
  };
  const resize = (factor: number) => {if (!isPartAlive(part)) return;fitted = false;const next = scale * factor;if (Number.isFinite(next) && next > 0) scale = next;render();};
  const clear = () => {if (!isPartAlive(part)) return;src = '';revision++;fitted = true;scale = 1;image.removeAttribute('src');image.removeAttribute('style');node.scrollTop = node.scrollLeft = 0;};
  const update = (state: Readonly<ZoomImageState>) => {
    assertOptions(state,['src','alt'],'zoom image state');validateState(state);if (!isPartAlive(part)) return;
    if (state.alt !== undefined) {alt = state.alt;image.alt = alt;}
    if (state.src !== undefined && state.src !== src) {
      if (!state.src) {clear();return;}
      src = state.src;const current = ++revision;fitted = true;scale = 1;node.scrollTop = node.scrollLeft = 0;announce('loading','Loading…');image.src = src;
      void image.decode().then(() => {if (isPartAlive(part) && current === revision) render();},() => {if (isPartAlive(part) && current === revision) announce('unavailable','Image unavailable');});
    }
  };
  const keyboard = (event: KeyboardEvent) => {
    if (!isPartAlive(part) || event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
    const dialog = node.closest('dialog'),target = event.target instanceof Element ? event.target : null;
    if (!dialog?.open || target?.closest('dialog') !== dialog || target.closest('input,textarea,[contenteditable]:not([contenteditable="false"])')) return;
    if (event.key === '+' || event.key === '=') {event.preventDefault();resize(1.25);}
    if (event.key === '-') {event.preventDefault();resize(1 / 1.25);}
  };
  node.ownerDocument.addEventListener('keydown',keyboard);
  const observer = new ResizeObserver(render);observer.observe(node);
  part = createOwnedPart<Omit<ZoomImagePart,keyof Part>>(node,{update,fit() {if (isPartAlive(part)) {fitted = true;render();}},original() {if (isPartAlive(part)) {fitted = false;scale = 1;render();}},zoomIn() {resize(1.25);},zoomOut() {resize(1 / 1.25);},clear},
    {dispose() {revision++;observer.disconnect();node.ownerDocument.removeEventListener('keydown',keyboard);image.removeAttribute('src');image.removeAttribute('style');}});
  update({src: options.src,alt: options.alt});return part;
}
