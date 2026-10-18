import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), args = process.argv.slice(2);
if (args.some(value => value !== '--check') || args.length > 1)
    throw new Error('Usage: node scripts/api-docs.ts [--check]');
const check = args.includes('--check'), config = ts.readConfigFile(join(root, 'tsconfig.build.json'), ts.sys.readFile);
if (config.error)
    throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root), entryPath = join(root, 'src/parts/index.ts');
const program = ts.createProgram([entryPath], { ...parsed.options, noEmit: false, emitDeclarationOnly: true, declaration: true, declarationMap: false, sourceMap: false, inlineSources: false }), checker = program.getTypeChecker(), entry = program.getSourceFile(entryPath)!;
const errors = ts.getPreEmitDiagnostics(program);
if (errors.length)
    throw new Error(ts.formatDiagnosticsWithColorAndContext(errors, { getCurrentDirectory: () => root, getCanonicalFileName: name => name, getNewLine: () => '\n' }));
const direct = new Map(checker.getExportsOfModule(checker.getSymbolAtLocation(entry)!).map(symbol => [symbol.name, symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol])), symbols = new Map(direct), queue = [...symbols.values()];
// Include reachable supporting types and opaque brands without advertising them
// as extra import names. These are exact emitted declarations, not hand copies.
for (const symbol of queue)
    for (const declaration of symbol.declarations ?? []) {
        const visit = (node: ts.Node): void => { const reference = ts.isTypeReferenceNode(node) ? node.typeName : ts.isTypeQueryNode(node) ? node.exprName : ts.isExpressionWithTypeArguments(node) ? node.expression : ts.isComputedPropertyName(node) ? node.expression : undefined; if (reference && ts.isIdentifier(reference)) {
            let related = checker.getSymbolAtLocation(reference);
            if (related?.flags && related.flags & ts.SymbolFlags.Alias)
                related = checker.getAliasedSymbol(related);
            const original = related?.declarations?.find(value => ts.isInterfaceDeclaration(value) || ts.isTypeAliasDeclaration(value) || ts.isVariableDeclaration(value));
            if (related && original && original.getSourceFile().fileName.startsWith(join(root, 'src') + '/')) {
                const previous = symbols.get(related.name);
                if (previous && previous !== related)
                    throw new Error('Ambiguous supporting type: ' + related.name);
                if (!previous) {
                    symbols.set(related.name, related);
                    queue.push(related);
                }
            }
        } ts.forEachChild(node, visit); };
        if (ts.isFunctionDeclaration(declaration)) {
            declaration.parameters.forEach(visit);
            if (declaration.type)
                visit(declaration.type);
        }
        else
            visit(declaration);
    }
interface Declaration {
    name: string;
    text: string;
    source: string;
    line: number;
    references: string[];
}
const declarations: Declaration[] = [], printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
const emitted = program.emit(undefined, (filename, text, _bom, _error, sources) => { if (!filename.endsWith('.d.ts'))
    return; const file = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true); for (const statement of file.statements) {
    const names = ts.isVariableStatement(statement) ? statement.declarationList.declarations.flatMap(node => ts.isIdentifier(node.name) ? [node.name.text] : []) : 'name' in statement && statement.name && ts.isIdentifier(statement.name as ts.Node) ? [(statement.name as ts.Identifier).text] : [];
    for (const name of names.filter(name => symbols.has(name))) {
        const symbol = symbols.get(name)!, original = symbol.valueDeclaration ?? symbol.declarations?.[0];
        if (!original)
            throw new Error('Missing source declaration: ' + name);
        const source = original.getSourceFile();
        if (sources && !sources.some(value => resolve(value.fileName) === resolve(source.fileName)))
            continue;
        const references = new Set<string>();
        const visit = (node: ts.Node): void => { if (ts.isIdentifier(node) && node.text !== name && symbols.has(node.text))
            references.add(node.text); ts.forEachChild(node, visit); };
        visit(statement);
        declarations.push({ name, text: printer.printNode(ts.EmitHint.Unspecified, statement, file).trim(), source: relative(root, source.fileName).replaceAll('\\', '/'), line: source.getLineAndCharacterOfPosition(original.getStart()).line + 1, references: [...references].sort() });
    }
} }, undefined, true);
if (emitted.emitSkipped || emitted.diagnostics.length)
    throw new Error('Declaration emit failed; API reference was not changed');
const represented = new Set(declarations.map(item => item.name)), missing = [...symbols.keys()].filter(name => !represented.has(name));
if (missing.length)
    throw new Error('Unrepresented public or supporting declarations: ' + missing.join(', '));
const factories = [...direct.keys()].filter(name => /^(create|mount)/.test(name)).sort(), version = (JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as {
    version: string;
}).version;
const id = (name: string) => name === 'mountParts' || name === 'createButtonPart' ? 'button-parts' : name.replace(/^create/, '').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
const gallery = (name: string) => `[${id(name)}](https://minifish-org.github.io/pith-ui/?item=${id(name)})`, anchor = (name: string) => name.toLowerCase();
const lines = ['# Public constrained parts API', '', `Generated for \`pith-ui@${version}\` by \`node scripts/api-docs.ts\` from TypeScript declaration emit. Installed declarations are authoritative. This reference covers ${factories.length} public factories and all reachable state, options, callbacks and opaque handles.`, '', 'Only names in the public index may be imported from `pith-ui`. The package also exports `pith-ui/styles.css`. Parts accept literal content, finite semantic options, state and data callbacks; they expose no DOM, CSS, pixel or animation ports. `mountParts` is the sole ordinary-container boundary. See [AI.md](./AI.md), the [assembly guide](./APP.md) and [shared recipes](./docs/assemblies/coverage.md).', '', 'Source links use the exact package version tag. Before release, this source reference can differ from an already-published package.', '', 'Regenerate: `node scripts/api-docs.ts`. Verify without writing: `node scripts/api-docs.ts --check`.', '', '## Factory index', '', '| Factory | Part specification and interaction |', '|---|---|', ...factories.map(name => `| [\`${name}\`](#${anchor(name)}) | ${gallery(name)} |`), '', '## Public type index', '', ...[...direct.keys()].filter(name => !factories.includes(name)).sort().map(name => `- [\`${name}\`](#${anchor(name)})`), '', '## Supporting declarations', '', 'The following supporting names explain signatures and private opaque identity. They are not additional package exports or extension points.', '', ...[...symbols.keys()].filter(name => !direct.has(name)).sort().map(name => `- [\`${name}\`](#${anchor(name)})`), ''];
for (const declaration of declarations.sort((a, b) => a.source.localeCompare(b.source, 'en') || a.name.localeCompare(b.name, 'en'))) {
    lines.push(`### ${declaration.name}`, '', `[Source](https://github.com/minifish-org/pith-ui/blob/v${version}/${declaration.source}#L${declaration.line})`, '', '```ts', declaration.text, '```', '');
    if (declaration.references.length)
        lines.push(`Referenced declarations: ${declaration.references.map(name => `[\`${name}\`](#${anchor(name)})`).join(', ')}.`, '');
}
const recipePath = join(root, 'src/recipes/index.ts');
const recipeProgram = ts.createProgram([recipePath], parsed.options), recipeChecker = recipeProgram.getTypeChecker();
const recipeSource = recipeProgram.getSourceFile(recipePath)!;
const recipeExports = recipeChecker.getExportsOfModule(recipeChecker.getSymbolAtLocation(recipeSource)!);
lines.push('## Shared recipes', '', 'Import these regions, state and callback types from `pith-ui/recipes`. Their installed declarations preserve the exact signatures and inferred handles. The host owns business decisions and requests; recipes own UI state and lifetime. See [APP.md](./APP.md). No whole application or standalone mount wrapper is exported.', '', '| Export | Declaration source |', '|---|---|');
for (const exported of recipeExports.sort((a,b) => a.name.localeCompare(b.name))) {
  const symbol = exported.flags & ts.SymbolFlags.Alias ? recipeChecker.getAliasedSymbol(exported) : exported;
  const declaration = symbol.valueDeclaration ?? symbol.declarations?.[0];
  if (!declaration) throw new Error('Missing recipe declaration: '+exported.name);
  const source = declaration.getSourceFile(), line = source.getLineAndCharacterOfPosition(declaration.getStart()).line + 1;
  lines.push(`| \`${exported.name}\` | [Source](https://github.com/minifish-org/pith-ui/blob/v${version}/${relative(root,source.fileName)}#L${line}) |`);
}
lines.push('');
const output = lines.join('\n'), path = join(root, 'API.md');
if (check) {
    let existing = '';
    try {
        existing = await readFile(path, 'utf8');
    }
    catch { }
    if (existing !== output)
        throw new Error('API.md is out of date. Run node scripts/api-docs.ts and review the generated changes.');
}
else
    await writeFile(path, output);
console.log(`${check ? 'Verified' : 'Generated'} API.md: ${factories.length} factories, ${direct.size} public names, ${symbols.size - direct.size} supporting declarations; version ${version}.`);
