import test from 'node:test';
import assert from 'node:assert/strict';
import {cpSync,existsSync,mkdtempSync,readFileSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import ts from 'typescript';

const root = resolve(process.cwd());
const metadata = JSON.parse(readFileSync(join(root,'package.json'),'utf8')) as {version: string};

test('the bundled assembly guide links the frozen contract and executable local recipes',() => {
  const path = join(root,'APP.md'),contract = readFileSync(path,'utf8');
  assert.match(contract,/3f1ee24/);assert.match(contract,/897f46a/);
  assert.match(contract,/not exported scene factories/);
  const links = [...contract.matchAll(/\]\(([^)]+)\)/g)].map(match => match[1]!);
  assert.ok(links.includes('docs/contracts/rc27-ui-022.md'));
  assert.ok(links.includes('docs/assemblies/coverage.md'));
  assert.ok(links.filter(link => link.startsWith('docs/assemblies/')).length >= 20,'Each existing template region needs assembly instructions.');
  for (const link of links.filter(link => !/^[a-z]+:/i.test(link))) assert.ok(existsSync(resolve(dirname(path),link.split('#')[0]!)),`Missing bundled assembly guide target: ${link}`);
  assert.doesNotMatch(contract,/pith-ui\/app|dist\/app\/index|APP-API\.md/,'The guide must not direct consumers to removed template entries.');
});

test('the public API reference indexes every bounded export with immutable versioned source links',() => {
  const path = join(root,'API.md');assert.ok(existsSync(path),'Part consumers need the complete bundled API index.');
  const reference = readFileSync(path,'utf8'),entryPath = join(root,'src/parts/index.ts');
  const program = ts.createProgram([entryPath],{target: ts.ScriptTarget.ES2022,module: ts.ModuleKind.ESNext,moduleResolution: ts.ModuleResolutionKind.Bundler,noEmit: true,strict: true,skipLibCheck: true});
  const entry = program.getSourceFile(entryPath)!,checker = program.getTypeChecker(),symbols = checker.getExportsOfModule(checker.getSymbolAtLocation(entry)!);
  assert.ok(reference.includes(`pith-ui@${metadata.version}`));
  for (const symbol of symbols) assert.ok(reference.includes(`### ${symbol.name}\n`),symbol.name);
  const sourceLinks = [...reference.matchAll(/\[Source\]\(([^)]+)\)/g)].map(match => match[1]!);
  assert.ok(sourceLinks.length >= symbols.length);
  assert.ok(sourceLinks.every(link => link.startsWith(`https://github.com/minifish-org/pith-ui/blob/v${metadata.version}/src/`)));
  const factories = symbols.map(symbol => symbol.name).filter(name => /^(create|mount)/.test(name)).sort();
  const indexed = [...reference.matchAll(/^\| \[\x60([^\x60]+)\x60\]/gm)].map(match => match[1]!).sort();
  assert.deepEqual(indexed,factories,'The factory index must cover the exact bounded root.');
  assert.ok(factories.every(name => name === 'mountParts' || /^create[A-Za-z0-9]+Part$/.test(name)));
  assert.doesNotMatch(reference,/^### (?:createApplication|createButton|createWorkspaceShell|createSettingsScene|createCostLedger)$/m,'Old factories and whole scenes must not be documented as public exports.');
});

test('the existing docs command generates the bounded API and rejects stale output without rewriting guides or assemblies',() => {
  const directory = mkdtempSync(join(tmpdir(),'pui-parts-docs-'));
  try {
    for (const path of ['src','scripts/api-docs.ts','package.json','tsconfig.json','tsconfig.build.json','APP.md','docs/assemblies','examples/assemblies']) cpSync(join(root,path),join(directory,path),{recursive: true});
    symlinkSync(join(root,'node_modules'),join(directory,'node_modules'),'dir');
    const guide = join(directory,'APP.md'),recipe = join(directory,'examples/assemblies/desk.ts'),guideBefore = readFileSync(guide,'utf8'),recipeBefore = readFileSync(recipe,'utf8');
    const run = (check = false) => spawnSync(process.execPath,['scripts/api-docs.ts',...(check ? ['--check'] : [])],{cwd: directory,encoding: 'utf8',maxBuffer: 8*1024*1024});
    const generated = run();assert.equal(generated.status,0,generated.stderr || generated.stdout);
    assert.ok(existsSync(join(directory,'API.md')));assert.equal(existsSync(join(directory,'APP-API.md')),false,'The removed application API must not be regenerated.');
    const verified = run(true);assert.equal(verified.status,0,verified.stderr || verified.stdout);
    const reference = join(directory,'API.md'),previous = readFileSync(reference,'utf8'),stale = previous.replace(`/blob/v${metadata.version}/src/`,'/blob/v0.0.0/src/');
    assert.notEqual(stale,previous);writeFileSync(reference,stale);
    const checked = run(true);assert.notEqual(checked.status,0);assert.match(checked.stderr,/API\.md.*out of date/i);assert.equal(readFileSync(reference,'utf8'),stale,'--check must never rewrite stale output.');
    const repaired = run();assert.equal(repaired.status,0,repaired.stderr || repaired.stdout);assert.equal(readFileSync(reference,'utf8'),previous);
    writeFileSync(reference,previous+'\nSTALE\n');const changed = run(true);assert.notEqual(changed.status,0);assert.match(changed.stderr,/API\.md.*out of date/i);assert.equal(readFileSync(reference,'utf8'),previous+'\nSTALE\n');
    assert.equal(readFileSync(guide,'utf8'),guideBefore,'API generation must preserve the reviewed application-owned assembly guide.');assert.equal(readFileSync(recipe,'utf8'),recipeBefore,'API generation must preserve executable consumer composition.');
  } finally {rmSync(directory,{recursive: true,force: true});}
});
