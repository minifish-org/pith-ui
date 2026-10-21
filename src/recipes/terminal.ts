import {createActionsPart,createButtonPart,createFeedbackPart,createStackPart,createTerminalPart} from '../parts/index.js';
import {nodeOf,onPartDestroy} from '../parts/ownership.js';
import type {RecipeResult} from './types.js';

export interface TerminalState {
  id?: string;
  location: string;directory: string;status: string;connected: boolean;exists: boolean;
  disabled?: boolean;pending?: boolean;restoring?: boolean;notice?: string;error?: string;
}
export interface TerminalCallbacks {
  onInput?(data: string): void;onResize?(size: {cols: number;rows: number}): void;
  onCopy?(text: string): void|RecipeResult|Promise<void|RecipeResult>;
  onError?(message: string): void;
}

/** The terminal fills its panel. Session creation and close belong to its tab's
 * application controller. Hiding or destroying this part never stops a shell. */
export function composeTerminal(initial: Readonly<TerminalState>,callbacks: TerminalCallbacks = {}) {
  let state = initial,alive = true;
  const feedback = createFeedbackPart({message: '',tone: 'info',hidden: true});
  const fail = (message: string) => {if (alive) {feedback.update({message,tone: 'error',hidden: !message});callbacks.onError?.(message);}};
  const copy = async (text: string) => {if (callbacks.onCopy) return callbacks.onCopy(text);await navigator.clipboard.writeText(text);};
  const terminal = createTerminalPart({label: 'Interactive terminal',disabled: true,onInput: callbacks.onInput,onResize: callbacks.onResize,onCopy(text) {void Promise.resolve(copy(text)).catch(error => fail(String(error)));}});
  const keys = ([['Interrupt terminal','Ctrl+C','\x03'],['Terminal Escape','Esc','\x1b'],['Terminal Tab','Tab','\t'],['Terminal Up','↑','\x1b[A'],['Terminal Down','↓','\x1b[B'],['Terminal Left','←','\x1b[D'],['Terminal Right','→','\x1b[C'],['Terminal EOF','Ctrl+D','\x04']] as const).map(([label,caption,data]) => createButtonPart({label: caption,accessibleLabel: label,variant: 'secondary',onAction() {if (alive && state.connected && !state.disabled) {callbacks.onInput?.(data);terminal.focus();}}}));
  const keyRow = createActionsPart({align: 'start',children: keys});nodeOf(keyRow).classList.add('pui-terminal-keys');
  const part = createStackPart({children: [feedback,terminal,keyRow]});nodeOf(part).classList.add('pui-terminal');
  function update(next: Readonly<TerminalState>): void {
    if (!alive) return;state = next;
    const message = [next.error,next.notice,!next.connected ? next.status : ''].filter(Boolean).join('\n');
    feedback.update({message,tone: next.error ? 'error' : 'info',hidden: !message});
    terminal.update({label: 'Interactive terminal',disabled: !next.connected || !!next.disabled,preserveSize: next.restoring});
    for (const [index,key] of keys.entries()) key.update({label: ['Ctrl+C','Esc','Tab','↑','↓','←','→','Ctrl+D'][index]!,accessibleLabel: ['Interrupt terminal','Terminal Escape','Terminal Tab','Terminal Up','Terminal Down','Terminal Left','Terminal Right','Terminal EOF'][index]!,variant: 'secondary',disabled: !next.connected || !!next.disabled});
  }
  onPartDestroy(part,() => {alive = false;});update(initial);
  return {part,update,write: terminal.write,reset: terminal.reset,fit: terminal.fit,focus: terminal.focus,readSize: terminal.readSize,destroy: part.destroy};
}
