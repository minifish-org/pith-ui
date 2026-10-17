import type {ActionResult} from '../src/index.js';
type PithUI = typeof import('../src/index.js');

/** A small composition independent of a complete application or business API. */
export function connectionForm(ui: PithUI, host: HTMLElement, save: (draft: {name: string; provider: string; limit: string}) => Promise<ActionResult>) {
  const name = ui.createTextInput({label:'Name',value:'My connection'});
  const provider = ui.createSelect({label:'Provider',options:[{value:'demo',label:'Demo'}]});
  const limit = ui.createNumberInput({label:'Maximum tokens',value:'8192',min:1,step:1});
  const section = ui.createFormSection({title:'Connection',children:[name,provider,limit]});
  const form = ui.createForm({children:[section],submitLabel:'Save connection',onSubmit:()=>save({name:name.read(),provider:provider.read(),limit:limit.read()})});
  return ui.mount(host,form,{appearance:'system'});
}

/** Destroying the mount releases the complete owned child tree. */
export function editableDetails(ui: PithUI, host: HTMLElement, save: (text: string) => Promise<ActionResult>) {
  const editor = ui.createTextEditDialog({title:'Edit message',onSubmit:save});
  const open = ui.createButton({label:'Edit',onAction:()=>editor.open({value:'Original message'})});
  return ui.mount(host,ui.createStack({children:[open,editor]}));
}

export function nativeMultipleChoice(ui: PithUI, host: HTMLElement) {
  const models = ui.createListSelect({label:'Models',multiple:true,values:['a','c'],options:[{value:'a',label:'A'},{value:'b',label:'B'},{value:'c',label:'C'}],onChange(values){values.forEach(value=>value.toUpperCase());}});
  const mounted = ui.mount(host,models);
  models.reset(['b']);
  return {mounted,read:()=>models.read()};
}

export function actionsAndFeedback(ui: PithUI, host: HTMLElement, remove: () => Promise<ActionResult>, copy: (text: string) => Promise<ActionResult>) {
  const confirmation = ui.createConfirmDialog({title:'Remove connection?',message:'This removes the selected connection.',onConfirm:remove});
  const menu = ui.createMenu({label:'Actions',items:[{id:'remove',label:'Remove connection',intent:'danger',onAction:()=>confirmation.open()}]});
  const copyButton = ui.createCopyButton({value:'Example connection',onCopy:copy});
  return ui.mount(host,ui.createStack({children:[ui.createToolbar({label:'Connection actions',children:[menu,copyButton]}),confirmation]}));
}

/** Pages remain local compositions of small components. */
export function localComposition(ui: PithUI,host:HTMLElement) {
  const first=ui.createTextInput({label:'First',value:'Draft'});
  const second=ui.createTextInput({label:'Second'});
  const list=ui.createList({items:[{key:'first',content:first},{key:'second',content:second}]});
  const footer=ui.createSlot({content:ui.createText({text:'Ready'})});
  const pane=ui.createPane({header:ui.createText({role:'heading',text:'Editor'}),content:list,footer});
  const layout=ui.createSplitPane({navigation:ui.createText({text:'Navigation'}),content:pane});
  const mounted=ui.mount(host,layout,{appearance:'system'});
  list.update({items:[{key:'second',content:second},{key:'first',content:first}]});
  footer.set(ui.createText({text:'Updated'}));
  const dialog=ui.createDialog({title:'Content',content:ui.createStack({children:[ui.createMarkdown({text:'# Safe content'}),ui.createDiff({text:'-old\n+new'})]})});
  mounted.attach(dialog);dialog.open();
  return mounted;
}

/** Input intent, reading, and content are independent pieces, never a complete scene. */
export function readingAndInput(ui:PithUI,host:HTMLElement,send:(value:string)=>Promise<ActionResult>,copy:(value:string)=>Promise<ActionResult>) {
  const reader=ui.createReadingArea({label:'Reading',identity:'document-1',empty:ui.createText({text:'No content'}),items:[{key:'first',revision:'1',content:ui.createMessage({role:'assistant',content:ui.createMarkdown({text:'Safe **content**',onCopy:copy})})}]});
  const prompt=ui.createPromptInput({label:'Message',onSubmit:send});
  const footer=ui.createDropArea({content:prompt,onDrop:data=>console.log(data.files.length)});
  const mounted=ui.mount(host,ui.createPane({content:reader,footer}),{viewport:'window'});
  return {mounted,find:reader.find,reset:prompt.reset};
}

export function validatedSecrets(ui:PithUI,host:HTMLElement,save:(draft:{url:string;environment:string})=>Promise<ActionResult>) {
  const url=ui.createURLInput({label:'Endpoint',required:true});
  const environment=ui.createSecretTextArea({label:'Environment JSON'});
  const form=ui.createForm({children:[url,environment],onSubmit:()=>save({url:url.read(),environment:environment.read()})});
  return {mounted:ui.mount(host,form),reset(){environment.reset('');form.resetSubmission();},validate:form.validate};
}

export function selectableItems(ui:PithUI,host:HTMLElement,select:()=>Promise<ActionResult>){
  return ui.mount(host,ui.createListRow({title:'Saved item',description:'A retained item',onAction:select,actions:ui.createButton({label:'Details',onAction:()=>console.log('Details')})}));
}

export function retainedMarkdown(ui:PithUI,host:HTMLElement,copy:(text:string)=>Promise<ActionResult>){
  const content=ui.createMarkdown({text:'[Documentation](https://example.com)',onCopy:copy,onLink:url=>{console.log(url);return{ok:true};}});
  const mounted=ui.mount(host,content);return{mounted,disable(){content.update({text:'[Documentation](https://example.com)',disabled:true});}};
}
