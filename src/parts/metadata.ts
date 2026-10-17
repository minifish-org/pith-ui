import {patchChildren} from '../content/views.js';
import {assertOptions,createOwnedPart,isPartAlive,type Part} from './ownership.js';

export type MetadataPurpose = 'summary-label'|'field-label'|'count'|'state'|'trailing-state'|'search-count';
export interface MetadataPartState {text: string;tone?: 'neutral'|'active'|'error';hidden?: boolean}
export interface MetadataPart extends Part {update(state: Readonly<MetadataPartState>): void}
/** One native span. Counts and statuses remain caller supplied content. */
export function createMetadataPart(options: MetadataPartState & {purpose: MetadataPurpose}): MetadataPart {
  assertOptions(options,['purpose','text','tone','hidden'],'metadata');
  const classes: Record<MetadataPurpose,string> = {'summary-label': 'pui-tool-group-label','field-label': 'pui-tool-field-label',count: 'pui-tool-group-count',state: 'pui-tool-group-count','trailing-state': 'pui-tool-status','search-count': ''};
  const purpose = options.purpose;
  if (!Object.hasOwn(classes,purpose)) throw new TypeError('Unknown metadata purpose.');
  const validate = (state: Readonly<MetadataPartState>) => {
    assertOptions(state,['text','tone','hidden'],'metadata state');
    if (typeof state.text !== 'string') throw new TypeError('Metadata must be text.');
    if (state.hidden !== undefined && typeof state.hidden !== 'boolean') throw new TypeError('Metadata visibility must be boolean.');
    if (state.tone !== undefined && !['neutral','active','error'].includes(state.tone)) throw new TypeError('Unknown metadata tone.');
    if (state.tone && state.tone !== 'neutral' && !['state','trailing-state'].includes(purpose)) throw new TypeError('Only state metadata supports a semantic tone.');
    if (purpose === 'trailing-state' && state.tone === 'active') throw new TypeError('Trailing state supports neutral or error.');
  };
  validate({text: options.text,tone: options.tone,hidden: options.hidden});
  const node = document.createElement('span');if (purpose === 'search-count') {node.dataset.findCount = '';node.setAttribute('role','status');node.setAttribute('aria-live','polite');}let part: MetadataPart;
  part = createOwnedPart<Omit<MetadataPart,keyof Part>>(node,{update(state: Readonly<MetadataPartState>) {validate(state);if (!isPartAlive(part)) return;
    node.className = purpose === 'state' && state.tone === 'active' ? 'pui-tool-group-running' : purpose === 'state' && state.tone === 'error' ? 'pui-tool-group-failed' : classes[purpose]+(purpose === 'trailing-state' && state.tone === 'error' ? ' pui-tool-status-error' : '');
    node.hidden = !!state.hidden;
    if (node.textContent !== state.text) {const source = document.createDocumentFragment();source.append(document.createTextNode(state.text));patchChildren(node,source);}
  }});part.update({text: options.text,tone: options.tone,hidden: options.hidden});return part;
}

export interface CodePropertyPart extends Part {update(state: {label: string;value: string}): void}
/** A literal label/code property. The two native children are its intrinsic
 * structure; no command, workspace or other business data is interpreted. */
export function createCodePropertyPart(options: {label: string;value: string}): CodePropertyPart {
  const validate = (state: {label: string;value: string}) => {assertOptions(state,['label','value'],'code property');if (typeof state.label !== 'string' || typeof state.value !== 'string') throw new TypeError('Code property content must be text.');};validate(options);
  const node = document.createElement('div');node.className = 'pui-command-directory';
  const label = document.createElement('span');label.className = 'pui-tool-field-label';const code = document.createElement('code');node.append(label,code);
  const part = createOwnedPart(node,{update(state: {label: string;value: string}) {validate(state);if (!isPartAlive(part)) return;if (label.textContent !== state.label) label.textContent = state.label;
    if (code.textContent !== state.value) {const source = document.createDocumentFragment();source.append(document.createTextNode(state.value));patchChildren(code,source);}
  }});part.update(options);return part;
}
