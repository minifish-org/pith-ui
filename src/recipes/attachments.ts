/** Internal assembly of the existing draft-image strip. Keys remain application data. */
import {
  createButtonPart,createCaptionPart,createImagePart,createThumbnailPart,createThumbnailStripPart,
  type ButtonPart,type CaptionPart,type ImageData,type ImagePart,type ThumbnailPart,type ThumbnailStripPart,
} from '../parts/index.js';

export interface AttachmentItem {id: string;url: string;name: string}
export interface AttachmentsState {items: readonly AttachmentItem[];disabled?: boolean}
export interface AttachmentsCallbacks {onRemove?(id: string): void;onOpen?(image: ImageData): void}
export interface AttachmentsComposition {readonly part: ThumbnailStripPart;update(state: Readonly<AttachmentsState>): void;destroy(): void}
interface Entry {figure: ThumbnailPart;image: ImagePart;caption: CaptionPart;remove: ButtonPart}

/** The strip supplies only layout. The local recipe owns keys, projection and intents. */
export function composeAttachments(initial: Readonly<AttachmentsState>,callbacks: AttachmentsCallbacks = {}): AttachmentsComposition {
  let alive = true;const entries = new Map<string,Entry>();
  const part = createThumbnailStripPart({label: 'Image attachments',hidden: true,children: [],onDispose() {alive = false;entries.clear();}});
  const update = (state: Readonly<AttachmentsState>) => {
    if (!alive) return;const children: ThumbnailPart[] = [],keep = new Set<string>();
    for (const item of state.items) {
      let entry = entries.get(item.id);
      if (!entry) {
        const id = item.id,image = createImagePart({purpose: 'attachment',src: item.url,alt: item.name,status: 'ready',onActivate(value) {if (alive) callbacks.onOpen?.(value);}});
        const caption = createCaptionPart({text: item.name}),remove = createButtonPart({variant: 'overlay-close',icon: 'close',label: 'Remove '+item.name,disabled: !!state.disabled,onAction() {if (alive) callbacks.onRemove?.(id);}});
        entry = {image,caption,remove,figure: createThumbnailPart({children: [image,caption,remove]})};entries.set(id,entry);
      } else {
        entry.image.update({src: item.url,alt: item.name,status: 'ready'});entry.caption.update({text: item.name});
        entry.remove.update({variant: 'overlay-close',icon: 'close',label: 'Remove '+item.name,disabled: !!state.disabled});
      }
      keep.add(item.id);children.push(entry.figure);
    }
    part.replace(children);for (const key of entries.keys()) if (!keep.has(key)) entries.delete(key);
    part.update({label: 'Image attachments',hidden: !state.items.length});
  };
  update(initial);return {part,update,destroy() {if (alive) part.destroy();}};
}
