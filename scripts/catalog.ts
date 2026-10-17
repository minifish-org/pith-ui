import { readFile, readdir } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
// This file has no top-level DOM effects; importing it keeps public examples in the normal type-check graph.
import '../docs/examples.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const config = ts.readConfigFile(join(root, 'tsconfig.json'), ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const program = ts.createProgram([join(root, 'src/index.ts'), join(root, 'docs/examples.ts')], parsed.options);
const errors = ts.getPreEmitDiagnostics(program);
if (errors.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(errors, { getCurrentDirectory: () => root, getCanonicalFileName: name => name, getNewLine: () => '\n' }));
const source = program.getSourceFile(join(root, 'src/index.ts'))!;
const checker = program.getTypeChecker();
const symbols = checker.getExportsOfModule(checker.getSymbolAtLocation(source)!);
const factories = symbols.map(symbol => symbol.getName()).filter(name => /^(create|install|mount)/.test(name)).sort();
const catalog = await readFile(join(root, 'docs/catalog.md'), 'utf8');
const undocumented = factories.filter(name => !catalog.includes('`' + name + '`'));
if (undocumented.length) throw new Error(`Public factories missing from docs/catalog.md: ${undocumented.join(', ')}`);
if (symbols.some(symbol => ['reconcileViews', 'clearViews'].includes(symbol.getName()))) throw new Error('Internal HTML reconciliation must not be a public extension API');

const cases = new Map<string, string>();
const foundationSource=await readFile(join(root,'showroom/foundation-cases.ts'),'utf8');
for(const match of foundationSource.slice(foundationSource.indexOf('const rules'),foundationSource.indexOf('export const foundationCases')).matchAll(/\['([a-z-]+)',/g))cases.set('foundation-'+match[1]!, 'foundation-cases.ts');
let examples = 0;
for (const filename of (await readdir(join(root, 'showroom'))).filter(name => name.endsWith('-cases.ts'))) {
  const body = await readFile(join(root, 'showroom', filename), 'utf8');
  const file = ts.createSourceFile(filename, body, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const visit = (node: ts.Node): void => {
    if (ts.isObjectLiteralExpression(node)) {
      const named = (name: string) => node.properties.find(property => property.name && (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) && property.name.text === name);
      const id = named('id');
      if (named('mount') && id && ts.isPropertyAssignment(id) && ts.isStringLiteralLike(id.initializer)) {
        const value = id.initializer.text;
        if (cases.has(value)) throw new Error(`Duplicate showroom ID ${value}: ${cases.get(value)}, ${filename}`);
        cases.set(value, filename);
      }
      const code = named('code');
      if (code && ts.isPropertyAssignment(code) && ts.isStringLiteralLike(code.initializer)) {
        const example = ts.createSourceFile(filename + ':example.ts', code.initializer.text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
        const diagnostics = (example as ts.SourceFile & { parseDiagnostics: readonly ts.Diagnostic[] }).parseDiagnostics;
        if (diagnostics.length) throw new Error(`Invalid TypeScript example in ${filename}: ${ts.flattenDiagnosticMessageText(diagnostics[0]!.messageText, '\n')}`);
        examples++;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
}
const documentation = [await readFile(join(root, 'README.md'), 'utf8'), await readFile(join(root, 'AI.md'), 'utf8'), catalog, await readFile(join(root, 'docs/guide.md'), 'utf8')].join('\n');
for (const link of documentation.matchAll(/[?&]item=([a-z0-9-]+)/g)) if (!cases.has(link[1]!)) throw new Error(`Documentation links to unknown showroom item: ${link[1]}`);
console.log(`Validated ${factories.length} documented public factories, ${cases.size} showroom IDs, ${examples} TypeScript snippet syntaxes and compiled public examples.`);
