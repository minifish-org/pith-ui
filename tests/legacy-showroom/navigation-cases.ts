import {createWorkspaceNavigation, createWorkspacePicker, createRenameConversation} from '../../src/navigation/navigation.js';
import {createContextMenu} from '../../src/navigation/context-menu.js';
import {createApprovalPanel} from '../../src/tasks/approval.js';
import {createPermissionControl, createFullAccessConfirmation, createTaskFailure} from '../../src/tasks/permission.js';
import {createRuntimePanel} from '../../src/tasks/runtime.js';
import {createFeatureDialogFrame} from '../../src/forms/dialog-frame.js';
import {createButton} from '../../src/primitives.js';
import type {DemoContext, MountedDemo, ShowcaseCase} from './types.js';

function formSurface(block:{element:HTMLElement;destroy():void}):MountedDemo{const element=document.createElement('div');element.className='pui-modal';element.append(block.element);return{element,destroy(){block.destroy();element.remove();}};}
function long(context:DemoContext,value:string):string{return context.state==='long'?`${value} 中文 English /workspace/很长的文件路径.ts `.repeat(6):value;}
const disabled=(context:DemoContext)=>context.state==='disabled'||context.state==='pending';
export const navigationCases:ShowcaseCase[]=[
  {
    id:'workspace-navigation',title:'工作区与会话导航',layer:'blocks',category:'应用与导航',description:'工作区展开、当前会话、菜单入口和空列表；排序与筛选结果由宿主提供。',states:['normal','disabled','empty','long'],related:['workspace-picker','context-menu'],
    code:`const navigation = createWorkspaceNavigation({ groups, empty: null }, {\n  onToggle: id => toggleWorkspace(id),\n  onSelect: id => openConversation(id),\n  onAction: event => {\n    if (event.action === 'conversation-menu') menu.open(event.trigger, conversationActions(event.conversationId));\n    else handleNavigationAction(event);\n  },\n});\ncontainer.append(navigation.element);`,
    mount(context){
      const state={groups:context.state==='empty'?[]:[{id:'demo-workspace',name:long(context,'Pith workspace'),path:'/demo/workspace',expanded:true,selected:true,children:[{id:'chat-1',title:long(context,'正在讨论的会话'),active:true},{id:'chat-2',title:'已经保存的另一段讨论',active:false}]},{id:'other-workspace',name:'Another workspace',path:'/demo/other',expanded:false,selected:false,children:[]}],empty:context.state==='empty'?'workspaces' as const:null,disabled:disabled(context)};
      const menu=createContextMenu({onAction:item=>{context.log(`演示导航菜单：${item.action}`);menu.close(true);}});
      const navigation=createWorkspaceNavigation(state,{onToggle:id=>{const group=state.groups.find(entry=>entry.id===id);if(group){group.expanded=!group.expanded;navigation.update(state);context.log(`工作区 ${id}: ${group.expanded?'展开':'收起'}`);}},onSelect:id=>{for(const group of state.groups)for(const entry of group.children)entry.active=entry.id===id;navigation.update(state);context.log(`选择会话：${id}`);},onAction:event=>{
        if(event.action==='conversation-menu') menu.open(event.trigger,{label:'演示会话操作',items:[{id:'rename',label:'Rename conversation',action:'rename'},{id:'delete',label:'Delete conversation',action:'delete',danger:true}]});
        else if(event.action==='workspace-menu') menu.open(event.trigger,{label:'演示工作区操作',items:[{id:'rename',label:'Rename workspace',action:'rename-workspace'},{id:'remove',label:'Remove workspace',action:'remove-workspace',danger:true}]});
        else context.log(event.action==='new-conversation'?`演示新建会话：${event.workspaceId}`:'演示添加工作区；原生目录由宿主提供');
      }});
      const element=document.createElement('aside');element.className='pui-sidebar';element.style.width='min(300px, 100%)';element.append(navigation.element,menu.element);return{element,destroy(){menu.destroy();navigation.destroy();element.remove();}};
    },
  },
  {
    id:'context-menu',title:'上下文菜单与键盘导航',layer:'blocks',category:'应用与导航',description:'菜单定位不越出窗口；支持方向键、Home/End、Escape 和返回触发按钮。',states:['normal','disabled','long'],related:['workspace-navigation','menu'],
    code:`const menu = createContextMenu({ onAction: item => handle(item.action) });\ndocument.body.append(menu.element);\n// Button actions align with the button's lower edge and flip near viewport edges.\nmenu.open(trigger, { label: 'Conversation actions', items: [{ label: 'Rename', action: 'rename' }, { label: 'Delete', action: 'delete', danger: true }] });\n// A context menu on a blank canvas may explicitly use a pointer point:\n// menu.open(focusSource, state, { point: { x: event.clientX, y: event.clientY } });`,
    mount(context){const element=document.createElement('div');const menu=createContextMenu({onAction:item=>{context.log(`菜单操作：${item.action}`);menu.close(true);}});const open=()=>menu.open(button.element,{label:'演示会话操作',items:[{label:long(context,'Rename conversation'),action:'rename',disabled:disabled(context)},{label:'Export Markdown',action:'export'},{label:'Delete conversation',action:'delete',danger:true}]});const button=createButton({label:'打开会话菜单',onAction:open});element.append(button.element,menu.element);return{element,replay:open,destroy(){menu.destroy();button.destroy();element.remove();}};},
  },
  {
    id:'workspace-picker',title:'工作区选择与添加',layer:'blocks',category:'应用与导航',description:'选择已有目录或填写路径。原生文件夹选择及业务创建通过宿主连接。',states:['normal','error','disabled','empty','long'],related:['workspace-navigation','text-input'],
    code:`const picker = createWorkspacePicker({ workspaces }, {\n  onSelect: id => openWorkspace(id),\n  onPick: () => pickLocalFolder(),\n  onSubmit: path => addWorkspace(path),\n});\ncontainer.append(picker.element);`,
    mount(context){const state={workspaces:context.state==='empty'?[]:[{id:'demo',name:long(context,'Example project'),path:long(context,'/demo/workspace')}],error:context.state==='error'?'演示目录不可用；可以修改路径后重试。':'',disabled:disabled(context)};const picker=createWorkspacePicker(state,{onSelect:id=>context.log(`演示选择工作区：${id}`),onPick:async()=>{context.log('演示原生文件夹选择结果');return{path:'/demo/chosen-folder'};},onSubmit:async path=>{context.log(`添加演示路径：${path}`);return context.action();}});return formSurface(picker);},
  },
  {
    id:'rename-conversation',title:'重命名会话',layer:'blocks',category:'应用与导航',description:'保留输入、原生必填校验、局部错误和提交状态。',states:['normal','error','disabled','long','pending'],related:['text-input','workspace-navigation'],
    code:`const rename = createRenameConversation({ id: 'chat-1', title: 'A discussion' }, {\n  onSubmit: ({ id, title }) => renameConversation(id, title),\n});\ncontainer.append(rename.element);\n// Snapshot updates retain the draft; reset() explicitly changes its target.\nrename.update({ id: 'chat-1', title: 'A discussion', disabled: false });`,
    mount(context){const state={id:'chat-1',title:long(context,'关于积木库的讨论'),error:context.state==='error'?'演示保存失败，输入保留。':'',disabled:disabled(context)};const block=createRenameConversation(state,{onSubmit:async draft=>{context.log(`演示新标题：${draft.title}`);return context.action();}});return formSurface(block);},
  },
  {
    id:'approval-panel',title:'工具审批与差异预览',layer:'blocks',category:'权限与任务',description:'批准、拒绝、工作区授权、差异与惰性参数预览；忙碌更新保留已展开内容。',states:['normal','error','disabled','empty','long','pending'],related:['paged-preview','permission-control'],
    code:`const panel = createApprovalPanel({ approval: { id: 'approval-1', toolName: 'edit_file', warning: '', canAlwaysAllow: true, argsText: '{"path":"README.md"}', preview: {kind: 'modify', path: 'README.md', diff: '-Old\\n+New'} } }, { onAction: (id, action) => approve(id, action) });\ncontainer.append(panel.element);`,
    mount(context){const approval=context.state==='empty'?null:{id:'demo-approval',toolName:'edit_file',warning:'演示审批 · 不会修改任何文件。',canAlwaysAllow:true,argsText:context.state==='long'?JSON.stringify({path:'/demo/报告.md',content:'中文内容 '.repeat(70000)},null,2):JSON.stringify({path:'/demo/报告.md',oldText:'旧内容',newText:'新内容'},null,2),preview:{kind:'modify',path:long(context,'/demo/报告.md'),diff:'--- a/报告.md\n+++ b/报告.md\n@@ -1 +1 @@\n-旧内容\n+新内容',error:context.state==='error'?'演示预览不可用，请展开参数检查。':'',truncated:context.state==='long'}};const panel=createApprovalPanel({approval,disabled:disabled(context)},{onAction:async(id,action)=>{panel.update({approval,disabled:true});context.log(`演示 ${action}: ${id}`);const result=await context.action();panel.update({approval,disabled:false});context.log(result.ok?'演示操作完成':result.error);}});return panel;},
  },
  {
    id:'permission-control',title:'会话权限选择',layer:'blocks',category:'权限与任务',description:'复用基础选择器的统一下拉浮层，附带权限说明；是否允许选择和确认策略由宿主决定。',states:['normal','disabled'],related:['select','popover','approval-panel','full-access-confirmation'],
    code:`const permission = createPermissionControl({ mode: 'ask', description: 'Changes require approval.' }, { onChange: mode => changePermission(mode) });\ncontainer.append(permission.element);`,
    mount(context){const element=document.createElement('div');const description=document.createElement('p');description.className='pui-composer-note';const descriptions:Record<string,string>={ask:'读取工作区；修改、命令与外部工具需批准。','workspace-write':'工作区文件修改已允许；命令和外部工具仍需批准。','full-access':'所有已启用工具无需逐次确认。演示不实际授权。'};const control=createPermissionControl({mode:'ask',description:descriptions.ask,disabled:disabled(context)},{descriptionElement:description,onChange:mode=>{control.update({mode,description:descriptions[mode]});context.log(`演示权限偏好：${mode}`);}});element.append(control.element,description);return{element,destroy(){control.destroy();element.remove();}};},
  },
  {
    id:'full-access-confirmation',title:'全权限确认',layer:'blocks',category:'权限与任务',description:'清晰解释授权范围、撤销方式与独立确认；宿主保留原会话目标校验。',states:['normal','error','disabled','long','pending'],related:['permission-control','confirmation'],
    code:`const panel = createFullAccessConfirmation({ title: 'My conversation' }, {\n  onConfirm: () => confirmPermission(), // Promise<ActionResult>\n});\ncontainer.append(panel.element);`,
    mount(context){const state={title:long(context,'关于项目的讨论'),error:context.state==='error'?'演示授权失败，当前权限没有变化。':'',disabled:disabled(context)};const panel=createFullAccessConfirmation(state,{onConfirm:async()=>{const result=await context.action();context.log(result.ok?'演示确认完成；未授予真实权限':result.error);return result;}});return formSurface(panel);},
  },
  {
    id:'runtime-panel',title:'运行状态与指标明细',layer:'blocks',category:'权限与任务',description:'摘要、耗时、速度、用量与费用字段。计算与计时基准由宿主负责。',states:['normal','empty','long'],related:['cost-ledger','approval-panel'],
    code:`const runtime = createRuntimePanel({ visible: true, summary: 'Working · demo', duration: '10s', speed: '12.0', inputTokens: '1000', outputTokens: '120', cacheRead: '0', cacheWrite: '0', contextTokens: '2000', contextWindow: '128000', compactions: '0', toolFailures: '0', recordedCost: '$0.01', latestCost: '$0.01' });\nruntime.updateTiming({ summary: 'Working · demo', duration: '11s', speed: '12.1' });`,
    mount(context){const state={visible:context.state!=='empty',summary:long(context,'Working · Example model · 1,120 tokens · $0.01'),duration:'10s',speed:'12.0',provider:'Example provider',thinkingLevel:'high',inputTokens:'1,000',outputTokens:'120',cacheRead:'0',cacheWrite:'0',contextTokens:'2,000',contextWindow:'128,000',compactions:'0',toolFailures:'0',recordedCost:'$0.01',latestCost:'$0.01'};const panel=createRuntimePanel(state);(panel.element as HTMLDetailsElement).open=true;const element=document.createElement('div');let elapsed=10;const tick=createButton({label:'模拟推进一秒',onAction:()=>{panel.updateTiming({summary:state.summary,duration:`${++elapsed}s`,speed:'12.0'});context.log('仅更新耗时与速度，保持详情展开');}});element.append(tick.element,panel.element);return{element,destroy(){tick.destroy();panel.destroy();element.remove();}};},
  },
  {
    id:'task-failure',title:'任务失败与恢复操作',layer:'blocks',category:'权限与任务',description:'错误、建议、继续或检查设置入口；当前工作区身份由宿主传入。',states:['normal','empty','long'],related:['notice','runtime-panel'],
    code:`const failure = createTaskFailure({ visible: true, message: 'Request failed', advice: 'Review the issue and continue.', canContinue: true, workspaceId: 'demo' }, { onContinue: continueTask, onDiagnostics: saveDiagnostics });\ncontainer.append(failure.element);`,
    mount(context){return createTaskFailure({visible:context.state!=='empty',message:long(context,'演示模型请求失败'),advice:'先查看问题，再选择继续。演示不会重试真实任务。',canContinue:true,workspaceId:'demo-workspace'},{onContinue:()=>context.log('演示继续任务'),onSettings:()=>context.log('演示检查设置'),onDiagnostics:()=>context.log('演示保存诊断')});},
  },
];
