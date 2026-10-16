import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, readdir, realpath, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const execute = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evidence = process.env.PITH_UI_EVIDENCE_DIR
  ? resolve(process.env.PITH_UI_EVIDENCE_DIR)
  : await mkdtemp(join(tmpdir(), 'pith-ui-package-'));
await mkdir(evidence, { recursive: true });
const consumer = await realpath(await mkdtemp(join(tmpdir(), 'pith-ui-consumer-')));
async function run(command: string, args: string[], cwd: string): Promise<string> {
  const result = await execute(command, args, { cwd, maxBuffer: 8 * 1024 * 1024 });
  return result.stdout.trim();
}

await run('npm', ['run', 'build'], root);
interface Packed { filename: string; integrity: string; shasum: string; size: number; unpackedSize: number; files: Array<{ path: string; size: number }> }
const [packed] = JSON.parse(await run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', evidence], root)) as Packed[];
if (!packed) throw new Error('npm pack did not return a package');
const paths = new Set(packed.files.map(file => file.path));
for (const expected of ['package.json', 'LICENSE', 'dist/index.js', 'dist/index.d.ts', 'dist/styles.css']) {
  if (!paths.has(expected)) throw new Error(`Missing published entry: ${expected}`);
}
for (const path of paths) {
  if (/^(?:showroom|tests|node_modules|output)\//.test(path)) throw new Error(`Development-only file entered the package: ${path}`);
}
const tarball = resolve(evidence, packed.filename);
const bytes = await readFile(tarball);
const integrity = `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
if (integrity !== packed.integrity) throw new Error('Packed file integrity differs from npm output');
await writeFile(join(consumer, 'package.json'), JSON.stringify({ name: 'pith-ui-verification-consumer', version: '1.0.0', private: true, type: 'module' }, null, 2));
await run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball], consumer);
const installed = join(consumer, 'node_modules/pith-ui');
for (const file of packed.files) {
  const current = await readFile(join(installed, file.path));
  if (current.length !== file.size) throw new Error(`Installed file size mismatch: ${file.path}`);
  if (file.path.startsWith('dist/')) {
    const original = await readFile(join(root, file.path));
    if (!original.equals(current)) throw new Error(`Installed content differs from built package: ${file.path}`);
  }
}

const publicNames = JSON.parse(await run(process.execPath, ['--input-type=module', '-e', 'const ui = await import("pith-ui"); console.log(JSON.stringify(Object.keys(ui)));'], consumer)) as string[];
for (const name of ['createButton', 'createTextEditDialog', 'createConfirmDialog', 'createSelect', 'Generation']) {
  if (!publicNames.includes(name)) throw new Error(`Expected public export is missing: ${name}`);
}
const source = `import { createButton, createTextEditDialog, createSelect, type UIBlock, type ActionResult } from 'pith-ui';
import 'pith-ui/styles.css';
const save = createButton({ label: 'Save', intent: 'primary', onAction: async (): Promise<ActionResult> => ({ ok: true }) });
const editor = createTextEditDialog({ title: 'Edit', onSubmit: async text => text.trim() ? { ok: true } : { ok: false, error: 'Enter text' } });
const models = createSelect({ label: 'Models', size: 5, options: [{ value: 'a', label: 'Model A' }] });
const block: UIBlock<{ label: string }> = save;
document.body.append(block.element, models.element);
save.element.addEventListener('click', () => editor.open({ value: '中文 example 🐟' }));
`;
await writeFile(join(consumer, 'main.ts'), source);
// Compile the complete maintained examples against the installed declarations,
// including callback targets and methods beyond this small runtime entry.
await writeFile(join(consumer, 'public-examples.ts'), (await readFile(join(root, 'docs/examples.ts'), 'utf8')).replaceAll("'../src/index.js'", "'pith-ui'"));
await writeFile(join(consumer, 'index.html'), '<!doctype html><html><head><meta charset="utf-8"><title>Package consumer</title></head><body><script type="module" src="/main.ts"></script></body></html>');
await writeFile(join(consumer, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', strict: true, noEmit: true, lib: ['ES2022', 'DOM', 'DOM.Iterable'], skipLibCheck: false }, include: ['main.ts', 'public-examples.ts'] }, null, 2));
await run(process.execPath, [join(root, 'node_modules/typescript/bin/tsc'), '--project', join(consumer, 'tsconfig.json')], consumer);
await run(process.execPath, [join(root, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', 'dist'], consumer);

async function assets(directory: string, prefix = ''): Promise<Array<{ path: string; bytes: number }>> {
  const result: Array<{ path: string; bytes: number }> = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name); const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory()) result.push(...await assets(path, `${relative}/`));
    else result.push({ path: relative, bytes: (await stat(path)).size });
  }
  return result;
}
const result = {
  tarball, consumer, integrity, sha256: createHash('sha256').update(bytes).digest('hex'),
  compressedBytes: packed.size, unpackedBytes: packed.unpackedSize, files: packed.files,
  exports: publicNames, consumerTypecheck: 'passed', consumerProductionBuild: 'passed',
  consumerAssets: await assets(join(consumer, 'dist')),
};
const report = join(evidence, 'package-verification.json');
await writeFile(report, JSON.stringify(result, null, 2));
console.log(JSON.stringify({ report, tarball, consumer, compressedBytes: packed.size, unpackedBytes: packed.unpackedSize, exportCount: publicNames.length, consumerTypecheck: 'passed', consumerProductionBuild: 'passed' }, null, 2));
