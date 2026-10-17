import {createFeatureStatus} from '../../../src/forms/dialog-frame.js';
import type {AppEnvironment} from './internal.js';

export interface LoadingState {readonly error?: string}
export interface LoadingSession {
  update(state: Readonly<LoadingState>): void;
  fail(message: string): void;
  isOpen(): boolean;
  close(): void;
  destroy(): void;
}

/** Private shared implementation for the named scenes' existing loading phase. */
export function createLoadingSession(env: AppEnvironment, title: string, initial: LoadingState, onClose?: () => void): LoadingSession {
  const block = createFeatureStatus({message: initial.error || 'Loading…', error: !!initial.error});
  const owner = env.openFeature(title, block, onClose);
  return {
    update(state) {if (owner.isOpen()) block.update({message: state.error || 'Loading…', error: !!state.error});},
    fail: owner.fail, isOpen: owner.isOpen, close: owner.close, destroy: owner.destroy,
  };
}
