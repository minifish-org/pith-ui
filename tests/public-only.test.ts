import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';

test('the package has one components entry and no application or scene entry',()=>{
  const pkg=JSON.parse(readFileSync(resolve('package.json'),'utf8'));
  assert.deepEqual(Object.keys(pkg.exports).sort(),['.','./styles.css']);
  assert.ok(!existsSync(resolve('src/app')),'Application composition belongs to its consumer');
  assert.ok(!pkg.files.some((file:string)=>/^APP(?:-API)?\.md$/.test(file)));
});

test('the formal showroom has no internal or whole-scene catalog entries',()=>{
  const catalog=readFileSync(resolve('showroom/catalog.ts'),'utf8');
  assert.doesNotMatch(catalog,/applicationCases|pageCases|internal|pith-ui\/app/);
  const main=readFileSync(resolve('showroom/main.ts'),'utf8');
  assert.doesNotMatch(main,/库内实现片段|pith-ui\/app|完整界面|selected\.entry === 'internal'/);
  assert.match(main,/组合示例/);
  assert.match(main,/基础积木/);
  assert.match(main,/\?\? 'button'/);
});

test('build and package validation reject stale application artifacts',()=>{
  const build=readFileSync(resolve('scripts/build.ts'),'utf8');
  assert.match(build,/prune|reachable|reachability/);
  const verify=readFileSync(resolve('scripts/verify-package.ts'),'utf8');
  assert.match(verify,/ERR_PACKAGE_PATH_NOT_EXPORTED/);
  assert.doesNotMatch(verify,/Missing application factory|complete application reference|appExports:/);
});
