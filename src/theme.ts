export type Appearance = 'light' | 'dark' | 'system';
/** Scope tokens and styles to an explicit application or preview root. */
export function setAppearance(root: HTMLElement, appearance: Appearance = 'system'): void {
  root.classList.add('pui');
  root.dataset.appearance = appearance;
}
