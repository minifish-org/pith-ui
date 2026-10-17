import {assertOptions,createOwnedPart,isPartAlive,type Part} from './ownership.js';

export type DownloadResult = {ok: true}|{ok: false;error: string};
export interface DownloadPart extends Part {download(file: {blob: Blob;name: string}): Promise<DownloadResult>}
/** Native file delivery with library-owned URL retirement. No style or DOM port. */
export function createDownloadPart(options: Record<string,never> = {}): DownloadPart {
  assertOptions(options,[],'download');
  const node = document.createElement('a');node.hidden = true;
  const urls = new Map<string,ReturnType<typeof setTimeout>>();
  const part = createOwnedPart<Omit<DownloadPart,keyof Part>>(node,{async download(file) {
    assertOptions(file,['blob','name'],'download file');
    if (!(file.blob instanceof Blob) || typeof file.name !== 'string') throw new TypeError('Downloads require a Blob and literal filename.');
    if (!isPartAlive(part)) return {ok: false,error: 'Application has been destroyed.'};
    const url = URL.createObjectURL(file.blob);
    try {node.href = url;node.download = file.name;node.click();return {ok: true};}
    catch (error) {return {ok: false,error: error instanceof Error ? error.message : String(error)};}
    finally {
      node.removeAttribute('href');node.removeAttribute('download');
      if (!isPartAlive(part)) URL.revokeObjectURL(url);
      else urls.set(url,setTimeout(() => {URL.revokeObjectURL(url);urls.delete(url);},30_000));
    }
  }},{dispose() {for (const [url,timer] of urls) {clearTimeout(timer);URL.revokeObjectURL(url);}urls.clear();}});
  return part;
}
