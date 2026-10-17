import {assertOptions,createOwnedPart,isPartAlive,type Part} from './ownership.js';

export interface ProgressPartState {label: string; value: number; hidden?: boolean}
export interface ProgressPart extends Part {update(state: Readonly<ProgressPartState>): void}
function validate(state: Readonly<ProgressPartState>): void {
  assertOptions(state,['label','value','hidden'],'progress');
  if (typeof state.label !== 'string') throw new TypeError('Progress label must be text.');
  if (!Number.isFinite(state.value)) throw new TypeError('Progress value must be a finite percentage.');
  if (state.hidden !== undefined && typeof state.hidden !== 'boolean') throw new TypeError('Progress hidden must be boolean.');
}
/** A native percentage progress track. Dimensions and accent belong to the library. */
export function createProgressPart(options: ProgressPartState): ProgressPart {
  validate(options);
  const node = document.createElement('progress'); node.className = 'pui-progress-track'; node.max = 100;
  let part: ProgressPart;
  const update = (state: Readonly<ProgressPartState>) => {
    validate(state); if (!isPartAlive(part)) return;
    node.setAttribute('aria-label',state.label); node.value = state.value; node.hidden = !!state.hidden;
  };
  part = createOwnedPart<Omit<ProgressPart,keyof Part>>(node,{update}); update(options); return part;
}
