import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {join, relative, resolve} from 'node:path';
import ts from 'typescript';
import type {Density} from '../src/core.ts';

const root = resolve(process.cwd());
function files(directory: string, extension: string): string[] {
  return readdirSync(directory, {withFileTypes:true}).flatMap(entry => entry.isDirectory() ? files(join(directory,entry.name),extension) : entry.name.endsWith(extension) ? [join(directory,entry.name)] : []);
}
const sourceFiles = ['src','showroom'].flatMap(directory => files(join(root,directory),'.ts'));
const cssFiles = ['src','showroom'].flatMap(directory => files(join(root,directory),'.css'));
const sizeTokens = ['--pui-text-small','--pui-text-medium','--pui-text-large','--pui-font-size','--pui-form-font-size'];
const familyTokens = ['--pui-font-ui','--pui-font-code','--pui-font-family'];
const weightTokens = ['--pui-weight-regular','--pui-weight-strong'];
const spaceTokens = ['--pui-space-xs','--pui-space-sm','--pui-space-md','--pui-space-lg','--pui-space-xl','--pui-field-gap'];
function token(value: string, names: readonly string[]): boolean { return names.some(name => value === `var(${name})`); }
function permitted(property: string, value: string): boolean {
  value = value.trim().replace(/var\(\s*(--[\w-]+)\s*\)/g,'var($1)').replace(/\s+/g,' ');
  if (value === 'inherit') return true;
  if (property === 'font-size') return value === '0' || token(value,sizeTokens);
  if (property === 'font-family') return token(value,familyTokens);
  if (property === 'font-weight') return token(value,weightTokens);
  if (property === 'line-height') return ['0','normal'].includes(value) || token(value,['--pui-line-height']);
  if (property === 'font') {
    const withoutTokens = value.replace(/var\((--[\w-]+)\)/g,(match,name:string) => [...sizeTokens,...familyTokens,...weightTokens,'--pui-line-height'].includes(name) ? '' : match);
    return withoutTokens.replace(/[\s/]/g,'') === '';
  }
  if (property === 'gap' || property === 'row-gap' || property === 'column-gap') {
    return value.split(' ').every(part => ['0','normal'].includes(part) || token(part,spaceTokens));
  }
  return true;
}
function permittedBoxSpacing(property: string, input: string): boolean {
  const value=input.trim().replace(/var\(\s*(--[\w-]+)\s*\)/g,'var($1)');
  return value.split(/\s+/).every(part=>part==='0'||(property.startsWith('margin')&&part==='auto')||token(part,spaceTokens));
}

test('source margin overlap only negates an approved spacing token', () => {
  for (const property of ['margin','margin-top','margin-inline-start']) {
    assert.equal(permittedBoxSpacing(property,'var(--pui-space-sm) 0 var(--pui-space-lg)'),true);
    assert.equal(permittedBoxSpacing(property,'calc(-1 * var(--pui-space-sm)) 0 var(--pui-space-lg)'),true);
  }
  for (const property of ['padding','padding-top','gap','row-gap']) assert.equal(permittedBoxSpacing(property,'calc(-1 * var(--pui-space-sm))'),false);
  for (const value of ['-8px','calc(-8px)','calc(-2 * var(--pui-space-sm))','calc(-1 * var(--pui-space-sm) + 1px)','calc(-1 * var(--pui-space-sm) * var(--pui-space-lg))','calc(-1 * var(--pui-space-unknown))','calc(-1 * var(--pui-text-small))','calc(-1 * var(--pui-field-gap))']) assert.equal(permittedBoxSpacing('margin',value),false,value);
});

test('the design contract has three text roles, two font stacks and five spacing choices', () => {
  const file = join(root,'src/design.css'); assert.ok(existsSync(file),'Shared design foundations must exist');
  const css = readFileSync(file,'utf8');
  const expected = {'--pui-text-small':'12px','--pui-text-medium':'14px','--pui-text-large':'16px','--pui-line-height':'1.5','--pui-weight-regular':'400','--pui-weight-strong':'600','--pui-space-xs':'4px','--pui-space-sm':'8px','--pui-space-md':'12px','--pui-space-lg':'16px','--pui-space-xl':'24px'};
  for (const [name,value] of Object.entries(expected)) assert.match(css,new RegExp(`${name}\\s*:\\s*${value}\\s*[;}]`),name);
  for (const family of ['--pui-font-ui','--pui-font-code']) assert.match(css,new RegExp(`${family}\\s*:\\s*[^;{}]+[;}]`),family);
  const fontDefinitions = css.match(/--pui-font-(?:ui|code)\s*:/g) ?? [];
  assert.equal(fontDefinitions.length,2,'Each shared font stack has one definition');
  for (const path of cssFiles) assert.doesNotMatch(readFileSync(path,'utf8'),/@font-face\b/i,'The library does not ship a downloaded font');
});

test('authored CSS consumes shared type and gap tokens instead of adding local scales', () => {
  const violations: string[] = [];
  for (const file of cssFiles) {
    const css = readFileSync(file,'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
    for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      for (const declaration of rule[2].matchAll(/([\w-]+)\s*:\s*([^;{}]+)(?:;|$)/g)) {
        const [,property,value] = declaration;
        // The logo's cell separation is its graphic, not component spacing.
        if (property === 'gap' && rule[1].includes('.pui-logo-mark') && ['3px','4px'].includes(value.trim())) continue;
        if (!permitted(property,value)) violations.push(`${relative(root,file)} ${rule[1].trim()}: ${property}: ${value.trim()}`);
      }
    }
  }
  assert.deepEqual(violations,[]);
});

const styleProperties = new Map([['fontSize','font-size'],['fontFamily','font-family'],['fontWeight','font-weight'],['lineHeight','line-height'],['font','font'],['gap','gap'],['rowGap','row-gap'],['columnGap','column-gap']]);
test('authored inline styles cannot reintroduce a fixed typography or spacing scale', () => {
  const violations: string[] = [];
  for (const file of sourceFiles) {
    const source = ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
    const constants = new Map<string,ts.Expression>();
    const remember = (node: ts.Node): void => {if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) constants.set(node.name.text,node.initializer); ts.forEachChild(node,remember);}; remember(source);
    const check = (name:string,expression:ts.Expression):void => {
      const property = styleProperties.get(name); if (!property) return;
      if (ts.isIdentifier(expression) && constants.has(expression.text)) expression = constants.get(expression.text)!;
      let value: string | undefined;
      if (ts.isStringLiteralLike(expression)) value = expression.text;
      else if (ts.isNumericLiteral(expression)) value = expression.text;
      else if (ts.isTemplateExpression(expression)) {
        const literal = expression.head.text + expression.templateSpans.map(span=>span.literal.text).join('');
        if (literal.startsWith('var(') && !/\d|px|rem|em/.test(literal)) return;
        value = expression.getText(source);
      } else value = expression.getText(source);
      if (!permitted(property,value)) {const line=source.getLineAndCharacterOfPosition(expression.getStart(source)).line+1;violations.push(`${relative(root,file)}:${line} ${property}: ${value}`);}
    };
    const visit = (node:ts.Node):void => {
      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isPropertyAccessExpression(node.left) && ts.isPropertyAccessExpression(node.left.expression) && node.left.expression.name.text === 'style') check(node.left.name.text,node.right);
      if (ts.isCallExpression(node) && node.expression.getText(source) === 'Object.assign' && node.arguments[0]?.getText(source).endsWith('.style')) for (const argument of node.arguments.slice(1)) if (ts.isObjectLiteralExpression(argument)) for (const property of argument.properties) if (ts.isPropertyAssignment(property)) check(property.name.getText(source).replace(/^['"]|['"]$/g,''),property.initializer);
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'setProperty' && node.expression.expression.getText(source).endsWith('.style') && node.arguments.length >= 2 && ts.isStringLiteralLike(node.arguments[0])) {
        const property=node.arguments[0].text;const camel=[...styleProperties].find(([,css])=>css===property)?.[0];if(camel) check(camel,node.arguments[1]);
      }
      ts.forEachChild(node,visit);
    };visit(source);
  }
  assert.deepEqual(violations,[]);
});

test('public component APIs keep density semantic and do not expose numeric style knobs', () => {
  const densities: Record<Density,true> = {normal:true,compact:true}; assert.deepEqual(Object.keys(densities),['normal','compact']);
  const exports = readFileSync(join(root,'src/index.ts'),'utf8');
  const violations: string[] = [];
  for (const match of exports.matchAll(/export(?: \*| (?:type )?\{[^}]+\}) from '\.\/([^']+)\.js'/g)) {
    const file=join(root,'src',match[1]+'.ts'),source=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
    const check = (node:ts.Node):void => {if(ts.isPropertySignature(node) && ['fontSize','lineHeight','gap','fontFamily','fontWeight','letterSpacing'].includes(node.name.getText(source).replace(/^['"]|['"]$/g,''))) violations.push(`${relative(root,file)}: ${node.name.getText(source)}`);ts.forEachChild(node,check);};
    for (const statement of source.statements) if (ts.canHaveModifiers(statement) && ts.getModifiers(statement)?.some(modifier=>modifier.kind===ts.SyntaxKind.ExportKeyword)) {
      if(ts.isInterfaceDeclaration(statement)||ts.isTypeAliasDeclaration(statement)) check(statement);
      else if(ts.isFunctionDeclaration(statement)) statement.parameters.forEach(check);
    }
  }
  assert.deepEqual(violations,[]);
});

test('small-control padding and margins use the fixed spacing scale', () => {
  const css=readFileSync(join(root,'src/primitives.css'),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
  const violations:string[]=[];
  for(const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g))for(const declaration of rule[2].matchAll(/((?:padding|margin)(?:-[\w-]+)?)\s*:\s*([^;{}]+)(?:;|$)/g)){
    if(rule[1].includes('.pui-sr-only')&&declaration[2].trim()==='-1px')continue;
    const value=declaration[2].trim();
    if(!permittedBoxSpacing(declaration[1],value))violations.push(`${rule[1].trim()}: ${declaration[1]}: ${value}`);
  }
  assert.deepEqual(violations,[]);
});
