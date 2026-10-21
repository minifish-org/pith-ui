import * as xtermModule from '@xterm/xterm';
import * as fitModule from '@xterm/addon-fit';
import type {Terminal} from '@xterm/xterm';
import type {FitAddon} from '@xterm/addon-fit';
import {assertOptions,createOwnedPart,isPartAlive,onPartAppearance,type Part} from './ownership.js';

export interface TerminalPartState {disabled?: boolean;preserveSize?: boolean;label: string}
export interface TerminalPartOptions extends TerminalPartState {
  onInput?(data: string): void;
  onResize?(size: {cols: number;rows: number}): void;
  onCopy?(text: string): void;
}
export interface TerminalPart extends Part {
  update(state: Readonly<TerminalPartState>): void;
  write(data: Uint8Array,onParsed?: () => void): void;
  reset(size?: {cols: number;rows: number}): void;
  fit(): void;focus(): void;selection(): string;paste(text: string): void;
  readSize(): {cols: number;rows: number};
}

/** An opaque xterm emulator. The host owns transport and shell lifetime.
 * A write callback means parsed, allowing bounded end-to-end flow control. */
export function createTerminalPart(options: TerminalPartOptions): TerminalPart {
  assertOptions(options,['label','disabled','preserveSize','onInput','onResize','onCopy'],'terminal');
  const validate = (state: Readonly<TerminalPartState>) => {
    assertOptions(state,['label','disabled','preserveSize'],'terminal state');
    if (typeof state.label !== 'string') throw new TypeError('Invalid terminal state.');
    for (const key of ['disabled','preserveSize'] as const) if (state[key] !== undefined && typeof state[key] !== 'boolean') throw new TypeError('Invalid terminal state.');
  };
  for (const key of ['onInput','onResize','onCopy'] as const) if (options[key] !== undefined && typeof options[key] !== 'function') throw new TypeError('Terminal events must be callbacks.');
  let state: TerminalPartState = {label: options.label,disabled: options.disabled,preserveSize: options.preserveSize};validate(state);
  const node = document.createElement('div');node.className = 'pui-terminal-viewport';
  const display = document.createElement('div');display.className = 'pui-terminal-reader';display.setAttribute('role','log');display.setAttribute('aria-label','Terminal display');display.setAttribute('aria-live','off');
  const media = matchMedia('(prefers-color-scheme: dark)');
  let term: Terminal,fitAddon: FitAddon,opened = false,frame = 0,generation = 0;
  const size = () => ({cols: term.cols,rows: term.rows});
  function readDisplay(): void {
    const buffer = term.buffer.active,lines: string[] = [];
    for (let row = 0;row < term.rows;row++) lines.push(buffer.getLine(buffer.viewportY+row)?.translateToString(true) ?? '');
    const text = lines.join('\n');if (display.textContent !== text) display.textContent = text;
  }
  function make(cols = 80,rows = 24): void {
    generation++;opened = false;display.textContent = '';node.replaceChildren(display);
    // xterm ships ESM for bundlers and CommonJS for Node. Namespace imports
    // keep the public library importable in both without a DOM at import time.
    const xterm = ('Terminal' in xtermModule ? xtermModule : Reflect.get(xtermModule,'default')) as typeof import('@xterm/xterm');
    const fit = ('FitAddon' in fitModule ? fitModule : Reflect.get(fitModule,'default')) as typeof import('@xterm/addon-fit');
    term = new xterm.Terminal({cols,rows,scrollback: 1000,convertEol: false,disableStdin: !!state.disabled,
      cursorBlink: true,
      allowProposedApi: false,allowTransparency: false});
    fitAddon = new fit.FitAddon();term.loadAddon(fitAddon);
    // xterm's screenReaderMode disables its insertText input path, which
    // mobile keyboards and emoji use. Keep that path and expose only the
    // bounded visible display as accessible text, without live announcements.
    term.onRender(readDisplay);term.onScroll(readDisplay);
    term.onData(data => {if (isPartAlive(part) && !state.disabled) options.onInput?.(data);});
    term.onResize(value => {if (isPartAlive(part)) options.onResize?.(value);});
    term.attachCustomKeyEventHandler(event => {
      if (event.type === 'keydown' && (event.metaKey || event.ctrlKey && event.shiftKey) && event.key.toLowerCase() === 'c' && term.hasSelection()) {
        event.preventDefault();options.onCopy?.(term.getSelection());return false;
      }
      return true;
    });
    schedule();
  }
  function fit(): void {
    if (!isPartAlive(part) || !node.isConnected || node.clientWidth < 20 || node.clientHeight < 20 || node.closest('[inert]')) return;
    if (!opened) {term.open(node);opened = true;}
    const colors = getComputedStyle(node);
    term.options.fontSize = Number.parseFloat(colors.fontSize);
    term.options.fontFamily = colors.fontFamily;
    term.options.theme = {background: colors.backgroundColor,foreground: colors.color,cursor: colors.color,selectionBackground: '#7495c966',selectionInactiveBackground: '#7495c944'};
    if (!state.preserveSize) fitAddon.fit();
  }
  function schedule(): void {if (!frame) frame = requestAnimationFrame(() => {frame = 0;fit();});}
  // xterm's own listener runs first. Prevent terminal keys (including Esc/Tab
  // and Ctrl+F) reaching conversation shortcuts or phone drawer dismissal.
  const stopKeys = (event: Event) => event.stopPropagation();
  node.addEventListener('keydown',stopKeys);node.addEventListener('keyup',stopKeys);
  const observer = new ResizeObserver(schedule);observer.observe(node);
  const viewport = window.visualViewport;viewport?.addEventListener('resize',schedule);
  media.addEventListener('change',schedule);
  const part: TerminalPart = createOwnedPart<Omit<TerminalPart,keyof Part>>(node,{
    update(next) {validate(next);if (!isPartAlive(part)) return;const resume = !!state.preserveSize && !next.preserveSize;state = next;node.setAttribute('aria-label',next.label);node.setAttribute('aria-disabled',String(!!next.disabled));term.options.disableStdin = !!next.disabled;if (resume) schedule();},
    write(data,onParsed) {
      if (!(data instanceof Uint8Array)) throw new TypeError('Terminal output must be UTF-8 bytes.');
      if (!isPartAlive(part)) return;
      const epoch = generation;term.write(data,() => {if (isPartAlive(part) && epoch === generation) {readDisplay();onParsed?.();}});
    },
    reset(value) {
      if (!isPartAlive(part)) return;
      const epoch = ++generation;display.textContent = '';
      // Cancel a partial sequence and queue RIS after old bytes. Recreating
      // xterm would detach the focused input on every history truncation.
      term.write(new Uint8Array([0x18,0x1b,0x63]),() => {if (isPartAlive(part) && epoch === generation) readDisplay();});
      if (value) term.resize(value.cols,value.rows);
    },
    fit,focus() {if (isPartAlive(part)) {fit();if (opened) term.focus();}},
    selection: () => isPartAlive(part) ? term.getSelection() : '',
    paste(text) {if (isPartAlive(part) && !state.disabled) term.paste(text);},
    readSize: size,
  },{dispose() {generation++;observer.disconnect();cancelAnimationFrame(frame);viewport?.removeEventListener('resize',schedule);media.removeEventListener('change',schedule);node.removeEventListener('keydown',stopKeys);node.removeEventListener('keyup',stopKeys);term.dispose();}});
  make();part.update(state);onPartAppearance(part,schedule);
  return part;
}
