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
