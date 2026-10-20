import {recipeCode} from './recipe-code.js';
import * as p from 'pith-ui';
import * as r from 'pith-ui/recipes';
import type {DemoContext,ShowcaseCase} from './types.js';

type Region = {part: p.Part;open?(): void;destroy(): void};
const examples: Array<{id: string;title: string;factories: string[];create(context: DemoContext): Region}> = [
  {id:'settings',title:'设置区域',factories:['composeSettings'],create(c) {
    const region=r.composeSettings({baseUrl:'https://provider.example/v1',hasApiKey:true,ready:true,disabled:c.state==='disabled',...(c.state==='browser'?{connectionHint:'Requests run on the remote host; localhost refers to that host.',diagnosticsLabel:'Download diagnostics'}:{})},{onSubmit:c.action,onTest:c.action,onRemoveKey:c.action,onProviderAction:c.action});
    region.setProviders([{id:'demo',name:'Demo provider',configured:true}],'demo');
    region.setCredential({status:'Configured',hidden:false,required:false,placeholder:'Keep the saved key',removeVisible:true});
    if(c.state!=='browser') region.updateUpdates({version:'Demo',phase:'idle',enabled:true,availableVersion:'',progress:0,message:'Demonstration data'});return region;
  }},
  {id:'mcp',title:'MCP 连接区域',factories:['composeMCPConnections'],create:c=>r.composeMCPConnections(c.state==='browser'?{oauthAvailable:false,connectionHint:'Commands, environment and dependencies run on the remote host. Use a bearer token for new connections.'}:{}, {onSubmit:c.action})},
  {id:'models',title:'模型选择区域',factories:['composeModelPicker'],create:c=>r.composeModelPicker({editor:{providers:[{id:'demo',name:'Demo provider'}],models:[{id:'model',name:'Demo model',provider:'demo',supportsImages:true,contextWindow:128000,maxTokens:8192,thinkingLevels:['off','high']}],selection:{provider:'demo',model:'model',thinkingLevel:'off'}}},{onSubmit:c.action})},
  {id:'connection',title:'独立连接编辑区域',factories:['composeCustomConnection','customModelDefaults'],create:c=>r.composeCustomConnection({name:'Demo',baseUrl:'https://provider.example/v1',api:'openai-completions',editing:false,models:[r.customModelDefaults()],...(c.state==='browser'?{connectionHint:'This endpoint is contacted by the remote host.'}:{})},{onSubmit:c.action})},
  {id:'login',title:'登录区域',factories:['composeProviderLogin'],create:c=>r.composeProviderLogin({phase:'prompt',message:'Demonstration sign-in challenge',prompt:'Verification code',promptType:'text'},{onAnswer:c.action,onCancel:c.action})},
  {id:'editor',title:'资源编辑区域',factories:['composeResourceEditor'],create:c=>r.composeResourceEditor({workspaceId:'demo',workspacePath:'/demo',kind:'skill',name:'inspect',content:'# Demo skill\n\nInspect the current project.',editable:true,workspaceBusy:false},{onSubmit:c.action})},
  {id:'resources',title:'资源列表区域',factories:['composeResourcesInventory'],create:c=>r.composeResourcesInventory({workspace:{id:'demo',name:'Demo workspace',path:'/demo'},instructions:[{name:'AGENTS.md',path:'/demo/AGENTS.md',content:'Demo instructions'}],skills:[{name:'review-changes',path:'/demo/.agents/skills/review-changes/SKILL.md',description:'Review changes and explain the most important findings.'}],templates:[],diagnostics:[],canCreateInstructions:false,fileActions:{reveal:c.state!=='browser',...(c.state==='browser'?{openLabel:'Copy server path'}:{})}},{onRefresh:c.action,onCreate:c.action,onEdit:c.action,onUse:c.action})},
  {id:'preview',title:'文件预览区域',factories:['composeFilePreview'],create(c) {
    const announcement=p.createAnnouncementPart({message:''});
    const region=r.composeFilePreview({owner:{kind:'artifact',id:'demo'},name:'Report.md',path:'/demo/Report.md',capabilities:{open:true,copyMode:'path',...(c.state==='browser'?{reveal:false,openLabel:'Download',copyPathLabel:'Copy server path'}:{})},content:{kind:'markdown',text:'# Demo report\n\nA **shared** preview.\n\n```ts\nconst ready = true;\n```'}},{onFileAction:c.action,onCopyCode:c.action},announcement);
    return {...region,part:p.createStackPart({children:[announcement,region.part]}),destroy(){region.destroy();announcement.destroy();}};
  }},
  {id:'reader',title:'会话阅读区域',factories:['composeConversationReader'],create(c) {
    const region=r.composeConversationReader({id:'demo',working:false,messages:[{id:'user',role:'user',text:'Review this project 中文',actions:{copy:true,edit:true}},{id:'answer',role:'assistant',text:'A **shared** reader.\n\n```ts\nconst ready = true;\n```',actions:{copy:true}}]},{onCopyCode:c.action,onMessageAction:c.action});
    return {part:p.createStackPart({children:[region.find,region.region,region.announcement]}),destroy:region.destroy};
  }},
  {id:'composer',title:'输入与任务区域',factories:['composeComposer','composeApproval','composePendingMessages','composeTaskFailure','composeRuntime','composeCostLedger'],create(c) {
    const composer=r.composeComposer({action:'send',actionDisabled:false,model:{label:'GPT-6.1 Sol',description:'Demonstration data'},thinking:{options:[{value:'off',label:'Off'},{value:'high',label:'High'}],value:'high'}},{onSubmit:c.action,onPermissionChange(mode){composer.updatePermission({mode,description:'Demonstration permissions'});c.log(mode);}});
    composer.updatePermission({mode:c.state==='normal'?'ask':c.state,description:'Demonstration permissions'});
    const approval=r.composeApproval({approval:{id:'demo',toolName:'run_command',argsText:'{"command":"inspect"}',canAlwaysAllow:false}}),pending=r.composePendingMessages({items:[{id:'queued',text:'A queued request',mode:'followUp',imageCount:0}],running:false,busy:false});
    const ledger=r.composeCostLedger(),runtime=r.composeRuntime({visible:true,summary:'Demo task',duration:'1s',speed:'20',inputTokens:'100',outputTokens:'20',cacheRead:'0',cacheWrite:'0',contextTokens:'120',contextWindow:'128,000',compactions:'0',toolFailures:'0',recordedCost:'Unknown',latestCost:'Unknown'},{costLedger:ledger.part});
    const failure=r.composeTaskFailure({visible:false,message:'',advice:'',canContinue:false});composer.panels.replace([approval.part,runtime.part,failure.part,pending.part]);return composer;
  }},
  {id:'navigation',title:'导航区域',factories:['composeFrame'],create(c) {
    return r.composeFrame({workspace:'Demo workspace',conversation:'Demo conversation',navigation:{groups:[{id:'demo',name:'Demo workspace',path:'/demo',selected:true,children:[{id:'chat',title:'Demo conversation',active:true}]}],empty:null}},{onAction:action=>{c.log(action);}});
  }},
  {id:'navigation-overlay',title:'原生标题栏融合',factories:['composeFrame'],create(c) {
    return r.composeFrame({workspace:'Demo workspace',conversation:'Demo conversation',navigation:{groups:[{id:'demo',name:'Demo workspace',path:'/demo',selected:true,children:[{id:'chat',title:'Demo conversation',active:true}]}],empty:null}},{onAction:action=>{c.log(action);}},{titlebar:'overlay'});
  }},
];
export const recipeCases: readonly ShowcaseCase[] = examples.map(example=>({
  id:'recipe-'+example.id,title:example.title,layer:'blocks',category:'正式区域组合',factories:example.factories,
  description:'从 pith-ui/recipes 直接引用；所有数据和操作均为演示。',states:example.id==='composer'?['normal','workspace-write','full-access']:['resources','settings','mcp','connection','preview'].includes(example.id)?['normal','browser']:['normal'],controls:['outcome'],
  code:recipeCode[example.id]!,
  mount(context) {
    const element=document.createElement('div');element.style.position='relative';element.style.minHeight=example.id.startsWith('navigation')?'440px':'280px';
    const region=example.create(context),open=region.open;
    const trigger=open?p.createButtonPart({label:'Open region',onAction:()=>open()}):undefined;
    const tree=p.mountParts(element,trigger?p.createStackPart({children:[trigger,region.part]}):region.part,{appearance:context.host.closest<HTMLElement>('[data-appearance]')?.dataset.appearance as 'light'|'dark'|'system' ?? 'system'});
    return {element,destroy:tree.destroy};
  },
}));
