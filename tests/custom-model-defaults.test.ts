import test from 'node:test';
import assert from 'node:assert/strict';
import {customModelDefaults as createDefaults} from '../src/recipes/custom-connection.js';

test('custom model defaults retain the existing limits',()=>{assert.deepEqual(createDefaults(),{id:'',contextWindow:128000,maxTokens:8192});});

test('each custom model defaults result is independent and contains no inherited capabilities or prices', async () => {
  const first = createDefaults();
  const second = createDefaults();
  assert.notEqual(first, second);
  first.id = 'edited-model';
  first.name = 'Edited name';
  first.contextWindow = 64000;
  first.maxTokens = 4096;
  first.reasoning = true;
  first.input = ['text', 'image'];
  first.cost = {input: 1, output: 2, cacheRead: 3, cacheWrite: 4};
  assert.deepEqual(second, {id: '', contextWindow: 128000, maxTokens: 8192});
  assert.deepEqual(createDefaults(), {id: '', contextWindow: 128000, maxTokens: 8192});
});
