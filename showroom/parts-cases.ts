import * as p from '../src/parts/index.js';
import {simpleLayouts,specialExamples,type PartExample} from './parts-examples.js';
import {exampleCode} from './parts-code.js';
import type {ShowcaseCase} from './types.js';
const builders:Record<string,PartExample>={...specialExamples};
for(const[name,factory]of Object.entries(simpleLayouts))builders[name]=()=>factory({children:[p.createTextPart({text:'Caller-owned content'})]});
const id=(name:string)=>name==='createButtonPart'?'button-parts':name.replace(/^create/,'').replace(/([a-z0-9])([A-Z])/g,'$1-$2').toLowerCase();
const category=(name:string)=>/Input|Field|Select|Checkbox|Textarea|Form|Secret/.test(name)?'输入与表单':/Button|Action|Toolbar|Menu|Popover|Dialog|Drawer|Inspector|Pagination|Download|Copy/.test(name)?'动作与浮层':/Image|Thumbnail|Caption|Brand/.test(name)?'图像与标识':/Frame|Rail|Main|Topbar|Stack|Group|Section|Row|Card|Viewport|Reading|Scroll|Tree/.test(name)?'布局与容器':'文本与状态';
const disableable=new Set(['createButtonPart','createInputPart','createTextareaPart','createSelectPart','createChoiceListPart','createCompactSelectPart','createCheckboxPart','createFormPart','createFieldsetPart','createSearchFieldPart','createTreeItemPart','createOptionActionPart','createStepActionPart','createMessageInputPart']);
export const partCases:readonly ShowcaseCase[]=Object.entries(builders).sort(([a],[b])=>a==='createButtonPart'?-1:b==='createButtonPart'?1:a.localeCompare(b)).map(([name,make])=>({
 id:id(name),title:name==='createButtonPart'?'按钮零件':name.replace(/^create/,'').replace(/Part$/,''),layer:'components',category:category(name),
 description:name==='createMarkdownPart'?'受限 Markdown 内容。disabled 控制整个内容区的动作；localFileDisabled 独立控制本地文件链接；copyBusy 只决定复制反馈期间及恢复时的可用状态，保留首次复制动作。':'正式受限零件。库统一决定原生结构、字体、间距、颜色、尺寸和动效；调用者只选择内容、有限语义选项、状态和数据回调。完整区域的组装说明见 APP.md。',
 factories:name==='createButtonPart'?[name,'mountParts']:[name],states:name==='createMarkdownPart'?['normal','disabled','local-file-disabled','copy-busy']:disableable.has(name)?['normal','disabled']:['normal'],code:exampleCode[name]??'',
 mount(context){const host=document.createElement('div'),part=make({disabled:context.state==='disabled',notify:context.log}),tree=p.mountParts(host,part,{appearance:context.host.closest<HTMLElement>('[data-appearance]')?.dataset.appearance as 'light'|'dark'|'system' ?? 'system'});if(name==='createMarkdownPart')(part as p.MarkdownPart).update({text:'**Literal Markdown**\n\n[Result](result.txt)\n\n```ts\nconst ready = true;\n```',disabled:context.state==='disabled',localFileDisabled:context.state==='local-file-disabled',copyBusy:context.state==='copy-busy'});return{element:host,destroy:tree.destroy};},
}));
