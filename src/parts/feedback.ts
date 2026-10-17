import {adoptFeedback} from '../foundations.js';
import {assertOptions, createOwnedPart, isPartAlive, type Part} from './ownership.js';

export interface FeedbackPartState {message: string; tone?: 'info' | 'error'; announce?: 'none' | 'polite'; hidden?: boolean}
export interface FeedbackPartOptions extends FeedbackPartState {presentation?: 'inline' | 'notice' | 'paragraph' | 'lead' | 'plain' | 'note' | 'banner'}
export interface FeedbackPart extends Part {update(state: Readonly<FeedbackPartState>): void}

/** Inline feedback; its existing semantic error/hint presentation belongs here. */
export function createFeedbackPart(options: FeedbackPartOptions): FeedbackPart {
  assertOptions(options, ['message', 'tone', 'presentation', 'announce', 'hidden'], 'feedback');
  if (options.presentation !== undefined && !['inline', 'notice', 'paragraph', 'lead', 'plain', 'note','banner'].includes(options.presentation)) throw new TypeError('Unsupported feedback presentation.');
  const validate = (state: Readonly<FeedbackPartState>) => {
    assertOptions(state, ['message', 'tone', 'announce', 'hidden'], 'feedback');
    if (typeof state.message !== 'string') throw new TypeError('Feedback message must be text.');
    if (state.tone !== undefined && !['info', 'error'].includes(state.tone)) throw new TypeError('Unsupported feedback tone.');
    if (state.announce !== undefined && !['none', 'polite'].includes(state.announce)) throw new TypeError('Unsupported feedback announcement.');
    if (state.hidden !== undefined && typeof state.hidden !== 'boolean') throw new TypeError('Feedback hidden must be boolean.');
  };
  const {presentation = 'inline', ...initial} = options;
  validate(initial);
  const node = document.createElement(presentation === 'paragraph' || presentation === 'lead' || presentation === 'note' ? 'p' : 'div');
  const feedback = adoptFeedback(node, {presentation: presentation === 'notice' ? 'notice' : 'inline', autoHide: presentation === 'notice' || presentation === 'plain'});
  let part: FeedbackPart;
  const update = (state: Readonly<FeedbackPartState>) => {
    validate(state);
    if (!isPartAlive(part)) return;
    const tone = state.tone ?? 'info';
    if (presentation !== 'notice') node.className = presentation === 'plain' ? '' : presentation === 'note' ? `pui-preview-note${tone === 'error' ? ' pui-form-error' : ''}` : presentation === 'lead' ? `pui-provider-login-status${tone === 'error' ? ' pui-form-error' : ''}` : tone === 'error' ? 'pui-form-error' : 'pui-feature-hint';
    if (state.announce === 'polite') node.setAttribute('aria-live', 'polite'); else node.removeAttribute('aria-live');
    feedback.update({message: state.message, tone});
    if (presentation === 'banner') {node.className = 'pui-inline-error';node.setAttribute('role','alert');}
    node.hidden = state.hidden ?? ((presentation === 'notice' || presentation === 'plain' || presentation === 'banner') && !state.message);
  };
  part = createOwnedPart(node, {update}, {dispose: feedback.destroy});
  update(initial);
  return part;
}
