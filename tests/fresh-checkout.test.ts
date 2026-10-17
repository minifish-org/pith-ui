import test from 'node:test';
import assert from 'node:assert/strict';
import {cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';

test('npm check works from a fresh source checkout and generates the public package declarations first', () => {
  const root = resolve(process.cwd()), directory = mkdtempSync(join(tmpdir(), 'pui-fresh-checkout-'));
  try {
    // Copy maintained inputs, never pre-existing build output. Tools come from
    // the current locked install; package self-reference resolves this fixture.
    for (const path of ['src', 'scripts', 'showroom', 'tests', 'visual-tests', 'docs']) cpSync(join(root, path), join(directory, path), {recursive: true});
    for (const entry of readdirSync(root, {withFileTypes: true})) {
      if (entry.isFile() && /\.(?:ts|json|html|md)$/.test(entry.name)) cpSync(join(root, entry.name), join(directory, entry.name));
    }
    symlinkSync(join(root, 'node_modules'), join(directory, 'node_modules'), 'dir');
    assert.equal(existsSync(join(directory, 'dist')), false, 'No declarations or JavaScript are inherited from a developer build');
    const config = JSON.parse(readFileSync(join(directory, 'tsconfig.json'), 'utf8')) as {compilerOptions: {strict?: boolean; paths?: unknown}};
    assert.equal(config.compilerOptions.strict, true);
    assert.equal(config.compilerOptions.paths, undefined, 'The example must keep resolving the public package export');
    const checked = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'check'], {cwd: directory, encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024});
    assert.equal(checked.error, undefined, checked.error?.message);
    assert.equal(checked.status, 0, checked.stderr || checked.stdout);
    const declaration = join(directory, 'dist/index.d.ts');
    assert.ok(existsSync(declaration), 'The documented check command prepares its public declaration dependency');
    assert.match(readFileSync(declaration, 'utf8'), /createButton/);
  } finally {rmSync(directory, {recursive: true, force: true});}
});
