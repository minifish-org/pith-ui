import {readFile, readdir} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const docs = join(root, 'docs/assemblies'), examples = join(root, 'examples/assemblies');
const virtual = new Map<string, string>();
for (const name of (await readdir(docs)).filter(name => name.endsWith('.md')).sort()) {
  const body = await readFile(join(docs, name), 'utf8');
  let index = 0;
  for (const match of body.matchAll(/^```(?:ts|typescript)\s*\n([\s\S]*?)^```\s*$/gm)) {
    virtual.set(join(docs, `${name}.example-${++index}.ts`), `${match[1]}\nexport {};\n`);
  }
  if (!index) throw new Error(`Assembly documentation has no executable TypeScript example: ${name}`);
}
const recipeFiles = (await readdir(examples)).filter(name => name.endsWith('.ts')).map(name => join(examples, name));
for (const name of recipeFiles) {
  const source = ts.createSourceFile(name, await readFile(name, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text;
      if (!['pith-ui','pith-ui/recipes'].includes(specifier) && !/^\.\/[^/]+\.js$/.test(specifier)) {
        throw new Error(`Assembly recipes may import only the formal parts entry or local recipes: ${name}: ${specifier}`);
      }
    }
    if (ts.isIdentifier(node) && ['document', 'window', 'Node', 'DOMParser'].includes(node.text)) {
      throw new Error(`Assembly recipes may not create or inspect raw DOM: ${name}: ${node.text}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}
const config = ts.readConfigFile(join(root, 'tsconfig.json'), ts.sys.readFile);
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const host = ts.createCompilerHost(parsed.options), originalRead = host.readFile, originalExists = host.fileExists;
host.readFile = name => virtual.get(name) ?? originalRead(name);
host.fileExists = name => virtual.has(name) || originalExists(name);
host.getSourceFile = (name, languageVersion, onError) => {
  const body = host.readFile(name);
  if (body === undefined) {onError?.(`Cannot read ${name}`); return undefined;}
  return ts.createSourceFile(name, body, languageVersion, true);
};
const program = ts.createProgram([...recipeFiles, ...virtual.keys()], {...parsed.options, noEmit: true}, host);
const errors = ts.getPreEmitDiagnostics(program);
if (errors.length) throw new Error(ts.formatDiagnosticsWithColorAndContext(errors, {
  getCurrentDirectory: () => root, getCanonicalFileName: name => name, getNewLine: () => '\n',
}));
console.log(`Compiled ${recipeFiles.length} constrained assembly recipes and ${virtual.size} documentation examples.`);
