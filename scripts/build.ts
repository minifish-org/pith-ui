import {execFileSync} from 'node:child_process';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {generateShowroomExamples} from './showroom-examples.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
await generateShowroomExamples(root);
// A removed public entry must disappear from a subsequent package build.
await rm(resolve(root, 'dist'), {recursive: true, force: true});
execFileSync(process.execPath,[resolve(root,'node_modules/typescript/bin/tsc'),'-p',resolve(root,'tsconfig.build.json')],{cwd: root,stdio: 'inherit'});
await mkdir(resolve(root, 'dist'), { recursive: true });
const entry = await readFile(resolve(root, 'src/styles.css'), 'utf8');
// Resolve local CSS imports so the package has one portable stylesheet.
async function inlineCSS(source: string, base: string, seen = new Set<string>()): Promise<string> {
  const imports = [...source.matchAll(/@import\s+['"]([^'"]+)['"];?/g)];
  for (const match of imports) {
    const path = resolve(base, match[1]!);
    if (seen.has(path)) throw new Error(`Circular or duplicate CSS import: ${path}`);
    seen.add(path);
    const content = await inlineCSS(await readFile(path, 'utf8'), dirname(path), seen);
    source = source.replace(match[0], content);
  }
  return source;
}
await writeFile(resolve(root, 'dist/styles.css'), await inlineCSS(entry, resolve(root, 'src')));
