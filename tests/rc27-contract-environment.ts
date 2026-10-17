import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import environment from './contracts/rc27-ui-022/environment.json' with {type: 'json'};

/** Exact geometry includes OS fonts and native list metrics. Behavior and live
 * old/new assembly comparisons run on every supported browser platform. */
export const supportsFrozenRC27 = process.platform === environment.platform && process.arch === environment.architecture;

export function assertFrozenRC27Environment(name: string, version: string): void {
  if (!supportsFrozenRC27) throw new Error('Frozen rc.27 geometry requires its recorded darwin-arm64 environment.');
  const expected = environment.browsers[name as keyof typeof environment.browsers];
  const require = createRequire(import.meta.url);
  const playwright = JSON.parse(readFileSync(require.resolve('@playwright/test/package.json'), 'utf8')) as {version: string};
  const metadata = JSON.parse(readFileSync(join(dirname(require.resolve('playwright-core/package.json')), 'browsers.json'), 'utf8')) as {browsers: Array<{name: string; revision: string}>};
  const build = execFileSync('sw_vers', ['-buildVersion'], {encoding: 'utf8'}).trim();
  if (!expected || version !== expected.version || metadata.browsers.find(browser => browser.name === name)?.revision !== expected.revision || playwright.version !== environment.playwright || build !== environment.osBuild) {
    throw new Error('The rc.27 geometry environment changed. Review OS/browser drift against the original source before explicitly recording new baselines.');
  }
}
