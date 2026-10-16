import { expect, test } from '@playwright/test';

test.beforeEach(async ({page}) => {await page.goto('/tests/fixture.html');});

test('owned provider actions suppress document delegation and retain a pending keyed button across identical updates', async ({page}) => {
  await page.evaluate(async () => {
    const path = '/src/forms/actions.ts'; const {createProviderActions} = await import(path);
    const state = {id:'provider',oauth:true,signedIn:false,custom:false};
    let calls = 0, delegated = 0;
    let finish!: (result:{ok:false;error:string}) => void;
    document.addEventListener('click',event => {if ((event.target as Element).closest('[data-sdk]')) document.body.dataset.delegated=String(++delegated);});
    const block = createProviderActions(state,{onAction(action:string,target:DOMStringMap) {document.body.dataset.calls=String(++calls);document.body.dataset.action=action;document.body.dataset.provider=target.id;return new Promise(resolve=>{finish=resolve;});},onError(message:string) {document.body.dataset.error=message;}});
    document.body.append(block.element);
    const original = (block.element as HTMLElement).querySelector<HTMLButtonElement>('button')!;
    Object.assign(window,{featureActionFixture:{block,repeatAndUpdate() {original.dispatchEvent(new MouseEvent('click',{bubbles:true}));block.update({...state});return original===(block.element as HTMLElement).querySelector('button');},finish() {finish({ok:false,error:'Provider rejected this attempt'});}}});
  });
  const action = page.getByRole('button',{name:'Sign in with provider',exact:true});
  await action.click();
  await expect(action).toBeDisabled();
  expect(await page.evaluate(() => (window as unknown as {featureActionFixture:{repeatAndUpdate():boolean}}).featureActionFixture.repeatAndUpdate())).toBe(true);
  await expect(page.locator('body')).toHaveAttribute('data-calls','1');
  await expect(page.locator('body')).toHaveAttribute('data-action','login');
  await expect(page.locator('body')).toHaveAttribute('data-provider','provider');
  expect(await page.locator('body').getAttribute('data-delegated')).toBeNull();
  await page.evaluate(() => (window as unknown as {featureActionFixture:{finish():void}}).featureActionFixture.finish());
  await expect(action).toBeEnabled();
  await expect(page.locator('body')).toHaveAttribute('data-error','Provider rejected this attempt');
  await action.click();
  await expect(page.locator('body')).toHaveAttribute('data-calls','2');
  await page.evaluate(() => (window as unknown as {featureActionFixture:{block:{destroy():void};finish():void}}).featureActionFixture.block.destroy());
});

test('owned resource actions ignore late errors after replacement or destroy and suppress synchronous destructive callbacks', async ({page}) => {
  const result = await page.evaluate(async () => {
    const path = '/src/forms/actions.ts'; const {createResourceActions,createProviderActions} = await import(path);
    let errors=0,delegated=0,calls=0;
    document.addEventListener('click',event=>{if ((event.target as Element).closest('[data-sdk]')) delegated++;});
    const state = {kind:'skill',resource:{name:'demo',path:'/workspace/demo.md'},workspaceId:'workspace'};
    let finish!: (result:{ok:false;error:string})=>void;
    const block = createResourceActions(state,{onAction() {calls++;return new Promise(resolve=>{finish=resolve;});},onError(){errors++;}});
    document.body.append(block.element);
    const original = (block.element as HTMLElement).querySelector<HTMLButtonElement>('[data-sdk=resource]')!;
    original.click();
    block.update({...state,resource:{name:'other',path:'/workspace/other.md'}});
    finish({ok:false,error:'Old target error'});await new Promise(done=>setTimeout(done,0));
    const current = (block.element as HTMLElement).querySelector<HTMLButtonElement>('[data-sdk=resource]')!;
    const replaced = {different:original!==current,disabled:current.disabled,errors};
    current.click();block.destroy();finish({ok:false,error:'Destroyed target error'});await new Promise(done=>setTimeout(done,0));
    const synchronous = createProviderActions({id:'p',oauth:true,signedIn:false,custom:false},{onAction(){calls++;synchronous.destroy();}});
    document.body.append(synchronous.element);(synchronous.element as HTMLElement).querySelector<HTMLButtonElement>('button')!.click();
    return {replaced,errors,delegated,calls,connected:block.element.isConnected};
  });
  expect(result).toEqual({replaced:{different:true,disabled:false,errors:0},errors:0,delegated:0,calls:3,connected:false});
});

test('provider and resource actions without callbacks preserve document-level delegation', async ({page}) => {
  const result = await page.evaluate(async () => {
    const path = '/src/forms/actions.ts';const {createProviderActions,createResourceActions}=await import(path);
    const received:unknown[]=[];
    document.addEventListener('click',event=>{const button=(event.target as Element).closest<HTMLButtonElement>('[data-sdk]');if(button)received.push({action:button.dataset.sdk,id:button.dataset.id??'',workspace:button.dataset.resourceWorkspace??'',path:button.dataset.path??''});});
    const provider=createProviderActions({id:'p',oauth:true,signedIn:false,custom:false});
    const resource=createResourceActions({kind:'instructions',resource:{name:'AGENTS.md',path:'/workspace/AGENTS.md'},workspaceId:'w'});
    document.body.append(provider.element,resource.element);
    (provider.element as HTMLElement).querySelector<HTMLButtonElement>('button')!.click();
    (resource.element as HTMLElement).querySelector<HTMLButtonElement>('button')!.click();
    provider.destroy();resource.destroy();return received;
  });
  expect(result).toEqual([{action:'login',id:'p',workspace:'',path:''},{action:'resource',id:'',workspace:'w',path:'/workspace/AGENTS.md'}]);
});
