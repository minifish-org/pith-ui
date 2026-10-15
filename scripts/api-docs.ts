import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
if (args.some(argument => argument !== '--check') || args.length > 1) throw new Error('Usage: node scripts/api-docs.ts [--check]');
const check = args.includes('--check');
const config = ts.readConfigFile(join(root, 'tsconfig.build.json'), ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const program = ts.createProgram([join(root, 'src/index.ts')], {
  ...parsed.options, noEmit: false, emitDeclarationOnly: true, declaration: true,
  declarationMap: false, sourceMap: false, inlineSources: false,
});
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCurrentDirectory: () => root, getCanonicalFileName: name => name, getNewLine: () => '\n',
}));
const checker = program.getTypeChecker();
const entry = program.getSourceFile(join(root, 'src/index.ts'))!;
const exports = checker.getExportsOfModule(checker.getSymbolAtLocation(entry)!);
const publicSymbols = new Map(exports.map(symbol => [symbol.name, symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol]));
const factories = [...publicSymbols.keys()].filter(name => /^(create|install|mount)/.test(name)).sort();
const gallery = new Map<string, Set<string>>();
const catalogGallery = new Map<string, Set<string>>();
function relate(name: string, id: string): void {
  const ids = gallery.get(name) || new Set<string>(); ids.add(id); gallery.set(name, ids);
}

// Catalog rows also relate small adapters to the product block that replaces them.
const catalog = await readFile(join(root, 'docs/catalog.md'), 'utf8');
for (const row of catalog.split('\n').filter(line => line.startsWith('|'))) {
  const columns = row.split('|');
  const names = [...(columns[2] || '').matchAll(/`([A-Za-z][A-Za-z0-9]*)`/g)].map(match => match[1]!).filter(name => publicSymbols.has(name));
  const ids = [...(columns[3] || '').matchAll(/`([a-z][a-z0-9-]*)`/g)].map(match => match[1]!);
  for (const name of names) {
    const related = names.length === ids.length ? [ids[names.indexOf(name)]!] : ids;
    catalogGallery.set(name, new Set(related));
  }
}
const caseIds = new Set<string>();
for (const filename of (await readdir(join(root, 'showroom'))).filter(name => name.endsWith('-cases.ts')).sort()) {
  const source = ts.createSourceFile(filename, await readFile(join(root, 'showroom', filename), 'utf8'), ts.ScriptTarget.Latest, true);
  const visit = (node: ts.Node): void => {
    if (ts.isObjectLiteralExpression(node)) {
      const property = (name: string) => node.properties.find(member => member.name && (ts.isIdentifier(member.name) || ts.isStringLiteral(member.name)) && member.name.text === name);
      const id = property('id'), mount = property('mount');
      if (id && ts.isPropertyAssignment(id) && ts.isStringLiteralLike(id.initializer) && mount) {
        const value = id.initializer.text; caseIds.add(value);
        const used = (child: ts.Node): void => {
          if (ts.isIdentifier(child) && publicSymbols.has(child.text)) relate(child.text, value);
          ts.forEachChild(child, used);
        };
        used(mount);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}
for (const [name, ids] of catalogGallery) if (!gallery.get(name)?.size) for (const id of ids) relate(name, id);
for (const [adapter, preferred] of [['createSDKDialogElements', 'createFeatureDialogFrame'], ['installImageViewer', 'createImageViewer'], ['mountPagedPreview', 'createPagedPreview']] as const) {
  for (const id of gallery.get(preferred) || []) relate(adapter, id);
}
for (const [name, ids] of gallery) for (const id of ids) if (!caseIds.has(id)) throw new Error(`Unknown gallery ID ${id} for ${name}`);
const missingGallery = factories.filter(name => !gallery.get(name)?.size);
if (missingGallery.length) throw new Error(`Factories need a related gallery entry: ${missingGallery.join(', ')}`);

interface Declaration { name: string; text: string; source: string; line: number; factory: boolean; references: string[] }
const declarations: Declaration[] = [];
const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
const emitted = program.emit(undefined, (filename, text) => {
  if (!filename.endsWith('.d.ts')) return;
  const file = ts.createSourceFile(filename, text, ts.ScriptTarget.Latest, true);
  for (const statement of file.statements) {
    const names = ts.isVariableStatement(statement)
      ? statement.declarationList.declarations.flatMap(node => ts.isIdentifier(node.name) ? [node.name.text] : [])
      : 'name' in statement && statement.name && ts.isIdentifier(statement.name as ts.Node) ? [(statement.name as ts.Identifier).text] : [];
    for (const name of names.filter(value => publicSymbols.has(value))) {
      const symbol = publicSymbols.get(name)!;
      const original = symbol.valueDeclaration || symbol.declarations?.[0];
      if (!original) throw new Error(`No source declaration for ${name}`);
      const source = original.getSourceFile();
      const references = new Set<string>();
      const visit = (node: ts.Node): void => {
        const reference = ts.isTypeReferenceNode(node) ? node.typeName : ts.isTypeQueryNode(node) ? node.exprName : ts.isExpressionWithTypeArguments(node) ? node.expression : undefined;
        if (reference && ts.isIdentifier(reference) && reference.text !== name && publicSymbols.has(reference.text)) references.add(reference.text);
        ts.forEachChild(node, visit);
      };
      visit(statement);
      declarations.push({ name, text: printer.printNode(ts.EmitHint.Unspecified, statement, file).trim(), source: relative(root, source.fileName).replaceAll('\\', '/'), line: source.getLineAndCharacterOfPosition(original.getStart()).line + 1, factory: factories.includes(name), references: [...references].sort() });
    }
  }
}, undefined, true);
if (emitted.emitSkipped || emitted.diagnostics.length) throw new Error('Declaration emit failed; API reference was not changed.');
const documented = new Set(declarations.map(declaration => declaration.name));
const missing = [...publicSymbols.keys()].filter(name => !documented.has(name));
if (missing.length) throw new Error(`Unrepresented public exports: ${missing.join(', ')}`);
declarations.sort((a, b) => a.source.localeCompare(b.source, 'en') || Number(b.factory) - Number(a.factory) || a.name.localeCompare(b.name, 'en'));
const anchor = (name: string) => name.toLowerCase();
const links = (ids: Iterable<string>) => [...ids].sort().map(id => `[${id}](https://minifish-org.github.io/pith-ui/?item=${id})`).join(', ');
const version = (JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as { version: string }).version;
const lines = [
  '# Public API reference', '',
  `Generated for \`pith-ui@${version}\` by \`node scripts/api-docs.ts\` from TypeScript declaration emit. Do not edit this file by hand. The installed public declarations are authoritative; this reference reproduces every public declaration, including all ${factories.length} create/install/mount factories and their state, options, callback and handle types.`, '',
  'Use the [catalog](https://github.com/minifish-org/pith-ui/blob/main/docs/catalog.md) to choose a complete block first, then inspect its exact signature and linked types here. Gallery links are related experiences; adapter APIs may point to their preferred replacement. Source links point to the implementation, not a second usage contract.', '',
  'Types such as `HTMLElement`, `Node`, `Event`, `Promise` and TypeScript utility types are standard platform types. Named Pith UI references below link to their exact public definitions. Node slots require trusted DOM nodes; there is no arbitrary-HTML extension interface. See [AI.md](./AI.md) for lifecycle, host boundaries and composition rules.', '',
  'Regenerate: `node scripts/api-docs.ts`. Verify without writing: `node scripts/api-docs.ts --check`.', '',
  '## Factory index', '',
  '| Factory | Related gallery |', '|---|---|',
  ...factories.map(name => `| [\`${name}\`](#${anchor(name)}) | ${links(gallery.get(name)!)} |`), '',
];
for (const source of [...new Set(declarations.map(declaration => declaration.source))]) {
  lines.push(`## ${source}`, '');
  for (const declaration of declarations.filter(value => value.source === source)) {
    lines.push(`### ${declaration.name}`, '', `[Source](https://github.com/minifish-org/pith-ui/blob/main/${declaration.source}#L${declaration.line})`, '', '```ts', declaration.text, '```', '');
    if (declaration.references.length) lines.push(`Referenced public types and APIs: ${declaration.references.map(name => `[\`${name}\`](#${anchor(name)})`).join(', ')}.`, '');
    if (gallery.get(declaration.name)?.size) lines.push(`Related gallery: ${links(gallery.get(declaration.name)!)}.`, '');
  }
}
const output = lines.join('\n');
const target = join(root, 'API.md');
if (check) {
  let existing = ''; try { existing = await readFile(target, 'utf8'); } catch { /* The actionable error below also covers a missing reference. */ }
  if (existing !== output) throw new Error('API.md is out of date. Run node scripts/api-docs.ts and review the generated changes.');
} else await writeFile(target, output);
console.log(`${check ? 'Verified' : 'Generated'} API.md: ${factories.length} factories, ${documented.size} public names, ${declarations.length} declarations.`);
