import assert from 'node:assert/strict';
import {after,before,test} from 'node:test';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {cpSync,existsSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,rmSync,symlinkSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import ts from 'typescript';

const root = resolve(process.cwd());
let temporary: string,archive: string,consumer: string,unpacked: string;
let packed: {filename: string;integrity: string;files: {path: string;size: number}[]};
const metadata = JSON.parse(readFileSync(join(root,'package.json'),'utf8')) as {name: string;version: string};
function command(executable: string,args: string[],cwd: string,expectSuccess = true) {
  const result = spawnSync(executable,args,{cwd,encoding: 'utf8',maxBuffer: 8*1024*1024});
  if (expectSuccess) assert.equal(result.status,0,`${executable} ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`);
  return result;
}
const npm = (args: string[],cwd: string) => command('npm',args,cwd).stdout;
function compile(files: string|readonly string[]): readonly ts.Diagnostic[] {
  const program = ts.createProgram(typeof files === 'string' ? [files] : [...files],{
    target: ts.ScriptTarget.ES2022,module: ts.ModuleKind.NodeNext,moduleResolution: ts.ModuleResolutionKind.NodeNext,
    lib: ['lib.es2022.d.ts','lib.dom.d.ts','lib.dom.iterable.d.ts'],types: [],
    strict: true,noEmit: true,skipLibCheck: false,verbatimModuleSyntax: true,
  });
  assert.equal(program.getCompilerOptions().skipLibCheck,false);return ts.getPreEmitDiagnostics(program);
}
const diagnosticText = (diagnostics: readonly ts.Diagnostic[]) => diagnostics.map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText,'\n'));
const installed = () => join(consumer,'node_modules/pith-ui');

before(() => {
  temporary = mkdtempSync(join(tmpdir(),'pith-ui-parts-package-'));consumer = join(temporary,'consumer');mkdirSync(consumer);
  npm(['run','build'],root);[packed] = JSON.parse(npm(['pack','--json','--ignore-scripts','--pack-destination',temporary],root));archive = join(temporary,packed.filename);
  unpacked = join(temporary,'archive');mkdirSync(unpacked);command('tar',['-xzf',archive,'-C',unpacked],temporary);
  writeFileSync(join(consumer,'package.json'),JSON.stringify({name: 'installed-parts-consumer',version: '1.0.0',private: true,type: 'module'}));
  npm(['install','--ignore-scripts','--no-audit','--no-fund',archive],consumer);
});
after(() => {if (temporary) rmSync(temporary,{recursive: true,force: true});});

test('the actual npm archive contains only bounded public entries, executable documentation and portable CSS',() => {
  const paths = new Set(packed.files.map(file => file.path));
  for (const path of ['dist/index.js','dist/index.d.ts','dist/styles.css','README.md','AI.md','API.md','APP.md','LICENSE','examples/assemblies/desk.ts','docs/assemblies/desk.md','docs/assemblies/coverage.md','docs/contracts/rc27-ui-022.md']) assert.ok(paths.has(path),`Missing packed entry or executable documentation ${path}`);
  assert.ok([...paths].every(path => !/^(?:src|tests|showroom|node_modules)\//.test(path)),'Development sources do not belong in the runtime package.');
  assert.ok([...paths].every(path => !path.startsWith('dist/app/') && path !== 'APP-API.md'),'Removed template entries must not remain in the archive.');
  assert.ok([...paths].filter(path => path.startsWith('examples/')).every(path => /^examples\/assemblies\/[^/]+\.ts$/.test(path)),'Only local assembly documentation, not an application runtime entry, is shipped as examples.');
  const pkg = JSON.parse(readFileSync(join(installed(),'package.json'),'utf8'));
  assert.deepEqual(pkg.exports,{'.': {types: './dist/index.d.ts',import: './dist/index.js'},'./styles.css': './dist/styles.css'});
  assert.equal(`sha512-${createHash('sha512').update(readFileSync(archive)).digest('base64')}`,packed.integrity,'The tested archive must match npm pack integrity.');
  for (const file of packed.files) {
    const bytes = readFileSync(join(installed(),file.path));assert.equal(bytes.length,file.size,`Installed size differs: ${file.path}`);
    assert.ok(bytes.equals(readFileSync(join(unpacked,'package',file.path))),`Installed bytes differ from the actual archive: ${file.path}`);
  }
  assert.doesNotMatch(readFileSync(join(installed(),'dist/styles.css'),'utf8'),/@import\s+['"]\.\//,'Published CSS must not depend on missing relative sources.');
  const runtime = command(process.execPath,['--input-type=module','-e',`
    import assert from 'node:assert/strict';
    const ui = await import('pith-ui'), names = Object.keys(ui).sort();
    assert.equal(typeof ui.mountParts, 'function');assert.equal(typeof ui.createButtonPart, 'function');
    assert.ok(names.every(name => name === 'mountParts' || /^create[A-Za-z0-9]+Part$/.test(name)), 'Only constrained native parts may be exported');
    for (const name of ['createApplication','createButton','createWorkspaceShell','createSettingsScene','customModelDefaults','formatCost']) assert.equal(name in ui,false,name);
    for (const entry of ['pith-ui/app','pith-ui/parts','pith-ui/dist/parts/ownership.js','pith-ui/src/dom.js']) await assert.rejects(import(entry), {code: 'ERR_PACKAGE_PATH_NOT_EXPORTED'});
    console.log(JSON.stringify(names));
  `],consumer);
  const names = JSON.parse(runtime.stdout.trim()),api = readFileSync(join(installed(),'API.md'),'utf8'),documented = [...api.matchAll(/^\| \[\x60((?:create[A-Za-z0-9]+Part)|mountParts)\x60\]/gm)].map(match => match[1]!).sort();
  assert.deepEqual(names,documented,'Installed ESM and the actual packed API index must agree.');
});

test('every actually shipped local assembly and documentation example compiles against the exact installed package and the complete Desk blueprint builds',() => {
  const sourceDirectory = join(installed(),'examples/assemblies'),destination = join(consumer,'examples/assemblies'),files: string[] = [];
  mkdirSync(destination,{recursive: true});
  for (const name of readdirSync(sourceDirectory).filter(name => name.endsWith('.ts'))) {
    const text = readFileSync(join(sourceDirectory,name),'utf8'),source = ts.createSourceFile(name,text,ts.ScriptTarget.Latest,true);
    const visit = (node: ts.Node): void => {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) assert.ok(ts.isStringLiteralLike(node.moduleSpecifier) && (node.moduleSpecifier.text === 'pith-ui' || /^\.\/[^/]+\.js$/.test(node.moduleSpecifier.text)),`Packed recipe ${name} imports a source/private entry.`);
      assert.ok(!(ts.isIdentifier(node) && ['document','window','Node','DOMParser'].includes(node.text)),`Packed recipe ${name} creates or inspects raw DOM.`);ts.forEachChild(node,visit);
    };visit(source);const target = join(destination,name);writeFileSync(target,text);files.push(target);
  }
  assert.ok(files.includes(join(destination,'desk.ts')),'The complete local Desk blueprint must be shipped and compiled.');
  const docsDirectory = join(installed(),'docs/assemblies'),compiledDocs = join(consumer,'docs/assemblies');mkdirSync(compiledDocs,{recursive: true});let examples = 0;
  for (const name of readdirSync(docsDirectory).filter(name => name.endsWith('.md'))) {
    const text = readFileSync(join(docsDirectory,name),'utf8');let count = 0;
    for (const match of text.matchAll(/^```(?:ts|typescript)\s*\n([\s\S]*?)^```\s*$/gm)) {const target = join(compiledDocs,`${name}.example-${++count}.ts`);writeFileSync(target,match[1]+'\nexport {};\n');files.push(target);examples++;}
    assert.ok(count > 0,`Packed assembly document ${name} has no executable example.`);
  }
  assert.ok(examples > 0);assert.deepEqual(diagnosticText(compile(files)),[]);
  writeFileSync(join(consumer,'recipe-main.ts'),"import {mountDesk} from './examples/assemblies/desk.js';\nimport 'pith-ui/styles.css';\nconst app=mountDesk(document.getElementById('app') as HTMLElement,{appearance:'light'});\nwindow.addEventListener('pagehide',()=>app.destroy(),{once:true});\n");
  writeFileSync(join(consumer,'index.html'),'<!doctype html><html><head><meta charset="utf-8"><title>Installed local Desk blueprint</title></head><body><div id="app"></div><script type="module" src="/recipe-main.ts"></script></body></html>');
  command(process.execPath,[join(root,'node_modules/vite/bin/vite.js'),'build','--outDir','recipe-dist'],consumer);
  const assets = readdirSync(join(consumer,'recipe-dist/assets'));assert.ok(assets.some(name => name.endsWith('.js')) && assets.some(name => name.endsWith('.css')),'The installed Desk blueprint production build must contain JS and CSS.');
});

test('the installed bounded root retains maintained examples and pure data callback compatibility under strict declarations',() => {
  const file = join(consumer,'parts-examples.ts');writeFileSync(file,readFileSync(join(root,'docs/examples.ts'),'utf8').replaceAll("'../src/parts/index.js'","'pith-ui'"));assert.deepEqual(diagnosticText(compile(file)),[]);
  const callbacks = join(consumer,'callback-compatibility.ts');writeFileSync(callbacks,`
import {createInputPart,createSelectPart,createMarkdownPart,createButtonPart,createStackPart,mountParts,type InputOptions,type ChoiceOptions,type MarkdownPartOptions} from 'pith-ui';
import 'pith-ui/styles.css';
const values:string[]=[];
const input={label:'Name',onInput:value=>values.push(value)} satisfies InputOptions;
const choice={options:[{value:'one',label:'One'}],onChange:value=>values.push(value)} satisfies ChoiceOptions;
const markdown={text:'',onCopyCode:async text=>{const exact:string=text;await Promise.resolve();void exact;}} satisfies MarkdownPartOptions;
const part=createStackPart({children:[createInputPart(input),createSelectPart(choice),createMarkdownPart(markdown),createButtonPart({label:'Save',onAction:async()=>({ok:true})})]});
mountParts(document.getElementById('app') as HTMLElement,part);
`);assert.deepEqual(diagnosticText(compile(callbacks)),[]);
  writeFileSync(join(consumer,'index.html'),'<!doctype html><html><head><meta charset="utf-8"><title>Installed parts consumer</title></head><body><div id="app"></div><script type="module" src="/callback-compatibility.ts"></script></body></html>');command(process.execPath,[join(root,'node_modules/vite/bin/vite.js'),'build','--outDir','parts-dist'],consumer);
  const assets = readdirSync(join(consumer,'parts-dist/assets'));assert.ok(assets.some(name => name.endsWith('.js')) && assets.some(name => name.endsWith('.css')));
});

for (const [label,text,token] of [
  ['part element handle','button.element;','element'],['native input control handle','input.control;','control'],['input element handle','input.element;','element'],
  ['free inline style',"createButtonPart({label:'Save',style:{padding:8}});",'style'],['free class',"createButtonPart({label:'Save',className:'custom'});",'className'],
  ['free render callback',"createButtonPart({label:'Save',render:()=>document.createElement('span')});",'render'],['DOM node child','createStackPart({children:[document.body]});','Part'],
  ['node instead of literal text',"createTextPart({text:document.body});",'HTMLElement'],['pixel layout','createStackPart({children:[],gap:12});','gap'],
  ['animation parameters',"createButtonPart({label:'Save',duration:100});",'duration'],['custom SVG',"createButtonPart({label:'Save',icon:'custom-svg'});",'custom-svg'],
  ['pixel field width',"createInputPart({label:'Name',width:300});",'width'],['unknown appearance',"mountParts(mount,button,{appearance:'custom'});",'custom'],
  ['forged part','const fake:Part={destroy(){}};','Part'],['old application factory',"import {createApplication} from 'pith-ui';",'createApplication'],['old unrestricted factory',"import {createButton} from 'pith-ui';",'createButton'],
] as const) test(`actual packed declarations reject ${label}`,() => {
  const file = join(consumer,'invalid-consumer.ts');writeFileSync(file,`import {createButtonPart,createInputPart,createTextPart,createStackPart,mountParts,type Part} from 'pith-ui';\ndeclare const mount:HTMLElement;\nconst button=createButtonPart({label:'Save'}),input=createInputPart({label:'Name'});\n${text}\n`);
  const diagnostics = compile(file).filter(diagnostic => diagnostic.file?.fileName === file && diagnostic.start !== undefined && diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line === 3);
  assert.ok(diagnostics.length > 0,`Packed public types accepted forbidden ${label}`);assert.ok(diagnosticText(diagnostics).some(message => message.includes(token)),diagnosticText(diagnostics).join('\n'));
});

// The real release verifier receives an independently repacked and installed
// archive. Its repository-shaped fixture only links the existing locked tools;
// executable recipes and docs are always read from that installed archive.
function releaseVerificationFixture(name: string,mutate: (packageRoot: string,pipelineRoot: string) => void,afterPack?: (tarball: string) => void) {
  const pipeline = join(temporary,name);mkdirSync(pipeline);const fixtureUnpacked = join(pipeline,'unpacked');mkdirSync(fixtureUnpacked);command('tar',['-xzf',archive,'-C',fixtureUnpacked],pipeline);const packageRoot = join(fixtureUnpacked,'package');
  mkdirSync(join(pipeline,'scripts'));mkdirSync(join(pipeline,'artifacts'));
  for (const file of ['release.ts','published-package.ts','verify-package.ts']) cpSync(join(root,'scripts',file),join(pipeline,'scripts',file));
  symlinkSync(join(root,'node_modules'),join(pipeline,'node_modules'),'dir');writeFileSync(join(pipeline,'package.json'),JSON.stringify({name: metadata.name,version: metadata.version,type: 'module'}));mutate(packageRoot,pipeline);
  const [repacked] = JSON.parse(npm(['pack','--json','--ignore-scripts','--pack-destination',join(pipeline,'artifacts')],packageRoot)) as {filename: string}[],tarball = join(pipeline,'artifacts',repacked!.filename);
  writeFileSync(join(pipeline,'artifacts/package-manifest.json'),JSON.stringify({filename: repacked!.filename,name: metadata.name,version: metadata.version,sha256: createHash('sha256').update(readFileSync(tarball)).digest('hex'),commit: process.env.GITHUB_SHA ?? 'isolated-verification-fixture',dirty: false}));afterPack?.(tarball);
  return command(process.execPath,['scripts/release.ts','verify'],pipeline,false);
}

test('the isolated real release verifier accepts the valid bounded package and all shipped recipes before mutations',() => {
  const result = releaseVerificationFixture('valid-package',() => {});assert.equal(result.status,0,result.stdout+result.stderr);assert.match(result.stdout,/Verified exact tarball/);assert.match(result.stdout,/installed local assemblies/);assert.match(result.stdout,/strict declarations/);
});
test('the actual release gate refuses a tarball whose bounded root runtime entry is absent',() => {
  const result = releaseVerificationFixture('missing-root',packageRoot => rmSync(join(packageRoot,'dist/index.js')));assert.notEqual(result.status,0,'The real release gate ignored the missing public root.');assert.match(result.stdout+result.stderr,/dist\/index\.js|Cannot find.*pith-ui/i);
});
test('the actual release gate checks packed part declarations without skipLibCheck',() => {
  const result = releaseVerificationFixture('invalid-parts-declaration',packageRoot => {const declaration = join(packageRoot,'dist/index.d.ts');writeFileSync(declaration,readFileSync(declaration,'utf8')+'\nexport interface DeclarationFailure {value: MissingTypeFromPackedParts}\n');});assert.notEqual(result.status,0,'The release gate skipped packed declarations.');assert.match(result.stdout+result.stderr,/MissingTypeFromPackedParts/);
});
test('the actual release gate compiles the shipped complete Desk recipe against that exact tarball',() => {
  const result = releaseVerificationFixture('invalid-shipped-recipe',packageRoot => {const recipe = join(packageRoot,'examples/assemblies/desk.ts');assert.ok(existsSync(recipe));writeFileSync(recipe,readFileSync(recipe,'utf8')+'\nmountDesk({} as HTMLElement).element;\n');});assert.notEqual(result.status,0,'The release gate did not compile the recipe shipped inside the archive.');assert.match(result.stdout+result.stderr,/element/);
});
test('the actual release gate refuses changed archive bytes after the manifest is recorded',() => {
  const result = releaseVerificationFixture('changed-archive',() => {},tarball => writeFileSync(tarball,Buffer.concat([readFileSync(tarball),Buffer.from('changed-after-manifest')])));assert.notEqual(result.status,0,'The release gate ignored altered archive bytes.');assert.match(result.stdout+result.stderr,/checksum mismatch/i);
});
