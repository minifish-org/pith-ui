import {test,expect} from '@playwright/test';

test('login metadata updates preserve prompt input and new questions reset it',async({page})=>{
  await page.goto('/tests/fixture.html');
  const result=await page.evaluate(async()=>{
    const path='/src/forms/provider-login.ts';const{createProviderLoginPanel}=await import(path);
    const state={phase:'prompt',message:'Enter code',prompt:'Verification code',promptType:'text',url:'https://example.com/login'};
    const login=createProviderLoginPanel(state);document.body.append(login.element);
    const input=login.element.querySelector('input') as HTMLInputElement;input.value='中文 code';input.focus();input.setSelectionRange(2,5);
    login.update({...state,message:'Waiting for response',code:'ABC',url:'https://example.com/next'});
    const preserved=login.element.querySelector('input')===input&&document.activeElement===input&&input.value==='中文 code'&&input.selectionStart===2&&input.selectionEnd===5;
    login.update({...state,prompt:'Additional question',url:'javascript:alert(1)'});
    const reset=(login.element.querySelector('input') as HTMLInputElement).value==='';
    const unsafe=login.element.querySelector('a')!.getAttribute('href');login.destroy();return{preserved,reset,unsafe};
  });expect(result).toEqual({preserved:true,reset:true,unsafe:null});
});

test('login prevents duplicate answers and keeps content on asynchronous failure',async({page})=>{
  await page.goto('/tests/fixture.html');
  await page.evaluate(async()=>{
    const path='/src/forms/provider-login.ts';const{createProviderLoginPanel}=await import(path);let calls=0,resolve!:(result:{ok:false;error:string})=>void;
    const state={phase:'prompt',message:'Sign in',prompt:'Code'};
    const login=createProviderLoginPanel(state,{onAnswer:()=>{calls++;return new Promise(done=>{resolve=done;});}});document.body.append(login.element);
    Object.assign(window,{loginFixture:{login,state,get calls(){return calls;},resolve:(value:{ok:false;error:string})=>resolve(value)}});
  });
  await page.getByRole('textbox',{name:'Code',exact:true}).fill('my-code');await page.getByRole('button',{name:'Continue',exact:true}).click();
  await expect(page.getByRole('button',{name:'Continue',exact:true})).toBeDisabled();
  const calls=await page.evaluate(()=>{const fixture=(window as unknown as {loginFixture:{calls:number;login:{update(state:object):void};state:object;resolve(result:object):void}}).loginFixture;fixture.login.update({...fixture.state,disabled:false});document.querySelector('form')!.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));fixture.resolve({ok:false,error:'Try the same code again'});return fixture.calls;});
  expect(calls).toBe(1);await expect(page.getByRole('textbox',{name:'Code',exact:true})).toHaveValue('my-code');await expect(page.getByRole('alert')).toHaveText('Try the same code again');
});
