import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {after,before,test} from 'node:test';

const root = resolve('.');let temporary: string,files: Set<string>;
before(() => {
  temporary = mkdtempSync(join(tmpdir(),'pith-ui-parts-pack-'));
  const result = spawnSync('npm',['pack','--ignore-scripts','--json','--pack-destination',temporary],{cwd: root,encoding: 'utf8'});
  assert.equal(result.status,0,result.stdout+result.stderr);const [packed] = JSON.parse(result.stdout) as Array<{files: Array<{path: string}>}>;files = new Set(packed!.files.map(file => file.path));
});
after(() => {if (temporary) rmSync(temporary,{recursive: true,force: true});});

test('the final package has one bounded root and its portable stylesheet',() => {
  const metadata = JSON.parse(readFileSync(join(root,'package.json'),'utf8'));
  assert.deepEqual(Object.keys(metadata.exports).sort(),['.','./styles.css']);
  assert.deepEqual(metadata.exports['.'],{types: './dist/index.d.ts',import: './dist/index.js'});
  assert.equal(metadata.exports['./styles.css'],'./dist/styles.css');
});

test('the packed documentation includes compilable assemblies while templates stay private',() => {
  for (const name of ['frame','model-picker','text-edit','confirmation','attachments']) {
    assert.ok(files.has(`docs/assemblies/${name === 'frame' ? 'frame-navigation' : name}.md`),`Missing assembly instructions for ${name}`);
    assert.ok(files.has(`examples/assemblies/${name}.ts`),`Missing executable assembly ${name}`);
  }
  assert.ok(![...files].some(file => file.startsWith('dist/app/')),'The package retains the removed application entry');
  assert.ok(!files.has('APP-API.md'),'Obsolete application API remains authoritative in the archive');
});
