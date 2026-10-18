import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

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
