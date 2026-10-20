import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {selectScope} from '../../scripts/ci-scope.ts';

test('real PR history emits successful documentation step outputs and rejects whitespace errors',() => {
  const script = resolve('scripts/ci-scope.ts'),root = mkdtempSync(join(tmpdir(),'pith-ci-scope-'));
  const git = (args: string[]) => execFileSync('git',args,{cwd: root,encoding: 'utf8',stdio: ['ignore','pipe','pipe']});
  const commit = () => {git(['add','AGENTS.md']);git(['-c','user.name=CI Fixture','-c','user.email=ci@example.test','-c','commit.gpgsign=false','-c','core.hooksPath=/dev/null','commit','-qm','fixture']);};
  try {
    git(['init','-q']);writeFileSync(join(root,'AGENTS.md'),'Guidance\n');commit();
    const base = git(['rev-parse','HEAD']).trim(),output = join(root,'step-output');
    writeFileSync(join(root,'AGENTS.md'),'Updated guidance\n');commit();
    const run = () => execFileSync(process.execPath,['--experimental-strip-types',script,'pull_request',base],{cwd: root,encoding: 'utf8',stdio: ['ignore','pipe','pipe'],env: {...process.env,GITHUB_OUTPUT: output}});
    assert.equal(JSON.parse(run()).mode,'docs');
    assert.match(readFileSync(output,'utf8'),/install=false\n/);
    assert.match(readFileSync(output,'utf8'),/browser=false\n/);
    writeFileSync(join(root,'AGENTS.md'),'Whitespace error \n');commit();
    assert.throws(run,/Command failed/);
  } finally {rmSync(root,{recursive: true,force: true});}
});

test('only PR maintenance documents can omit installation',() => {
  assert.equal(selectScope(['AGENTS.md','docs/validation.md']).mode,'docs');
  for (const event of ['push','workflow_dispatch','workflow_call']) assert.equal(selectScope(['AGENTS.md'],event).mode,'full');
});
test('shipped documentation keeps the public package consumer proof',() => {
  for (const file of ['README.md','AI.md','APP.md','API.md','LICENSE','docs/assemblies/composer.md']) {
    const scope = selectScope(['AGENTS.md',file]);
    assert.equal(scope.mode,'package',file);assert.equal(scope.package,true);assert.equal(scope.browser,false);
  }
});
test('isolated test changes select the matching test group',() => {
  assert.equal(selectScope(['tests/core.test.ts']).mode,'unit');
  assert.equal(selectScope(['tests/tools/release.test.ts']).mode,'unit');
  assert.equal(selectScope(['tests/parts-artifacts.spec.ts']).mode,'browser');
});
test('source, public API, fixtures, dependencies, build config and mixed groups expand coverage',() => {
  for (const file of ['src/index.ts','src/recipes/types.ts','src/styles.css','tests/fixture.html','tests/recipes-fixture.ts','examples/assemblies/frame.ts','package.json','package-lock.json','vite.config.ts','tsconfig.json','playwright.config.ts','.github/workflows/ci.yml','scripts/ci-scope.ts','new-runtime/file']) assert.equal(selectScope([file]).mode,'full',file);
  assert.equal(selectScope(['tests/core.test.ts','tests/parts-artifacts.spec.ts']).mode,'full');
  assert.equal(selectScope(['src/removed.ts','AGENTS.md']).mode,'full');
  assert.equal(selectScope(null).mode,'full');
});
test('the actual selector falls back to full checks when the PR base is unavailable',() => {
  const output = execFileSync(process.execPath,['--experimental-strip-types','scripts/ci-scope.ts','pull_request','missing-ci-base-ref'],{encoding: 'utf8',env: {...process.env,GITHUB_OUTPUT: ''}});
  assert.equal(JSON.parse(output).mode,'full');
});
