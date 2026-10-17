import {createButtonPart} from './button.js';
import {createFieldLabelPart,isSecretValuePart,setSecretRevealed,type ValuePart} from './fields.js';
import {assertOptions,createOwnedPart,isPartAlive,nodeOf,type Part} from './ownership.js';

export interface SecretLabelPartState {label: string;revealed?: boolean;hidden?: boolean}
export interface SecretLabelPartOptions extends SecretLabelPartState {control: ValuePart;onToggle?(revealed: boolean): void}
export interface SecretLabelPart extends Part {update(state: Readonly<SecretLabelPartState>): void}
function validate(state: Readonly<SecretLabelPartState>): void {
  if (typeof state.label !== 'string') throw new TypeError('Secret label must be text.');
  for (const key of ['revealed','hidden'] as const) if (state[key] !== undefined && typeof state[key] !== 'boolean') throw new TypeError(`Secret label ${key} must be boolean.`);
}

/** A label and visibility action for a borrowed secret textarea. The control
 * remains its own native part; this adds only the original useful heading row. */
export function createSecretLabelPart(options: SecretLabelPartOptions): SecretLabelPart {
  assertOptions(options,['label','revealed','hidden','control','onToggle'],'secret label');validate(options);
  if (!isSecretValuePart(options.control)) throw new TypeError('A secret label requires a live Pith UI secret textarea.');
  if (options.onToggle !== undefined && typeof options.onToggle !== 'function') throw new TypeError('Secret onToggle must be a callback.');
  const node = document.createElement('div');node.className = 'pui-secret-label';
  const label = createFieldLabelPart({label: options.label,control: options.control});
  let revealed = !!options.revealed,part: SecretLabelPart;
  const sync = () => {
    if (!isSecretValuePart(options.control)) return;
    setSecretRevealed(options.control,revealed);button.update({label: revealed ? 'Hide' : 'Show',variant: 'secondary'});
    nodeOf(button).setAttribute('aria-pressed',String(revealed));
  };
  const button = createButtonPart({label: revealed ? 'Hide' : 'Show',variant: 'secondary',onAction() {
    if (!isPartAlive(part) || !isSecretValuePart(options.control)) return;
    revealed = !revealed;sync();options.onToggle?.(revealed);
  }});
  nodeOf(button).setAttribute('aria-controls',nodeOf(options.control).id);
  const update = (state: Readonly<SecretLabelPartState>) => {
    assertOptions(state,['label','revealed','hidden'],'secret label state');validate(state);if (!isPartAlive(part)) return;
    label.update({label: state.label});node.hidden = !!state.hidden;if (state.revealed !== undefined) revealed = state.revealed;sync();
  };
  try {part = createOwnedPart<Omit<SecretLabelPart,keyof Part>>(node,{update},{children: [label,button],dispose() {if (isSecretValuePart(options.control)) setSecretRevealed(options.control,false);}});}
  catch (error) {label.destroy();button.destroy();throw error;}
  update({label: options.label,revealed: options.revealed,hidden: options.hidden});return part;
}
