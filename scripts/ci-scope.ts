import {execFileSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export function selectScope(files: readonly string[] | null, event = 'pull_request') {
  let mode: 'docs' | 'package' | 'unit' | 'browser' | 'full' = 'full';
  if (event === 'pull_request' && files) {
    const code = files.filter(file => !['AGENTS.md','docs/validation.md','docs/releasing.md'].includes(file));
    if (!code.length) mode = 'docs';
    else if (code.every(file => /^(?:README\.md|AI\.md|APP\.md|API\.md|LICENSE|docs\/.*\.md)$/.test(file))) mode = 'package';
    else if (code.every(file => /^tests\/(?:tools\/)?[^/]+\.test\.ts$/.test(file))) mode = 'unit';
    else if (code.every(file => /^tests\/[^/]+\.spec\.ts$/.test(file))) mode = 'browser';
  }
  return {mode,install: mode !== 'docs',unit: mode === 'unit' || mode === 'full',browser: mode === 'browser' || mode === 'full',package: mode === 'package' || mode === 'full'};
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const event = process.argv[2] ?? process.env.GITHUB_EVENT_NAME ?? 'push';
  const base = process.argv[3] ?? process.env.CI_BASE_SHA;
  let files: string[] | null = null;
  if (event === 'pull_request' && base) {
    try {
      files = execFileSync('git',['diff','--name-only','--no-renames','-z',`${base}...HEAD`],{encoding: 'utf8',stdio: ['ignore','pipe','pipe']}).split('\0').filter(Boolean);
    } catch { /* Missing history must expand coverage. */ }
  }
  execFileSync('git',files ? ['diff','--check',`${base}...HEAD`] : ['show','--format=','--check','HEAD'],{stdio: 'inherit'});
  const scope = selectScope(files,event);
  console.log(JSON.stringify(scope));
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT,Object.entries(scope).map(([key,value]) => `${key}=${value}\n`).join(''));
}
