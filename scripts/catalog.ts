import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { generateShowroomExamples, showroomExampleSources, recipeExampleSources, partId } from './showroom-examples.ts';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), write = process.argv.includes('--write');
if (process.argv.slice(2).some(value => value !== '--write'))
    throw new Error('Usage: node scripts/catalog.ts [--write]');
const examples = await showroomExampleSources(root), recipes = await recipeExampleSources(root), config = ts.readConfigFile(join(root, 'tsconfig.json'), ts.sys.readFile);
if (config.error)
    throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root), entryPath = join(root, 'src/parts/index.ts'), virtual = new Map([...examples,...[...recipes].map(([name,code])=>['recipe-'+name,code] as const)].map(([name, code]) => [join(root, 'showroom/.checked-examples', name + '.ts'), code]));
const host = ts.createCompilerHost(parsed.options), originalRead = host.readFile, originalExists = host.fileExists;
host.readFile = name => virtual.get(name) ?? originalRead(name);
host.fileExists = name => virtual.has(name) || originalExists(name);
host.getSourceFile = (name, languageVersion, onError) => { const body = host.readFile(name); if (body === undefined) {
    onError?.('Cannot read ' + name);
    return undefined;
} return ts.createSourceFile(name, body, languageVersion, true); };
// Staging examples use the same constrained declarations until the final root
// promotion. The installed-tarball verifier deliberately has no such mapping.
host.resolveModuleNames = (names, containingFile) => names.map(name => virtual.has(containingFile) && (name === 'pith-ui' || name === 'pith-ui/recipes') ? {resolvedFileName: name === 'pith-ui' ? entryPath : join(root,'src/recipes/index.ts'),extension:ts.Extension.Ts} : ts.resolveModuleName(name, containingFile, parsed.options, host).resolvedModule);
const program = ts.createProgram([entryPath, ...virtual.keys()], { ...parsed.options, noEmit: true }, host), errors = ts.getPreEmitDiagnostics(program);
if (errors.length)
    throw new Error(ts.formatDiagnosticsWithColorAndContext(errors, { getCurrentDirectory: () => root, getCanonicalFileName: name => name, getNewLine: () => '\n' }));
const checker = program.getTypeChecker(), entry = program.getSourceFile(entryPath)!, symbols = checker.getExportsOfModule(checker.getSymbolAtLocation(entry)!), factories = symbols.filter(symbol => { const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol; return !!(target.flags & ts.SymbolFlags.Value); }).map(symbol => symbol.name).sort();
const covered = ['mountParts', ...examples.keys()].sort();
if (JSON.stringify(factories) !== JSON.stringify(covered))
    throw new Error('Formal showroom coverage differs from runtime exports. Missing: ' + factories.filter(name => !covered.includes(name)).join(', ') + '; extra: ' + covered.filter(name => !factories.includes(name)).join(', '));
for (const [name, code] of examples) {
    if (!code.includes(name))
        throw new Error('Example does not demonstrate ' + name);
    if (/pith-ui\/app|\.element\b|\.control\b|style\s*:|className\s*:/.test(code))
        throw new Error('Example exposes an unrestricted UI port: ' + name);
}
const catalog = ['# Formal constrained parts catalog', '', 'Choose a small part by its native responsibility. The library fixes presentation; callers supply literal content, finite semantic choices, state and data callbacks. There is one checked `mountParts` boundary and one inherited appearance owner.', '', 'Every linked exhibit has a strictly compiled example made from the formal API. Shared regions are imported from `pith-ui/recipes` and demonstrated alongside the parts. See [region usage](./assemblies/coverage.md). See [API.md](../API.md) for exact legal options and opaque handle methods.', '', '| Factory | Specification and legal interaction |', '| --- | --- |', ...factories.map(name => `| \`${name}\` | [${partId(name)}](https://minifish-org.github.io/pith-ui/?item=${partId(name)}) |`), ''].join('\n');
if (write) {
    await generateShowroomExamples(root);
    await writeFile(join(root, 'docs/catalog.md'), catalog);
}
else if (await readFile(join(root, 'docs/catalog.md'), 'utf8') !== catalog)
    throw new Error('docs/catalog.md is stale. Run node scripts/catalog.ts --write.');
const ids = new Set([...examples.keys()].map(partId));
for(const match of (await readFile(join(root,'showroom/recipe-cases.ts'),'utf8')).matchAll(/id:'([a-z-]+)'/g)) ids.add('recipe-'+match[1]!);
for (const name of ['README.md', 'AI.md', 'APP.md', 'docs/catalog.md', 'docs/guide.md'])
    for (const match of (await readFile(join(root, name), 'utf8')).matchAll(/[?&]item=([a-z0-9-]+)/g))
        if (!ids.has(match[1]!))
            throw new Error(`${name} links to a removed showroom template: ${match[1]}`);
console.log(`Validated ${factories.length} formal runtime factories, ${examples.size} parts-only exhibits and strictly compiled public TypeScript examples.`);
