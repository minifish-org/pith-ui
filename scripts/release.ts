import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isIdenticalPublishedPackage, publicationDistTag } from './published-package.ts';
import { verifyInstalledPackageConsumer } from './verify-package.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifacts = resolve(root, 'artifacts');
const metadata = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as { name: string; version: string };
interface Manifest { filename: string; name: string; version: string; sha256: string; commit: string; dirty: boolean }
function run(command: string, args: string[], cwd = root): string {
  return execFileSync(command, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
}
function assert(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function checksum(data: Uint8Array): string { return createHash('sha256').update(data).digest('hex'); }
const manifestPath = join(artifacts, 'package-manifest.json');

async function pack(): Promise<void> {
  await mkdir(artifacts, { recursive: true });
  const packed = JSON.parse(run('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', artifacts])) as Array<{ filename: string }>;
  assert(packed.length === 1, 'Expected exactly one npm package');
  const filename = packed[0]!.filename;
  assert(basename(filename) === filename, 'npm returned an unexpected package path');
  const data = await readFile(join(artifacts, filename));
  const manifest: Manifest = { filename, name: metadata.name, version: metadata.version, sha256: checksum(data), commit: process.env.GITHUB_SHA || run('git', ['rev-parse', 'HEAD']).trim(), dirty: !!run('git', ['status', '--porcelain', '--untracked-files=normal']).trim() };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Packed ${manifest.name}@${manifest.version}: ${manifest.filename} (${manifest.sha256})`);
}
async function manifest(): Promise<Manifest> {
  const value = JSON.parse(await readFile(manifestPath, 'utf8')) as Manifest;
  assert(value.name === metadata.name && value.version === metadata.version, 'Artifact does not match this package version');
  assert(value.filename === basename(value.filename) && value.filename.endsWith('.tgz'), 'Invalid artifact filename');
  assert(checksum(await readFile(join(artifacts, value.filename))) === value.sha256, 'Package artifact checksum mismatch');
  if (process.env.GITHUB_SHA) assert(value.commit === process.env.GITHUB_SHA, 'Artifact was built from a different commit');
  return value;
}
async function verify(): Promise<void> {
  const value = await manifest();
  const archive = join(artifacts, value.filename);
  const paths = run('tar', ['-tzf', archive]).trim().split('\n');
  assert(paths.length > 0 && paths.every(path => path.startsWith('package/') && !path.split('/').includes('..')), 'Archive contains an unsafe file path');
  assert(paths.every(path => path.startsWith('package/dist/') || ['package/package.json', 'package/README.md', 'package/AI.md', 'package/API.md', 'package/LICENSE'].includes(path)), 'Archive contains unpublished source, tests or gallery code');
  assert(!paths.some(path=>path.startsWith('package/dist/app/')), 'Removed application artifacts must not ship');
  const temporary = await mkdtemp(join(tmpdir(), 'pith-ui-package-'));
  try {
    await writeFile(join(temporary, 'package.json'), JSON.stringify({ private: true, type: 'module', dependencies: { [metadata.name]: `file:${archive}` } }));
    run('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], temporary);
    const installed = join(temporary, 'node_modules', metadata.name);
    const installedMetadata = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8')) as { name: string; version: string; dependencies: Record<string, string> };
    assert(installedMetadata.name === metadata.name && installedMetadata.version === metadata.version, 'Installed package metadata differs');
    assert(Object.values(installedMetadata.dependencies).every(version => /^\d+\.\d+\.\d+$/.test(version)), 'Runtime dependencies must use exact versions');
    for (const required of ['dist/index.js', 'dist/index.d.ts', 'dist/styles.css', 'README.md', 'AI.md', 'API.md', 'LICENSE']) assert((await readFile(join(installed, required))).byteLength > 0, `Missing or empty package file: ${required}`);
    const verification = await verifyInstalledPackageConsumer(root, temporary);
    await writeFile(join(artifacts, 'package-consumer-verification.json'), JSON.stringify({filename: value.filename, sha256: value.sha256, commit: value.commit, version: value.version, ...verification}, null, 2) + '\n');
    console.log(`Verified exact tarball ${value.filename}: component ESM/types/CSS, removed-entry rejection, strict declarations, ${verification.rejectedTypeCases} rejected UI escape cases, small-control constraints and isolated production build.`);
  } finally { await rm(temporary, { recursive: true, force: true }); }
}
function verifyTag(): void {
  assert(process.env.GITHUB_REF_TYPE === 'tag', 'Publishing requires a version tag');
  assert(process.env.GITHUB_REF_NAME === `v${metadata.version}`, 'Git tag must exactly match package.json version');
  console.log(`Validated release tag v${metadata.version}`);
}
switch (process.argv[2]) {
  case 'verify-tag': verifyTag(); break;
  case 'pack': await pack(); break;
  case 'verify': await verify(); break;
  case 'publish': {
    verifyTag();
    const value = await manifest();
    assert(value.dirty === false, 'Publish requires a package built from a clean committed source tree');
    // A manually bootstrapped version may already exist before Trusted Publishing is configured.
    // Only a registry 404 permits publication; an existing archive payload must match exactly.
    if (await isIdenticalPublishedPackage(metadata.name, metadata.version, await readFile(join(artifacts, value.filename)))) {
      console.log(`Already published ${metadata.name}@${metadata.version}: registry SHA-512 verified; the complete decompressed TAR payload is byte-identical to the tested artifact (gzip encoding may differ). Skipped immutable re-publication.`);
    } else execFileSync('npm', ['publish', join(artifacts, value.filename), '--access', 'public', '--ignore-scripts', '--tag', publicationDistTag(metadata.version)], { cwd: root, stdio: 'inherit' });
    break;
  }
  default: throw new Error('Usage: node scripts/release.ts <verify-tag|pack|verify|publish>');
}
