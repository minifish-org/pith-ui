import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {lstat, mkdtemp, mkdir, readFile, readdir, realpath, stat, writeFile} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath, pathToFileURL} from 'node:url';

const execute = promisify(execFile);
async function run(command: string, args: string[], cwd: string): Promise<string> {
  try {return (await execute(command, args, {cwd, maxBuffer: 8 * 1024 * 1024})).stdout.trim();}
  catch (error) {
    const result = error as {stdout?: string; stderr?: string; message?: string};
    throw new Error(`${result.message ?? `${command} failed`}\n${result.stdout ?? ''}\n${result.stderr ?? ''}`);
  }
}
function assert(condition: unknown, message: string): asserts condition {if (!condition) throw new Error(message);}

interface Asset {path: string; bytes: number}
export interface PackageConsumerVerification {
  exports: string[];
  appExports: string[];
  consumerTypecheck: 'passed';
  consumerProductionBuild: 'passed';
  genericConsumerProductionBuild: 'passed';
  referenceSha256: string;
  rejectedTypeCases: number;
  consumerAssets: Asset[];
  genericConsumerAssets: Asset[];
}

async function assets(directory: string, prefix = ''): Promise<Asset[]> {
  const result: Asset[] = [];
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const path = join(directory, entry.name), relative = `${prefix}${entry.name}`;
    if (entry.isDirectory()) result.push(...await assets(path, `${relative}/`));
    else result.push({path: relative, bytes: (await stat(path)).size});
  }
  return result;
}

/** Verify an already-installed exact archive or registry package, never a source alias.
 * This module is inert on import: the publisher job has no development dependencies.
 * The locked compiler and builder are loaded only by this verification operation.
 */
export async function verifyInstalledPackageConsumer(root: string, consumer: string): Promise<PackageConsumerVerification> {
  const metadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as {name: string; version: string};
  const installed = join(consumer, 'node_modules', metadata.name);
  assert(!(await lstat(installed)).isSymbolicLink(), 'Package consumer must use the installed package, not a source symlink');
  const pkg = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8')) as {
    name: string; version: string; dependencies?: Record<string, string>;
    exports?: Record<string, string | {types?: string; import?: string}>;
  };
  assert(pkg.name === metadata.name && pkg.version === metadata.version, 'Installed package metadata differs');
  for (const document of ['README.md', 'AI.md', 'API.md', 'APP.md', 'APP-API.md', 'LICENSE']) assert((await readFile(join(installed, document))).byteLength > 0, `Missing or empty package file: ${document}`);
  assert(pkg.dependencies && Object.values(pkg.dependencies).every(version => /^\d+\.\d+\.\d+$/.test(version)), 'Runtime dependencies must use exact versions');
  for (const [entry, stem] of [['.', 'index'], ['./app', 'app/index']] as const) {
    const target = pkg.exports?.[entry];
    assert(target && typeof target !== 'string' && target.types === `./dist/${stem}.d.ts` && target.import === `./dist/${stem}.js`, `Invalid independent public entry: ${entry}`);
    for (const extension of ['js', 'd.ts']) assert((await readFile(join(installed, `dist/${stem}.${extension}`))).byteLength > 0, `Missing or empty package file: dist/${stem}.${extension}`);
  }
  assert(pkg.exports?.['./styles.css'] === './dist/styles.css', 'Missing portable public stylesheet entry');
  const css = await readFile(join(installed, 'dist/styles.css'), 'utf8');
  assert(css.length > 0 && !/@import\s+['"]\.\//.test(css), 'Published CSS must be nonempty and contain no relative source imports');
  const runtime = JSON.parse(await run(process.execPath, ['--input-type=module', '-e', `
    const ui = await import('pith-ui'); const app = await import('pith-ui/app');
    if (typeof app.createApplication !== 'function') throw new Error('Missing application factory');
    if (Object.keys(app).some(name => name.startsWith('create') && name !== 'createApplication')) throw new Error('Low-level factories escaped through pith-ui/app');
    if ('reconcileViews' in ui || 'clearViews' in ui) throw new Error('Internal HTML reconciliation must not be public');
    console.log(JSON.stringify({generic: Object.keys(ui), app: Object.keys(app)}));
  `], consumer)) as {generic: string[]; app: string[]};
  for (const name of ['createButton', 'createConversationView', 'createTextEditDialog', 'createConfirmDialog', 'createSelect', 'Generation']) assert(runtime.generic.includes(name), `Expected public export is missing: ${name}`);

  const reference = await readFile(join(root, 'examples/application/main.ts'), 'utf8');
  const ts = (await import(pathToFileURL(join(root, 'node_modules/typescript/lib/typescript.js')).href)).default as typeof import('typescript');
  const parsed = ts.createSourceFile('application.ts', reference, ts.ScriptTarget.Latest, true);
  let appImported = false, cssImported = false;
  const modulePath = (node: import('typescript').Node): void => {
    assert(ts.isStringLiteralLike(node) && ['pith-ui/app', 'pith-ui/styles.css'].includes(node.text), 'The complete application reference may import only pith-ui/app and pith-ui/styles.css');
    if (node.text === 'pith-ui/app') appImported = true;
    if (node.text === 'pith-ui/styles.css') cssImported = true;
  };
  const visit = (node: import('typescript').Node): void => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) modulePath(node.moduleSpecifier);
    if (ts.isImportTypeNode(node)) {
      assert(ts.isLiteralTypeNode(node.argument), 'Application reference type imports must use the approved public entry');
      modulePath(node.argument.literal);
    }
    assert(!ts.isImportEqualsDeclaration(node) && !(ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || ts.isIdentifier(node.expression) && node.expression.text === 'require')), 'Dynamic and CommonJS reference imports are forbidden');
    ts.forEachChild(node, visit);
  };
  visit(parsed);
  assert(appImported && cssImported, 'The complete reference must consume both public app and stylesheet entries');
  const generic = `import { createButton, createConversationView, createTextEditDialog, createSelect, setAppearance, type UIBlock, type ActionResult } from 'pith-ui';
import 'pith-ui/styles.css';
setAppearance(document.body, 'light');
const save = createButton({ label: 'Save', intent: 'primary', onAction: async (): Promise<ActionResult> => ({ ok: true }) });
const view = createConversationView();
view.update({ id: 'package-consumer', messages: [{ id: 'answer', role: 'assistant', text: 'Package consumer', actions: { copy: 'Copy response' } }], working: false });
const editor = createTextEditDialog({ title: 'Edit', onSubmit: async text => text.trim() ? { ok: true } : { ok: false, error: 'Enter text' } });
const models = createSelect({ label: 'Models', size: 5, options: [{ value: 'a', label: 'Model A' }] });
const block: UIBlock<{ label: string }> = save;
document.body.append(view.element, block.element, models.element);
save.element.addEventListener('click', () => editor.open({ value: '中文 example 🐟' }));
editor.destroy();
`;
  await writeFile(join(consumer, 'main.ts'), reference);
  await writeFile(join(consumer, 'generic-consumer.ts'), generic);
  for (const [source, target] of [['docs/examples.ts', 'public-examples.ts'], ['tests/callback-compatibility.ts', 'callback-compatibility.ts']] as const) await writeFile(join(consumer, target), (await readFile(join(root, source), 'utf8')).replaceAll("'../src/index.js'", "'pith-ui'"));
  const compilerOptions = {target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', strict: true, noEmit: true, lib: ['ES2022', 'DOM', 'DOM.Iterable'], types: [], skipLibCheck: false, verbatimModuleSyntax: true};
  await writeFile(join(consumer, 'tsconfig.json'), JSON.stringify({compilerOptions, include: ['main.ts', 'generic-consumer.ts', 'public-examples.ts', 'callback-compatibility.ts']}, null, 2));
  const compiler = join(root, 'node_modules/typescript/bin/tsc');
  await run(process.execPath, [compiler, '--project', join(consumer, 'tsconfig.json')], consumer);

  const forbidden = [
    ['app.element;', 'element'], ['app.workspace.element;', 'element'], ["app.workspace.part('composer');", 'part'],
    ["createApplication(mount, {style: {padding: 8}});", 'style'], ["createApplication(mount, {className: 'custom'});", 'className'],
    ["createApplication(mount, {render: () => document.createElement('div')});", 'render'], ['createApplication(mount, {children: document.body});', 'children'],
    ["app.workspace.openMessageEditor({title: 'Edit', value: document.body});", 'HTMLElement'],
  ];
  for (const [source, diagnostic] of forbidden) {
    await writeFile(join(consumer, 'rejected-consumer.ts'), `import {createApplication} from 'pith-ui/app';\ndeclare const mount: HTMLElement;\nconst app = createApplication(mount);\n${source}\n`);
    await writeFile(join(consumer, 'rejected-tsconfig.json'), JSON.stringify({compilerOptions, include: ['rejected-consumer.ts']}));
    let rejected = false;
    try {await execute(process.execPath, [compiler, '--project', 'rejected-tsconfig.json'], {cwd: consumer, maxBuffer: 8 * 1024 * 1024});}
    catch (error) {
      const failure = error as {code?: unknown; stdout?: string; stderr?: string};
      const output = `${failure.stdout ?? ''}\n${failure.stderr ?? ''}`;
      assert(typeof failure.code === 'number' && output.includes('rejected-consumer.ts') && output.includes(diagnostic!), `Unexpected failure while checking forbidden public type: ${output}`);
      rejected = true;
    }
    assert(rejected, `Packed public declarations accepted forbidden UI surface: ${source}`);
  }
  const html = (entry: string) => `<!doctype html><html><head><meta charset="utf-8"><title>Installed Pith UI consumer</title></head><body><div id="app"></div><script type="module" src="/${entry}"></script></body></html>`;
  const vite = join(root, 'node_modules/vite/bin/vite.js');
  await writeFile(join(consumer, 'index.html'), html('main.ts'));
  await run(process.execPath, [vite, 'build', '--outDir', 'dist'], consumer);
  await writeFile(join(consumer, 'index.html'), html('generic-consumer.ts'));
  await run(process.execPath, [vite, 'build', '--outDir', 'generic-dist'], consumer);
  await writeFile(join(consumer, 'index.html'), html('main.ts'));
  const consumerAssets = await assets(join(consumer, 'dist')), genericConsumerAssets = await assets(join(consumer, 'generic-dist'));
  for (const built of [consumerAssets, genericConsumerAssets]) assert(built.some(asset => asset.path.endsWith('.js') && asset.bytes > 0) && built.some(asset => asset.path.endsWith('.css') && asset.bytes > 0), 'Consumer production builds must contain JavaScript and CSS');
  return {exports: runtime.generic, appExports: runtime.app, consumerTypecheck: 'passed', consumerProductionBuild: 'passed', genericConsumerProductionBuild: 'passed', referenceSha256: createHash('sha256').update(reference).digest('hex'), rejectedTypeCases: forbidden.length, consumerAssets, genericConsumerAssets};
}

interface Packed {filename: string; integrity: string; shasum: string; size: number; unpackedSize: number; files: Array<{path: string; size: number}>}
async function main(): Promise<void> {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const evidence = process.env.PITH_UI_EVIDENCE_DIR ? resolve(process.env.PITH_UI_EVIDENCE_DIR) : await mkdtemp(join(tmpdir(), 'pith-ui-package-'));
  await mkdir(evidence, {recursive: true});
  const consumer = await realpath(await mkdtemp(join(tmpdir(), 'pith-ui-consumer-')));
  await run('npm', ['run', 'build'], root);
  const [packed] = JSON.parse(await run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', evidence], root)) as Packed[];
  assert(packed, 'npm pack did not return a package');
  const paths = new Set(packed.files.map(file => file.path));
  for (const expected of ['package.json', 'README.md', 'AI.md', 'API.md', 'APP.md', 'APP-API.md', 'LICENSE', 'dist/index.js', 'dist/index.d.ts', 'dist/app/index.js', 'dist/app/index.d.ts', 'dist/styles.css']) assert(paths.has(expected), `Missing published entry: ${expected}`);
  for (const path of paths) assert(!/^(?:src|showroom|tests|examples|node_modules|output)\//.test(path), `Development-only file entered the package: ${path}`);
  const tarball = resolve(evidence, packed.filename), bytes = await readFile(tarball);
  const integrity = `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
  assert(integrity === packed.integrity, 'Packed file integrity differs from npm output');
  await writeFile(join(consumer, 'package.json'), JSON.stringify({name: 'pith-ui-verification-consumer', version: '1.0.0', private: true, type: 'module'}, null, 2));
  await run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball], consumer);
  const installed = join(consumer, 'node_modules/pith-ui');
  for (const file of packed.files) {
    const current = await readFile(join(installed, file.path));
    assert(current.length === file.size, `Installed file size mismatch: ${file.path}`);
    if (file.path.startsWith('dist/')) assert((await readFile(join(root, file.path))).equals(current), `Installed content differs from built package: ${file.path}`);
  }
  const verification = await verifyInstalledPackageConsumer(root, consumer);
  const result = {tarball, consumer, integrity, sha256: createHash('sha256').update(bytes).digest('hex'), compressedBytes: packed.size, unpackedBytes: packed.unpackedSize, files: packed.files, ...verification};
  const report = join(evidence, 'package-verification.json');
  await writeFile(report, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({report, tarball, consumer, compressedBytes: packed.size, unpackedBytes: packed.unpackedSize, exportCount: verification.exports.length, appExportCount: verification.appExports.length, consumerTypecheck: 'passed', consumerProductionBuild: 'passed'}, null, 2));
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await main();
