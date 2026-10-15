import {test,expect} from '@playwright/test';

test('composer merges async pending with host state, retains failed drafts and invalidates reset results',async({page})=>{
  await page.goto('/tests/fixture.html');
  await page.evaluate(async()=>{
    const path='/src/workspace.ts';const {createComposerView}=await import(path);
    let resolve!:(value:{ok:true}|{ok:false;error:string})=>void;let calls=0;
    const composer=createComposerView({onSubmit:()=>{calls++;return new Promise(done=>{resolve=done;});}});
    document.body.append(composer.element);composer.reset('原始草稿');
    Object.assign(window,{composerFixture:{composer,get calls(){return calls;},resolve:(result:{ok:true}|{ok:false;error:string})=>resolve(result)}});
  });
  const input=page.getByRole('textbox',{name:'Message Pith'}),send=page.getByRole('button',{name:'Send message',exact:true});
  await input.fill('用户编辑的草稿');await send.click();await expect(send).toBeDisabled();
  await page.evaluate(()=>{const fixture=(window as unknown as {composerFixture:{composer:{update(state:object):void};calls:number;resolve(value:object):void}}).composerFixture;fixture.composer.update({action:'send',actionDisabled:false});});
  await expect(send).toBeDisabled();
  await page.evaluate(()=>{const fixture=(window as unknown as {composerFixture:{resolve(value:object):void}}).composerFixture;fixture.resolve({ok:false,error:'保存失败'});});
  await expect(input).toHaveValue('用户编辑的草稿');await expect(page.getByRole('alert')).toHaveText('保存失败');
  await input.press('Enter');
  await page.evaluate(()=>{const fixture=(window as unknown as {composerFixture:{composer:{reset(value:string):void};resolve(value:object):void}}).composerFixture;fixture.composer.reset('另一目标的新草稿');fixture.resolve({ok:false,error:'旧错误'});});
  await expect(input).toHaveValue('另一目标的新草稿');await expect(page.getByRole('alert')).toBeHidden();await expect(send).toBeEnabled();
});

test('pending message nodes and selection survive unrelated state changes',async({page})=>{
  await page.goto('/tests/fixture.html');
  const result=await page.evaluate(async()=>{
    const path='/src/composer.ts';const{createPendingMessages}=await import(path);const block=createPendingMessages();document.body.append(block.element);
    const state={items:[{id:'one',text:'保留文字',mode:'follow-up'}],running:false,busy:false};block.update(state);
    const row=block.element.querySelector('.pui-queued-message')!,button=row.querySelector('[data-queue-action=edit]') as HTMLButtonElement;
    button.focus();block.update({...state,running:true});
    const stable=row===block.element.querySelector('.pui-queued-message')&&document.activeElement===button;
    block.destroy();block.update(state);return{stable,empty:block.element.childElementCount===0};
  });expect(result).toEqual({stable:true,empty:true});
});
