import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {test} from 'node:test';
import {catalog} from '../showroom/catalog.js';
import * as parts from '../src/parts/index.js';

test('the public showroom contains only formal parts, with no template or application page',() => {
  assert.ok(catalog.length > 0);
  for (const item of catalog) assert.ok(['foundations','components'].includes(item.layer),`${item.id} exposes a whole template layer`);
  const source = readFileSync(resolve('showroom/catalog.ts'),'utf8');
  assert.doesNotMatch(source,/applicationCases|pageCases|composerCases|contentCases|filesCases|formsCases|navigationCases|primitiveCases|foundationCases/);
});

test('every formal runtime export has a demonstrated part case and executable example',() => {
  const covered = new Set<string>();
  for (const item of catalog) {
    const factories = (item as typeof item & {factories?: readonly string[]}).factories;
    assert.ok(factories?.length,`${item.id} has no formal factory declaration`);
    for (const name of factories) {assert.equal(typeof (parts as Record<string,unknown>)[name],'function',`${name} is not a formal factory`);assert.ok(item.code.includes(name),`${item.id} does not show ${name}`);covered.add(name);}
    assert.match(item.code,/from ['"]pith-ui['"]/);
    assert.doesNotMatch(item.code,/pith-ui\/app|src\/(?:dom|primitives|app)|\.element\b|\.control\b|style\s*:|className\s*:/);
  }
  assert.deepEqual([...covered].sort(),Object.keys(parts).sort());
});

test('the public showroom build has no complete application output',() => {
  const config = readFileSync(resolve('vite.config.ts'),'utf8');
  assert.doesNotMatch(config,/examples\/application\/index\.html/);
});
