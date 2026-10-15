import test from 'node:test';
import assert from 'node:assert/strict';
import { findRanges } from '../src/content/conversation-reader.ts';

test('literal find preserves Unicode offsets and treats query punctuation as text', () => {
  assert.deepEqual(findRanges('截图😀\nCODE code 截图', '截图'), [{ start: 0, end: 2 }, { start: 15, end: 17 }]);
  assert.deepEqual(findRanges('a+b [x] a+b .*', 'a+b'), [{ start: 0, end: 3 }, { start: 8, end: 11 }]);
  assert.deepEqual(findRanges('a+b [x] a+b .*', '.*'), [{ start: 12, end: 14 }]);
  assert.deepEqual(findRanges('CODE code', 'code'), [{ start: 0, end: 4 }, { start: 5, end: 9 }]);
  assert.deepEqual(findRanges('anything', ''), []);
});
