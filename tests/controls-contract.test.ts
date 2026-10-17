import test from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {resolve} from 'node:path';
import {readFileSync} from 'node:fs';
import * as ui from '../src/index.js';

const options: ts.CompilerOptions = {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'], strict: true, noEmit: true, skipLibCheck: false};
function diagnostics(text: string): string[] {
  const file = resolve('src/controls-consumer-check.ts');
  const host = ts.createCompilerHost(options), original = host.getSourceFile.bind(host);
  host.getSourceFile = (name, languageVersion, onError, fresh) => name === file ? ts.createSourceFile(name, text, languageVersion, true) : original(name, languageVersion, onError, fresh);
  return ts.getPreEmitDiagnostics(ts.createProgram([file], options, host)).map(error => ts.flattenDiagnosticMessageText(error.messageText, '\n'));
}

test('the default public entry consists of small constrained controls, not DOM or product adapters', () => {
  for (const name of ['mount', 'createButton', 'createSelect', 'createListSelect', 'createForm', 'createStack', 'createText', 'createCopyButton']) assert.equal(typeof (ui as Record<string, unknown>)[name], 'function', name);
  for (const name of ['element', 'icon', 'iconElement', 'dialogHeading', 'createField', 'createWorkspaceShell', 'createCopyFeedback', 'createFeatureDialogFrame', 'setAppearance', 'assertModalControl']) assert.equal(name in ui, false, name);
});

test('small controls compose through owned handles and native data constraints', () => {
  assert.deepEqual(diagnostics(`import {mount, createButton, createTextInput, createNumberInput, createSelect, createListSelect, createForm, createStack, createText, createDialog, createMenu, createCopyButton} from './index.js';
const name = createTextInput({label:'Name', value:'Draft', onInput(value) {value.toUpperCase();}});
const count = createNumberInput({label:'Tokens', min:1, max:128000, step:1});
const select = createSelect({label:'Provider', options:[{value:'demo',label:'Demo'}], onChange(value) {value.toUpperCase();}});
const multiple = createListSelect({label:'Models', multiple:true, values:['a'], options:[{value:'a',label:'A'}], onChange(values) {values.map(value => value.toUpperCase());}});
multiple.reset(['a']); multiple.read().map(String);
const form = createForm({children:[name,count,select,multiple], submitLabel:'Save', onSubmit: async () => ({ok:true})});
const dialog = createDialog({title:'Details', content:createText({text:'Safe text'})});
const button = createButton({label:'Details',onAction:()=>dialog.open()});
const menu = createMenu({label:'Actions',items:[{id:'delete',label:'Delete',intent:'danger',onAction:()=>({ok:true})}]});
const copy = createCopyButton({value:'Safe text',onCopy:async text=>({ok:!!text,error:'Empty'})});
const view = createStack({children:[form,button,menu,copy,dialog]});
const host = document.getElementById('app'); if (!(host instanceof HTMLElement)) throw new Error('Missing mount');
const mounted = mount(host,view,{appearance:'system'}); mounted.setAppearance('dark'); name.focus(); name.reset('Next'); mounted.destroy();`), []);
});

test('notice selection has a notice-only construction and update contract', () => {
  const imports = "import {createSurface,createText,type Control,type NoticeSurfaceState,type OrdinarySurfaceState} from './index.js';\n";
  assert.deepEqual(diagnostics(imports + `
const notice:Control<NoticeSurfaceState>=createSurface({purpose:'notice',selected:true,content:createText({text:'Notice'})});
notice.update({selected:false});notice.update({label:'Retained selection'});
const ordinary:Control<OrdinarySurfaceState>=createSurface({content:createText({text:'Input'})});
ordinary.update({purpose:'panel'});`), []);
  for (const source of [
    "createSurface({content:createText({text:'Input'}),selected:true});",
    "createSurface({purpose:'input',content:createText({text:'Input'}),selected:true});",
    "createSurface({purpose:'panel',content:createText({text:'Panel'}),selected:false});",
    "createSurface({content:createText({text:'Input'})}).update({selected:true});",
    "createSurface({content:createText({text:'Input'})}).update({purpose:'notice'});",
    "createSurface({purpose:'notice',content:createText({text:'Notice'})}).update({purpose:'input'});",
    "createSurface({purpose:'notice',content:createText({text:'Notice'}),selected:'yes'});",
    "createSurface({purpose:'notice',content:createText({text:'Notice'}),borderWidth:3});",
  ]) assert.ok(diagnostics(imports + source).length, source);
});

test('secret reveal policy and timestamps expose only their bounded data contracts', () => {
  const imports="import {createTimestamp,createSecretInput,createTextInput,createMessage,createText,type TimestampState,type SecretInputOptions} from './index.js';\n";
  assert.deepEqual(diagnostics(imports+`const options:SecretInputOptions={label:'Answer',revealable:false};const secret=createSecretInput(options);secret.update({label:'Answer',readOnly:true});const state:TimestampState={value:Date.now()};const time=createTimestamp(state);time.update({value:0});createMessage({role:'assistant',time:state.value,content:createText({text:'Reply'})});`),[]);
  for(const source of ["createSecretInput({label:'Answer',revealable:'false'});","createTextInput({label:'Plain',revealable:false});","createSecretInput({label:'Answer'}).update({label:'Answer',revealable:false});","createTimestamp({value:'2026-10-13'});","createTimestamp({value:Date.now(),format:'full'});","createTimestamp({value:Date.now(),title:'Custom title'});","createTimestamp({value:Date.now(),fontSize:14});","createTimestamp({value:Date.now()}).element;"])
    assert.ok(diagnostics(imports+source).length,source);
});

test('warning is a fixed action intent and does not broaden menu styling',()=>{
 const imports="import {createButton,createTextAction,createIconButton,createMenu} from './index.js';\n";
 assert.deepEqual(diagnostics(imports+`const grant=createButton({label:'Grant',intent:'warning'});grant.update({label:'Confirm',intent:'primary'});createTextAction({label:'Grant',intent:'warning'});createIconButton({label:'Grant',intent:'warning',icon:'shield'});`),[]);
 for(const source of ["createButton({label:'Grant',intent:'caution'});","createButton({label:'Grant',intent:'warning',tone:'danger'});","createMenu({label:'Actions',items:[{id:'grant',label:'Grant',intent:'warning',onAction(){}}]});"])
   assert.ok(diagnostics(imports+source).length,source);
});

test('constrained declarations reject visual options, raw nodes, invalid modes and internal handles', () => {
  const cases = [
    "createTable({label:'Data',columns:[{key:'item',label:'Item',width:220}],rows:[]});",
    "createTable({label:'Data',columns:[{key:'item',label:'Item',kind:'number'}],rows:[]});",
    "createTable({label:'Data',columns:[{key:'item',label:'Item'}],rows:[{key:'row',cells:[document.body]}]});",
    "createButton({label:'Save',context:'link'});",
    "createConfirmDialog({title:'Confirm',content:createText({text:'Body'}),message:'Second body',onConfirm:()=>({ok:true})});",
    "createButton({label:'Save',density:'compact'});",
    "createButton({label:'Save',appearance:'secondary'});",
    "createButton({label:'Save',style:{padding:4}});",
    "createButton({label:'Save',className:'custom'});",
    "createButton({label:'Save',fontSize:18});",
    "createTextInput({label:'Name',min:1});",
    "createSelect({label:'Provider',options:[],multiple:true});",
    "createSelect({label:'Provider',options:[],values:[]});",
    "createListSelect({label:'Models',options:[],size:7});",
    "createSelect({label:'Models',options:[],purpose:'catalog'});",
    "createTextArea({label:'Notes',rows:3});",
    "createSecretTextArea({label:'Environment',purpose:'document'});",
    "createListSelect({label:'Models',multiple:true,options:[],value:'a'});",
    "createIcon({name:'invented-icon'});",
    "createIcon({name:'file',size:'small'});",
    "createStack({children:[document.createElement('div')]});",
    "createDialog({title:'Details',content:document.body});",
    "createPopover({label:'Details',content:document.body});",
    "createConfirmDialog({title:'Delete?',message:document.body,onConfirm:()=>({ok:true})});",
    "createMenu({label:'Actions',items:[{id:'x',label:'X',intent:'primary',onAction:()=>{}}]});",
    "createContentColumn({purpose:'reading',content:createText({text:'Read'}),width:700});",
    "createSurface({content:createText({text:'Body'}),padding:8});",
    "createToolbar({label:'Actions',children:[],gap:4});",
    "createGrid({columns:3,children:[]});",
    "createBreadcrumb({label:'Location',items:[],fontSize:12});",
    "createStep({number:1,title:'Connect',description:'Provider',fontWeight:600});",
    "createIconButton({label:'Send',icon:'arrow',context:'tiny'});",
    "createImage({purpose:'intro',label:'Logo',source:'/logo.svg',width:48});",
    "createImage({purpose:'brand',label:'Logo',source:'/logo.svg',compactSource:'/small.svg'});",
    "createButton({label:'Save'}).element;",
    "createTextInput({label:'Name'}).control;",
    "createDialog({title:'Details'}).body;",
    "createPopover({label:'Details',content:createText({text:'Safe'})}).panel;",
    "createListSelect({label:'Models',multiple:true,options:[]}).reset('a');",
  ];
  const imports = "import {createButton,createTextInput,createSelect,createListSelect,createIcon,createStack,createDialog,createPopover,createConfirmDialog,createMenu,createText,createContentColumn,createSurface,createToolbar,createGrid,createBreadcrumb,createStep,createIconButton,createImage,createTextArea,createSecretTextArea,createTable} from './index.js';\n";
  // Each case is independently checked, so an unrelated missing import cannot
  // accidentally satisfy an expected declaration rejection.
  assert.deepEqual(diagnostics(imports), []);
  for (const source of cases) assert.ok(diagnostics(imports + source).length, source);
});

test('every small-control showroom example compiles through the actual public package',()=>{
  const files=new Map<string,string>();
  for(const filename of ['primitive-cases.ts','control-page-cases.ts','public-cases.ts','consumer-cases.ts','layout-cases.ts','foundation-cases.ts']){
    const source=ts.createSourceFile(filename,readFileSync(resolve('showroom',filename),'utf8'),ts.ScriptTarget.Latest,true);
    const visit=(node:ts.Node):void=>{
      if(filename==='foundation-cases.ts'&&ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text==='code'&&node.initializer&&ts.isStringLiteralLike(node.initializer))files.set(resolve('showroom','public-example-foundations.ts'),node.initializer.text);
      if(ts.isObjectLiteralExpression(node)){
        const value=(name:string)=>(node.properties.find(p=>ts.isPropertyAssignment(p)&&p.name.getText(source)===name) as ts.PropertyAssignment|undefined)?.initializer;
        const id=value('id'),code=value('code');
        if(id&&code&&ts.isStringLiteralLike(id)&&ts.isStringLiteralLike(code))files.set(resolve('showroom',`public-example-${id.text}.ts`),code.text);
      }
      ts.forEachChild(node,visit);
    };visit(source);
  }
  assert.ok(files.size>=33,'All base controls and small composition pages need public examples');
  const host=ts.createCompilerHost(options),original=host.getSourceFile.bind(host);
  host.getSourceFile=(file,version,onError,fresh)=>files.has(file)?ts.createSourceFile(file,files.get(file)!,version,true):original(file,version,onError,fresh);
  const errors=ts.getPreEmitDiagnostics(ts.createProgram([...files.keys()],options,host));
  assert.deepEqual(errors.map(error=>`${error.file?.fileName}: ${ts.flattenDiagnosticMessageText(error.messageText,'\n')}`),[]);
});
