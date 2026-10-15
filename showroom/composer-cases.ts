import { createComposerView } from '../src/workspace.js';
import { createAttachments, createPendingMessages, createDropFeedback } from '../src/composer.js';
import { createButton, createTextEditDialog } from '../src/primitives.js';
import { element } from '../src/dom.js';
import type { ShowcaseCase } from './types.js';

const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="220" height="140"><rect width="220" height="140" fill="#4A62C8"/><text x="25" y="80" fill="white" font-size="26">Demo image</text></svg>');
export const composerCases: ShowcaseCase[] = [
  { id:'composer', title:'自适应输入与发送', layer:'blocks', category:'输入与队列', description:'多行、输入法、提交失败、重复点击和只读状态；草稿由调用方显式重置，模型和权限通过回调连接。', states:['normal','error','disabled','long','pending'], controls:['outcome'], related:['attachments','pending-messages','workspace-chat','text-area'],
    code:`const composer = createComposerView({ onInput: rememberDraft, onSubmit: send });\ncontainer.append(composer.element);\ncomposer.reset(savedDraft);\ncomposer.update({ action: 'send', actionDisabled: false });`,
    mount(context) {
      let pending = context.state === 'pending', alive = true;
      const status = element('p', 'pui-form-error'); status.setAttribute('role','status');
      const composer = createComposerView({ onInput:text=>context.log(`草稿 ${text.length} 字符`), onSubmit:async text=>{
        if (pending || context.state === 'disabled') return;
        pending = true; update(); const result = await context.action();
        if (!alive) return; pending = false;
        status.textContent = result.ok ? '演示发送成功。调用方现在显式清空草稿。' : result.error;
        if (result.ok && composer.getValue() === text) composer.reset(''); update();
      } });
      function update():void { composer.update({action:'send',disabled:pending || context.state === 'disabled',actionDisabled:pending || context.state === 'disabled'}); }
      composer.reset(context.state === 'long' ? '多行输入保持可见。\n'.repeat(12) : '中文输入、English、emoji 🐟'); update();
      if (context.state === 'error') status.textContent = '演示发送失败；草稿保留。';
      const root=element('div','',composer.element,status);
      return {element:root,destroy(){alive=false;composer.destroy();root.remove();}};
    } },
  { id:'attachments', title:'图片附件与删除', layer:'blocks', category:'输入与队列', description:'稳定附件 key，原图预览、删除和禁用。实际文件读取、格式校验与 URL 生命周期由应用管理。', states:['normal','disabled','empty','long'], related:['composer','image-viewer'],
    code:`const attachments = createAttachments({ onRemove: removeFromDraft, onOpen: image => viewer.open({ src: image.src, alt: image.alt }) });\nattachments.update({ items: [{ id: 'image-1', url, name: 'Example.png' }] });`,
    mount(context){
      let items = context.state==='empty'?[]:Array.from({length:context.state==='long'?8:2},(_,index)=>({id:`image-${index}`,url:image,name:`演示图片 ${index+1}.png`}));
      const block=createAttachments({onRemove:id=>{items=items.filter(item=>item.id!==id);update();context.log(`移除 ${id}`);},onOpen:image=>context.log(`点击预览：${image.alt}；完整缩放请见“图片缩放”积木`)});
      function update():void {block.update({items,disabled:context.state==='disabled'});} update();return block;
    } },
  { id:'pending-messages',title:'待发送队列与编辑',layer:'blocks',category:'输入与队列',description:'待发送内容、插入指令、附件计数与编辑弹窗；状态更新保留队列节点和焦点。',states:['normal','disabled','empty','long','pending'],controls:['outcome'],related:['composer','text-edit-dialog','workspace-approval'],
    code:`const queue = createPendingMessages({ onAction: handleQueueAction });\nqueue.update({ items, running: true, busy: false });\ncontainer.append(queue.element);`,
    mount(context){
      let items=context.state==='empty'?[]:Array.from({length:context.state==='long'?12:2},(_,index)=>({id:`queue-${index}`,text:`待发送消息 ${index+1} · 保留行为`,mode:index%2?'steer':'follow-up',imageCount:index%2}));
      let target='',alive=true;
      const editor=createTextEditDialog({title:'Edit pending message',onSubmit:async text=>{const id=target;const result=await context.action();if(alive&&result.ok){items=items.map(item=>item.id===id?{...item,text}:item);update();}return result;}});
      const block=createPendingMessages({onAction:(action,id)=>{if(action==='edit'){target=id;editor.open({value:items.find(item=>item.id===id)!.text});}else{items=action==='delete'?items.filter(item=>item.id!==id):items.map(item=>item.id===id?{...item,mode:'steer'}:item);update();}context.log(`队列操作 ${action}: ${id}`);}});
      function update():void{block.update({items,running:true,busy:context.state==='disabled'||context.state==='pending'});}update();const root=element('div','',block.element,editor.element);
      return{element:root,destroy(){alive=false;editor.destroy();block.destroy();root.remove();}};
    } },
  { id:'drop-feedback',title:'拖放反馈',layer:'blocks',category:'输入与队列',description:'拖放外观由库维护；文件身份、路径验证和附件处理由应用执行。体验区只报告演示文件名，不读文件内容。',states:['normal','disabled'],related:['composer','attachments'],
    code:`const feedback = createDropFeedback({ container: composer.element });\nfeedback.update({ active: true, disabled: false });\nfeedback.destroy();`,
    mount(context){
      const composer=createComposerView();composer.reset('把演示文件拖到这里，或点击模拟按钮。');const feedback=createDropFeedback({container:composer.element});
      const abort=new AbortController();const update=(active:boolean)=>feedback.update({active,disabled:context.state==='disabled'});
      composer.element.addEventListener('dragover',event=>{event.preventDefault();update(true);},{signal:abort.signal});
      composer.element.addEventListener('dragleave',()=>update(false),{signal:abort.signal});
      composer.element.addEventListener('drop',event=>{event.preventDefault();update(false);context.log(`演示拖放 ${event.dataTransfer?.files.length??0} 个文件；未读取内容`);},{signal:abort.signal});
      const start=createButton({label:'模拟拖入',disabled:context.state==='disabled',onAction:()=>update(true)}),end=createButton({label:'模拟离开',onAction:()=>update(false)});const root=element('div','pui-form-section',composer.element,start.element,end.element);
      return{element:root,replay:()=>update(true),destroy(){abort.abort();feedback.destroy();composer.destroy();start.destroy();end.destroy();root.remove();}};
    } },
];
