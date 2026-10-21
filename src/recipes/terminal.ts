import {createActionsPart,createButtonPart,createFeedbackPart,createStackPart,createTerminalPart,createTextPart,type Part} from '../parts/index.js';
import {nodeOf,onPartDestroy} from '../parts/ownership.js';
import type {RecipeResult} from './types.js';

export interface TerminalState {
  id?: string;
  location: string;directory: string;status: string;connected: boolean;exists: boolean;
  disabled?: boolean;pending?: boolean;notice?: string;error?: string;
}
export interface TerminalCallbacks {
  onStart?(): void|RecipeResult|Promise<void|RecipeResult>;
  onClose?(): void|RecipeResult|Promise<void|RecipeResult>;
  onInput?(data: string): void;onResize?(size: {cols: number;rows: number}): void;
  onCopy?(text: string): void|RecipeResult|Promise<void|RecipeResult>;
  onError?(message: string): void;
}

/** Manual terminal presentation only. Hiding or destroying this region never
 * closes a host session. A host explicitly handles Start and Close intents. */
export function composeTerminal(initial: Readonly<TerminalState>,callbacks: TerminalCallbacks = {}) {
  let state = initial,alive = true,pasteRevision = 0;
  const fail = (message: string) => {if (alive) {error.update({message,tone: 'error',hidden: !message});callbacks.onError?.(message);}};
  const copy = async (text: string) => {if (callbacks.onCopy) return callbacks.onCopy(text);await navigator.clipboard.writeText(text);};
  const terminal = createTerminalPart({label: 'Interactive terminal',disabled: true,onInput: callbacks.onInput,onResize: callbacks.onResize,onCopy(text) {void Promise.resolve(copy(text)).catch(error => fail(String(error)));}});
  const location = createTextPart({role: 'path-paragraph',text: state.location}),directory = createTextPart({role: 'path-paragraph',text: state.directory}),status = createTextPart({role: 'hint',text: state.status});
  const notice = createFeedbackPart({message: '',tone: 'info',hidden: true}),error = createFeedbackPart({message: '',tone: 'error',hidden: true});
  const start = createButtonPart({label: 'Start terminal',variant: 'secondary',onAction() {if (!state.disabled && !state.pending) return callbacks.onStart?.();},onError: fail});
  const close = createButtonPart({label: 'Close terminal',variant: 'secondary',title: 'Stop this shell and its jobs',onAction() {if (!state.disabled && !state.pending) return callbacks.onClose?.();},onError: fail});
  const copyButton = createButtonPart({label: 'Copy selection',variant: 'secondary',onAction: () => copy(terminal.selection()),onError: fail});
  const paste = createButtonPart({label: 'Paste into terminal',variant: 'secondary',async onAction() {const original = pasteRevision;const text = await navigator.clipboard.readText();if (alive && original === pasteRevision && state.connected && !state.disabled) {terminal.paste(text);terminal.focus();}},onError: () => fail('Clipboard access unavailable. Use your system Paste command or touch-and-hold in the terminal.')});
  const keys = ([['Interrupt terminal','Ctrl+C','\x03'],['Terminal Escape','Esc','\x1b'],['Terminal Tab','Tab','\t'],['Terminal Up','↑','\x1b[A'],['Terminal Down','↓','\x1b[B'],['Terminal Left','←','\x1b[D'],['Terminal Right','→','\x1b[C'],['Terminal EOF','Ctrl+D','\x04']] as const).map(([label,caption,data]) => createButtonPart({label: caption,accessibleLabel: label,variant: 'secondary',onAction() {if (alive && state.connected && !state.disabled) {callbacks.onInput?.(data);terminal.focus();}}}));
  const actions = createActionsPart({align: 'start',children: [start,close,copyButton,paste]}),keyRow = createActionsPart({align: 'start',children: keys});
  const heading = createStackPart({children: [location,directory,status,actions,notice,error]});
  nodeOf(heading).classList.add('pui-terminal-heading');
  const part = createStackPart({children: [heading,terminal,keyRow]});
  nodeOf(part).classList.add('pui-terminal');
  function update(next: Readonly<TerminalState>): void {
    if (!alive) return;
    if (next.id !== state.id || !next.connected && state.connected || next.disabled && !state.disabled) pasteRevision++;
    state = next;
    location.update({text: next.location});directory.update({text: next.directory});status.update({text: next.status});
    notice.update({message: next.notice ?? '',tone: 'info',hidden: !next.notice});error.update({message: next.error ?? '',tone: 'error',hidden: !next.error});
    terminal.update({label: 'Interactive terminal',disabled: !next.connected || !!next.disabled});
    start.update({label: 'Start terminal',variant: 'secondary',hidden: next.exists,disabled: !!next.disabled || !!next.pending});
    close.update({label: 'Close terminal',variant: 'secondary',hidden: !next.exists,disabled: !!next.disabled || !!next.pending});
    paste.update({label: 'Paste into terminal',variant: 'secondary',disabled: !next.connected || !!next.disabled});
    for (const [index,key] of keys.entries()) key.update({label: ['Ctrl+C','Esc','Tab','↑','↓','←','→','Ctrl+D'][index]!,accessibleLabel: ['Interrupt terminal','Terminal Escape','Terminal Tab','Terminal Up','Terminal Down','Terminal Left','Terminal Right','Terminal EOF'][index]!,variant: 'secondary',disabled: !next.connected || !!next.disabled});
  }
  onPartDestroy(part,() => {alive = false;});update(initial);
  return {part,update,write: terminal.write,reset: terminal.reset,fit: terminal.fit,focus: terminal.focus,readSize: terminal.readSize,destroy: part.destroy};
}

export type WorkspaceToolView = 'files'|'terminal';
/** A bounded two-view tool rail. Both opaque children keep their UI lifetime. */
export function composeWorkspaceTools(content: {files: Part;terminal: Part},callbacks: {onView?(view: WorkspaceToolView): void} = {}) {
  let view: WorkspaceToolView = 'files',alive = true;
  const files = createStackPart({children: [content.files]}),terminal = createStackPart({children: [content.terminal],hidden: true});
  const buttons = (['files','terminal'] as const).map(value => createButtonPart({label: value === 'files' ? 'Files' : 'Terminal',variant: value === view ? 'primary' : 'secondary',onAction: () => select(value)}));
  const actions = createActionsPart({align: 'start',children: buttons}),part = createStackPart({children: [actions,files,terminal]});
  nodeOf(part).classList.add('pui-workspace-tools');nodeOf(files).classList.add('pui-tool-view');nodeOf(terminal).classList.add('pui-tool-view');
  function select(next: WorkspaceToolView): void {
    if (next !== 'files' && next !== 'terminal') throw new TypeError('Unknown workspace tool view.');
    if (!alive || next === view) return;view = next;
    files.update({hidden: view !== 'files'});terminal.update({hidden: view !== 'terminal'});
    buttons.forEach((button,index) => button.update({label: index ? 'Terminal' : 'Files',variant: (index ? 'terminal' : 'files') === view ? 'primary' : 'secondary'}));
    callbacks.onView?.(view);
  }
  onPartDestroy(part,() => {alive = false;});
  return {part,select,read: () => view,destroy: part.destroy};
}
