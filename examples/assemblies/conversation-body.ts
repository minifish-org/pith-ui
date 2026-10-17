/** Text-message portion of the internal conversation proof. Tool groups,
 * images and reader coordination have their separate acceptance tranches. */
import {
  createReadingColumnPart,createBubblePart,createTextPart,createReadingNotePart,createMarkdownPart,
  createTimestampPart,createMessageFooterPart,createMessageActionsPart,createButtonPart,createWorkingIndicatorPart,
  type Part,type ButtonPart,type LayoutPart,type TimestampPart,type WorkingIndicatorPart,
} from '../../src/parts/index.js';

export interface BodyMessage {id: string;role: string;text: string;timestamp?: number;status?: string;actions?: {copy?: boolean|string;edit?: boolean;branch?: {key: string;label?: string}}}
export interface ConversationBodyState {id: string;messages: readonly BodyMessage[];working: boolean}
export interface MessageAction {action: 'copy'|'edit'|'branch';messageId: string;branchKey?: string}
export type BodyResult = void|{ok: true}|{ok: false;error: string};
export interface ConversationBodyCallbacks {onMessageAction?(target: Readonly<MessageAction>): BodyResult|Promise<BodyResult>;onCopyCode?(text: string): BodyResult|Promise<BodyResult>;onError?(message: string): void}
export interface ConversationBodyComposition {readonly part: LayoutPart;update(state: Readonly<ConversationBodyState>): void;updateAvailability(state: Readonly<Partial<Record<MessageAction['action'],boolean>>>): void;destroy(): void}
interface Entry {part: Part;kind: string;update(message: BodyMessage): void;availability(): void}

/** Reading column -> caller-keyed bubbles/notes and optional working indicator.
 * Each bubble explicitly composes its text, timestamp, footer and actions. */
export function composeConversationBody(initial: Readonly<ConversationBodyState>,callbacks: ConversationBodyCallbacks = {}): ConversationBodyComposition {
  let alive = true,id = initial.id,disabled: Readonly<Partial<Record<MessageAction['action'],boolean>>> = {},working: WorkingIndicatorPart|undefined;
  const entries = new Map<string,Entry>();
  const fail = (message: string) => {if (alive) callbacks.onError?.(message);};
  const root = createReadingColumnPart({children: [],onDispose() {alive = false;entries.clear();working = undefined;}});
  const kindOf = (message: BodyMessage) => message.role === 'system' ? 'system' : message.role === 'user' ? 'user' : message.role === 'tool' ? 'tool' : 'assistant';
  function make(message: BodyMessage): Entry {
    const kind = kindOf(message);
    if (kind === 'tool') throw new TypeError('Tool groups belong to the tool-disclosure assembly.');
    if (kind === 'system') {const part = createReadingNotePart({key: message.id,text: message.text});return {part,kind,update(next) {part.update({text: next.text});},availability() {}};}
    let current = message,footer: LayoutPart|undefined,actions: LayoutPart|undefined,time: TimestampPart|undefined;
    const buttons = new Map<MessageAction['action'],ButtonPart>();
    const text = kind === 'user' ? createTextPart({role: 'bubble',text: message.text,hidden: !message.text}) : createMarkdownPart({text: message.text,onCopyCode: callbacks.onCopyCode,onError: fail});
    const interrupted = kind === 'assistant' ? createTextPart({role: 'interrupted',text: 'Response interrupted',hidden: message.status !== 'error'}) : undefined;
    const bubble = createBubblePart({key: message.id,speaker: kind === 'user' ? 'self' : 'agent',children: []});
    const availability = () => {for (const [action,button] of buttons) {
      const label = action === 'copy' ? typeof current.actions?.copy === 'string' ? current.actions.copy : 'Copy message' : action === 'edit' ? 'Edit message' : current.actions?.branch?.label || 'Branch from this message';
      button.update({variant: 'quiet-icon',icon: action === 'copy' ? 'copy' : action === 'edit' ? 'edit' : 'branch',label,title: label,disabled: !!disabled[action]});
    }};
    const update = (next: BodyMessage) => {
      current = next;
      text.update({text: next.text,...(kind === 'user' ? {hidden: !next.text} : {})});
      interrupted?.update({text: 'Response interrupted',hidden: next.status !== 'error'});
      const desired: MessageAction['action'][] = [ ...(next.actions?.copy ? ['copy' as const] : []),...(next.actions?.edit ? ['edit' as const] : []),...(next.actions?.branch ? ['branch' as const] : []) ];
      for (const [action,button] of buttons) if (!desired.includes(action)) {button.destroy();buttons.delete(action);}
      for (const action of desired) if (!buttons.has(action)) buttons.set(action,createButtonPart({variant: 'quiet-icon',icon: action === 'copy' ? 'copy' : action === 'edit' ? 'edit' : 'branch',label: action,
        onAction() {if (!alive || disabled[action]) return;const target = Object.freeze({action,messageId: current.id,...(action === 'branch' ? {branchKey: current.actions!.branch!.key} : {})});return callbacks.onMessageAction?.(target);},onError: fail}));
      if (desired.length) {if (!actions) actions = createMessageActionsPart({children: []});actions.replace(desired.map(action => buttons.get(action)!));}
      else {actions?.destroy();actions = undefined;}
      if (next.timestamp && Number.isFinite(new Date(next.timestamp).getTime())) {if (!time) time = createTimestampPart({value: next.timestamp});else time.update({value: next.timestamp});}
      else {time?.destroy();time = undefined;}
      if (time || actions) {if (!footer) footer = createMessageFooterPart({children: []});footer.replace([...(time ? [time] : []),...(actions ? [actions] : [])]);}
      else {footer?.destroy();footer = undefined;}
      bubble.replace([text,...(interrupted ? [interrupted] : []),...(footer ? [footer] : [])]);availability();
    };
    update(message);return {part: bubble,kind,update,availability};
  }
  const update = (state: Readonly<ConversationBodyState>) => {
    if (!alive) return;
    const keys = new Set<string>();for (const message of state.messages) {if (keys.has(message.id)) throw new TypeError('Message IDs must be unique.');keys.add(message.id);if (kindOf(message) === 'tool') throw new TypeError('This proof assembles text messages only.');}
    if (state.id !== id) {root.replace([]);entries.clear();working = undefined;id = state.id;}
    for (const [key,entry] of entries) if (!keys.has(key)) {entry.part.destroy();entries.delete(key);}
    const children: Part[] = [];
    for (const message of state.messages) {let entry = entries.get(message.id);if (entry && entry.kind !== kindOf(message)) {entry.part.destroy();entries.delete(message.id);entry = undefined;}
      if (!entry) {entry = make(message);entries.set(message.id,entry);}else entry.update(message);children.push(entry.part);}
    if (state.working) {working ??= createWorkingIndicatorPart({label: 'Working…'});children.push(working);}else {working?.destroy();working = undefined;}
    root.replace(children);root.update({hidden: !state.messages.length});
  };
  update(initial);
  return {part: root,update,updateAvailability(state) {if (alive) {disabled = {...state};for (const entry of entries.values()) entry.availability();}},destroy() {root.destroy();}};
}
