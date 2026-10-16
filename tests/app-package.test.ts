import assert from 'node:assert/strict';
import {after, before, test} from 'node:test';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import ts from 'typescript';

const root = resolve(process.cwd());
let temporary: string, archive: string, consumer: string;
let packed: {filename: string; files: {path: string}[]};
const metadata = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {name: string; version: string};
function command(executable: string, args: string[], cwd: string, expectSuccess = true) {
  const result = spawnSync(executable, args, {cwd, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024});
  if (expectSuccess) assert.equal(result.status, 0, `${executable} ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`);
  return result;
}
const npm = (args: string[], cwd: string) => command('npm', args, cwd).stdout;
function compile(file: string): readonly ts.Diagnostic[] {
  const program = ts.createProgram([file], {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'], types: [],
    strict: true, noEmit: true, skipLibCheck: false, verbatimModuleSyntax: true,
  });
  assert.equal(program.getCompilerOptions().skipLibCheck, false);
  return ts.getPreEmitDiagnostics(program);
}
const diagnosticText = (diagnostics: readonly ts.Diagnostic[]) => diagnostics.map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));

before(() => {
  temporary = mkdtempSync(join(tmpdir(), 'pith-ui-app-package-'));
  consumer = join(temporary, 'consumer'); mkdirSync(consumer);
  npm(['run', 'build'], root);
  [packed] = JSON.parse(npm(['pack', '--json', '--ignore-scripts', '--pack-destination', temporary], root));
  archive = join(temporary, packed.filename);
  writeFileSync(join(consumer, 'package.json'), JSON.stringify({name: 'installed-application-consumer', version: '1.0.0', private: true, type: 'module'}));
  npm(['install', '--ignore-scripts', '--no-audit', '--no-fund', archive], consumer);
});
after(() => {if (temporary) rmSync(temporary, {recursive: true, force: true});});

test('the actual npm archive carries the independent app ESM/declarations and portable CSS', () => {
  const paths = new Set(packed.files.map(file => file.path));
  for (const path of ['dist/app/index.js', 'dist/app/index.d.ts', 'dist/index.js', 'dist/index.d.ts', 'dist/styles.css']) assert.ok(paths.has(path), `Missing packed public entry ${path}`);
  assert.ok([...paths].every(path => !/^(?:src|tests|showroom|examples|node_modules)\//.test(path)), 'Development and reference sources do not belong in the runtime package');
  const installed = join(consumer, 'node_modules/pith-ui');
  const pkg = JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8'));
  assert.deepEqual(pkg.exports['./app'], {types: './dist/app/index.d.ts', import: './dist/app/index.js'});
  assert.equal(pkg.exports['./styles.css'], './dist/styles.css');
  for (const path of ['dist/app/index.js', 'dist/app/index.d.ts', 'dist/styles.css']) assert.ok(readFileSync(join(installed, path)).equals(readFileSync(join(root, path))), `Installed bytes differ: ${path}`);
  assert.doesNotMatch(readFileSync(join(installed, 'dist/styles.css'), 'utf8'), /@import\s+['"]\.\//, 'Published CSS must not depend on missing relative sources');
  const runtime = command(process.execPath, ['--input-type=module', '-e', `const app = await import('pith-ui/app'); const generic = await import('pith-ui'); if (typeof app.createApplication !== 'function' || typeof generic.createButton !== 'function') throw new Error('Missing factory'); if ('createButton' in app || 'createWorkspaceShell' in app || 'createSettingsScene' in app) throw new Error('Low-level application escape'); console.log('both-public-entries');`], consumer);
  assert.match(runtime.stdout, /both-public-entries/);
});

test('the complete maintained reference compiles and builds through only installed app and CSS entries', () => {
  const reference = join(root, 'examples/application/main.ts');
  assert.ok(existsSync(reference), 'The complete application reference must be maintained.');
  const text = readFileSync(reference, 'utf8'), source = ts.createSourceFile(reference, text, ts.ScriptTarget.Latest, true);
  const imports: string[] = [];
  const visit = (node: ts.Node): void => {if (ts.isImportDeclaration(node) && ts.isStringLiteralLike(node.moduleSpecifier)) imports.push(node.moduleSpecifier.text); ts.forEachChild(node, visit);}; visit(source);
  assert.ok(imports.includes('pith-ui/app') && imports.includes('pith-ui/styles.css'));
  assert.ok(imports.every(value => ['pith-ui/app', 'pith-ui/styles.css'].includes(value)), 'Reference consumption must not redirect to root/private/source modules');
  writeFileSync(join(consumer, 'main.ts'), text);
  assert.deepEqual(diagnosticText(compile(join(consumer, 'main.ts'))), []);
  writeFileSync(join(consumer, 'index.html'), '<!doctype html><html><head><meta charset="utf-8"><title>Installed application reference</title></head><body><div id="app"></div><script type="module" src="/main.ts"></script></body></html>');
  command(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), 'build'], consumer);
  const assets = readdirSync(join(consumer, 'dist/assets'));
  assert.ok(assets.some(name => name.endsWith('.js')) && assets.some(name => name.endsWith('.css')), 'The application consumer production build must include JS and CSS.');
});

test('the installed generic root retains its maintained examples and callback compatibility under strict declarations', () => {
  for (const [source, target] of [['docs/examples.ts', 'generic-examples.ts'], ['tests/callback-compatibility.ts', 'callback-compatibility.ts']]) {
    const file = join(consumer, target!);
    writeFileSync(file, readFileSync(join(root, source!), 'utf8').replaceAll("'../src/index.js'", "'pith-ui'"));
    assert.deepEqual(diagnosticText(compile(file)), []);
  }
});

for (const [label, text, token] of [
  ['application element handle', 'app.element;', 'element'],
  ['scene element handle', 'app.workspace.element;', 'element'],
  ['scene part accessor', "app.workspace.part('composer');", 'part'],
  ['free inline style', "createApplication(mount, {style: {padding: 8}});", 'style'],
  ['free class', "createApplication(mount, {className: 'custom'});", 'className'],
  ['free render callback', "createApplication(mount, {render: () => document.createElement('div')});", 'render'],
  ['DOM node slot', 'createApplication(mount, {children: document.body});', 'children'],
  ['semantic text replaced by a node', "app.workspace.openMessageEditor({title: 'Edit', value: document.body});", 'HTMLElement'],
] as const) {
  test(`actual packed declarations reject ${label}`, () => {
    const file = join(consumer, 'invalid-consumer.ts');
    writeFileSync(file, `import {createApplication} from 'pith-ui/app';\ndeclare const mount: HTMLElement;\nconst app = createApplication(mount);\n${text}\n`);
    const diagnostics = compile(file).filter(diagnostic => diagnostic.file?.fileName === file && diagnostic.start !== undefined && diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line === 3);
    assert.ok(diagnostics.length > 0, `Packed public types accepted forbidden ${label}`);
    assert.ok(diagnosticText(diagnostics).some(message => message.includes(token)), diagnosticText(diagnostics).join('\n'));
  });
}

// Exercise the real release verifier in an isolated repository-shaped fixture.
// Its node_modules link supplies only the existing locked tools; the package
// consumed by the verifier is always an actual independently installed tarball.
function releaseVerificationFixture(name: string, mutate: (packageRoot: string, pipelineRoot: string) => void) {
  const pipeline = join(temporary, name); mkdirSync(pipeline);
  const unpacked = join(pipeline, 'unpacked'); mkdirSync(unpacked);
  command('tar', ['-xzf', archive, '-C', unpacked], pipeline);
  const packageRoot = join(unpacked, 'package');
  mkdirSync(join(pipeline, 'scripts')); mkdirSync(join(pipeline, 'artifacts'));
  for (const file of ['release.ts', 'published-package.ts', 'verify-package.ts']) cpSync(join(root, 'scripts', file), join(pipeline, 'scripts', file));
  for (const directory of ['docs', 'examples/application']) {
    const source = join(root, directory);
    if (existsSync(source)) cpSync(source, join(pipeline, directory), {recursive: true});
  }
  mkdirSync(join(pipeline, 'tests'));
  cpSync(join(root, 'tests/callback-compatibility.ts'), join(pipeline, 'tests/callback-compatibility.ts'));
  symlinkSync(join(root, 'node_modules'), join(pipeline, 'node_modules'), 'dir');
  writeFileSync(join(pipeline, 'package.json'), JSON.stringify({name: metadata.name, version: metadata.version, type: 'module'}));
  mutate(packageRoot, pipeline);
  const [repacked] = JSON.parse(npm(['pack', '--json', '--ignore-scripts', '--pack-destination', join(pipeline, 'artifacts')], packageRoot)) as {filename: string}[];
  const tarball = join(pipeline, 'artifacts', repacked!.filename);
  writeFileSync(join(pipeline, 'artifacts/package-manifest.json'), JSON.stringify({filename: repacked!.filename, name: metadata.name, version: metadata.version, sha256: createHash('sha256').update(readFileSync(tarball)).digest('hex'), commit: process.env.GITHUB_SHA ?? 'isolated-verification-fixture', dirty: false}));
  return command(process.execPath, ['scripts/release.ts', 'verify'], pipeline, false);
}

test('the isolated real release verifier accepts the valid packed package before mutations', () => {
  const result = releaseVerificationFixture('valid-package', () => {});
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /Verified exact tarball/);
});

test('the actual release gate refuses a tarball whose independent application entry is absent', () => {
  const result = releaseVerificationFixture('missing-app', packageRoot => rmSync(join(packageRoot, 'dist/app'), {recursive: true, force: true}));
  assert.notEqual(result.status, 0, 'The real release gate ignored a missing app entry.');
  assert.match(result.stdout + result.stderr, /dist\/app\/index\.(?:js|d\.ts)|Cannot find.*pith-ui\/app/i);
});

test('the actual release gate checks packed app declarations without skipLibCheck', () => {
  const result = releaseVerificationFixture('invalid-app-declaration', packageRoot => {
    const declaration = join(packageRoot, 'dist/app/index.d.ts');
    writeFileSync(declaration, readFileSync(declaration, 'utf8') + '\nexport interface DeclarationFailure { value: MissingTypeFromPackedApplication }\n');
  });
  assert.notEqual(result.status, 0, 'The real release gate skipped the packed application declarations.');
  assert.match(result.stdout + result.stderr, /MissingTypeFromPackedApplication/);
});

test('the actual release gate compiles the complete maintained reference against that exact tarball', () => {
  const result = releaseVerificationFixture('invalid-reference', (_packageRoot, pipelineRoot) => {
    const reference = join(pipelineRoot, 'examples/application/main.ts');
    assert.ok(existsSync(reference));
    writeFileSync(reference, readFileSync(reference, 'utf8') + '\ncreateApplication(mount).element;\n');
  });
  assert.notEqual(result.status, 0, 'The real release gate did not compile the maintained application reference.');
  assert.match(result.stdout + result.stderr, /element/);
});
