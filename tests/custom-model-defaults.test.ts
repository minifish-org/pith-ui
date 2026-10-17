import test from 'node:test';
import assert from 'node:assert/strict';
import type {CustomModelValue} from '../src/forms/custom-connection.js';

type Defaults = () => CustomModelValue;

async function defaults(entry: 'app' | 'general'): Promise<Defaults> {
  const module = entry === 'app' ? await import('../src/app/index.js') : await import('../src/legacy.js');
  const factory: unknown = Reflect.get(module, 'customModelDefaults');
  assert.equal(typeof factory, 'function', `${entry} entry exports the pure custom model defaults function`);
  return factory as Defaults;
}

test('custom model defaults are available through both public entries with the existing limits', async () => {
  const app = await defaults('app');
  const general = await defaults('general');
  assert.equal(app, general, 'Both public entries expose the same implementation');
  assert.deepEqual(app(), {id: '', contextWindow: 128000, maxTokens: 8192});
});

test('each custom model defaults result is independent and contains no inherited capabilities or prices', async () => {
  const createDefaults = await defaults('app');
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
