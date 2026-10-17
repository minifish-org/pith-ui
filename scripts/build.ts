import ts from 'typescript';
import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { themeStyles } from './palette.ts';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
await mkdir(resolve(root, 'dist'), { recursive: true });
const entry = (await readFile(resolve(root, 'src/styles.css'), 'utf8')).replace('/* PUI_THEME_PALETTE */', themeStyles());
// Resolve local CSS imports so the package has one portable stylesheet.
async function inlineCSS(source: string, base: string, seen = new Set<string>()): Promise<string> {
    const imports = [...source.matchAll(/@import\s+['"]([^'"]+)['"];?/g)];
    for (const match of imports) {
        const path = resolve(base, match[1]!);
        if (seen.has(path))
            throw new Error(`Circular or duplicate CSS import: ${path}`);
        seen.add(path);
        const content = await inlineCSS(await readFile(path, 'utf8'), dirname(path), seen);
        source = source.replace(match[0], content);
    }
    return source;
}
await writeFile(resolve(root, 'dist/styles.css'), await inlineCSS(entry, resolve(root, 'src')));
// Prune stale and unreachable emitted modules after TypeScript builds the public graph.
const config = ts.readConfigFile(resolve(root, 'tsconfig.build.json'), ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const program = ts.createProgram([resolve(root, 'src/index.ts')], parsed.options);
const reachable = new Set<string>(['styles.css']);
for (const file of program.getSourceFiles())
    if (file.fileName.startsWith(resolve(root, 'src') + '/') && !file.isDeclarationFile) {
        const stem = relative(resolve(root, 'src'), file.fileName).replace(/\.ts$/, '');
        for (const suffix of ['.js', '.js.map', '.d.ts', '.d.ts.map'])
            reachable.add(stem + suffix);
    }
async function prune(directory: string): Promise<void> { for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, item.name);
    if (item.isDirectory()) {
        await prune(path);
        if (!(await readdir(path)).length)
            await rm(path, { recursive: true });
    }
    else if (!reachable.has(relative(resolve(root, 'dist'), path)))
        await rm(path);
} }
await prune(resolve(root, 'dist'));
