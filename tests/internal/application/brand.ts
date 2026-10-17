import type {ApplicationBrand} from './index.js';

/** Finite brand resources share one factory in the wordmark and welcome view. */
export function createApplicationBrandMark(mark: ApplicationBrand['mark']): HTMLElement | undefined {
  if (!mark) return;
  if (mark.symbol === 'pith') {
    const symbol = document.createElement('span'); symbol.className = 'pui-logo-mark';
    if (mark.alt) {symbol.setAttribute('role', 'img'); symbol.setAttribute('aria-label', mark.alt);}
    else symbol.setAttribute('aria-hidden', 'true');
    for (let index = 0; index < 4; index++) symbol.append(document.createElement('i'));
    return symbol;
  }
  const image = document.createElement('img'); image.className = 'pui-app-brand-image';
  image.src = mark.src; image.alt = mark.alt;
  return image;
}
