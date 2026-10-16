import {expect,test} from '@playwright/test';
import type {ActionResult,CustomConnectionDraft,CustomConnectionState,MCPConnectionDraft,MCPConnectionItem,MCPEditorValue,ModelPickerState,ModelSelection,ProviderActionsState,ProviderLoginState,SettingsCredentialView,SettingsDraft,SettingsPanelState,SettingsProviderOption,UpdatePanelState} from '../src/index.js';

type Result=ActionResult|Promise<ActionResult>;
interface Session {update(state:unknown):void;close():void;isOpen():boolean}
interface SettingsSession extends Session {
  read():SettingsDraft;
  setProviders(items:readonly SettingsProviderOption[],selected?:string):void;
  resetProvider(value:{provider:string;baseUrl:string;clearKey?:boolean;collapseAdvanced?:boolean}):void;
  setCredential(view:Omit<SettingsCredentialView,'actions'>&{providerActions?:ProviderActionsState}):void;
  updateUpdates(state:UpdatePanelState):void;
  clearSecrets():void;
}
interface MCPSession extends Session {read():MCPConnectionDraft;edit(value?:MCPEditorValue):void;clearSecrets():void;setConnections(items:readonly MCPConnectionItem[]):void}
interface ModelSession extends Session {read():ModelSelection;reset(value:ModelSelection):void}
interface CustomSession extends Session {read():CustomConnectionDraft}
interface SettingsScene {
  openSettings(state:SettingsPanelState,callbacks?:{onSubmit?:(draft:SettingsDraft)=>Result;onProviderChange?:(id:string)=>void;onProviderAction?:(action:string,target:{id:string})=>Result;onUpdateAction?:(action:'check'|'install')=>void}):SettingsSession;
  openConnections(state:Record<string,unknown>,callbacks?:{onSubmit?:(draft:MCPConnectionDraft)=>Result;onConnectionAction?:(action:string,target:{name:string})=>Result}):MCPSession;
  openModels(state:ModelPickerState,callbacks?:{onSubmit?:(selection:ModelSelection)=>Result}):ModelSession;
  openCustomConnection(state:CustomConnectionState,callbacks?:{onSubmit?:(draft:CustomConnectionDraft)=>Result}):CustomSession;
  openProviderLogin(state:ProviderLoginState,callbacks?:{onAnswer?:(answer:string)=>Result}):Session;
}
interface Harness {
  app:{settings:SettingsScene;destroy():void};
  current?:SettingsSession|MCPSession|ModelSession|CustomSession|Session;
  previous?:SettingsSession|CustomSession|Session;
  calls:number;
  values:unknown[];
  release?:(result:ActionResult)=>void;
}
const state:SettingsPanelState={baseUrl:'https://first.example/v1',hasApiKey:true,ready:true};

test.beforeEach(async ({page})=>{
  await page.goto('/tests/fixture.html');
  await page.evaluate(async()=>{
    const path='../src/app/index.js'; const {createApplication}=await import(path);
    const harness:Harness={app:createApplication(document.body,{brand:{name:'Pith Test'},host:{openExternal(url:string){harness.values.push(url);}}}),calls:0,values:[]};
    Object.assign(window,{appSettingsTest:harness});
  });
});

test('settings scenes return plain semantic sessions without DOM handles or slots',async ({page})=>{
  const handles=await page.evaluate((state)=>{
    const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest,scene=h.app.settings;
    const inspect=(session:Session)=>{const keys=Object.keys(session),nodes=Object.values(session).filter(value=>value instanceof Node).length;session.close();return {keys,nodes};};
    return [
      inspect(scene.openSettings(state)),inspect(scene.openConnections({})),
      inspect(scene.openModels({loading:true})),
      inspect(scene.openCustomConnection({name:'Example',baseUrl:'https://example.test',api:'openai-completions',editing:false,models:[]})),
      inspect(scene.openProviderLogin({phase:'waiting',message:'Waiting for sign-in'})),
    ];
  },state);
  const forbidden=['element','field','id','control','input','form','parts','updates','list','body','panel','trigger','button','submitButton','confirmButton'];
  for(const handle of handles){expect(handle.nodes).toBe(0);expect(handle.keys.filter(key=>forbidden.includes(key))).toEqual([]);expect(handle.keys).toEqual(expect.arrayContaining(['update','close','isOpen']));}
});

test('settings keyboard choices and ordinary feedback preserve the live credential draft and selection',async ({page})=>{
  await page.evaluate((state)=>{
    const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest;
    const session=h.app.settings.openSettings(state,{onProviderChange:id=>h.values.push(id)});h.current=session;
    session.setProviders([{id:'first',name:'First provider'},{id:'second',name:'Second provider'}],'first');
    session.setCredential({status:'Configured',hidden:false,required:false,placeholder:'Keep saved key',removeVisible:true});
  },state);
  const provider=page.getByRole('combobox',{name:'Provider',exact:true});
  await provider.press('Enter');await provider.press('ArrowDown');await provider.press('Enter');
  expect(await page.evaluate(()=>(window as unknown as {appSettingsTest:Harness}).appSettingsTest.values)).toEqual(['second']);
  const key=page.getByLabel('API key',{exact:false});await key.fill('Unsaved 中文 secret');await key.focus();
  await key.evaluate((node:HTMLInputElement)=>node.setSelectionRange(2,8));
  await page.evaluate((state)=>(window as unknown as {appSettingsTest:Harness}).appSettingsTest.current!.update({...state,error:'Status changed'}),state);
  await expect(key).toHaveValue('Unsaved 中文 secret');await expect(key).toBeFocused();
  expect(await key.evaluate((node:HTMLInputElement)=>[node.selectionStart,node.selectionEnd])).toEqual([2,8]);
  expect(await page.evaluate(()=>(window as unknown as {appSettingsTest:Harness}).appSettingsTest.current && ((window as unknown as {appSettingsTest:Harness}).appSettingsTest.current as SettingsSession).read())).toEqual({provider:'second',baseUrl:state.baseUrl,apiKey:'Unsaved 中文 secret'});
});

test('settings submission rejects repeats and retains a failed draft through external availability changes',async ({page})=>{
  await page.evaluate((state)=>{
    const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest;
    const session=h.app.settings.openSettings(state,{onSubmit:draft=>{h.calls++;h.values.push(draft);return new Promise<ActionResult>(resolve=>{h.release=resolve;});}});h.current=session;
    session.setProviders([{id:'first',name:'First provider'}],'first');
  },state);
  await page.getByLabel('API key',{exact:false}).fill('Private draft');
  const save=page.getByRole('button',{name:'Save settings',exact:true});await save.click();await expect(save).toBeDisabled();
  await page.getByRole('dialog').locator('form').dispatchEvent('submit',{bubbles:true,cancelable:true});
  expect(await page.evaluate(()=>(window as unknown as {appSettingsTest:Harness}).appSettingsTest.calls)).toBe(1);
  await page.evaluate((state)=>{const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest;h.current!.update({...state,disabled:true});h.release!({ok:false,error:'Settings rejected'});},state);
  await expect(page.getByText('Settings rejected',{exact:true})).toBeVisible();await expect(save).toBeDisabled();await expect(page.getByLabel('API key',{exact:false})).toHaveValue('Private draft');
  await page.evaluate((state)=>(window as unknown as {appSettingsTest:Harness}).appSettingsTest.current!.update(state),state);await expect(save).toBeEnabled();
});

test('provider and update actions use semantic data and closing settings clears credentials',async ({page})=>{
  await page.evaluate((state)=>{
    const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest;
    const session=h.app.settings.openSettings(state,{onProviderAction:(action,target)=>{h.values.push({action,target,dom:Object.values(target as Record<string,unknown>).some(value=>value instanceof Node)});return {ok:true};},onUpdateAction:action=>{h.values.push(action);}});h.current=session;
    session.setProviders([{id:'first',name:'First provider'}],'first');
    session.setCredential({status:'Configured',hidden:false,required:false,placeholder:'Keep saved key',removeVisible:false,providerActions:{id:'first',oauth:true,signedIn:false,custom:true}});
    session.updateUpdates({version:'1.0.0',enabled:true,phase:'idle',availableVersion:'1.1.0',progress:0,message:'Ready'});
  },state);
  await page.getByRole('button',{name:'Sign in with provider',exact:true}).click();
  await page.getByRole('button',{name:'Check for updates',exact:true}).click();await page.getByRole('button',{name:'Update and restart',exact:true}).click();
  expect(await page.evaluate(()=>(window as unknown as {appSettingsTest:Harness}).appSettingsTest.values)).toEqual([{action:'login',target:{id:'first'},dom:false},'check','install']);
  await page.getByLabel('API key',{exact:false}).fill('Discard on close');
  const result=await page.evaluate(()=>{const session=(window as unknown as {appSettingsTest:Harness}).appSettingsTest.current as SettingsSession;session.close();return {open:session.isOpen(),key:session.read().apiKey};});
  expect(result).toEqual({open:false,key:''});await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('connections integrate typed actions and explicit edit invalidates old submissions and secrets',async ({page})=>{
  await page.evaluate(()=>{
    const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest;
    const session=h.app.settings.openConnections({},{onSubmit:draft=>{h.values.push(draft);return new Promise<ActionResult>(resolve=>{h.release=resolve;});},onConnectionAction:(action,target)=>{h.values.push({action,target});return {ok:true};}});h.current=session;
    session.setConnections([{name:'tools',type:'stdio',command:'/usr/bin/demo',enabled:true,statusLabel:'Connected'}]);
  });
  await page.getByRole('button',{name:'Edit',exact:true}).click();
  expect(await page.evaluate(()=>(window as unknown as {appSettingsTest:Harness}).appSettingsTest.values)).toEqual([{action:'mcp-edit',target:{name:'tools'}}]);
  await page.evaluate(()=>((window as unknown as {appSettingsTest:Harness}).appSettingsTest.current as MCPSession).edit({name:'tools',type:'stdio',command:'/usr/bin/demo',args:['one'],envKeys:['KEY']}));
  await page.getByLabel('Environment overrides',{exact:false}).fill('{"KEY":"Private draft"}');
  await page.getByRole('button',{name:'Save connection',exact:true}).click();await expect(page.getByRole('button',{name:'Save connection',exact:true})).toBeDisabled();
  await page.evaluate(()=>{const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest; (h.current as MCPSession).edit({name:'new-target',type:'http',url:'https://example.test/mcp'});h.release!({ok:false,error:'Old connection error'});});
  await expect(page.getByLabel('Name',{exact:true})).toHaveValue('new-target');await expect(page.getByText('Old connection error',{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'Save connection',exact:true})).toBeEnabled();
  expect(await page.evaluate(()=>((window as unknown as {appSettingsTest:Harness}).appSettingsTest.current as MCPSession).read().env)).toBe('');
});

test('model catalog updates retain the user search and native list choice',async ({page})=>{
  await page.evaluate(()=>{
    const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest;
    const editor={providers:[{id:'first',name:'First provider',model:'balanced',thinkingLevel:'high'}],models:[{id:'balanced',name:'Balanced',provider:'first',supportsImages:true,contextWindow:100000,maxTokens:8000,thinkingLevels:['off','high']},{id:'fast',name:'Fast',provider:'first',supportsImages:false,contextWindow:64000,maxTokens:4096,thinkingLevels:['off']}],selection:{provider:'first',model:'balanced',thinkingLevel:'high'}};
    h.current=h.app.settings.openModels({editor,loading:false},{onSubmit:selection=>{h.values.push(selection);return {ok:false,error:'Model rejected'};}});Object.assign(window,{appModelState:{editor,loading:false}});
  });
  const models=page.getByRole('listbox',{name:'Choose model',exact:true});await models.focus();await models.press('Home');await models.press('ArrowDown');
  const search=page.getByRole('dialog').getByRole('searchbox');await search.fill('absent');await search.focus();
  await page.evaluate(()=>{const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest,model=(window as unknown as {appModelState:ModelPickerState}).appModelState;h.current!.update({...model,error:'Catalog refreshed',editor:{...model.editor!,models:model.editor!.models!.map(item=>({...item,maxTokens:item.maxTokens+1}))}});});
  await expect(models).toHaveValue('fast');await expect(search).toHaveValue('absent');await expect(search).toBeFocused();
  await page.getByRole('button',{name:'Use model',exact:true}).click();
  expect(await page.evaluate(()=>(window as unknown as {appSettingsTest:Harness}).appSettingsTest.values)).toEqual([{provider:'first',model:'fast',thinkingLevel:'off'}]);await expect(page.getByText('Model rejected',{exact:true})).toBeVisible();
});

test('replacing the SDK custom editor invalidates its old session and pending completion',async ({page})=>{
  await page.evaluate(()=>{
    const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest;
    const old=h.app.settings.openCustomConnection({name:'Old endpoint',baseUrl:'https://old.example/v1',api:'openai-completions',editing:false,models:[{id:'old-model',contextWindow:1000,maxTokens:100}]},{onSubmit:()=>new Promise<ActionResult>(resolve=>{h.release=resolve;})});h.current=old;h.previous=old;
  });
  await page.getByLabel('API key',{exact:false}).fill('Old secret');await page.getByRole('button',{name:'Save connection',exact:true}).click();
  const owner=await page.evaluate(()=>{
    const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest;
    const next=h.app.settings.openCustomConnection({name:'New endpoint',baseUrl:'https://new.example/v1',api:'openai-completions',editing:false,models:[]});h.current=next;
    const old=h.previous as CustomSession;old.close();old.update({name:'Old endpoint',baseUrl:'https://old.example/v1',api:'openai-completions',editing:false,models:[],error:'Old error'});h.release!({ok:true});
    return {oldOpen:old.isOpen(),newOpen:next.isOpen(),oldKey:old.read().apiKey};
  });
  expect(owner).toEqual({oldOpen:false,newOpen:true,oldKey:''});await expect(page.getByLabel('Connection name',{exact:true})).toHaveValue('New endpoint');await expect(page.getByLabel('API key',{exact:false})).toHaveValue('');await expect(page.getByText('Old error',{exact:true})).toHaveCount(0);await expect(page.getByRole('dialog')).toBeVisible();
});

test('provider login routes external URLs through the host and ignores answers from its old session',async ({page})=>{
  await page.evaluate(()=>{
    const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest;
    h.current=h.app.settings.openProviderLogin({phase:'prompt',message:'First sign-in',url:'https://login.example/authorize',prompt:'Verification code',promptType:'secret'},{onAnswer:answer=>{h.values.push(answer);return new Promise<ActionResult>(resolve=>{h.release=resolve;});}});h.previous=h.current;
  });
  await page.getByRole('link',{name:'Open sign-in page in your browser',exact:false}).click();
  await page.getByLabel('Verification code',{exact:true}).fill('Old private answer');await page.getByRole('button',{name:'Continue',exact:true}).click();
  const owner=await page.evaluate(()=>{
    const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest;
    h.current=h.app.settings.openProviderLogin({phase:'prompt',message:'Second sign-in',prompt:'New code',promptType:'text'});h.previous!.close();h.release!({ok:false,error:'Old answer error'});return {oldOpen:h.previous!.isOpen(),newOpen:h.current.isOpen(),values:h.values};
  });
  expect(owner).toEqual({oldOpen:false,newOpen:true,values:['https://login.example/authorize','Old private answer']});await expect(page.getByText('Second sign-in',{exact:true})).toBeVisible();await expect(page.getByLabel('New code',{exact:true})).toHaveValue('');await expect(page.getByText('Old answer error',{exact:true})).toHaveCount(0);
});
