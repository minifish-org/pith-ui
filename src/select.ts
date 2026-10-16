import { Lifetime } from './core.js';
import { iconElement, setText, uniqueId } from './dom.js';
import { installAnchoredSurface } from './surface.js';

interface SelectController {
  readonly trigger: HTMLButtonElement;
  refresh(): void;
  focus(): void;
  destroy(): void;
}
type Entry = { controller: SelectController; owners: number };
const entries = new WeakMap<HTMLSelectElement, Entry>();

/** A native select remains the form/value contract. Only its single-choice
 * presentation is enhanced; multiple and multi-row lists retain native behavior.
 */
export function adoptSelect(control: HTMLSelectElement): SelectController | undefined {
  if (control.multiple || control.size > 1 || !control.parentNode) return;
  let entry = entries.get(control);
  if (!entry) { entry = { controller: installSelect(control), owners: 0 }; entries.set(control, entry); }
  entry.owners++;
  const current = entry; let released = false;
  return { trigger: current.controller.trigger,
    refresh() { if (!released) current.controller.refresh(); },
    focus() { if (!released) current.controller.focus(); },
    destroy() { if (released) return; released = true; if (--current.owners === 0) { current.controller.destroy(); entries.delete(control); } },
  };
}

/** Used after an explicit option reconciliation, without a second controller. */
export function refreshSelect(control: HTMLSelectElement): void { entries.get(control)?.controller.refresh(); }

function installSelect(control: HTMLSelectElement): SelectController {
  const doc = control.ownerDocument;
  const life = new Lifetime();
  const wrapper = doc.createElement('span'); wrapper.className = 'pui-select';
  const trigger = doc.createElement('button'); trigger.type = 'button'; trigger.id = uniqueId('pui-select-trigger');
  trigger.tabIndex = 0;
  trigger.setAttribute('role', 'combobox'); trigger.setAttribute('aria-haspopup', 'listbox');
  const caption = doc.createElement('span'); caption.className = 'pui-select-value';
  const arrow = iconElement('down'); arrow.classList.add('pui-select-arrow'); trigger.append(caption, arrow);
  const panel = doc.createElement('div'); panel.className = 'pui-popover-panel pui-select-popup'; panel.id = uniqueId('pui-select-list');
  panel.setAttribute('role', 'listbox'); trigger.setAttribute('aria-controls', panel.id);
  const originalHidden = control.getAttribute('aria-hidden'), originalTabIndex = control.getAttribute('tabindex');
  const originalTitle = control.title;
  control.before(wrapper); wrapper.append(control, trigger, panel);
  control.classList.add('pui-select-backing'); control.setAttribute('aria-hidden', 'true'); control.tabIndex = -1;
  let disposed = false, active: HTMLOptionElement | undefined, search = '', searchTime = 0;
  let invalid = false;
  const items = new Map<HTMLOptionElement, HTMLElement>();
  const hidden = (option: HTMLOptionElement) => option.hidden || (option.parentElement instanceof HTMLOptGroupElement && option.parentElement.hidden);
  const enabled = () => [...control.options].filter(option => !hidden(option) && !option.disabled && !(option.parentElement instanceof HTMLOptGroupElement && option.parentElement.disabled));
  const surface = installAnchoredSurface({ trigger, panel, canOpen: () => !control.matches(':disabled') && !control.hidden,
    onToggle(open) {
      if (!open) { trigger.removeAttribute('aria-activedescendant'); search = ''; return; }
      active = enabled().find(option => option.selected) ?? enabled()[0];
      highlight();
    },
  });
  const attribute = (node: HTMLElement, name: string, value: string | null) => {
    if (value === null) { if (node.hasAttribute(name)) node.removeAttribute(name); }
    else if (node.getAttribute(name) !== value) node.setAttribute(name, value);
  };
  function labelText(label: HTMLLabelElement): string {
    const walker = doc.createTreeWalker(label, NodeFilter.SHOW_TEXT);
    const text: string[] = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.parentElement?.closest('.pui-select, select, button, [aria-hidden="true"]')) continue;
      if (node.textContent?.trim()) text.push(node.textContent.trim());
    }
    return text.join(' ');
  }
  function highlight(): void {
    if (!surface.isOpen()) return;
    for (const [option, node] of items) node.classList.toggle('pui-active', option === active);
    const node = active && items.get(active);
    if (node) { attribute(trigger, 'aria-activedescendant', node.id); node.scrollIntoView({ block: 'nearest' }); }
    else trigger.removeAttribute('aria-activedescendant');
  }
  function refresh(): void {
    if (disposed) return;
    if (control.validity.valid) invalid = false;
    const classes = [...control.classList].filter(name => name !== 'pui-select-backing');
    const nextClasses = [...classes, 'pui-select-trigger'].join(' ');
    if (trigger.className !== nextClasses) trigger.className = nextClasses;
    trigger.disabled = control.matches(':disabled'); wrapper.hidden = control.hidden;
    const labelledBy = control.getAttribute('aria-labelledby');
    const labels = new Set(control.labels ?? []);
    const implicit = control.closest('label'); if (implicit) labels.add(implicit);
    if (!labels.size && control.id) {
      const root = control.getRootNode();
      if (root instanceof Element || root instanceof DocumentFragment || root instanceof Document) {
        for (const label of root.querySelectorAll('label')) if (label.htmlFor === control.id) labels.add(label);
      }
    }
    const name = control.getAttribute('aria-label') || [...labels].map(labelText).filter(Boolean).join(' ') || control.name || originalTitle || 'Choose an option';
    attribute(trigger, 'aria-labelledby', labelledBy);
    attribute(trigger, 'aria-label', labelledBy ? null : name);
    attribute(panel, 'aria-labelledby', labelledBy);
    attribute(panel, 'aria-label', labelledBy ? null : name);
    attribute(trigger, 'aria-describedby', control.getAttribute('aria-describedby'));
    attribute(trigger, 'aria-invalid', invalid || control.getAttribute('aria-invalid') === 'true' ? 'true' : control.getAttribute('aria-invalid'));
    attribute(trigger, 'aria-required', String(control.required));
    attribute(trigger, 'title', control.title || null);
    setText(caption, control.selectedOptions[0]?.label ?? '');
    const keep = new Set([...control.options]);
    const available = new Set(enabled());
    for (const [option, node] of items) if (!keep.has(option)) { node.remove(); items.delete(option); }
    let cursor = panel.firstElementChild;
    for (const option of control.options) {
      let node = items.get(option);
      if (!node) { node = doc.createElement('div'); node.className = 'pui-select-option'; node.id = uniqueId('pui-select-option'); node.setAttribute('role', 'option'); items.set(option, node); }
      setText(node, option.label);
      node.hidden = hidden(option);
      attribute(node, 'aria-label', option.label);
      attribute(node, 'aria-selected', String(option.selected));
      attribute(node, 'aria-disabled', String(!available.has(option)));
      if (node !== cursor) panel.insertBefore(node, cursor);
      cursor = node.nextElementSibling;
    }
    if (trigger.disabled || control.hidden || (surface.isOpen() && !trigger.getClientRects().length)) surface.close();
    if (active && !enabled().includes(active)) active = enabled().find(option => option.selected) ?? enabled()[0];
    highlight();
  }
  function commit(option: HTMLOptionElement | undefined): void {
    if (!option || !enabled().includes(option) || control.matches(':disabled')) return;
    const changed = control.value !== option.value || control.selectedIndex !== option.index;
    control.selectedIndex = option.index; invalid = false;
    surface.close(true); refresh();
    if (changed) {
      control.dispatchEvent(new Event('input', { bubbles: true }));
      control.dispatchEvent(new Event('change', { bubbles: true }));
      refresh();
    }
  }
  life.listen(trigger, 'click', (event => { event.preventDefault(); trigger.focus({ preventScroll: true }); refresh(); if (surface.isOpen()) surface.close(); else surface.open(); }) as EventListener);
  life.listen(trigger, 'keydown', (event => {
    const key = event as KeyboardEvent;
    if (key.isComposing || key.ctrlKey || key.metaKey || trigger.disabled) return;
    if (key.key === 'Tab') { surface.close(); return; }
    if (key.key === 'Enter' || key.key === ' ') {
      key.preventDefault(); if (surface.isOpen()) commit(active); else { refresh(); surface.open(); } return;
    }
    const choices = enabled();
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key.key)) {
      key.preventDefault(); refresh();
      const wasOpen = surface.isOpen(); if (!wasOpen) surface.open();
      if (key.key === 'Home') active = choices[0];
      else if (key.key === 'End') active = choices.at(-1);
      else if (wasOpen) { const index = active ? choices.indexOf(active) : -1; active = choices[(index + (key.key === 'ArrowDown' ? 1 : -1) + choices.length) % choices.length]; }
      highlight(); return;
    }
    if (key.key.length === 1 && !key.altKey) {
      key.preventDefault(); refresh(); if (!surface.isOpen()) surface.open();
      const now = Date.now(); search = now - searchTime > 700 ? key.key : search + key.key; searchTime = now;
      const repeated = [...search].every(character => character === search[0]);
      const query = (repeated ? search[0] : search).toLocaleLowerCase();
      const start = active ? choices.indexOf(active) + 1 : 0;
      const ordered = [...choices.slice(start), ...choices.slice(0, start)];
      active = ordered.find(option => option.label.toLocaleLowerCase().startsWith(query)) ?? active; highlight();
    }
  }) as EventListener);
  // Keep focus on the combobox while clicking an option; the listbox itself is
  // represented by aria-activedescendant rather than a second tab stop.
  life.listen(panel, 'pointerdown', event => event.preventDefault());
  life.listen(panel, 'click', (event => {
    event.preventDefault();
    const node = (event.target as Element).closest<HTMLElement>('[role="option"]');
    commit([...items].find(([, item]) => item === node)?.[0]);
  }) as EventListener);
  life.listen(control, 'input', refresh); life.listen(control, 'change', () => { invalid = false; refresh(); });
  life.listen(control, 'click', event => { event.preventDefault(); trigger.focus(); refresh(); surface.open(); });
  // Native validation chooses the correct field to focus. checkValidity only
  // dispatches invalid; reportValidity/submission also focuses the first field.
  life.listen(control, 'invalid', () => { invalid = true; refresh(); });
  life.listen(control, 'focus', () => { if (invalid) trigger.focus(); });
  life.listen(doc, 'reset', event => { if (event.target === control.form) queueMicrotask(() => { if (!event.defaultPrevented) { invalid = false; refresh(); } }); }, { capture: true });
  const observer = new MutationObserver(refresh);
  observer.observe(control, { childList: true, subtree: true, characterData: true, attributes: true,
    attributeFilter: ['disabled', 'hidden', 'required', 'class', 'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-invalid', 'title', 'label', 'value', 'selected'] });
  life.add(() => observer.disconnect());
  refresh();
  return { trigger, refresh, focus() { if (!disposed) trigger.focus(); }, destroy() {
    if (disposed) return;
    disposed = true; surface.destroy(); life.destroy();
    control.classList.remove('pui-select-backing');
    if (originalHidden === null) control.removeAttribute('aria-hidden'); else control.setAttribute('aria-hidden', originalHidden);
    if (originalTabIndex === null) control.removeAttribute('tabindex'); else control.setAttribute('tabindex', originalTabIndex);
    if (wrapper.parentNode) wrapper.replaceWith(control); else control.remove();
    items.clear();
  } };
}
