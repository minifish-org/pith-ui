import { execFileSync, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const update = process.argv.slice(2).includes('--update');
if (process.argv.slice(2).some(argument => argument !== '--update')) throw new Error('Usage: node scripts/visual.ts [--update]');
if (process.platform !== 'darwin' || process.arch !== 'arm64') throw new Error('Maintained visual baselines require darwin-arm64. Linux CI runs behavior tests, not these macOS font snapshots.');
const require = createRequire(import.meta.url);
const browserMetadata = JSON.parse(await readFile(join(dirname(require.resolve('playwright-core/package.json')), 'browsers.json'), 'utf8')) as { browsers: Array<{ name: string; revision: string }> };
const revision = browserMetadata.browsers.find(browser => browser.name === 'chromium')!.revision;
const browser = await chromium.launch({ executablePath: chromium.executablePath(), headless: true });
const browserVersion = browser.version();
await browser.close();
const environment = {
  platform: process.platform, architecture: process.arch,
  osVersion: execFileSync('sw_vers', ['-productVersion'], { encoding: 'utf8' }).trim(),
  osBuild: execFileSync('sw_vers', ['-buildVersion'], { encoding: 'utf8' }).trim(),
  playwright: JSON.parse(await readFile(require.resolve('@playwright/test/package.json'), 'utf8')).version as string,
  browser: 'bundled Chromium full executable, headless', browserRevision: revision, browserVersion,
  deviceScaleFactor: 1, locale: 'en-US', timezoneId: 'Asia/Singapore', reducedMotion: 'reduce',
  viewports: [{ width: 900, height: 600 }, { width: 1280, height: 800 }, { width: 1440, height: 900 }],
};
const directory = join(root, 'visual-baselines/darwin-arm64');
const record = join(directory, 'environment.json');
if (!update) {
  let previous: unknown;
  try { previous = JSON.parse(await readFile(record, 'utf8')); }
  catch { throw new Error('No maintained environment record. Use --update to create reviewable candidate baselines explicitly.'); }
  if (JSON.stringify(previous) !== JSON.stringify(environment)) throw new Error('Visual environment differs from the maintained record. Review the OS/browser change, then explicitly run --update; no snapshots were accepted.');
}
const cli = join(dirname(require.resolve('@playwright/test/package.json')), 'cli.js');
const result = spawnSync(process.execPath, [cli, 'test', '--config', 'playwright.visual.config.ts', `--update-snapshots=${update ? 'all' : 'none'}`], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
if (update) { await mkdir(directory, { recursive: true }); await writeFile(record, JSON.stringify(environment, null, 2) + '\n'); }
console.log(update ? 'Candidate visual baselines recorded. Review the PNG changes; this does not record human acceptance.' : 'Visual snapshots match the maintained environment and baselines.');
