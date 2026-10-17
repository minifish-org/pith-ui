import {Lifetime} from '../core.js';
import type {LayoutPart} from './layout.js';
import {assertOptions,assertUnownedParts,createOwnedPart,isPartAlive,replacePartChildren,type Part} from './ownership.js';

export interface CompoundDisclosurePartState {hidden?: boolean;disabled?: boolean}
export interface CompoundDisclosurePartOptions extends CompoundDisclosurePartState {
  purpose: 'group'|'result';
  summary: readonly Part[];
  children: readonly Part[];
  readingKey?: string;
  foldKey?: string;
  open?: boolean;
  onToggle?(open: boolean): void;
}
export interface CompoundDisclosurePart extends LayoutPart {
  replaceSummary(children: readonly Part[]): void;
  update(state: Readonly<CompoundDisclosurePartState>): void;
  setOpen(open: boolean): void;
  isOpen(): boolean;
}
function validate(state: Readonly<CompoundDisclosurePartState>): void {
  assertOptions(state,['hidden','disabled'],'compound disclosure state');
  for (const key of ['hidden','disabled'] as const) if (state[key] !== undefined && typeof state[key] !== 'boolean') throw new TypeError(`Disclosure ${key} must be boolean.`);
}
/** Native details plus its required summary. The caller supplies every icon,
 * caption, count, status and content part; no tool or conversation is inferred. */
export function createCompoundDisclosurePart(options: CompoundDisclosurePartOptions): CompoundDisclosurePart {
  assertOptions(options,['purpose','summary','children','readingKey','foldKey','open','hidden','disabled','onToggle'],'compound disclosure');
  validate({hidden: options.hidden,disabled: options.disabled});
  if (!['group','result'].includes(options.purpose)) throw new TypeError('Unknown compound disclosure purpose.');
  for (const key of ['readingKey','foldKey'] as const) if (options[key] !== undefined && (typeof options[key] !== 'string' || !options[key])) throw new TypeError('Disclosure keys must be nonempty text.');
  if (options.open !== undefined && typeof options.open !== 'boolean') throw new TypeError('Disclosure open must be boolean.');
  if (options.onToggle !== undefined && typeof options.onToggle !== 'function') throw new TypeError('Disclosure onToggle must be a callback.');
  if (!Array.isArray(options.summary) || !Array.isArray(options.children)) throw new TypeError('Disclosure slots must be arrays of Pith UI parts.');
  assertUnownedParts([...options.summary,...options.children]);
  const node = document.createElement('details');node.className = options.purpose === 'group' ? 'pui-tool-group' : 'pui-tool-message';
  if (options.readingKey) node.dataset.readingId = options.readingKey;
  if (options.foldKey) node.dataset.toolFold = options.foldKey;
  const summary = document.createElement('summary');
  const summaryPart = createOwnedPart(summary,{replace(children: readonly Part[]) {replacePartChildren(summaryPart,children);}}, {children: options.summary});
  const life = new Lifetime();let disabled = false,part: CompoundDisclosurePart;
  life.listen(summary,'click',event => {if (disabled) event.preventDefault();});
  life.listen(node,'toggle',() => {if (isPartAlive(part)) options.onToggle?.(node.open);});
  try {
    part = createOwnedPart<Omit<CompoundDisclosurePart,keyof Part>>(node,{
      replaceSummary(children: readonly Part[]) {if (isPartAlive(part)) summaryPart.replace(children);},
      replace(children: readonly Part[]) {if (isPartAlive(part)) replacePartChildren(part,[summaryPart,...children]);},
      update(state: Readonly<CompoundDisclosurePartState>) {validate(state);if (isPartAlive(part)) {node.hidden = !!state.hidden;disabled = !!state.disabled;if (disabled) summary.setAttribute('aria-disabled','true');else summary.removeAttribute('aria-disabled');}},
      setOpen(open: boolean) {if (typeof open !== 'boolean') throw new TypeError('Disclosure open must be boolean.');if (isPartAlive(part)) node.open = open;},
      isOpen() {return isPartAlive(part) && node.open;},
    },{children: [summaryPart,...options.children],dispose() {life.destroy();}});
  } catch (error) {summaryPart.destroy();life.destroy();throw error;}
  part.update({hidden: options.hidden,disabled: options.disabled});node.open = !!options.open;return part;
}

export type DisclosureBodyPurpose = 'group'|'details'|'output';
/** A single empty native content region with a finite padding/border purpose. */
export function createDisclosureBodyPart(options: {purpose: DisclosureBodyPurpose;children: readonly Part[]}): LayoutPart {
  assertOptions(options,['purpose','children'],'disclosure body');
  const classes: Record<DisclosureBodyPurpose,string> = {group: 'pui-tool-group-content',details: 'pui-command-details',output: 'pui-command-output'};
  if (!Object.hasOwn(classes,options.purpose)) throw new TypeError('Unknown disclosure body purpose.');
  const node = document.createElement('div');node.className = classes[options.purpose];
  const part = createOwnedPart(node,{replace(children: readonly Part[]) {if (isPartAlive(part)) replacePartChildren(part,children);}}, {children: options.children});return part;
}
