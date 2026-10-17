import {adoptFeedback} from '../foundations.js';
import {assertOptions, createOwnedPart, isPartAlive, type Part} from './ownership.js';

export interface FeedbackPartState {message: string; tone?: 'info' | 'error'; announce?: 'none' | 'polite'}
export interface FeedbackPartOptions extends FeedbackPartState {presentation?: 'inline' | 'notice' | 'paragraph'}
export interface FeedbackPart extends Part {update(state: Readonly<FeedbackPartState>): void}

/** Inline feedback; its existing semantic error/hint presentation belongs here. */
export function createFeedbackPart(options: FeedbackPartOptions): FeedbackPart {
  assertOptions(options, ['message', 'tone', 'presentation', 'announce'], 'feedback');
  if (options.presentation !== undefined && !['inline', 'notice', 'paragraph'].includes(options.presentation)) throw new TypeError('Unsupported feedback presentation.');
  const validate = (state: Readonly<FeedbackPartState>) => {
    assertOptions(state, ['message', 'tone', 'announce'], 'feedback');
    if (typeof state.message !== 'string') throw new TypeError('Feedback message must be text.');
    if (state.tone !== undefined && !['info', 'error'].includes(state.tone)) throw new TypeError('Unsupported feedback tone.');
    if (state.announce !== undefined && !['none', 'polite'].includes(state.announce)) throw new TypeError('Unsupported feedback announcement.');
  };
  const {presentation = 'inline', ...initial} = options;
  validate(initial);
  const node = document.createElement(presentation === 'paragraph' ? 'p' : 'div');
  const feedback = adoptFeedback(node, {presentation: presentation === 'notice' ? 'notice' : 'inline', autoHide: presentation === 'notice'});
  let part: FeedbackPart;
  const update = (state: Readonly<FeedbackPartState>) => {
    validate(state);
    if (!isPartAlive(part)) return;
    const tone = state.tone ?? 'info';
    if (presentation !== 'notice') node.className = tone === 'error' ? 'pui-form-error' : 'pui-feature-hint';
    if (state.announce === 'polite') node.setAttribute('aria-live', 'polite'); else node.removeAttribute('aria-live');
    feedback.update({message: state.message, tone});
  };
  part = createOwnedPart(node, {update}, {dispose: feedback.destroy});
  update(initial);
  return part;
}
