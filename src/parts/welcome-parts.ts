import type {UIAction} from '../core.js';
import {iconElement} from '../dom.js';
import {adoptAction} from '../foundations.js';
import {patchChildren} from '../content/views.js';
import {isBrandMarkPart,type BrandMarkPart} from './brand.js';
import {isButtonPart,type ButtonPart} from './button.js';
import type {LayoutPart} from './layout.js';
import {assertOptions,assertUnownedParts,createOwnedPart,isPartAlive,onPartDestroy,replacePartChildren,type Part} from './ownership.js';
import {assertIconName,type IconName} from './text.js';

export interface CenteredContentState {hidden?: boolean}
export interface CenteredContentPart extends LayoutPart {update(state: Readonly<CenteredContentState>): void}
/** An empty centered content column. All text, controls and branching are caller parts. */
export function createCenteredContentPart(options: CenteredContentState & {children: readonly Part[];onDispose?(): void}): CenteredContentPart {
  assertOptions(options,['children','hidden','onDispose'],'centered content');
  const validate = (state: Readonly<CenteredContentState>) => {assertOptions(state,['hidden'],'centered content state');if (state.hidden !== undefined && typeof state.hidden !== 'boolean') throw new TypeError('Content visibility must be boolean.');};
  validate({hidden: options.hidden});if (options.onDispose !== undefined && typeof options.onDispose !== 'function') throw new TypeError('Content disposal must be a callback.');
  if (!Array.isArray(options.children)) throw new TypeError('Centered content children must be Pith UI parts.');
  const node = document.createElement('div');node.className = 'pui-welcome';let part: CenteredContentPart;
  part = createOwnedPart<Omit<CenteredContentPart,keyof Part>>(node,{update(state) {validate(state);if (isPartAlive(part)) node.hidden = !!state.hidden;},replace(children) {if (isPartAlive(part)) replacePartChildren(part,children);}},{children: options.children});
  if (options.onDispose) onPartDestroy(part,options.onDispose);part.update({hidden: options.hidden});return part;
}
/** One fixed emblem tile, with the genuine mark as its direct child. */
export function createBrandTilePart(options: {mark: BrandMarkPart}): Part {
  assertOptions(options,['mark'],'brand tile');if (!isBrandMarkPart(options.mark)) throw new TypeError('Brand tiles require a genuine live brand mark.');
  const node = document.createElement('div');node.className = 'pui-welcome-mark';return createOwnedPart(node,{}, {children: [options.mark]});
}

export interface ResponsiveLeadState {lines: readonly string[]}
export interface ResponsiveLeadPart extends Part {update(state: Readonly<ResponsiveLeadState>): void}
/** Literal content lines separated by the library's fixed responsive break. */
export function createResponsiveLeadPart(options: ResponsiveLeadState): ResponsiveLeadPart {
  const validate = (state: Readonly<ResponsiveLeadState>) => {assertOptions(state,['lines'],'responsive lead');if (!Array.isArray(state.lines) || state.lines.some(line => typeof line !== 'string')) throw new TypeError('Lead lines must be literal text.');};validate(options);
  const node = document.createElement('p');node.className = 'pui-welcome-description';let part: ResponsiveLeadPart;
  part = createOwnedPart<Omit<ResponsiveLeadPart,keyof Part>>(node,{update(state) {
    validate(state);if (!isPartAlive(part)) return;const content = document.createDocumentFragment();
    state.lines.forEach((line,index) => {if (index) {const br = document.createElement('br');br.className = 'pui-desktop-break';content.append(br);}content.append(document.createTextNode(line));});patchChildren(node,content);
  }});part.update(options);return part;
}

export interface StepActionState {step: string;completed: boolean;label: string;description: string;disabled?: boolean}
declare const stepActionRole: unique symbol;
export interface StepActionPart extends Part {readonly [stepActionRole]: true;update(state: Readonly<StepActionState>): void;focus(): void;invalidate(): void}
export interface StepActionOptions extends StepActionState {onAction?: UIAction;onError?(message: string): void}
const stepActions = new WeakSet<Part>();
function validateStep(state: Readonly<StepActionState>): void {
  assertOptions(state,['step','completed','label','description','disabled'],'step action state');
  for (const key of ['step','label','description'] as const) if (typeof state[key] !== 'string') throw new TypeError('Step content must be literal text.');
  if (typeof state.completed !== 'boolean' || state.disabled !== undefined && typeof state.disabled !== 'boolean') throw new TypeError('Step states must be boolean.');
}
/** One native rich action. The leading number/check and chevron are intrinsic. */
export function createStepActionPart(options: StepActionOptions): StepActionPart {
  assertOptions(options,['step','completed','label','description','disabled','onAction','onError'],'step action');
  const {onAction,onError,...initial} = options;validateStep(initial);
  for (const callback of [onAction,onError]) if (callback !== undefined && typeof callback !== 'function') throw new TypeError('Step actions require callbacks.');
  const node = document.createElement('button');node.type = 'button';node.className = 'pui-setup-step';
  const prefix = document.createElement('span'),caption = document.createElement('span'),label = document.createElement('strong'),description = document.createElement('small');caption.append(label,description);node.append(prefix,caption,iconElement('chevron'));
  let completed: boolean|undefined,part: StepActionPart;const action = adoptAction(node,{onAction,onError});
  const update = (state: Readonly<StepActionState>) => {
    validateStep(state);if (!isPartAlive(part)) return;
    prefix.className = `pui-step-number${state.completed ? ' pui-complete' : ''}`;
    if (completed !== state.completed) {completed = state.completed;prefix.replaceChildren(completed ? iconElement('check') : document.createTextNode(state.step));}
    else if (!completed && prefix.textContent !== state.step) prefix.textContent = state.step;
    if (label.textContent !== state.label) label.textContent = state.label;if (description.textContent !== state.description) description.textContent = state.description;action.update({disabled: !!state.disabled});
  };
  part = createOwnedPart<Omit<StepActionPart,keyof Part|typeof stepActionRole>>(node,{update,focus() {if (isPartAlive(part)) node.focus();},invalidate() {if (isPartAlive(part)) action.invalidate();}},{dispose: action.destroy}) as StepActionPart;
  stepActions.add(part);update(initial);return part;
}

export interface StepGroupState {title: string;summary: string}
export interface StepGroupPart extends Part {update(state: Readonly<StepGroupState>): void;replace(children: readonly StepActionPart[]): void}
function validateSteps(children: readonly StepActionPart[]): void {
  if (!Array.isArray(children) || children.some(part => !stepActions.has(part) || !isPartAlive(part))) throw new TypeError('Step groups require genuine live step actions.');
}
/** A small titled group. It supplies no setup workflow, model or workspace data. */
export function createStepGroupPart(options: StepGroupState & {children: readonly StepActionPart[]}): StepGroupPart {
  assertOptions(options,['title','summary','children'],'step group');
  const validate = (state: Readonly<StepGroupState>) => {assertOptions(state,['title','summary'],'step group state');if (typeof state.title !== 'string' || typeof state.summary !== 'string') throw new TypeError('Group title and summary must be literal text.');};
  const initial = {title: options.title,summary: options.summary};validate(initial);validateSteps(options.children);assertUnownedParts(options.children);
  const node = document.createElement('div');node.className = 'pui-setup-card';const heading = document.createElement('div');heading.className = 'pui-setup-card-heading';
  const title = document.createTextNode(''),summary = document.createElement('span');heading.append(title,summary);const headingPart = createOwnedPart(heading,{});let part: StepGroupPart;
  part = createOwnedPart<Omit<StepGroupPart,keyof Part>>(node,{update(state) {validate(state);if (!isPartAlive(part)) return;if (title.data !== state.title+' ') title.data = state.title+' ';if (summary.textContent !== state.summary) summary.textContent = state.summary;},
    replace(children) {if (!isPartAlive(part)) return;validateSteps(children);replacePartChildren(part,[headingPart,...children]);}},{children: [headingPart,...options.children]});part.update(initial);return part;
}

/** A short inline context row with independently composed content and actions. */
export function createContextLinePart(options: {children: readonly Part[]}): LayoutPart {return layout(options,'pui-welcome-workspace');}
export interface SuggestionGroupPart extends Part {replace(children: readonly ButtonPart[]): void}
/** A wrapping group of genuine ordinary actions, without implicit suggestions. */
export function createSuggestionGroupPart(options: {children: readonly ButtonPart[]}): SuggestionGroupPart {
  const validate = (children: readonly ButtonPart[]) => {if (!Array.isArray(children) || children.some(part => !isButtonPart(part))) throw new TypeError('Suggestion groups require genuine live buttons.');};
  assertOptions(options,['children'],'suggestion group');validate(options.children);const node = document.createElement('div');node.className = 'pui-suggestions';let part: SuggestionGroupPart;
  part = createOwnedPart<Omit<SuggestionGroupPart,keyof Part>>(node,{replace(children) {if (!isPartAlive(part)) return;validate(children);replacePartChildren(part,children);}},{children: options.children});return part;
}
function layout(options: {children: readonly Part[]},className: string): LayoutPart {
  assertOptions(options,['children'],'content group');if (!Array.isArray(options.children)) throw new TypeError('Group children must be Pith UI parts.');
  const node = document.createElement('div');node.className = className;let part: LayoutPart;
  part = createOwnedPart<Omit<LayoutPart,keyof Part>>(node,{replace(children) {if (isPartAlive(part)) replacePartChildren(part,children);}},{children: options.children});return part;
}

export interface IconNoteState {icon: IconName;text: string}
export interface IconNotePart extends Part {update(state: Readonly<IconNoteState>): void}
/** One icon and literal note in the library's fixed quiet line presentation. */
export function createIconNotePart(options: IconNoteState): IconNotePart {
  const validate = (state: Readonly<IconNoteState>) => {assertOptions(state,['icon','text'],'icon note');assertIconName(state.icon);if (typeof state.text !== 'string') throw new TypeError('Icon notes must be literal text.');};validate(options);
  const node = document.createElement('div');node.className = 'pui-welcome-footnote';let icon = options.icon,glyph = iconElement(icon);const text = document.createTextNode('');node.append(glyph,text);let part: IconNotePart;
  part = createOwnedPart<Omit<IconNotePart,keyof Part>>(node,{update(state) {validate(state);if (!isPartAlive(part)) return;if (icon !== state.icon) {icon = state.icon;const next = iconElement(icon);glyph.replaceWith(next);glyph = next;}if (text.data !== state.text) text.data = state.text;}});part.update(options);return part;
}
