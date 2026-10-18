import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {formatCost, thinkingLabel} from '../src/recipes/index.js';

test('compact effort labels and USD estimates remain readable without losing small charges', () => {
  assert.deepEqual(['off','high','xhigh','max'].map(thinkingLabel), ['Off','High','Extra high','Max']);
  const cost = {requestCount: 1,unknownRequests: 0,runRequests: 1,runUnknownRequests: 0,total: 1.068332,runTotal: 0.007004};
  assert.equal(formatCost(cost), '~$1.07');
  assert.equal(formatCost(cost, true), '~$0.007');
  assert.equal(formatCost({...cost,total: 0.0000001234}), '~$0.000000123');
  assert.equal(formatCost({...cost,total: 0}), '~$0.00');
  assert.equal(formatCost({...cost,requestCount: 2,unknownRequests: 1}), '~$1.07 (partial)');
  assert.equal(formatCost({...cost,unknownRequests: 1}), 'Unknown');
  assert.equal(formatCost({...cost,unavailable: true}), 'Unavailable');
});

test('the published recipe entry provides shared regions without publishing an application', async () => {
  const metadata = JSON.parse(readFileSync('package.json', 'utf8'));
  assert.deepEqual(metadata.exports['./recipes'], {types: './dist/recipes/index.d.ts', import: './dist/recipes/index.js'});
  const entry: string = 'pith-ui/recipes';
  const recipes = await import(entry);
  for (const name of ['composeFrame', 'composeSettings', 'composeModelPicker', 'composeResourceEditor', 'composeFilePreview', 'composeConversationReader', 'createDialogHost']) {
    assert.equal(typeof recipes[name], 'function', name);
  }
  assert.equal('mountDesk' in recipes, false);
  assert.equal(Object.keys(recipes).some(name => name.startsWith('mount')), false);
});
