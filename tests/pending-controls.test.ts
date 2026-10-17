// Preserved Desk regressions now live with their private library implementation.
import test from 'node:test';
import assert from 'node:assert/strict';
import { controlDisabled, setControlPending } from '../src/core.ts';

test('snapshot availability preserves loading, connection probes and pending copies', () => {
  const button = { dataset: {}, disabled: false } as unknown as HTMLButtonElement;
  setControlPending(button, true);
  assert.equal(controlDisabled(button, false), true);
  setControlPending(button, false);
  assert.equal(controlDisabled(button, true), true);
  assert.equal(controlDisabled(button, false), false);
  button.dataset.copyPending = 'true';
  assert.equal(controlDisabled(button, false), true);
});
