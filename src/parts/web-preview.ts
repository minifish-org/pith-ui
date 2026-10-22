import {assertOptions,createOwnedPart,isPartAlive,type Part} from './ownership.js';

export interface WebPreviewPartState {url: string;disabled?: boolean;revision?: number}
export interface WebPreviewPart extends Part {update(state: Readonly<WebPreviewPartState>): void}

/** Sandboxed, separate-origin web content. The host admits addresses and owns
 * proxy/authentication policy; this part never reads the frame or its messages. */
export function createWebPreviewPart(initial: WebPreviewPartState): WebPreviewPart {
  const node = document.createElement('div');node.className = 'pui-web-preview-viewport';
  let frame: HTMLIFrameElement|undefined,url = '',revision: number|undefined;
  function update(state: Readonly<WebPreviewPartState>): void {
    assertOptions(state,['url','disabled','revision'],'web preview');
    if (typeof state.url !== 'string' || state.disabled !== undefined && typeof state.disabled !== 'boolean' || state.revision !== undefined && !Number.isSafeInteger(state.revision)) throw new TypeError('Invalid web preview state.');
    if (state.url) {
      const target = new URL(state.url);
      if (!['http:','https:'].includes(target.protocol) || target.username || target.password || target.origin === location.origin) throw new TypeError('Web previews require a separate HTTP or HTTPS origin.');
    }
    if (!isPartAlive(part)) return;
    const next = state.disabled ? '' : state.url;
    if (next === url && state.revision === revision) return;
    frame?.remove();frame = undefined;url = next;revision = state.revision;
    if (!next) return;
    frame = document.createElement('iframe');frame.title = 'Web preview';
    frame.sandbox.add('allow-scripts','allow-forms','allow-same-origin');
    frame.referrerPolicy = 'no-referrer';
    frame.allow = "camera 'none'; microphone 'none'; geolocation 'none'; clipboard-read 'none'; clipboard-write 'none'; usb 'none'; serial 'none'";
    frame.src = next;node.append(frame);
  }
  const part = createOwnedPart(node,{update},{dispose() {frame?.remove();frame=undefined;url='';}});
  try {update(initial);} catch (error) {part.destroy();throw error;}
  return part;
}
