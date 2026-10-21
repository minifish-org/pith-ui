import {createButtonPart,createMenuPart,createStackPart,type ButtonPart,type Part} from '../parts/index.js';
import {nodeOf,onPartDestroy} from '../parts/ownership.js';
import {uniqueId} from '../dom.js';

export type WorkspaceToolView = 'files'|'terminal';
export interface WorkspaceToolTab {id: string;kind: WorkspaceToolView;label: string;detail?: string;pending?: boolean}
export interface WorkspaceToolsState {
  tabs: readonly WorkspaceToolTab[];activeId: string;location: 'Local'|'Server';detail: string;disabled?: boolean;
}
export interface WorkspaceToolsCallbacks {
  onSelect?(id: string): void;onClose?(id: string): void;onNew?(kind: WorkspaceToolView): void;onDismiss?(): void;
}

/** Retained opaque panels with a compact, keyboard-accessible tab strip.
 * The application owns tab identity, persistence and process-close policy. */
export function composeWorkspaceTools(initial: Readonly<WorkspaceToolsState>,callbacks: WorkspaceToolsCallbacks = {}) {
  let state = initial,alive = true,restoreFocus = false;
  const panels = new Map<string,ReturnType<typeof createStackPart>>();
  const selectors = new Map<string,{part: ReturnType<typeof createStackPart>;select: ButtonPart;close: ButtonPart}>();
  const add = createButtonPart({label: 'New tool tab',title: 'New tool tab',icon: 'plus',variant: 'quiet-icon',onAction() {if (!state.disabled) {if (menu.isOpen()) menu.close();else menu.open(add);}}});
  const strip = createStackPart({children: [add]}),body = createStackPart({children: []});
  nodeOf(strip).className = 'pui-tool-tabs';nodeOf(strip).setAttribute('role','tablist');nodeOf(strip).setAttribute('aria-label','Workspace tools');
  nodeOf(body).className = 'pui-tool-panels';
  const dismiss = createButtonPart({label: 'Close tools',title: 'Close tools',icon: 'sidebar-right',variant: 'quiet-icon',onAction: callbacks.onDismiss});nodeOf(dismiss).classList.add('pui-tool-dismiss');
  const heading = createStackPart({children: [strip,dismiss]});nodeOf(heading).className = 'pui-tool-tabs-heading';
  const menu = createMenuPart({label: 'New workspace tool',scrollBehavior: 'anchor',items: (['terminal','files'] as const).map(kind => ({key: kind,label: kind === 'terminal' ? 'New terminal' : 'New files',onAction() {menu.close();if (alive && !state.disabled) callbacks.onNew?.(kind);}}))});
  const part = createStackPart({children: [heading,body,menu]});nodeOf(part).className = 'pui-workspace-tools';

  function select(id: string,focus = false): void {
    if (!alive || state.disabled || !state.tabs.some(tab => tab.id === id)) return;
    update({...state,activeId: id});if (focus) selectors.get(id)?.select.focus();callbacks.onSelect?.(id);
  }
  function update(next: Readonly<WorkspaceToolsState>): void {
    if (!alive) return;
    if (!Array.isArray(next.tabs) || new Set(next.tabs.map(tab => tab.id)).size !== next.tabs.length || next.tabs.some(tab => !tab.id || !['files','terminal'].includes(tab.kind))) throw new TypeError('Invalid workspace tool tabs.');
    const changedActive = state.activeId !== next.activeId;state = next;
    const wanted = new Set(next.tabs.map(tab => tab.id));
    const returnFocus = restoreFocus || [...selectors].some(([id,row]) => !wanted.has(id) && nodeOf(row.part).contains(document.activeElement));restoreFocus = false;
    for (const [id,row] of selectors) if (!wanted.has(id)) {row.part.destroy();selectors.delete(id);}
    for (const tab of next.tabs) {
      let row = selectors.get(tab.id);
      if (!row) {
        const id = tab.id;
        const button = createButtonPart({label: tab.label,variant: 'secondary',onAction: () => select(id)});
        const close = createButtonPart({label: 'Close '+tab.label,title: tab.kind === 'terminal' ? 'Stop this terminal and its jobs' : 'Close this files view',icon: 'close',variant: 'quiet-icon',onAction() {if (alive && !state.disabled && !state.tabs.find(tab => tab.id === id)?.pending) callbacks.onClose?.(id);}});
        const wrapper = createStackPart({children: [button,close]});nodeOf(wrapper).className = 'pui-tool-tab';nodeOf(wrapper).setAttribute('role','presentation');
        const buttonNode = nodeOf(button);buttonNode.id = uniqueId('pui-tool-tab');buttonNode.setAttribute('role','tab');
        const navigate = (event: Event) => {
          if (!(event instanceof KeyboardEvent)) return;
          const index = state.tabs.findIndex(tab => tab.id === id),count = state.tabs.length;
          const target = event.key === 'ArrowRight' ? (index+1)%count : event.key === 'ArrowLeft' ? (index+count-1)%count : event.key === 'Home' ? 0 : event.key === 'End' ? count-1 : -1;
          if (target >= 0) {event.preventDefault();event.stopPropagation();select(state.tabs[target]!.id,true);}
          else if (event.key === 'Delete' && !state.disabled && !state.tabs[index]?.pending) {event.preventDefault();callbacks.onClose?.(id);}
        };
        buttonNode.addEventListener('keydown',navigate);onPartDestroy(wrapper,() => buttonNode.removeEventListener('keydown',navigate));
        row = {part: wrapper,select: button,close};selectors.set(id,row);
      }
      row.select.update({label: tab.label,title: tab.detail || `${next.location}${next.detail ? '\n'+next.detail : ''}`,variant: 'secondary',disabled: !!next.disabled});
      row.close.update({label: 'Close '+tab.label,title: tab.kind === 'terminal' ? 'Stop this terminal and its jobs' : 'Close this files view',icon: 'close',variant: 'quiet-icon',disabled: !!next.disabled || !!tab.pending});
      const selected = next.activeId === tab.id;
      nodeOf(row.select).setAttribute('aria-selected',String(selected));nodeOf(row.select).setAttribute('tabindex',selected ? '0' : '-1');
      nodeOf(row.part).classList.toggle('pui-selected',selected);
    }
    strip.replace([...next.tabs.map(tab => selectors.get(tab.id)!.part),add]);
    add.update({label: 'New tool tab',title: 'New tool tab',icon: 'plus',variant: 'quiet-icon',disabled: !!next.disabled});
    if (next.disabled) menu.close();
    for (const [id,panel] of panels) {
      const selected = id === next.activeId && wanted.has(id);
      panel.update({hidden: !selected});nodeOf(panel).toggleAttribute('inert',!selected);
      const selector = selectors.get(id)?.select;
      if (selector) {nodeOf(selector).setAttribute('aria-controls',nodeOf(panel).id);nodeOf(panel).setAttribute('aria-labelledby',nodeOf(selector).id);}
    }
    if (changedActive) {const row = selectors.get(next.activeId);if (row && nodeOf(row.part).isConnected) nodeOf(row.part).scrollIntoView({block: 'nearest',inline: 'nearest'});}
    if (returnFocus) (selectors.get(next.activeId)?.select ?? add).focus();
  }
  function attach(id: string,content: Part): void {
    if (!alive) throw new Error('Workspace tools were destroyed.');
    if (panels.has(id)) throw new TypeError('Tool panel ID already exists.');
    const panel = createStackPart({children: [content],hidden: true});nodeOf(panel).className = 'pui-tool-panel';nodeOf(panel).id = uniqueId('pui-tool-panel');nodeOf(panel).setAttribute('role','tabpanel');
    panels.set(id,panel);body.replace([...panels.values()]);update(state);
  }
  function remove(id: string): void {if (!alive) return;const panel = panels.get(id);if (panel && nodeOf(panel).contains(document.activeElement)) restoreFocus = true;panels.delete(id);body.replace([...panels.values()]);}
  onPartDestroy(part,() => {alive = false;panels.clear();selectors.clear();});update(initial);
  return {part,dismiss,update,attach,remove,closeMenu: menu.close,read: () => state.activeId,destroy: part.destroy};
}
