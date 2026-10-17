import {assertOptions,assertUnownedParts,createOwnedPart,isPartAlive,nodeOf,onPartDestroy,retargetPart,type Part} from './ownership.js';

export interface FoldingPartState {title: string;collapsible: boolean}
export interface FoldingPartOptions extends FoldingPartState {purpose?: 'plain'|'review';body: Part;open?: boolean;onToggle?(open: boolean): void}
export interface FoldingPart extends Part {update(state: Readonly<FoldingPartState>): void;setOpen(open: boolean): void;isOpen(): boolean}
function validate(state: Readonly<FoldingPartState>): void {
  assertOptions(state,['title','collapsible'],'folding state');
  if (typeof state.title !== 'string' || typeof state.collapsible !== 'boolean') throw new TypeError('Folding requires a text title and boolean collapsibility.');
}
/** One owned body can be always visible or placed inside native details.
 * The body is never copied, replaced or given an additional layout wrapper. */
export function createFoldingPart(options: FoldingPartOptions): FoldingPart {
  assertOptions(options,['title','collapsible','purpose','body','open','onToggle'],'folding');
  const initial = {title: options.title,collapsible: options.collapsible};validate(initial);
  if (options.purpose !== undefined && !['plain','review'].includes(options.purpose)) throw new TypeError('Unsupported folding purpose.');
  if (options.open !== undefined && typeof options.open !== 'boolean') throw new TypeError('Folding open must be boolean.');
  if (options.onToggle !== undefined && typeof options.onToggle !== 'function') throw new TypeError('Folding onToggle must be a callback.');
  assertUnownedParts([options.body]);const body = nodeOf(options.body);
  const details = document.createElement('details');if (options.purpose === 'review') details.className = 'pui-approval-arguments';
  const summary = document.createElement('summary'),summaryPart = createOwnedPart(summary,{});
  let collapsible = true,part: FoldingPart;
  const toggle = () => {if (isPartAlive(part)) options.onToggle?.(details.open);};details.addEventListener('toggle',toggle);
  const update = (state: Readonly<FoldingPartState>) => {
    validate(state);if (!isPartAlive(part)) return;
    if (summary.textContent !== state.title) summary.textContent = state.title;
    if (state.collapsible !== collapsible) {
      if (state.collapsible) {
        body.parentNode?.insertBefore(details,body);details.append(body);retargetPart(part,details);
      } else {
        if (details.parentNode) details.parentNode.insertBefore(body,details);else body.remove();
        details.remove();retargetPart(part,body);
      }
      collapsible = state.collapsible;
    }
  };
  try {part = createOwnedPart<Omit<FoldingPart,keyof Part>>(details,{update,setOpen(open: boolean) {if (typeof open !== 'boolean') throw new TypeError('Folding open must be boolean.');if (isPartAlive(part)) details.open = open;},isOpen: () => isPartAlive(part) && details.open},{children: [summaryPart,options.body],dispose() {details.removeEventListener('toggle',toggle);details.remove();}});}
  catch (error) {details.removeEventListener('toggle',toggle);summaryPart.destroy();throw error;}
  onPartDestroy(options.body,() => {if (isPartAlive(part)) part.destroy();});
  update(initial);details.open = !!options.open;return part;
}
