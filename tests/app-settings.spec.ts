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
  setUpdatePending(pending:boolean):void;
  setUpdateError(message:string,options?:{allowCheckRetry?:boolean}):void;
  clearSecrets():void;
}
interface MCPSession extends Session {read():MCPConnectionDraft;edit(value?:MCPEditorValue):void;clearSecrets():void;setConnections(items:readonly MCPConnectionItem[]):void}
interface ModelSession extends Session {read():ModelSelection;reset(value:ModelSelection):void}
interface CustomSession extends Session {read():CustomConnectionDraft}
interface SettingsScene {
  openSettings(state:SettingsPanelState,callbacks?:{onSubmit?:(draft:SettingsDraft)=>Result;onRemoveKey?:(draft:SettingsDraft)=>Result;onProviderChange?:(id:string)=>void;onProviderAction?:(action:string,target:{id:string})=>Result;onUpdateAction?:(action:'check'|'install')=>void;onCreateConnection?:()=>void|Result;onTest?:(draft:SettingsDraft)=>void|Result;onCancelTest?:()=>void|Result}):SettingsSession;
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

for(const signedIn of [false,true]) test(`settings availability disables provider and add actions while retaining a live draft (${signedIn?'signed in':'signed out'})`,async ({page})=>{
  await page.evaluate(({state,signedIn})=>{
    const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest;
    const session=h.app.settings.openSettings({...state,disabled:true},{onProviderAction:()=>{h.calls++;return {ok:true};},onCreateConnection:()=>{h.calls++;}});h.current=session;
    session.setProviders([{id:'first',name:'First provider'}],'first');
    session.setCredential({status:'Configured',hidden:false,required:false,placeholder:'Keep saved key',removeVisible:true,providerActions:{id:'first',oauth:true,signedIn,custom:true}});
  },{state,signedIn});
  const labels=[signedIn?'Sign out':'Sign in with provider','Edit models and prices','Remove connection','Add independent model connection'];
  for(const name of labels) await expect(page.getByRole('button',{name,exact:true})).toBeDisabled();
  const key=page.getByLabel('API key',{exact:false});await key.fill('Unsaved private draft');await key.focus();await key.evaluate((node:HTMLInputElement)=>node.setSelectionRange(2,8));
  await page.evaluate(({state,signedIn})=>{
    const session=(window as unknown as {appSettingsTest:Harness}).appSettingsTest.current as SettingsSession;
    session.update(state);session.update({...state,disabled:true});
    session.setCredential({status:'Configured',hidden:false,required:false,placeholder:'Keep saved key',removeVisible:true,providerActions:{id:'first',oauth:true,signedIn,custom:true}});
  },{state,signedIn});
  for(const name of labels) {const button=page.getByRole('button',{name,exact:true});await expect(button).toBeDisabled();await button.dispatchEvent('click',{bubbles:true});}
  await expect(key).toBeFocused();await expect(key).toHaveValue('Unsaved private draft');
  expect(await key.evaluate((node:HTMLInputElement)=>[node.selectionStart,node.selectionEnd])).toEqual([2,8]);
  expect(await page.evaluate(()=>{const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest;return {calls:h.calls,draft:(h.current as SettingsSession).read()};})).toEqual({calls:0,draft:{provider:'first',baseUrl:state.baseUrl,apiKey:'Unsaved private draft'}});
  await page.evaluate(state=>(window as unknown as {appSettingsTest:Harness}).appSettingsTest.current!.update(state),state);
  for(const name of labels) await expect(page.getByRole('button',{name,exact:true})).toBeEnabled();
  await page.getByRole('button',{name:labels[0],exact:true}).click();await page.getByRole('button',{name:'Add independent model connection',exact:true}).click();
  expect(await page.evaluate(()=>(window as unknown as {appSettingsTest:Harness}).appSettingsTest.calls)).toBe(2);
});

for(const action of ['provider','add'] as const) test(`settings ${action} action pending completion preserves external unavailability`,async ({page})=>{
  await page.evaluate(({state,action})=>{
    const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest;
    const pending=()=>{h.calls++;return new Promise<ActionResult>(resolve=>{h.release=resolve;});};
    const session=h.app.settings.openSettings(state,action==='provider'?{onProviderAction:pending}:{onCreateConnection:pending});h.current=session;
    session.setProviders([{id:'first',name:'First provider'}],'first');
    session.setCredential({status:'Configured',hidden:false,required:false,placeholder:'Keep saved key',removeVisible:false,providerActions:{id:'first',oauth:true,signedIn:false,custom:true}});
  },{state,action});
  const button=page.getByRole('button',{name:action==='provider'?'Sign in with provider':'Add independent model connection',exact:true});
  await button.click();await expect(button).toBeDisabled();
  await page.evaluate(state=>{
    const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest,session=h.current as SettingsSession;
    session.update({...state,disabled:true});
    session.setCredential({status:'Configured',hidden:false,required:false,placeholder:'Keep saved key',removeVisible:false,providerActions:{id:'first',oauth:true,signedIn:false,custom:true}});
    h.release!({ok:true});
  },state);
  await expect(button).toHaveAttribute('aria-busy','false');await expect(button).toBeDisabled();
  await button.dispatchEvent('click',{bubbles:true});expect(await page.evaluate(()=>(window as unknown as {appSettingsTest:Harness}).appSettingsTest.calls)).toBe(1);
  await page.evaluate(state=>(window as unknown as {appSettingsTest:Harness}).appSettingsTest.current!.update(state),state);await expect(button).toBeEnabled();
});

test('settings connection testing keeps its existing cancel action available',async ({page})=>{
  await page.evaluate(state=>{
    const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest;
    const session=h.app.settings.openSettings(state,{onTest:draft=>{h.values.push(draft);session.update({...state,testing:true});return new Promise<ActionResult>(resolve=>{h.release=resolve;});},onCancelTest:()=>{h.values.push('cancel');session.update(state);h.release!({ok:true});}});h.current=session;
    session.setProviders([{id:'first',name:'First provider'}],'first');
  },state);
  await page.getByRole('button',{name:'Test connection',exact:true}).click();
  const cancel=page.getByRole('button',{name:'Cancel test',exact:true});await expect(cancel).toBeEnabled();await cancel.click();
  await expect(page.getByRole('button',{name:'Test connection',exact:true})).toBeEnabled();
  expect(await page.evaluate(()=>(window as unknown as {appSettingsTest:Harness}).appSettingsTest.values)).toEqual([{provider:'first',baseUrl:state.baseUrl,apiKey:''},'cancel']);
});

for(const action of ['save','remove'] as const) test(`an earlier successful provider ${action} cannot close the reset provider draft`,async ({page})=>{
  await page.evaluate(state=>{
    const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest;
    const pending=(draft:SettingsDraft)=>{h.calls++;h.values.push(draft);return new Promise<ActionResult>(resolve=>{h.release=resolve;});};
    const session=h.app.settings.openSettings(state,{onSubmit:pending,onRemoveKey:pending});h.current=session;
    session.setProviders([{id:'first',name:'First provider'},{id:'second',name:'Second provider'}],'first');
    session.setCredential({status:'Configured',hidden:false,required:false,placeholder:'Keep saved key',removeVisible:true});
  },state);
  await page.getByLabel('API key',{exact:false}).fill('First provider key');
  await page.getByRole('button',{name:action==='save'?'Save settings':'Remove saved API key',exact:true}).click();
  await page.evaluate(()=>((window as unknown as {appSettingsTest:Harness}).appSettingsTest.current as SettingsSession).resetProvider({provider:'second',baseUrl:'https://second.example/v1',clearKey:true}));
  const key=page.getByLabel('API key',{exact:false});await key.fill('Second provider draft');await key.focus();await key.evaluate((node:HTMLInputElement)=>node.setSelectionRange(3,10));
  await page.evaluate(()=>(window as unknown as {appSettingsTest:Harness}).appSettingsTest.release!({ok:true}));
  await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('button',{name:'Save settings',exact:true})).toBeEnabled();
  await expect(key).toHaveValue('Second provider draft');await expect(key).toBeFocused();
  expect(await key.evaluate((node:HTMLInputElement)=>[node.selectionStart,node.selectionEnd])).toEqual([3,10]);
  expect(await page.evaluate(()=>{const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest;return {calls:h.calls,values:h.values,current:(h.current as SettingsSession).read()};})).toEqual({calls:1,values:[{provider:'first',baseUrl:state.baseUrl,apiKey:'First provider key'}],current:{provider:'second',baseUrl:'https://second.example/v1',apiKey:'Second provider draft'}});
});

test('an earlier successful model submission cannot close an explicitly reset selection',async ({page})=>{
  await page.evaluate(()=>{
    const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest;
    const editor={providers:[{id:'first',name:'First provider',model:'balanced',thinkingLevel:'high'}],models:[{id:'balanced',name:'Balanced',provider:'first',supportsImages:true,contextWindow:100000,maxTokens:8000,thinkingLevels:['off','high']},{id:'fast',name:'Fast',provider:'first',supportsImages:false,contextWindow:64000,maxTokens:4096,thinkingLevels:['off']}],selection:{provider:'first',model:'balanced',thinkingLevel:'high'}};
    h.current=h.app.settings.openModels({editor,loading:false},{onSubmit:selection=>{h.calls++;h.values.push(selection);return new Promise<ActionResult>(resolve=>{h.release=resolve;});}});
  });
  const submit=page.getByRole('button',{name:'Use model',exact:true});await submit.click();await expect(submit).toBeDisabled();
  await page.evaluate(()=>{const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest;(h.current as ModelSession).reset({provider:'first',model:'fast',thinkingLevel:'off'});h.release!({ok:true});});
  await expect(page.getByRole('dialog')).toBeVisible();await expect(submit).toBeEnabled();await expect(page.getByRole('listbox',{name:'Choose model',exact:true})).toHaveValue('fast');
  expect(await page.evaluate(()=>{const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest;return {calls:h.calls,values:h.values,current:(h.current as ModelSession).read()};})).toEqual({calls:1,values:[{provider:'first',model:'balanced',thinkingLevel:'high'}],current:{provider:'first',model:'fast',thinkingLevel:'off'}});
});

test('update refresh errors expose retry through semantic state without changing the reported phase',async ({page})=>{
  await page.evaluate((state)=>{
    const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest;
    const session=h.app.settings.openSettings(state);h.current=session;
    session.updateUpdates({version:'1.0.0',enabled:true,phase:'checking',availableVersion:'1.1.0',progress:0,message:'Checking for a new version'});
    session.setUpdatePending(true);
  },state);
  const check=page.getByRole('button',{name:'Check for updates',exact:true}),install=page.getByRole('button',{name:'Update and restart',exact:true});
  await expect(check).toBeDisabled();await expect(install).toBeDisabled();
  await page.evaluate(()=>{
    const session=(window as unknown as {appSettingsTest:Harness}).appSettingsTest.current as SettingsSession;
    session.setUpdatePending(false);session.setUpdateError('Update status is unavailable',{allowCheckRetry:true});
  });
  await expect(page.getByText('Update status is unavailable',{exact:true})).toBeVisible();await expect(check).toBeEnabled();await expect(install).toBeDisabled();
  await page.evaluate(()=>((window as unknown as {appSettingsTest:Harness}).appSettingsTest.current as SettingsSession).updateUpdates({version:'1.0.0',enabled:true,phase:'checking',availableVersion:'1.1.0',progress:0,message:'Checking again'}));
  await expect(check).toBeDisabled();await expect(page.getByText('Update status is unavailable',{exact:true})).toHaveCount(0);await expect(page.getByText('Checking again',{exact:true})).toBeVisible();
});

test('host update pending and owned action pending cannot release each other or affect a replacement session',async ({page})=>{
  await page.evaluate((state)=>{
    const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest;
    const session=h.app.settings.openSettings(state,{onUpdateAction:()=>new Promise<ActionResult>(resolve=>{h.release=resolve;})});h.current=session;
    session.updateUpdates({version:'1.0.0',enabled:true,phase:'idle',availableVersion:'1.1.0',progress:0,message:'Ready'});
  },state);
  const check=page.getByRole('button',{name:'Check for updates',exact:true});
  await check.click();await expect(check).toBeDisabled();
  await page.evaluate(()=>((window as unknown as {appSettingsTest:Harness}).appSettingsTest.current as SettingsSession).setUpdatePending(false));
  await expect(check).toBeDisabled();
  await page.evaluate(()=>{
    const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest;
    (h.current as SettingsSession).setUpdatePending(true);h.release!({ok:true});
  });
  await expect(check).toBeDisabled();
  await page.evaluate(()=>((window as unknown as {appSettingsTest:Harness}).appSettingsTest.current as SettingsSession).setUpdatePending(false));
  await expect(check).toBeEnabled();
  await page.evaluate((state)=>{
    const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest,old=h.current as SettingsSession;
    const next=h.app.settings.openSettings(state);next.updateUpdates({version:'2.0.0',enabled:true,phase:'idle',availableVersion:'',progress:0,message:'New owner ready'});h.current=next;
    old.setUpdatePending(true);old.setUpdateError('Old update error',{allowCheckRetry:true});
  },state);
  await expect(check).toBeEnabled();await expect(page.getByText('New owner ready',{exact:true})).toBeVisible();await expect(page.getByText('Old update error',{exact:true})).toHaveCount(0);
});

test('update version uses the application brand rather than a generic label',async ({page})=>{
  await page.evaluate((state)=>{
    const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest;
    h.current=h.app.settings.openSettings(state);
    (h.current as SettingsSession).updateUpdates({version:'1.0.0',enabled:true,phase:'idle',availableVersion:'',progress:0,message:'Ready'});
  },state);
  await expect(page.getByText('Pith Test 1.0.0',{exact:true})).toBeVisible();
});

for(const outcome of ['result','throw'] as const) test(`update installation failure preserves busy availability (${outcome})`,async ({page})=>{
  await page.evaluate(({state,outcome})=>{
    const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest;
    const session=h.app.settings.openSettings(state,{onUpdateAction:()=>{
      session.updateUpdates({version:'1.0.0',enabled:true,phase:'installing',availableVersion:'1.1.0',progress:20,message:'Installing'});
      if(outcome==='throw') return Promise.reject(new Error('Installation rejected'));
      return {ok:false,error:'Installation rejected'};
    }});h.current=session;
    session.updateUpdates({version:'1.0.0',enabled:true,phase:'idle',availableVersion:'1.1.0',progress:0,message:'Ready'});
  },{state,outcome});
  await page.getByRole('button',{name:'Update and restart',exact:true}).click();
  await expect(page.getByText('Installation rejected',{exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Check for updates',exact:true})).toBeDisabled();
  await expect(page.getByRole('button',{name:'Update and restart',exact:true})).toBeDisabled();
});

test('removing a saved key closes its successful settings session and clears credentials',async ({page})=>{
  await page.evaluate((state)=>{
    const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest;
    const session=h.app.settings.openSettings(state,{onRemoveKey:draft=>{h.calls++;h.values.push(draft);return new Promise<ActionResult>(resolve=>{h.release=resolve;});}});h.current=session;
    session.setProviders([{id:'first',name:'First provider'}],'first');
    session.setCredential({status:'Configured',hidden:false,required:false,placeholder:'Keep saved key',removeVisible:true});
  },state);
  await page.getByLabel('API key',{exact:false}).fill('Discard after removal');
  const remove=page.getByRole('button',{name:'Remove saved API key',exact:true});
  await remove.click();await expect(remove).toBeDisabled();
  expect(await page.evaluate(()=>(window as unknown as {appSettingsTest:Harness}).appSettingsTest.calls)).toBe(1);
  await page.evaluate(()=>(window as unknown as {appSettingsTest:Harness}).appSettingsTest.release!({ok:true}));
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(()=>{const session=(window as unknown as {appSettingsTest:Harness}).appSettingsTest.current as SettingsSession;return {open:session.isOpen(),key:session.read().apiKey};})).toEqual({open:false,key:''});
});

test('a late key removal cannot close or report an error on a replacement settings session',async ({page})=>{
  await page.evaluate((state)=>{
    const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest;
    const session=h.app.settings.openSettings(state,{onRemoveKey:()=>new Promise<ActionResult>(resolve=>{h.release=resolve;})});h.current=session;h.previous=session;
    session.setProviders([{id:'first',name:'First provider'}],'first');
    session.setCredential({status:'Configured',hidden:false,required:false,placeholder:'Keep saved key',removeVisible:true});
  },state);
  await page.getByLabel('API key',{exact:false}).fill('Old key draft');
  await page.getByRole('button',{name:'Remove saved API key',exact:true}).click();
  await page.evaluate((state)=>{
    const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest;
    const next=h.app.settings.openSettings({...state,baseUrl:'https://replacement.example/v1'});next.setProviders([{id:'second',name:'Second provider'}],'second');h.current=next;
    h.release!({ok:false,error:'Old removal error'});
  },state);
  await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByText('Old removal error',{exact:true})).toHaveCount(0);
  expect(await page.evaluate(()=>{const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest;return {oldOpen:h.previous!.isOpen(),oldKey:(h.previous as SettingsSession).read().apiKey,newDraft:(h.current as SettingsSession).read()};})).toEqual({oldOpen:false,oldKey:'',newDraft:{provider:'second',baseUrl:'https://replacement.example/v1',apiKey:''}});
});

test('custom connection dialogs retain the existing add and edit titles',async ({page})=>{
  for(const editing of [false,true]) {
    await page.evaluate((editing)=>{
      const h=(window as unknown as {appSettingsTest:Harness}).appSettingsTest;
      h.current=h.app.settings.openCustomConnection({name:'Example',baseUrl:'https://example.test/v1',api:'openai-completions',editing,models:[]});
    },editing);
    await expect(page.getByRole('heading',{name:editing?'Edit model connection':'Add model connection',exact:true})).toBeVisible();
  }
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
  await page.getByRole('textbox',{name:'Environment overrides (JSON object, optional)',exact:true}).fill('{"KEY":"Private draft"}');
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
