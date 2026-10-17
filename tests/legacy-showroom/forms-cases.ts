import {createSettingsPanel, createMCPConnectionsPanel, createMCPConnectionList, createModelPicker} from '../../src/forms/panels.js';
import {createCustomConnectionEditor, customModelDefaults} from '../../src/forms/custom-connection.js';
import {createResourceEditor} from '../../src/forms/resource-editor.js';
import {createProviderLoginPanel} from '../../src/forms/provider-login.js';
import {createBranchHistory} from '../../src/forms/history.js';
import {createFeatureDialogFrame, createFeatureStatus} from '../../src/forms/dialog-frame.js';
import {createProviderActions, createResourceActions} from '../../src/forms/actions.js';
import {createButton} from '../../src/primitives.js';
import {createUpdatePanel} from '../../src/files/systems.js';
import type {DemoContext, MountedDemo, ShowcaseCase} from './types.js';

type Owned = {element: HTMLElement; destroy(): void};
const formStates = ['normal', 'error', 'disabled', 'long', 'pending'] as const;
function text(context: DemoContext, value: string): string {return context.state === 'long' ? `${value} · 中文 English /workspace/a-very-long-file-name.ts `.repeat(4) : value;}
function disabled(context: DemoContext): boolean {return context.state === 'disabled' || context.state === 'pending';}
function surface(block: Owned): MountedDemo {
  const element = document.createElement('div'); element.className = 'pui-modal pui-showcase-form'; element.append(block.element);
  return {element, destroy() {block.destroy(); element.remove();}};
}
export const formsCases: ShowcaseCase[] = [
  {
    id: 'settings-panel', title: '设置与提供商连接', layer: 'blocks', category: '设置与模型连接',
    description: '外观、更新状态、提供商、密钥和连接测试共用已验证布局；真实凭证和请求留在宿主。', states: ['normal', 'loading', 'error', 'disabled', 'long'], related: ['form-section', 'custom-connection'],
    code: `const panel = createSettingsPanel({ baseUrl: 'https://example.com/v1', hasApiKey: true, ready: true }, { onSubmit: draft => saveProvider(draft) });\npanel.setProviders([{ id: 'example', name: 'Example provider' }]);\ncontainer.append(panel.element);\nconst draft = panel.read();`,
    mount(context) {
      const state = {baseUrl:'https://example.com/v1',hasApiKey:true,ready:context.state !== 'loading',error:context.state === 'error' ? '演示连接失败；密钥不会显示。' : '',disabled:disabled(context)}; let live = true;
      const panel = createSettingsPanel(state,{onSubmit:()=>context.action(),onAppearanceChange:mode=>context.log(`外观偏好：${mode}（仅演示）`),onTest:async()=>{panel.update({...state,testing:true}); const result = await context.action(); if (live) panel.update({...state,testing:false,testResult:{message:result.ok ? '演示连接成功。' : result.error,ok:result.ok}});}});
      if (context.state !== 'loading') panel.setProviders([{id:'example',name:text(context,'Example provider')}]);
      const updates = createUpdatePanel({container:panel.updates,productName:'不连接更新服务'}); updates.update({version:'',enabled:false,phase:'disabled',availableVersion:'',progress:0,message:'演示数据 · 当前版本 0.1.0'});
      const mounted = surface(panel); return {...mounted,destroy() {live = false; updates.destroy(); mounted.destroy();}};
    },
  },
  {
    id: 'model-picker', title: '模型目录与思考强度', layer: 'blocks', category: '模型与强度',
    description: '提供商、模型搜索、多行选择和能力说明；搜索、选择和强度均可实际操作。', states: ['normal', 'loading', 'error', 'disabled', 'empty', 'long'], related: ['select', 'search-input'],
    code: `const picker = createModelPicker({ editor: { providers, models, selection }, loading: false }, { onSubmit: selected => saveSelection(selected) });\ncontainer.append(picker.element);\nconst selected = picker.read();`,
    mount(context) {
      const names = context.state === 'empty' ? [] : [{id:'example', name: text(context, 'Example provider'), model:'balanced', thinkingLevel:'high'}];
      const picker = createModelPicker({error:context.state === 'error' ? '演示模型目录读取失败。' : '',loading:context.state === 'loading',disabled:context.state === 'empty' || disabled(context),editor:context.state === 'loading' ? undefined : {providers:names,models:names.length ? [{id:'balanced',name:'Balanced / 均衡',provider:'example',supportsImages:true,contextWindow:128000,maxTokens:8192,thinkingLevels:['off','low','medium','high']},{id:'fast',name:'Fast / 快速',provider:'example',supportsImages:false,contextWindow:64000,maxTokens:4096,thinkingLevels:['off']}] : [],selection:{provider:'example',model:'balanced',thinkingLevel:'high'},disabled:disabled(context)}},{onSubmit:selection=>{context.log(`${selection.provider} / ${selection.model} / ${selection.thinkingLevel}`); return context.action();}});
      return surface(picker);
    },
  },
  {
    id:'custom-connection', title:'独立连接与模型定义', layer:'blocks', category:'设置与模型连接',
    description:'可增删模型、填写能力与四项价格；首行与新增行共用默认值，修改已有行不会影响下一行。辅助按钮不会意外提交。', states:formStates, related:['settings-panel','number-input','secret-input'],
    code:`const editor = createCustomConnectionEditor({ name: 'Local', baseUrl: 'http://localhost:11434/v1', api: 'openai-completions', editing: false, models: [customModelDefaults()] }, { onSubmit: draft => saveConnection(draft) });\ncontainer.append(editor.element);`,
    mount(context) {
      const state={name:text(context,'Example connection'),baseUrl:'https://example.com/v1',api:'openai-completions',editing:true,models:[{...customModelDefaults(),id:'example-model',name:'Example model',reasoning:true,input:['text','image'],cost:{input:1,output:2,cacheRead:0,cacheWrite:0}}],error:context.state==='error'?'演示保存失败；输入保留。':'',disabled:disabled(context)};
      return surface(createCustomConnectionEditor(state,{onSubmit:()=>context.action()}));
    },
  },
  {
    id:'mcp-connections',title:'MCP 连接与私密字段',layer:'blocks',category:'OAuth 与 MCP',
    description:'HTTP 与本地命令表单、已有密钥提示、环境变量显隐和连接操作。',states:['normal','loading','error','disabled','empty','long'],related:['provider-login','secret-input'],
    code:`const panel = createMCPConnectionsPanel({}, { onSubmit: draft => saveMCP(draft) });\npanel.edit({ name: 'my-tools', type: 'http', url: 'https://example.com/mcp', enabled: true });\nconst list = createMCPConnectionList({ entries: [{ name: 'my-tools', type: 'http', enabled: true, statusLabel: 'Connected · 3 tools' }] });\npanel.list.append(list.element);\n// Destroy the list and panel when their host closes.`,
    mount(context) {
      const panel=createMCPConnectionsPanel({error:context.state==='error'?'演示连接列表读取失败。':'',disabled:disabled(context)},{onSubmit:()=>context.action()});
      const entry={name:text(context,'demo-tools'),type:'http',url:'https://example.com/mcp',enabled:true,oauth:true,signedIn:false,hasBearerToken:true,envKeys:['DEMO_KEY'],status:context.state==='error'?'error':'connected',statusLabel:context.state==='error'?'Connection failed':'Connected · 3 tools',error:context.state==='error'?'模拟连接超时':''};
      const list=context.state==='loading'?null:createMCPConnectionList({entries:context.state==='empty'?[]:[entry]}); if(list)panel.list.replaceChildren(list.element);
      if(context.state!=='empty')panel.edit(entry);
      const abort=new AbortController();panel.element.addEventListener('click',event=>{const button=(event.target as HTMLElement).closest<HTMLButtonElement>('button');if(button?.dataset.action==='new-mcp')panel.edit();if(button?.dataset.action==='refresh-mcp')context.log('刷新演示连接');if(button?.dataset.sdk)context.log(`演示账号操作：${button.dataset.sdk}`);},{signal:abort.signal});
      const mounted=surface(panel);return {...mounted,destroy(){abort.abort();list?.destroy();mounted.destroy();}};
    },
  },
  {
    id:'provider-login',title:'提供商登录流程',layer:'blocks',category:'OAuth 与 MCP',
    description:'登录链接、验证码、追加问题及失败提示；演示不连接真实账号。',states:['normal','loading','error','disabled','long','pending'],related:['mcp-connections','dialog'],
    code:`const panel = createProviderLoginPanel({ phase: 'prompt', message: 'Enter the verification code', prompt: 'Code' }, { onAnswer: answer => submitAnswer(answer), onCancel: cancel });\ncontainer.append(panel.element);\npanel.update({ phase: 'complete', message: 'Signed in' });`,
    mount(context) {
      const state={phase:context.state==='error'?'error':context.state==='loading'?'waiting':'prompt',message:text(context,context.state==='error'?'演示登录失败。':'演示账号登录；不会发送真实数据。'),url:'https://example.com',code:'DEMO-1234',prompt:'输入演示验证码',disabled:disabled(context)};
      const panel=createProviderLoginPanel(state,{onAnswer:async answer=>{context.log(`提交演示验证码：${answer.length} 字符`);panel.update({...state,disabled:true});const result=await context.action();panel.update(result.ok?{phase:'complete',message:'演示登录成功'}:{...state,error:result.error,disabled:false});},onCancel:()=>context.log('取消演示登录'),onClose:()=>context.log('关闭登录界面')});return surface(panel);
    },
  },
  {
    id:'resource-editor',title:'资源原文编辑器',layer:'blocks',category:'工作区资源',
    description:'技能、模板、指令共用原文编辑界面；只读原因和操作状态由宿主提供。',states:formStates,related:['text-area','confirmation'],
    code:`const editor = createResourceEditor({ workspaceId: 'demo', workspacePath: '/demo', kind: 'skill', name: 'demo-skill', content: '# Instructions', editable: true, workspaceBusy: false }, { onSubmit: draft => saveResource(draft) });\ncontainer.append(editor.element);\nconst { name, content } = editor.read();`,
    mount(context) {
      const state={workspaceId:'demo',workspacePath:text(context,'/demo/workspace'),kind:'skill',name:'demo-skill',content:context.state==='long'?'# 中文技能\n\nLong content. '.repeat(100):'---\nname: my-skill\ndescription: 演示技能\n---\n\n在这里编辑 Markdown。',editable:context.state!=='disabled',workspaceBusy:context.state==='disabled',error:context.state==='error'?'演示保存失败；文本保留。':'',disabled:context.state==='pending'};
      return surface(createResourceEditor(state,{onSubmit:()=>context.action()}));
    },
  },
  {
    id:'branch-history',title:'分支历史',layer:'blocks',category:'分支历史',
    description:'展示已保存消息、当前分支和继续操作；继续请求与分支业务规则由宿主处理。',states:['normal','loading','error','empty','long'],related:['conversation-messages'],
    code:`const history = createBranchHistory({ nodes: [{ id: 'node-1', role: 'user', text: 'Question', active: true }] }, { onContinue: id => continueBranch(id) });\ncontainer.append(history.element);`,
    mount(context) {return surface(createBranchHistory({nodes:context.state==='empty'?[]:[{id:'node-1',role:'user',text:text(context,'请检查这个项目。'),active:true},{id:'node-2',role:'assistant',text:'已经保存的另一个分支。',active:false}],loading:context.state==='loading',error:context.state==='error'?'演示历史读取失败。':''},{onContinue:async id=>{context.log(`继续分支：${id}`);await context.action();}}));},
  },
  {
    id:'feature-dialog',title:'共享功能弹窗',layer:'blocks',category:'浮层与反馈',
    description:'关闭、重开、替换内容与焦点恢复；旧内容实例随替换销毁。',states:['normal','loading','error'],related:['dialog','branch-history'],
    code:`const dialog = createFeatureDialogFrame();\ndocument.body.append(dialog.element);\ndialog.open({ title: 'Resources', body: createFeatureStatus({ message: 'Loading…' }) });`,
    mount(context) {
      const frame=createFeatureDialogFrame();const root=document.createElement('div');const open=()=>{frame.open({title:'演示功能弹窗',body:createFeatureStatus({message:context.state==='error'?'演示读取失败。':context.state==='loading'?'Loading…':'可以关闭、再次打开，检查焦点与清理。',error:context.state==='error'})});context.log('打开功能弹窗');};const button=createButton({label:'打开功能弹窗',onAction:open});root.append(button.element,frame.element);return{element:root,replay:open,destroy(){frame.destroy();button.destroy();root.remove();}};
    },
  },
  {
    id:'provider-resource-actions',title:'账号与资源操作栏',layer:'blocks',category:'设置与模型连接',
    description:'有限语义操作，统一按钮与危险操作样式。',states:['normal','long'],related:['actions','settings-panel','resource-editor'],
    code:`const actions = createProviderActions({ id: 'example', oauth: true, signedIn: false, custom: true }, { onAction: action => handle(action) });\ncontainer.append(actions.element);`,
    mount(context) {const provider=createProviderActions({id:'demo',oauth:true,signedIn:false,custom:true},{onAction:action=>context.log(`账号操作：${action}`)});const resource=createResourceActions({kind:'skill',resource:{name:text(context,'demo-skill'),path:'/demo/.pi/skills/demo/SKILL.md'},workspaceId:'demo'},{onAction:action=>context.log(`资源操作：${action}`)});const element=document.createElement('div');element.append(provider.element,resource.element);return{element,destroy(){provider.destroy();resource.destroy();element.remove();}};},
  },
];
