import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import ts from 'typescript';

const root = resolve(process.cwd());
const reference = join(root, 'examples/application/main.ts');

/** Inspect executable syntax, never examples of syntax inside business text. */
function boundaryViolations(text: string): string[] {
  const source = ts.createSourceFile('reference.ts', text, ts.ScriptTarget.Latest, true);
  const violations: string[] = [];
  const imports = new Set(['pith-ui/app', 'pith-ui/styles.css']);
  const appValues = new Set(['createApplication', 'customModelDefaults']);
  const forbiddenMembers = new Set(['element', 'part', 'field', 'control', 'style', 'className', 'classList', 'innerHTML', 'outerHTML', 'textContent', 'querySelector', 'querySelectorAll', 'closest', 'matches', 'createElement', 'append', 'appendChild', 'replaceChildren', 'setAttribute', 'insertAdjacentHTML', 'getComputedStyle']);
  let mounts = 0;
  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node)) {
      if (!ts.isStringLiteral(node.moduleSpecifier) || !imports.has(node.moduleSpecifier.text)) violations.push('private or unsupported import');
      if (node.importClause?.name || node.importClause?.namedBindings && ts.isNamespaceImport(node.importClause.namedBindings)) violations.push('default or namespace import');
      const bindings = node.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) for (const binding of bindings.elements) {
        if (!node.importClause?.isTypeOnly && !binding.isTypeOnly && !appValues.has((binding.propertyName ?? binding.name).text)) violations.push('lower-level factory import');
      }
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) violations.push('dynamic import');
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'require') violations.push('require import');
    if (ts.isPropertyAccessExpression(node)) {
      if (forbiddenMembers.has(node.name.text)) violations.push(node.name.text);
      if (ts.isIdentifier(node.expression) && node.expression.text === 'document' && node.name.text !== 'getElementById') violations.push('document access');
    }
    if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression) && forbiddenMembers.has(node.argumentExpression.text)) violations.push(node.argumentExpression.text);
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'getElementById') {
      mounts++;
      if (!ts.isIdentifier(node.expression.expression) || node.expression.expression.text !== 'document' || node.arguments.length !== 1 || !ts.isStringLiteral(node.arguments[0]) || node.arguments[0].text !== 'app') violations.push('non-application mount');
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  if (mounts !== 1) violations.push('one application mount is required');
  return violations;
}

test('the reference application uses only the constrained public entry and one checked mount', () => {
  assert.ok(existsSync(reference), 'A complete reference application must be checked in');
  const text = readFileSync(reference, 'utf8');
  assert.deepEqual(boundaryViolations(text), []);
  const source = ts.createSourceFile(reference, text, ts.ScriptTarget.Latest, true);
  let checkedMount = false, applications = 0;
  function visit(node: ts.Node): void {
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword && ts.isIdentifier(node.right) && node.right.text === 'HTMLElement') checkedMount = true;
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'createApplication') applications++;
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.equal(checkedMount, true, 'The sole mount is validated before passing it to the library');
  assert.equal(applications, 1);
  const html = readFileSync(join(root, 'examples/application/index.html'), 'utf8');
  assert.match(html, /<div\s+id="app"\s*>\s*<\/div>/);
  assert.match(html, /<script\s+type="module"\s+src="\.\/main\.ts"\s*>/);
  assert.doesNotMatch(html, /<style\b|\sstyle\s*=|<link\b[^>]+stylesheet/i, 'The reference has no private visual implementation');
});

test('the syntax gate accepts business prose but rejects actual DOM and private-factory escapes', () => {
  const mount = "const mount = document.getElementById('app'); if (!(mount instanceof HTMLElement)) throw new Error('Missing mount');";
  assert.deepEqual(boundaryViolations(`${mount} const content = 'element.style querySelector <style> createButton'; const data = {content: 'render html', id: 'business-id'};`), []);
  assert.deepEqual(boundaryViolations(`${mount} import {customModelDefaults as defaults} from 'pith-ui/app'; const model = defaults();`), []);
  for (const body of ["import {createButton} from 'pith-ui';", "import {createButton} from 'pith-ui/app';", "import {createButton as customModelDefaults} from 'pith-ui/app';", "import {customModelDefaults} from 'pith-ui';", 'app.workspace.element.append(document.createElement("div"));', 'app.workspace["style"] = {};', 'document.querySelector("main");', 'await import("../../src/index.ts");']) {
    assert.ok(boundaryViolations(`${mount}${body}`).length, body);
  }
});

test('the complete reference compiles strictly against the built package public exports', () => {
  assert.ok(existsSync(reference), 'The maintained TypeScript example is required');
  assert.ok(existsSync(join(root, 'dist/app/index.d.ts')), 'Build the package before validating its public reference');
  const program = ts.createProgram([reference], {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'], types: ['node'], strict: true, noEmit: true, skipLibCheck: false, verbatimModuleSyntax: true});
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.deepEqual(diagnostics.map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')), []);
});

test('the typed showroom includes the complete constrained reference as a page', () => {
  const path = join(root, 'showroom/application-cases.ts');
  assert.ok(existsSync(path), 'The reference must be discoverable and operable in the showroom');
  const text = readFileSync(path, 'utf8'), source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
  let referencePage = false, frame = false, fullPageLink = false;
  function visit(node: ts.Node): void {
    if (ts.isObjectLiteralExpression(node)) {
      const value = (name: string) => node.properties.find(property => ts.isPropertyAssignment(property) && property.name.getText(source) === name) as ts.PropertyAssignment | undefined;
      const id = value('id')?.initializer, layer = value('layer')?.initializer;
      if (id && layer && ts.isStringLiteralLike(id) && id.text === 'application-reference' && ts.isStringLiteralLike(layer) && layer.text === 'pages') referencePage = true;
    }
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'createElement' && ts.isStringLiteral(node.arguments[0])) {
      frame ||= node.arguments[0].text === 'iframe'; fullPageLink ||= node.arguments[0].text === 'a';
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.equal(referencePage, true); assert.equal(frame, true); assert.equal(fullPageLink, true);
  assert.match(readFileSync(join(root, 'showroom/catalog.ts'), 'utf8'), /applicationCases/);
});
